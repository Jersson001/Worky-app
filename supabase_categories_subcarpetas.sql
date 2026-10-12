-- ============================================================
-- WORKY - SUBCARPETAS EN EL CATÁLOGO
-- Ejecutar en el Editor SQL de Supabase. Idempotente.
--
-- Por qué: una carpeta grande —«Jean»— necesita partirse en «Jean hombre» y
-- «Jean mujer». Se hace con un solo nivel: una subcarpeta cuelga de una carpeta
-- principal y no puede tener subcarpetas propias. Eso lo cuida la app; aquí solo
-- se guarda de quién cuelga.
--
-- `ON DELETE SET NULL`: al borrar una carpeta con subcarpetas, estas suben al
-- primer nivel en vez de borrarse o quedar colgando de un id que ya no existe.
-- Los productos nunca se pierden: ya quedaban sin carpeta al borrarla.
--
-- Las políticas de `categories` ya limitan cada fila a su dueño.
-- ============================================================

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id UUID
  REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_categories_parent_id
  ON public.categories (parent_id);

NOTIFY pgrst, 'reload schema';

-- Comprobación: debe aparecer la columna.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'parent_id';
