-- ============================================================
-- WORKY - CAMPO ALIAS Y ANCLA DE VINCULACIÓN EN CONTACTOS
-- Ejecutar en SQL Editor de Supabase. Idempotente.
-- ============================================================

-- 1. Añadir columna 'alias' a la tabla contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS alias TEXT;

-- 2. Actualizar función add_contact_mutual para soportar alias y leads manuales
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

  -- 1. Fila principal: yo -> otro (con el alias visual y teléfono ancla)
  INSERT INTO public.contacts
    (user_id, contact_user_id, client_name, alias, avatar, phone, status, role, last_message, last_message_time, unread_count)
  VALUES
    (v_me, p_other_user, p_client_name, p_alias, p_avatar, p_phone, p_status, p_role, '', now(), 0)
  ON CONFLICT (user_id, contact_user_id) DO UPDATE
    SET client_name = EXCLUDED.client_name,
        alias = COALESCE(EXCLUDED.alias, contacts.alias),
        phone = COALESCE(EXCLUDED.phone, contacts.phone);

  -- 2. Metadata de chat para mi lado
  INSERT INTO public.user_chats (user_id, contact_id, last_message, last_message_time, unread)
  VALUES (v_me, p_other_user, '', now(), 0)
  ON CONFLICT (user_id, contact_id) DO NOTHING;

  -- 3. Fila inversa: solo si p_other_user ES un usuario registrado en auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = p_other_user) THEN
    INSERT INTO public.contacts
      (user_id, contact_user_id, client_name, avatar, phone, status, role, last_message, last_message_time, unread_count)
    SELECT
      p_other_user, v_me, COALESCE(pi.display_name, 'Usuario'), pi.avatar_url, NULL, 'Lead', 'client', '', now(), 0
    FROM (SELECT 1) AS dummy
    LEFT JOIN public.public_info pi ON pi.user_id = v_me
    ON CONFLICT (user_id, contact_user_id) DO NOTHING;

    INSERT INTO public.user_chats (user_id, contact_id, last_message, last_message_time, unread)
    VALUES (p_other_user, v_me, '', now(), 0)
    ON CONFLICT (user_id, contact_id) DO NOTHING;
  END IF;

END $$;

-- Permisos para la función RPC
REVOKE ALL ON FUNCTION public.add_contact_mutual(uuid, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_contact_mutual(uuid, text, text, text, text, text, text) TO authenticated;

-- Forzar recarga del esquema en PostgREST
NOTIFY pgrst, 'reload schema';
