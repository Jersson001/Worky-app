-- ============================================================
-- WORKY - LO QUE UN ANÓNIMO NO PUEDE HACER
-- Ejecutar en SQL Editor de Supabase. Idempotente.
-- Correr ANTES de activar las sesiones anónimas.
-- ============================================================
--
-- Un usuario anónimo tiene su propio `uid`, así que las políticas existentes
-- —todas del tipo `auth.uid() = user_id`— le dejan hacer lo mismo que a un
-- vendedor registrado. Para casi todo está bien: el cliente que llega por QR
-- necesita crear su perfil, agregar al vendedor y mandarle mensajes, fotos
-- incluidas, que es de lo que va la app.
--
-- Lo que no necesita es ser vendedor. Y dos cosas de vendedor son peligrosas
-- en manos de una cuenta que se crea sin correo y sin dejar rastro:
--
--   1. Publicar un catálogo. Un catálogo es HTML que se sirve desde tu
--      dominio de Supabase. Sin este límite, cualquiera podría crear cuentas
--      anónimas en masa y usar tu proyecto para alojar páginas de phishing.
--
--   2. Crear productos. Es la puerta a llenarte la base y el almacenamiento
--      sin que haya a quién reclamarle.
--
-- Las políticas son RESTRICTIVE: no conceden nada, se suman como condición a
-- lo que ya había. Si mañana se añade otra política permisiva, esta sigue
-- filtrando.
--
-- `coalesce(..., false)` y no `is false` a secas: si algún día el token
-- llegara sin la marca `is_anonymous`, se trata como cuenta permanente. Es lo
-- que hay que hacer para no dejar tirado a un usuario normal por un cambio en
-- el formato del token; el riesgo se cubre por el otro lado, porque la marca
-- sí viene siempre en las sesiones anónimas.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Nada de publicar catálogos
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Solo cuentas permanentes publican catalogo" ON storage.objects;

CREATE POLICY "Solo cuentas permanentes publican catalogo" ON storage.objects
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Solo se mete donde vive el catálogo; el resto del bucket no se toca,
    -- para que el cliente anónimo pueda seguir mandando fotos por el chat.
    (storage.foldername(name))[1] IS DISTINCT FROM 'shared_catalogs'
    OR coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

-- ------------------------------------------------------------
-- 2. Nada de crear productos
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Solo cuentas permanentes crean productos" ON public.products;

CREATE POLICY "Solo cuentas permanentes crean productos" ON public.products
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

-- ------------------------------------------------------------
-- 3. Comprobación
--
-- Deben aparecer las dos con permissive = 'RESTRICTIVE'.
-- ------------------------------------------------------------
SELECT tablename, policyname, cmd, permissive
FROM pg_policies
WHERE policyname LIKE 'Solo cuentas permanentes%'
ORDER BY tablename;
