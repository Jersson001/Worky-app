-- ============================================================
-- WORKY - EL LOCAL Y EL CENTRO COMERCIAL DEL NEGOCIO
-- Ejecutar en SQL Editor de Supabase. Idempotente.
-- ============================================================
--
-- El catálogo público solo decía la ciudad debajo del nombre: «Hábitat Home ·
-- Bogotá». A quien escanea el QR en un centro comercial eso no le sirve para
-- volver, y el vendedor que está en un local quiere que se sepa cuál.
--
-- `address` ya existía y se pedía en el registro, pero no salía en ninguna
-- parte. Estas dos columnas son lo que le falta para ubicar un local:
--
--   local             «Local 203», «Módulo 14», «Bodega 2»
--   centro_comercial  «Centro Comercial Titán Plaza». Opcional: hay negocios
--                     de calle, y ahí solo la dirección tiene sentido.
--
-- Las dos son texto libre y opcionales: no hay una forma canónica de escribir
-- un local en Colombia, y obligar a llenarlas le estorbaría a quien trabaja
-- desde su casa o sin punto de venta.
-- ============================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS local text,
  ADD COLUMN IF NOT EXISTS centro_comercial text;

COMMENT ON COLUMN public.user_profiles.local IS
  'Local o módulo dentro de un centro comercial o plaza. Texto libre, opcional.';
COMMENT ON COLUMN public.user_profiles.centro_comercial IS
  'Nombre del centro comercial o plaza. Texto libre, opcional.';

-- ── Comprobación ─────────────────────────────────────────────────────────
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_profiles'
  AND column_name IN ('address', 'city', 'local', 'centro_comercial');
