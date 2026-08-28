-- ============================================================
-- WORKY - CERRAR EL BUCKET `files`
-- Ejecutar en SQL Editor de Supabase. Idempotente. URGENTE.
-- ============================================================
--
-- Quedaron vivas las políticas de diagnóstico de la investigación del
-- catálogo, cuando se buscaba por qué `files` rechazaba las escrituras. Dos
-- de ellas siguen abiertas:
--
--   Catalogo: prueba publica   INSERT  to public          <- cualquiera
--   Catalogo: prueba carpeta   INSERT  to authenticated   <- cualquier cuenta
--
-- Ninguna comprueba de quién es el archivo. La primera tiene rol `public`,
-- así que no hace falta ni tener cuenta: con la clave `anon` —que viaja
-- dentro de la app publicada y por tanto es pública— cualquiera puede subir
-- lo que quiera a ese bucket. Eso ya está abierto hoy, sin esperar a las
-- sesiones anónimas.
--
-- El script viejo (supabase_catalogo_storage.sql, punto 2) intentaba
-- borrarlas, pero por lo visto no llegó a ejecutarse entero.
--
-- Se cierra el bucket completo en vez de acotarlo porque ya no se usa: la
-- única función que escribía ahí es `uploadFile` en services/
-- storageService.ts, y no la llama nadie —el chat pasó a `uploadFileForChat`,
-- que va a `chat_media`—. El catálogo también se mudó a `chat_media`.
--
-- Lo que ya está subido se sigue leyendo: los buckets públicos sirven las
-- descargas por URL sin pasar por estas políticas, así que un archivo antiguo
-- enlazado en un chat viejo no se rompe.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Las dos abiertas. Esto es lo urgente.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Catalogo: prueba publica" ON storage.objects;
DROP POLICY IF EXISTS "Catalogo: prueba carpeta" ON storage.objects;

-- ------------------------------------------------------------
-- 2. Las del catálogo en `files`, que ya no se usan.
--
-- El catálogo vive en `chat_media` desde hace tiempo (ver
-- services/catalogShareService.ts). Estas quedaron de entonces.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Catalogo: subir el propio" ON storage.objects;
DROP POLICY IF EXISTS "Catalogo: actualizar el propio" ON storage.objects;

-- ------------------------------------------------------------
-- 3. Comprobación
--
-- Debe quedar SOLO lo de chat_media: subir y borrar por dueño, y la lectura
-- pública. Ni una fila de `files`, ni un UPDATE en ningún sitio.
-- ------------------------------------------------------------
SELECT
  policyname,
  cmd,
  case
    when coalesce(qual, with_check) like '%files%'      then 'files'
    when coalesce(qual, with_check) like '%chat_media%' then 'chat_media'
    else '???'
  end as bucket,
  case
    when coalesce(qual, with_check) like '%auth.uid()%' then 'por dueño'
    else 'SIN DUEÑO'
  end as alcance,
  roles::text as quien
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
