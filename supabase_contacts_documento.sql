-- ============================================================
-- WORKY - DOCUMENTO DEL CONTACTO (cédula, NIT o RUT)
-- Ejecutar en el Editor SQL de Supabase. Idempotente.
--
-- Por qué: para cotizar y facturar a un cliente hace falta su documento, y la
-- ficha del contacto no tenía dónde guardarlo. Es texto libre porque un NIT
-- lleva guion y dígito de verificación («900.123.456-7») y una cédula, puntos.
--
-- Va en `contacts`, no en `user_profiles`: es el dato que quien vende anota de
-- SU cliente, y las políticas de `contacts` ya lo limitan a su dueño.
-- ============================================================

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS documento TEXT;

NOTIFY pgrst, 'reload schema';

-- Comprobación: debe aparecer la columna.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'documento';
