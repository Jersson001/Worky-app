-- Panel de administración para gestionar suscripciones Pro manualmente.
-- Ejecutar en el SQL Editor. Idempotente.

-- ------------------------------------------------------------
-- 1. Flag de administrador
-- ------------------------------------------------------------
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Marca como admin la cuenta dueña de Ferry App SAS.
UPDATE public.user_profiles
SET is_admin = true
WHERE email = 'jfescobar0913@gmail.com';

-- ------------------------------------------------------------
-- 2. Helper SECURITY DEFINER: consulta el propio flag sin pasar
--    por RLS, evitando la recursión de referenciar user_profiles
--    dentro de su propia policy.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.user_profiles WHERE id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

-- ------------------------------------------------------------
-- 3. RLS: el admin puede leer y actualizar todos los perfiles.
--    Son policies adicionales (permissive), se combinan con OR junto
--    a las policies existentes de "solo mi propia fila".
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "user_profiles_select_admin" ON public.user_profiles;
CREATE POLICY "user_profiles_select_admin" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "user_profiles_update_admin" ON public.user_profiles;
CREATE POLICY "user_profiles_update_admin" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- ------------------------------------------------------------
-- 4. Blindaje: un usuario normal editando su propio perfil (policy
--    "own row") no puede tocar is_pro / trial_ends_at /
--    subscription_ends_at / is_admin. Si no es admin, el trigger
--    revierte esos campos al valor anterior antes de guardar.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_subscription_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    NEW.is_pro := OLD.is_pro;
    NEW.trial_ends_at := OLD.trial_ends_at;
    NEW.subscription_ends_at := OLD.subscription_ends_at;
    NEW.is_admin := OLD.is_admin;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_subscription_fields ON public.user_profiles;
CREATE TRIGGER trg_protect_subscription_fields
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_subscription_fields();

NOTIFY pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Verificación
-- ------------------------------------------------------------
SELECT id, email, is_admin, is_pro, trial_ends_at, subscription_ends_at
FROM public.user_profiles
WHERE is_admin = true;
