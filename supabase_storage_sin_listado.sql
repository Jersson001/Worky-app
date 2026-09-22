-- ============================================================
-- WORKY - NADIE LISTA LOS ARCHIVOS DE LOS DEMÁS
-- Ejecutar en SQL Editor de Supabase. Idempotente.
-- ============================================================
--
-- El bucket `chat_media` tenía una sola política de lectura, para todo el
-- mundo y sin mirar la ruta:
--
--   "Permitir lectura publica de chat_media"   SELECT   public
--   USING (bucket_id = 'chat_media')
--
-- Con la clave pública —la que va dentro de la app y cualquiera puede ver—
-- eso deja LISTAR el bucket entero. Comprobado el 22/09/2026 pidiendo
-- `shared_docs/` sin sesión: devolvía los nombres. Y como el bucket es
-- público, cada nombre se descarga. O sea: todas las cotizaciones, facturas y
-- cuentas de cobro compartidas por todos los usuarios, con nombres de
-- clientes, montos y números de cuenta, a la mano de cualquiera, sin necesidad
-- de adivinar un enlace.
--
-- Lo que de verdad hace falta leer:
--
--   · Sin cuenta, solo LISTAR `shared_catalogs/<uid>/`: el visor del catálogo
--     busca así la instantánea más reciente. Nada más se lista en la app.
--   · Con cuenta, lo propio: las subidas con `upsert` —los documentos
--     compartidos— pasan por la política de lectura para la fila que acaban de
--     escribir.
--   · Descargar por enlace público no pasa por aquí: en un bucket público las
--     URL `/object/public/…` se sirven sin mirar estas políticas. Fotos del
--     chat, documentos y catálogos se siguen viendo igual.
-- ============================================================

DROP POLICY IF EXISTS "Permitir lectura publica de chat_media" ON storage.objects;

DROP POLICY IF EXISTS "chat_media: listar catalogos" ON storage.objects;
CREATE POLICY "chat_media: listar catalogos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'chat_media' AND (storage.foldername(name))[1] = 'shared_catalogs');

DROP POLICY IF EXISTS "chat_media: ver lo propio" ON storage.objects;
CREATE POLICY "chat_media: ver lo propio" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chat_media' AND owner_id = (auth.uid())::text);

-- ── Comprobación ─────────────────────────────────────────────────────────
SELECT policyname, cmd, roles::text FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects' ORDER BY cmd, policyname;
