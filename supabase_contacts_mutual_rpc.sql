-- ============================================================
-- WORKY - ALTA MUTUA DE CONTACTOS (RPC SECURITY DEFINER)
-- Ejecutar en SQL Editor. Idempotente.
-- ============================================================
-- Bug que corrige: addContact() en el cliente intentaba hacer DOS
-- INSERT directos a contacts: uno (yo -> otro) que sí cumple la
-- policy "auth.uid() = user_id", y otro (otro -> yo) que la viola
-- SIEMPRE, porque auth.uid() nunca es igual al otro usuario.
--
-- Ese segundo INSERT lanzaba una excepción RLS. Como ocurría
-- DESPUÉS del insert exitoso, el registro de "quien agrega" quedaba
-- a medias en la DB (fila directa sí, sin selección en la UI porque
-- el catch interrumpía el flujo antes de setContacts), y el OTRO
-- usuario jamás recibía su fila: por eso los mensajes se guardaban
-- en la tabla `messages` pero el destinatario no podía verlos, ya
-- que su ChatList sale de `contacts`, no de `messages`.
--
-- Solución: una función SECURITY DEFINER que crea ambas filas de
-- una vez, corriendo con permisos de owner (no sujeta al RLS del
-- cliente). El propio cuerpo de la función es el único lugar que
-- decide qué se puede insertar y en nombre de quién.
-- ============================================================

CREATE OR REPLACE FUNCTION public.add_contact_mutual(
  p_other_user uuid,
  p_client_name text,
  p_avatar text,
  p_phone text,
  p_status text,
  p_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'no autenticado';
  END IF;
  IF p_other_user = v_me THEN
    RAISE EXCEPTION 'no puedes agregarte a ti mismo como contacto';
  END IF;

  -- Mi fila: yo -> otro, con los datos que yo elegí al buscar/agregar.
  INSERT INTO public.contacts
    (user_id, contact_user_id, client_name, avatar, phone, status, role, last_message, last_message_time, unread_count)
  VALUES
    (v_me, p_other_user, p_client_name, p_avatar, p_phone, p_status, p_role, '', now(), 0)
  ON CONFLICT (user_id, contact_user_id) DO NOTHING;

  -- Fila inversa: el otro me tiene a mí. Nombre/avatar salen de mi
  -- public_info; si el otro ya me había agregado antes, no se pisa
  -- (ON CONFLICT DO NOTHING respeta lo que el otro ya personalizó).
  INSERT INTO public.contacts
    (user_id, contact_user_id, client_name, avatar, phone, status, role, last_message, last_message_time, unread_count)
  SELECT
    p_other_user, v_me, COALESCE(pi.display_name, 'Usuario'), pi.avatar_url, NULL, 'Lead', 'client', '', now(), 0
  FROM (SELECT 1) AS dummy
  LEFT JOIN public.public_info pi ON pi.user_id = v_me
  ON CONFLICT (user_id, contact_user_id) DO NOTHING;

  -- Metadata de chat (contador de no-leídos) para ambos lados.
  INSERT INTO public.user_chats (user_id, contact_id, last_message, last_message_time, unread)
  VALUES (v_me, p_other_user, '', now(), 0)
  ON CONFLICT (user_id, contact_id) DO NOTHING;

  INSERT INTO public.user_chats (user_id, contact_id, last_message, last_message_time, unread)
  VALUES (p_other_user, v_me, '', now(), 0)
  ON CONFLICT (user_id, contact_id) DO NOTHING;
END $$;

REVOKE ALL ON FUNCTION public.add_contact_mutual(uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_contact_mutual(uuid, text, text, text, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Verificación
-- ============================================================
SELECT 'add_contact_mutual existe' AS control,
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'add_contact_mutual'
       ) THEN 'OK' ELSE 'FALTA' END AS estado;
