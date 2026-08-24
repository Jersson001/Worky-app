-- ============================================================
-- WORKY - SCRIPT SQL: ELIMINACIÓN DE CONTACTOS Y PERMISOS RLS
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Asegurar políticas RLS para permitir DELETE en contacts, user_chats y messages
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Política de eliminación para la tabla 'contacts'
DROP POLICY IF EXISTS "Permitir borrar contactos propios" ON public.contacts;
CREATE POLICY "Permitir borrar contactos propios"
  ON public.contacts FOR DELETE
  USING (auth.uid() = user_id);

-- Política de eliminación para la tabla 'user_chats'
DROP POLICY IF EXISTS "Permitir borrar chats propios" ON public.user_chats;
CREATE POLICY "Permitir borrar chats propios"
  ON public.user_chats FOR DELETE
  USING (auth.uid() = user_id);

-- Política de eliminación para la tabla 'messages'
DROP POLICY IF EXISTS "Permitir borrar mensajes entre usuarios" ON public.messages;
CREATE POLICY "Permitir borrar mensajes entre usuarios"
  ON public.messages FOR DELETE
  USING (
    auth.uid()::text = sender_id OR
    auth.uid()::text = recipient_id
  );

-- 2. Recargar esquema PostgREST en Supabase
NOTIFY pgrst, 'reload schema';
