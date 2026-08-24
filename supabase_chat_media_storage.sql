-- ============================================================
-- WORKY - COLUMNAS Y STORAGE PARA ENVÍO DE ARCHIVOS/IMÁGENES
-- Ejecutar en el Editor SQL de Supabase.
-- ============================================================

-- 1. Añadir columnas a la tabla de mensajes
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT;

-- 2. Crear bucket chat_media
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_media', 'chat_media', true)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS en storage.objects para el bucket chat_media
DROP POLICY IF EXISTS "Permitir lectura publica de chat_media" ON storage.objects;
CREATE POLICY "Permitir lectura publica de chat_media" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'chat_media');

DROP POLICY IF EXISTS "Permitir subida a usuarios autenticados en chat_media" ON storage.objects;
CREATE POLICY "Permitir subida a usuarios autenticados en chat_media" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat_media');

-- Opcional: Recargar esquema (suele ser automático)
NOTIFY pgrst, 'reload schema';
