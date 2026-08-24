-- ============================================================
-- WORKY - CORREGIR FK DE CONTACTOS PARA LEADS MANUALES
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Permitir valores nulos en contact_user_id (para leads manuales que aún no son usuarios)
ALTER TABLE public.contacts
  ALTER COLUMN contact_user_id DROP NOT NULL;

-- 2. Eliminar la foreign key que obliga a que contact_user_id exista en auth.users
--    (el nombre puede variar; estos son los nombres más comunes)
ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_contact_user_id_fkey;

ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS fk_contacts_contact_user_id;

-- 3. (Opcional) Re-crear la FK pero permitiendo NULL (ON DELETE SET NULL)
--    Esto permite que el vínculo funcione si el usuario SÍ existe,
--    pero no bloquea la creación de leads manuales.
--    Descomenta las siguientes líneas si deseas mantener la integridad referencial parcial:
-- ALTER TABLE public.contacts
--   ADD CONSTRAINT contacts_contact_user_id_fkey
--   FOREIGN KEY (contact_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Asegurar que la columna alias exista
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS alias TEXT;

-- 5. Recargar esquema de PostgREST
NOTIFY pgrst, 'reload schema';
