-- ============================================================
-- WORKY - SCRIPT DEFINITIVO: CORREGIR TABLA PROJECTS Y SCHEMA CACHE
-- Ejecutar este script en el SQL Editor de Supabase
-- ============================================================

-- 1. Asegurarse de que la tabla 'projects' tenga todas las columnas requeridas
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS client_id UUID,
  ADD COLUMN IF NOT EXISTS contractor_id UUID,
  ADD COLUMN IF NOT EXISTS quote_code TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 2. Asegurarse de que client_id y contractor_id permitan valores NULL (para leads manuales)
ALTER TABLE public.projects
  ALTER COLUMN client_id DROP NOT NULL,
  ALTER COLUMN contractor_id DROP NOT NULL;

-- 3. Habilitar y actualizar RLS en la tabla 'projects' para visibilidad bidireccional
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de proyectos a cliente y contratista" ON public.projects;
CREATE POLICY "Permitir lectura de proyectos a cliente y contratista"
  ON public.projects FOR SELECT
  USING (
    auth.uid() = client_id OR
    auth.uid() = contractor_id OR
    auth.uid()::text = contact_id
  );

DROP POLICY IF EXISTS "Permitir insercion de proyectos a usuarios autenticados" ON public.projects;
CREATE POLICY "Permitir insercion de proyectos a usuarios autenticados"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Permitir actualizacion de proyectos a cliente y contratista" ON public.projects;
CREATE POLICY "Permitir actualizacion de proyectos a cliente y contratista"
  ON public.projects FOR UPDATE
  USING (
    auth.uid() = client_id OR
    auth.uid() = contractor_id OR
    auth.uid()::text = contact_id
  );

-- 4. FORZAR RECARGA DEL ESQUEMA EN POSTGREST (SUPABASE SCHEMA CACHE)
NOTIFY pgrst, 'reload schema';
