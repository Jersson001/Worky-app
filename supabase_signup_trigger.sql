-- ============================================================
-- WORKY - ALTA AUTOMÁTICA DE USUARIO + BÚSQUEDA POR CORREO
-- Ejecutar en SQL Editor. Idempotente.
-- ============================================================
-- Problema que resuelve: el cliente creaba la cuenta y LUEGO
-- insertaba user_profiles / public_info. Si algo fallaba en medio,
-- el usuario quedaba en Auth pero invisible para la búsqueda, y
-- no había segunda oportunidad. Con un trigger sobre auth.users
-- las filas se crean siempre, venga el alta de donde venga.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Búsqueda por correo exacto en minúsculas
--    Índice único sobre el identificador normalizado.
-- ------------------------------------------------------------
UPDATE public.public_info
SET phone_or_email = LOWER(TRIM(phone_or_email))
WHERE phone_or_email IS DISTINCT FROM LOWER(TRIM(phone_or_email));

CREATE INDEX IF NOT EXISTS idx_public_info_phone_or_email
  ON public.public_info (phone_or_email);

-- ------------------------------------------------------------
-- 2. Trigger de alta
--    SECURITY DEFINER: corre con permisos del owner, así puede
--    escribir aunque el RLS del usuario recién creado aún no aplique.
--    Nunca lanza: si fallara, abortaría el signUp entero.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name  TEXT;
  v_phone TEXT;
  v_ident TEXT;
BEGIN
  -- El nombre viene de options.data del signUp; si no, se deriva del correo.
  v_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'Usuario'
  );
  v_phone := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''), NEW.phone);
  v_ident := LOWER(TRIM(COALESCE(NEW.email, NEW.phone, '')));

  INSERT INTO public.user_profiles (id, business_name, owner_name, email, phone)
  VALUES (NEW.id, v_name, v_name, LOWER(TRIM(NEW.email)), v_phone)
  ON CONFLICT (id) DO UPDATE
    SET email      = COALESCE(EXCLUDED.email, public.user_profiles.email),
        owner_name = COALESCE(NULLIF(public.user_profiles.owner_name, ''), EXCLUDED.owner_name);

  IF v_ident <> '' THEN
    INSERT INTO public.public_info (user_id, phone_or_email, display_name, avatar_url)
    VALUES (
      NEW.id,
      v_ident,
      v_name,
      'https://ui-avatars.com/api/?name=' || replace(v_name, ' ', '+') || '&background=random'
    )
    ON CONFLICT (user_id) DO UPDATE
      SET phone_or_email = EXCLUDED.phone_or_email,
          display_name   = COALESCE(NULLIF(public.public_info.display_name, ''), EXCLUDED.display_name),
          avatar_url     = COALESCE(public.public_info.avatar_url, EXCLUDED.avatar_url);

    -- Se mantiene user_index por compatibilidad con registros antiguos.
    INSERT INTO public.user_index (safe_key, user_id)
    VALUES (regexp_replace(v_ident, '[\.\#\$\[\]]', '_', 'g'), NEW.id)
    ON CONFLICT (safe_key) DO UPDATE SET user_id = EXCLUDED.user_id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Nunca bloquear la creación de la cuenta por un fallo de espejado.
    RAISE WARNING 'handle_new_user fallo para %: %', NEW.id, SQLERRM;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- 3. Backfill: usuarios que ya existían y quedaron sin espejar
--    (incluye los creados durante las pruebas fallidas)
-- ------------------------------------------------------------
INSERT INTO public.user_profiles (id, business_name, owner_name, email, phone)
SELECT u.id,
       COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1), 'Usuario'),
       COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1), 'Usuario'),
       LOWER(TRIM(u.email)),
       COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'phone'), ''), u.phone)
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.public_info (user_id, phone_or_email, display_name, avatar_url)
SELECT u.id,
       LOWER(TRIM(COALESCE(u.email, u.phone))),
       COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1), 'Usuario'),
       'https://ui-avatars.com/api/?name=' ||
         replace(COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1), 'Usuario'), ' ', '+') ||
         '&background=random'
FROM auth.users u
WHERE COALESCE(u.email, u.phone) IS NOT NULL
ON CONFLICT (user_id) DO UPDATE
  SET phone_or_email = EXCLUDED.phone_or_email,
      display_name   = COALESCE(NULLIF(public.public_info.display_name, ''), EXCLUDED.display_name);

INSERT INTO public.user_index (safe_key, user_id)
SELECT regexp_replace(LOWER(TRIM(COALESCE(u.email, u.phone))), '[\.\#\$\[\]]', '_', 'g'), u.id
FROM auth.users u
WHERE COALESCE(u.email, u.phone) IS NOT NULL
ON CONFLICT (safe_key) DO UPDATE SET user_id = EXCLUDED.user_id;

NOTIFY pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Verificación: cada usuario de Auth debe tener su fila espejada.
-- 'huerfanos_public_info' debe ser 0.
-- ------------------------------------------------------------
SELECT
  (SELECT count(*) FROM auth.users)                                   AS usuarios_auth,
  (SELECT count(*) FROM public.public_info)                           AS filas_public_info,
  (SELECT count(*) FROM auth.users u
     WHERE COALESCE(u.email, u.phone) IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.public_info p WHERE p.user_id = u.id))
                                                                      AS huerfanos_public_info;
