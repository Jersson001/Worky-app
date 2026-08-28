-- ============================================================
-- WORKY - CADA ARCHIVO DE STORAGE, DE SU DUEÑO
-- Ejecutar en SQL Editor de Supabase. Idempotente.
-- ============================================================
--
-- El bucket `chat_media` guarda las fotos de los chats, las de los productos,
-- los documentos compartidos y los catálogos publicados. Sus políticas solo
-- comprobaban el bucket, no de quién era cada archivo:
--
--   USING (bucket_id = 'chat_media')
--
-- Con eso, cualquier usuario con sesión podía sobrescribir el archivo de
-- cualquier otro. Lo más grave era el catálogo: es el HTML que la app le
-- sirve a quien escanea el QR de un vendedor, así que reemplazarlo es
-- suplantarlo delante de sus clientes.
--
-- Hasta ahora hacía falta registrarse con un correo real para intentarlo. Al
-- activar las sesiones anónimas eso deja de ser cierto: la clave `anon` viaja
-- dentro de la app publicada, y con ella cualquiera abre sesión sin correo y
-- sin dejar rastro. Por eso esto va antes que el alias.
--
-- Las rutas ya venían preparadas: todas empiezan por el id del dueño.
--
--   <uid>/<contacto>/<archivo>            fotos de chat
--   <uid>/<carpeta>/<archivo>             fotos de producto
--   shared_catalogs/<uid>/<fecha>.html    catálogos
--   shared_docs/<idDocumento>.json|html   documentos compartidos
-- ============================================================

-- ------------------------------------------------------------
-- 1. Fuera la sobrescritura
--
-- Esta política existía para poder republicar el catálogo sobre el mismo
-- archivo. Ya no hace falta: el catálogo estrena nombre en cada publicación
-- (ver `nuevaInstantanea` en services/catalogShareService.ts), y los
-- documentos compartidos también, porque `generateDocumentId()` devuelve un
-- id nuevo cada vez. Sin UPDATE, un archivo subido no lo puede pisar nadie.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir sobrescribir en chat_media" ON storage.objects;

-- ------------------------------------------------------------
-- 2. Subir solo a lo tuyo
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir subida a usuarios autenticados en chat_media" ON storage.objects;
DROP POLICY IF EXISTS "chat_media: subir a lo propio" ON storage.objects;

CREATE POLICY "chat_media: subir a lo propio" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat_media'
    AND (
      -- Fotos de chat y de producto: la carpeta raíz es el id del dueño.
      (storage.foldername(name))[1] = auth.uid()::text

      -- Catálogos: cuelgan de una carpeta común, con la del dueño dentro.
      OR ((storage.foldername(name))[1] = 'shared_catalogs'
          AND (storage.foldername(name))[2] = auth.uid()::text)

      -- Documentos compartidos. Estos no llevan el dueño en la ruta, así que
      -- aquí solo se puede exigir que caigan en su carpeta. Sobrescribir ya
      -- no es posible —no hay UPDATE— y el nombre lleva marca de tiempo y
      -- azar, así que nadie puede adivinar el de otro para estorbarlo. Lo que
      -- queda abierto es que alguien suba basura ahí; se cierra el día que
      -- los documentos pasen a `shared_docs/<uid>/<id>`, que obliga a tocar
      -- también la lectura y los enlaces ya repartidos.
      OR (storage.foldername(name))[1] = 'shared_docs'
    )
  );

-- ------------------------------------------------------------
-- 3. Borrar solo lo tuyo
--
-- No había política de DELETE, así que nadie podía borrar nada —ni su propia
-- foto—. Se añade con el mismo criterio que la subida.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "chat_media: borrar lo propio" ON storage.objects;

CREATE POLICY "chat_media: borrar lo propio" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat_media'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR ((storage.foldername(name))[1] = 'shared_catalogs'
          AND (storage.foldername(name))[2] = auth.uid()::text)
    )
  );

-- ------------------------------------------------------------
-- 4. La lectura sigue siendo pública y no se toca
--
-- Es lo que permite que un cliente abra el catálogo o vea la foto de un
-- producto sin tener cuenta, que es de lo que va la app.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- 5. Comprobación
-- ------------------------------------------------------------
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
