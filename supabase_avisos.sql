-- ============================================================
-- WORKY - AVISOS DE LA TIENDA A QUIENES LA SIGUEN
-- Ejecutar en SQL Editor de Supabase. Idempotente.
-- ============================================================
--
-- Una tienda publica un aviso —un descuento, un producto nuevo, una novedad— y
-- les llega a las personas que la siguen: como notificación en el teléfono si
-- tienen Worky instalado, y en su bandeja de «Novedades» al abrirla.
--
-- Hasta ahora «seguir una tienda» vivía solo en el teléfono de quien la seguía
-- (`localStorage`), y la tienda no sabía quién la seguía. `seguidores` es el
-- lado del servidor: la app lo sincroniza al abrirse.
--
-- Privacidad: la tienda ve CUÁNTAS personas la siguen, no quiénes. Un seguidor
-- solo se vuelve conocido para ella si le escribe.
--
-- Contra el abuso: solo cuentas permanentes publican, con tope de avisos por
-- día. La notificación la manda una función del servidor que recibe solamente
-- el id del aviso y lee el contenido de la base; así nadie puede fabricar una
-- notificación con texto propio llamando a esa dirección, y cada aviso se
-- envía una sola vez.
--
-- Las tablas no tienen permisos por la API: todo pasa por funciones.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.seguidores (
  tienda_id  uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  usuario_id uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  creado     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tienda_id, usuario_id),
  CHECK (tienda_id <> usuario_id)
);

CREATE INDEX IF NOT EXISTS seguidores_usuario_idx ON public.seguidores (usuario_id);

CREATE TABLE IF NOT EXISTS public.avisos (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_id  uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  tipo       text        NOT NULL CHECK (tipo IN ('descuento', 'lanzamiento', 'aviso')),
  titulo     text        NOT NULL CHECK (char_length(titulo) BETWEEN 3 AND 80),
  texto      text        NOT NULL DEFAULT '' CHECK (char_length(texto) <= 500),
  vence_en   date,
  -- Una foto opcional, subida por la propia tienda a `chat_media/<su id>/avisos/`.
  imagen_url text        CHECK (imagen_url IS NULL OR char_length(imagen_url) <= 500),
  creado     timestamptz NOT NULL DEFAULT now(),
  -- Cuándo salió la notificación. Si ya tiene fecha, no se vuelve a enviar.
  enviado_en timestamptz
);

CREATE INDEX IF NOT EXISTS avisos_tienda_idx ON public.avisos (tienda_id, creado DESC);

-- Para las bases que ya tenían la tabla sin la imagen.
ALTER TABLE public.avisos
  ADD COLUMN IF NOT EXISTS imagen_url text CHECK (imagen_url IS NULL OR char_length(imagen_url) <= 500);

ALTER TABLE public.seguidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.seguidores, public.avisos FROM anon, authenticated;

-- ------------------------------------------------------------
-- Seguir: la app manda las tiendas que ya seguía en el teléfono
-- ------------------------------------------------------------
-- Devuelve cuántas son nuevas. Ignora tiendas que no existen y a uno mismo.
CREATE OR REPLACE FUNCTION public.seguir_tiendas(p_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nuevas integer;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 0; END IF;
  IF p_ids IS NULL OR cardinality(p_ids) = 0 THEN RETURN 0; END IF;

  INSERT INTO public.seguidores (tienda_id, usuario_id)
  SELECT DISTINCT p.id, auth.uid()
  FROM public.user_profiles p
  WHERE p.id = ANY (p_ids[1:200]) AND p.id <> auth.uid()
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_nuevas = ROW_COUNT;
  RETURN v_nuevas;
END;
$$;

REVOKE ALL ON FUNCTION public.seguir_tiendas(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seguir_tiendas(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.dejar_de_seguir(p_tienda uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.seguidores WHERE tienda_id = p_tienda AND usuario_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.dejar_de_seguir(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dejar_de_seguir(uuid) TO authenticated;

-- ------------------------------------------------------------
-- La tienda: cuántos la siguen
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cuantos_me_siguen()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer FROM public.seguidores WHERE tienda_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.cuantos_me_siguen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cuantos_me_siguen() TO authenticated;

-- ------------------------------------------------------------
-- La tienda publica un aviso
-- ------------------------------------------------------------
-- Tope: 2 avisos cada 24 horas. Sin tope, una tienda podría llenarle el
-- teléfono a sus seguidores, y la primera consecuencia sería que la dejen de
-- seguir —o que desinstalen Worky—.
-- La versión sin imagen se quita: con las dos, llamar con cuatro argumentos sería
-- ambiguo.
DROP FUNCTION IF EXISTS public.publicar_aviso(text, text, text, date);

CREATE OR REPLACE FUNCTION public.publicar_aviso(
  p_tipo   text,
  p_titulo text,
  p_texto  text,
  p_vence  date,
  p_imagen text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_imagen text := nullif(trim(coalesce(p_imagen, '')), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Entra a tu cuenta para publicar un aviso';
  END IF;
  IF coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'Solo las tiendas con cuenta pueden publicar avisos';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'No encontramos tu tienda';
  END IF;
  IF (SELECT count(*) FROM public.avisos
      WHERE tienda_id = auth.uid() AND creado > now() - interval '24 hours') >= 2 THEN
    RAISE EXCEPTION 'Ya publicaste 2 avisos hoy. Para no llenarle el teléfono a tus seguidores, espera a mañana';
  END IF;
  IF p_vence IS NOT NULL AND p_vence < current_date THEN
    RAISE EXCEPTION 'La fecha límite ya pasó';
  END IF;

  -- La imagen tiene que ser un archivo que esta misma tienda subió a nuestro
  -- almacenamiento. Sin esto, un aviso podría llevar cualquier dirección: una
  -- imagen ajena, o una que avise a un tercero de quién la abrió.
  IF v_imagen IS NOT NULL AND v_imagen NOT LIKE
     'https://vdkjfogtumzoiprsvyub.supabase.co/storage/v1/object/public/chat_media/' || auth.uid()::text || '/%' THEN
    RAISE EXCEPTION 'La imagen del aviso no es válida; súbela de nuevo';
  END IF;

  INSERT INTO public.avisos (tienda_id, tipo, titulo, texto, vence_en, imagen_url)
  VALUES (auth.uid(), p_tipo, trim(coalesce(p_titulo, '')), trim(coalesce(p_texto, '')), p_vence, v_imagen)
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN check_violation THEN
  RAISE EXCEPTION 'Revisa el aviso: el título lleva de 3 a 80 letras y el texto hasta 500';
END;
$$;

REVOKE ALL ON FUNCTION public.publicar_aviso(text, text, text, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publicar_aviso(text, text, text, date, text) TO authenticated;

-- Los avisos que publicó la tienda, los más nuevos primero.
DROP FUNCTION IF EXISTS public.mis_avisos_publicados(integer);

CREATE OR REPLACE FUNCTION public.mis_avisos_publicados(p_limite integer DEFAULT 20)
RETURNS TABLE (id uuid, tipo text, titulo text, texto text, vence_en date, creado timestamptz, imagen_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.tipo, a.titulo, a.texto, a.vence_en, a.creado, a.imagen_url
  FROM public.avisos a
  WHERE a.tienda_id = auth.uid()
  ORDER BY a.creado DESC
  LIMIT greatest(1, least(coalesce(p_limite, 20), 50));
$$;

REVOKE ALL ON FUNCTION public.mis_avisos_publicados(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mis_avisos_publicados(integer) TO authenticated;

-- Borrar un aviso lo saca de las bandejas; la notificación ya enviada no se retira.
CREATE OR REPLACE FUNCTION public.borrar_aviso(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.avisos WHERE id = p_id AND tienda_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.borrar_aviso(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.borrar_aviso(uuid) TO authenticated;

-- ------------------------------------------------------------
-- El cliente: las novedades de las tiendas que sigue
-- ------------------------------------------------------------
-- Solo de las tiendas que sigue, de los últimos 60 días y sin las ofertas ya
-- vencidas.
DROP FUNCTION IF EXISTS public.mis_avisos(integer);

CREATE OR REPLACE FUNCTION public.mis_avisos(p_limite integer DEFAULT 30)
RETURNS TABLE (
  id uuid, tienda_id uuid, negocio text, tipo text, titulo text, texto text,
  vence_en date, creado timestamptz, imagen_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.tienda_id,
         coalesce(nullif(u.business_name, ''), nullif(u.owner_name, ''), 'Una tienda'),
         a.tipo, a.titulo, a.texto, a.vence_en, a.creado, a.imagen_url
  FROM public.avisos a
  JOIN public.seguidores s ON s.tienda_id = a.tienda_id AND s.usuario_id = auth.uid()
  LEFT JOIN public.user_profiles u ON u.id = a.tienda_id
  WHERE a.creado > now() - interval '60 days'
    AND (a.vence_en IS NULL OR a.vence_en >= current_date)
  ORDER BY a.creado DESC
  LIMIT greatest(1, least(coalesce(p_limite, 30), 100));
$$;

REVOKE ALL ON FUNCTION public.mis_avisos(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mis_avisos(integer) TO authenticated;

-- ------------------------------------------------------------
-- La notificación: solo el id; el contenido lo lee la función de la base
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.avisar_aviso_nuevo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net'
AS $$
begin
  perform net.http_post(
    url     := 'https://vdkjfogtumzoiprsvyub.supabase.co/functions/v1/notificar-aviso',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object('aviso_id', new.id)
  );
  return new;
exception when others then
  -- Un fallo al avisar no puede impedir que el aviso se guarde: se queda en la
  -- bandeja aunque la notificación no salga.
  raise warning 'avisar_aviso_nuevo fallo: %', sqlerrm;
  return new;
end $$;

DROP TRIGGER IF EXISTS trg_avisar_aviso_nuevo ON public.avisos;
CREATE TRIGGER trg_avisar_aviso_nuevo
  AFTER INSERT ON public.avisos
  FOR EACH ROW EXECUTE FUNCTION public.avisar_aviso_nuevo();

SELECT c.relname, c.relrowsecurity AS rls
FROM pg_class c
WHERE c.relname IN ('seguidores', 'avisos')
ORDER BY c.relname;
