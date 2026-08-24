-- ============================================================
-- WORKY - PROYECTOS DOBLE VÍA (Contratista y Cliente)
-- Copiar y Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Asegurar columnas contractor_id y client_id en public.projects
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contractor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID,
  contact_id TEXT,
  value NUMERIC DEFAULT 0,
  stage TEXT DEFAULT 'En Progreso',
  description TEXT,
  priority TEXT,
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ,
  quote_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS contractor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS client_id UUID,
  ADD COLUMN IF NOT EXISTS contact_id TEXT,
  ADD COLUMN IF NOT EXISTS quote_code TEXT;

-- Crear índices de optimización para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_projects_contractor ON public.projects(contractor_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_contact ON public.projects(contact_id);

-- 2. Habilitar RLS (Row Level Security) en la tabla projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 3. Eliminar políticas antiguas
DROP POLICY IF EXISTS "projects_select_participants" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_participants" ON public.projects;
DROP POLICY IF EXISTS "projects_update_participants" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_participants" ON public.projects;
DROP POLICY IF EXISTS "projects_all_own" ON public.projects;

-- 4. Definir políticas RLS Doble Vía con auth.uid() = client_id OR auth.uid() = contractor_id
CREATE POLICY "projects_select_participants" ON public.projects
  FOR SELECT TO authenticated
  USING (
    auth.uid() = client_id 
    OR auth.uid() = contractor_id 
    OR auth.uid()::text = contact_id
  );

CREATE POLICY "projects_insert_participants" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = client_id 
    OR auth.uid() = contractor_id 
    OR auth.uid()::text = contact_id
  );

CREATE POLICY "projects_update_participants" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = client_id 
    OR auth.uid() = contractor_id 
    OR auth.uid()::text = contact_id
  );

CREATE POLICY "projects_delete_participants" ON public.projects
  FOR DELETE TO authenticated
  USING (
    auth.uid() = client_id 
    OR auth.uid() = contractor_id
  );

NOTIFY pgrst, 'reload schema';
