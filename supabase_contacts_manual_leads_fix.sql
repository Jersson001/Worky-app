-- ============================================================
-- WORKY - PERMITIR LEADS MANUALES EN contacts
-- Ejecutar en SQL Editor. Idempotente.
-- ============================================================
-- La app tiene dos tipos de "contacto":
--   1. Usuario real encontrado por búsqueda (contact_user_id = un
--      auth.users.id de verdad, participa en chat en tiempo real).
--   2. Lead manual (cliente sin cuenta, agregado a mano desde
--      "Nuevo Cliente"): NO corresponde a ningún auth.users.
--
-- La migración anterior (supabase_contacts_rls.sql) definió
-- contact_user_id con REFERENCES auth.users(id), que exige que
-- CUALQUIER contacto sea un usuario real. Eso rompe el alta de
-- leads manuales con un error de foreign key violation.
--
-- user_id sí debe seguir siendo siempre un usuario real (es quien
-- está autenticado), así que su FK se mantiene. Solo se relaja
-- contact_user_id.
-- ============================================================

ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_contact_user_id_fkey;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Verificación: ya no debe existir la FK sobre contact_user_id
-- ============================================================
SELECT 'contacts.contact_user_id sin FK a auth.users' AS control,
       CASE WHEN NOT EXISTS (
         SELECT 1 FROM pg_constraint
         WHERE conname = 'contacts_contact_user_id_fkey'
       ) THEN 'OK' ELSE 'FALTA' END AS estado;
