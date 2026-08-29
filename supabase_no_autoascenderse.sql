-- ============================================================
-- WORKY - QUE NADIE SE NOMBRE ADMIN A SÍ MISMO
-- Ejecutar en SQL Editor de Supabase. Idempotente. URGENTE.
-- ============================================================
--
-- `protect_subscription_fields` impide que un usuario se ponga is_admin o
-- is_pro, pero solo está declarado BEFORE UPDATE. Al INSERT no lo mira nadie,
-- y la política de INSERT solo comprueba `auth.uid() = id`.
--
-- Eso bastaría si la fila del perfil ya existiera siempre al llegar el
-- usuario. No existe: los comentarios del cliente dan por hecho un trigger
-- `on_auth_user_created` en auth.users que cree la fila mínima, pero en la
-- base no hay ningún trigger en esa tabla. La primera fila la crea el propio
-- cliente con un upsert, que para un usuario nuevo es un INSERT.
--
-- Resultado: cualquiera que se registre puede crear su perfil con
-- is_admin = true llamando a la API directamente, sin pasar por la app. Y un
-- admin puede leer y modificar el perfil de todos (ver las políticas
-- user_profiles_select_admin y user_profiles_update_admin). También podría
-- darse is_pro y saltarse el pago.
--
-- Comprobado antes de escribir esto: 17 perfiles, 0 admins, 0 pro. No se ha
-- usado.
--
-- El arreglo extiende el trigger al INSERT. Se prefiere a revocar el permiso
-- de columna porque mantiene el criterio en un solo sitio y no rompe el
-- upsert del cliente, que envía la fila entera.
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_subscription_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Un admin de verdad sí puede tocar estos campos: es como se conceden.
  IF public.is_current_user_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Se conserva lo que hubiera: nadie se asciende ni se regala Pro.
    NEW.is_pro               := OLD.is_pro;
    NEW.trial_ends_at        := OLD.trial_ends_at;
    NEW.subscription_ends_at := OLD.subscription_ends_at;
    NEW.is_admin             := OLD.is_admin;
  ELSE
    -- En un INSERT no hay OLD contra el que comparar, así que se imponen los
    -- valores por defecto de la tabla. Nacer administrador no es una opción.
    NEW.is_pro               := false;
    NEW.is_admin             := false;
    NEW.trial_ends_at        := now() + interval '30 days';
    NEW.subscription_ends_at := NULL;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_subscription_fields ON public.user_profiles;

CREATE TRIGGER trg_protect_subscription_fields
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_subscription_fields();

-- ------------------------------------------------------------
-- Comprobación
-- ------------------------------------------------------------
SELECT tgname, pg_get_triggerdef(t.oid) AS definicion
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'user_profiles' AND NOT t.tgisinternal;
