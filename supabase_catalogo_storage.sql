-- ============================================================
-- WORKY - CATÁLOGO PÚBLICO EN STORAGE
-- Ejecutar en el Editor SQL de Supabase.
--
-- Contexto: la publicación del catálogo pasó del bucket `files`
-- (sin políticas de escritura, ver PENDIENTE-CATALOGO-STORAGE.md)
-- a `chat_media`, que ya tiene lectura pública e INSERT.
-- ============================================================

-- 1. Permitir sobrescribir. El catálogo vive en una ruta fija por usuario
--    (`shared_catalogs/<uid>.html`) para que el QR impreso siga sirviendo
--    tras actualizarlo, así que republicar es un UPDATE, no un INSERT.
--    Sin esta política la primera publicación funciona y la segunda falla
--    con "new row violates row-level security policy".
DROP POLICY IF EXISTS "Permitir sobrescribir en chat_media" ON storage.objects;
CREATE POLICY "Permitir sobrescribir en chat_media" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'chat_media')
  WITH CHECK (bucket_id = 'chat_media');

-- 2. Limpieza obligatoria: políticas de diagnóstico de la investigación
--    anterior. La primera permite escritura anónima en `files`.
DROP POLICY IF EXISTS "Catalogo: prueba publica" ON storage.objects;
DROP POLICY IF EXISTS "Catalogo: prueba carpeta" ON storage.objects;

-- 3. Comprobación. Debe listar las de chat_media (SELECT, INSERT, UPDATE)
--    y ninguna llamada "prueba". Mirar también la columna `permissive`:
--    una política RESTRICTIVE explicaría por qué `files` rechaza las
--    escrituras incluso con una política `to public`.
SELECT policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
