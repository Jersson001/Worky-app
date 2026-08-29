-- ============================================================
-- WORKY - QUE EL OTRO TAMBIÉN TE VEA
-- Ejecutar en SQL Editor de Supabase. Idempotente.
-- ============================================================
--
-- En la base convivían dos versiones de add_contact_mutual: la de 6 parámetros,
-- que creaba las dos fichas, y la de 7 (la que añadió el alias), que solo creaba
-- la de quien agrega. La app siempre manda p_alias —ver addContact en
-- services/messagingService.ts— así que siempre caía en la segunda.
--
-- Consecuencia: al agregar a alguien, ese alguien no se enteraba. El vendedor no
-- veía al cliente que acababa de escanear su QR hasta que llegara un mensaje.
--
-- Esta es la versión que ya estaba escrita en
-- supabase_contacts_alias_and_anchor.sql; lo desplegado se había quedado atrás.
-- ============================================================

CREATE OR REPLACE FUNCTION public.add_contact_mutual(
  p_other_user uuid,
  p_client_name text,
  p_avatar text,
  p_phone text,
  p_status text,
  p_role text,
  p_alias text DEFAULT NULL
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

  -- Mi ficha: yo -> el otro, con el alias visual y el teléfono ancla.
  INSERT INTO public.contacts
    (user_id, contact_user_id, client_name, alias, avatar, phone, status, role, last_message, last_message_time, unread_count)
  VALUES
    (v_me, p_other_user, p_client_name, p_alias, p_avatar, p_phone, p_status, p_role, '', now(), 0)
  ON CONFLICT (user_id, contact_user_id) DO UPDATE
    SET client_name = EXCLUDED.client_name,
        alias = COALESCE(EXCLUDED.alias, contacts.alias),
        phone = COALESCE(EXCLUDED.phone, contacts.phone);

  INSERT INTO public.user_chats (user_id, contact_id, last_message, last_message_time, unread)
  VALUES (v_me, p_other_user, '', now(), 0)
  ON CONFLICT (user_id, contact_id) DO NOTHING;

  -- La ficha inversa, solo si el otro es un usuario de verdad: un lead creado a
  -- mano no existe en auth.users y no puede ser dueño de una ficha.
  --
  -- DO NOTHING y no DO UPDATE: si el otro ya me tenía agregado, se respeta el
  -- nombre que él me haya puesto.
  --
  -- NULLIF en display_name porque quien entra con alias puede tener la columna
  -- en blanco un instante; 'Usuario' es mejor que una ficha sin nombre.
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = p_other_user) THEN
    INSERT INTO public.contacts
      (user_id, contact_user_id, client_name, avatar, phone, status, role, last_message, last_message_time, unread_count)
    SELECT
      p_other_user, v_me, COALESCE(NULLIF(pi.display_name, ''), 'Usuario'), pi.avatar_url, NULL, 'Lead', 'client', '', now(), 0
    FROM (SELECT 1) AS dummy
    LEFT JOIN public.public_info pi ON pi.user_id = v_me
    ON CONFLICT (user_id, contact_user_id) DO NOTHING;

    INSERT INTO public.user_chats (user_id, contact_id, last_message, last_message_time, unread)
    VALUES (p_other_user, v_me, '', now(), 0)
    ON CONFLICT (user_id, contact_id) DO NOTHING;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.add_contact_mutual(uuid, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_contact_mutual(uuid, text, text, text, text, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
