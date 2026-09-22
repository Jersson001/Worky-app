-- ============================================================
-- WORKY - QUE EL CLIENTE MANUAL ENTRE A SU PROPIO CHAT AL REGISTRARSE
-- Ejecutar en SQL Editor de Supabase. Idempotente.
-- Pruebas: node supabase_invitaciones_contacto.test.mjs
-- ============================================================
--
-- Un contacto manual es alguien que no tiene cuenta: el vendedor lo crea a
-- mano —con su número o su usuario de WhatsApp— y le manda cotizaciones. Si
-- ese cliente se registra después, hasta ahora aparecía como un contacto
-- NUEVO, y el vendedor quedaba con dos: el manual, con toda la historia, y el
-- registrado, vacío.
--
-- Esto los une. Al compartirle un documento a un contacto manual, el enlace
-- lleva una invitación; quien la abre y se registra con correo pasa a ser ese
-- contacto: su ficha, sus mensajes y sus proyectos quedan a su nombre.
--
-- ── Por qué una invitación y no el usuario de WhatsApp ──
--
-- Lo primero que se pensó fue reconocerlo por el usuario de WhatsApp que el
-- vendedor anotó. Pero ese dato lo escribe cualquiera al registrarse: quien
-- pusiera «@andres.23» sin serlo entraría al chat del vendedor con Andrés y
-- vería sus cotizaciones. La invitación, en cambio, solo la tiene quien
-- recibió el enlace, que es a quien se lo mandó el vendedor por WhatsApp.
--
-- ── Por qué la invitación va en el enlace y no dentro del documento ──
--
-- Los documentos compartidos viven en Storage con lectura pública, y hasta
-- supabase_storage_sin_listado.sql cualquiera podía LISTAR esa carpeta. Una
-- invitación guardada dentro del documento se la llevaba cualquiera. Así que
-- vive solo aquí, en una tabla que nadie lee directamente, y en el enlace que
-- el vendedor manda.
-- ============================================================


-- ── 1. Las invitaciones ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invitaciones_contacto (
  -- 122 bits al azar: no se adivina, que es lo único que la protege.
  token        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contacto_id  uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  creada_en    timestamptz NOT NULL DEFAULT now(),
  expira_en    timestamptz NOT NULL DEFAULT now() + interval '90 days',
  usada_en     timestamptz,
  usada_por    uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Nadie la lee ni la escribe directamente: solo las dos funciones de abajo.
-- RLS activo y sin políticas cierra la tabla para la API.
ALTER TABLE public.invitaciones_contacto ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invitaciones_contacto FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS invitaciones_contacto_por_contacto
  ON public.invitaciones_contacto (contacto_id) WHERE usada_en IS NULL;


-- ── 2. El vendedor pide una invitación para su contacto manual ──────────
--
-- Devuelve NULL si el contacto no es suyo o ya tiene cuenta: en ese caso no
-- hay nada que unir y el enlace sale sin invitación. Reutiliza la que siga
-- viva, para no llenar la tabla con una por cada documento compartido.

CREATE OR REPLACE FUNCTION public.crear_invitacion_contacto(p_contacto uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.contacts
    WHERE id = p_contacto AND user_id = auth.uid() AND contact_user_id IS NULL
  ) THEN
    RETURN NULL;
  END IF;

  SELECT token INTO v_token
  FROM public.invitaciones_contacto
  WHERE contacto_id = p_contacto AND usada_en IS NULL AND expira_en > now()
  LIMIT 1;

  IF v_token IS NULL THEN
    INSERT INTO public.invitaciones_contacto (vendedor, contacto_id)
    VALUES (auth.uid(), p_contacto)
    RETURNING token INTO v_token;
  END IF;

  RETURN v_token;
END $$;

REVOKE ALL ON FUNCTION public.crear_invitacion_contacto(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.crear_invitacion_contacto(uuid) TO authenticated;


-- ── 3. El cliente, ya registrado, la reclama ────────────────────────────
--
-- Devuelve el id del vendedor, para abrirle el chat; NULL si la invitación
-- no sirve. No dice por qué no sirve: a quien prueba tokens al azar no hay
-- que contarle cuáles existen.

CREATE OR REPLACE FUNCTION public.reclamar_contacto(p_token uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_yo        uuid := auth.uid();
  v_inv       public.invitaciones_contacto%ROWTYPE;
  v_contacto  public.contacts%ROWTYPE;
  v_chat      text;
BEGIN
  IF v_yo IS NULL THEN
    RETURN NULL;
  END IF;

  -- Con correo, y no anónima: lo pidió él —«ahí sí es obligatorio»— y es lo
  -- que hace recuperable la cuenta a la que va a parar toda esa historia.
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = v_yo AND email IS NOT NULL AND coalesce(is_anonymous, false) = false
  ) THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_inv FROM public.invitaciones_contacto WHERE token = p_token FOR UPDATE;
  IF NOT FOUND OR v_inv.usada_en IS NOT NULL OR v_inv.expira_en <= now() OR v_inv.vendedor = v_yo THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_contacto FROM public.contacts
  WHERE id = v_inv.contacto_id AND user_id = v_inv.vendedor
  FOR UPDATE;
  IF NOT FOUND OR v_contacto.contact_user_id IS NOT NULL THEN
    RETURN NULL;
  END IF;

  -- Si ya existía la ficha vendedor → yo —porque entró antes por otro enlace
  -- del mismo vendedor—, sobra: la buena es la manual, que tiene la historia y
  -- el nombre que le puso el vendedor. Borrarla no pierde mensajes, que van
  -- por ids y no por ficha.
  DELETE FROM public.contacts
  WHERE user_id = v_inv.vendedor AND contact_user_id = v_yo AND id <> v_contacto.id;

  UPDATE public.contacts SET contact_user_id = v_yo WHERE id = v_contacto.id;

  -- Los mensajes que el vendedor le mandó cuando era manual pasan a la
  -- conversación entre los dos. El chat_id se arma igual que getChatId: los
  -- dos ids ordenados byte a byte, que es lo que hace sort() en JavaScript.
  SELECT string_agg(x, '_' ORDER BY x COLLATE "C") INTO v_chat
  FROM unnest(ARRAY[v_inv.vendedor::text, v_yo::text]) AS x;

  UPDATE public.messages
  SET recipient_id = v_yo, recipient_contact = NULL, chat_id = v_chat
  WHERE sender_id = v_inv.vendedor AND recipient_contact = v_contacto.id::text;

  -- Sus proyectos también: así los ve como cliente y cuentan como ventas.
  UPDATE public.projects
  SET client_id = v_yo
  WHERE contact_id = v_contacto.id AND client_id IS NULL;

  INSERT INTO public.user_chats (user_id, contact_id, last_message, last_message_time, unread)
  VALUES (v_inv.vendedor, v_yo, '', now(), 0)
  ON CONFLICT (user_id, contact_id) DO NOTHING;

  -- Gastada, y con ella cualquier otra que quedara viva para ese contacto.
  UPDATE public.invitaciones_contacto
  SET usada_en = now(), usada_por = CASE WHEN token = p_token THEN v_yo END
  WHERE contacto_id = v_contacto.id AND usada_en IS NULL;

  RETURN v_inv.vendedor;
END $$;

REVOKE ALL ON FUNCTION public.reclamar_contacto(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.reclamar_contacto(uuid) TO authenticated;


-- ── 4. El freno de los mensajes deja pasar al servidor ─────────────────
--
-- supabase_finanzas_del_vendedor.sql congeló remitente, destinatario, chat y
-- tipo de un mensaje, porque el destinatario podía reescribirlo entero. Ese
-- freno también paraba a reclamar_contacto, que SÍ tiene que mover mensajes.
--
-- El freno es para los clientes: quien entra por la API lo hace como
-- `authenticated` o `anon`. Una función SECURITY DEFINER corre como su dueño,
-- y eso es lo que se deja pasar.

CREATE OR REPLACE FUNCTION public.mensaje_no_cambia_de_dueno()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF NEW.sender_id         IS DISTINCT FROM OLD.sender_id
  OR NEW.recipient_id      IS DISTINCT FROM OLD.recipient_id
  OR NEW.recipient_contact IS DISTINCT FROM OLD.recipient_contact
  OR NEW.chat_id           IS DISTINCT FROM OLD.chat_id
  OR NEW.type              IS DISTINCT FROM OLD.type THEN
    RAISE EXCEPTION 'Un mensaje no puede cambiar de remitente, destinatario, chat ni tipo'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
