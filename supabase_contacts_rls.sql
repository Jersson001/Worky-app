-- ============================================================
-- WORKY - RLS Y ESQUEMA PARA CONTACTOS (contacts, user_chats)
-- Ejecutar en SQL Editor. Idempotente.
-- ============================================================
-- Problema que resuelve: los contactos se agregan pero no persisten
-- ni se replican entre usuarios porque faltan las tablas, las
-- políticas RLS, o ambas. Los mensajes no cruzan porque los
-- chatIds no coinciden o los canales realtime están mal suscritos.

-- ============================================================
-- 1. Tabla contacts (if not exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name text,
  avatar text,
  phone text,
  status text,
  role text,
  last_message text,
  last_message_time timestamp with time zone DEFAULT now(),
  unread_count integer DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT no_self_contact CHECK (user_id != contact_user_id),
  CONSTRAINT unique_contact_pair UNIQUE(user_id, contact_user_id)
);

-- Índice para queries rápidas
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);

-- ============================================================
-- 2. Tabla user_chats (if not exists)
-- Metadata del chat: último mensaje visto, contador de no-leídos.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_chats (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message text,
  last_message_time timestamp with time zone DEFAULT now(),
  unread integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY(user_id, contact_id),
  CONSTRAINT no_self_chat CHECK (user_id != contact_id)
);

CREATE INDEX IF NOT EXISTS idx_user_chats_user_id ON public.user_chats(user_id);

-- ============================================================
-- 3. Habilitar RLS
-- ============================================================
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_chats ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS para contacts: solo ver/editar tus propios contactos
-- ============================================================
DROP POLICY IF EXISTS "contacts_select_own" ON public.contacts;
DROP POLICY IF EXISTS "contacts_insert_own" ON public.contacts;
DROP POLICY IF EXISTS "contacts_update_own" ON public.contacts;
DROP POLICY IF EXISTS "contacts_delete_own" ON public.contacts;

CREATE POLICY "contacts_select_own" ON public.contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "contacts_insert_own" ON public.contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contacts_update_own" ON public.contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "contacts_delete_own" ON public.contacts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 5. RLS para user_chats: solo ver/editar tus propios chats
-- ============================================================
DROP POLICY IF EXISTS "user_chats_select_own" ON public.user_chats;
DROP POLICY IF EXISTS "user_chats_insert_own" ON public.user_chats;
DROP POLICY IF EXISTS "user_chats_update_own" ON public.user_chats;
DROP POLICY IF EXISTS "user_chats_delete_own" ON public.user_chats;

CREATE POLICY "user_chats_select_own" ON public.user_chats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_chats_insert_own" ON public.user_chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_chats_update_own" ON public.user_chats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_chats_delete_own" ON public.user_chats
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 6. Habilitar Realtime para que los cambios se repliquen
-- ============================================================
ALTER TABLE public.contacts REPLICA IDENTITY FULL;
ALTER TABLE public.user_chats REPLICA IDENTITY FULL;

-- El DO block es idempotente; si la pub ya existe, saltará.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'contacts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_chats'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_chats;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Realtime no configurado automaticamente (%). Actívalo en Database > Replication.', SQLERRM;
END $$;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Verificación: todo debe estar presente
-- ============================================================
SELECT
  'contacts table' AS control,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='contacts')
       THEN 'OK' ELSE 'FALTA' END AS estado
UNION ALL
SELECT 'user_chats table',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_chats')
       THEN 'OK' ELSE 'FALTA' END
UNION ALL
SELECT 'contacts RLS enabled',
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='contacts' AND rowsecurity)
       THEN 'OK' ELSE 'FALTA' END
UNION ALL
SELECT 'user_chats RLS enabled',
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='user_chats' AND rowsecurity)
       THEN 'OK' ELSE 'FALTA' END
UNION ALL
SELECT 'contacts en realtime',
  CASE WHEN EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='contacts')
       THEN 'OK' ELSE 'FALTA' END
UNION ALL
SELECT 'user_chats en realtime',
  CASE WHEN EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='user_chats')
       THEN 'OK' ELSE 'FALTA' END;
