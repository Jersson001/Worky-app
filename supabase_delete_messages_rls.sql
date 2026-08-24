-- ============================================================
-- WORKY - POLÍTICA RLS PARA BORRADO DE MENSAJES (Supabase)
-- Ejecutar en el Editor SQL de Supabase.
-- ============================================================

-- Eliminar políticas anteriores de DELETE si existen
DROP POLICY IF EXISTS "messages_delete_own" ON public.messages;
DROP POLICY IF EXISTS "messages_delete_participants" ON public.messages;

-- Habilitar política de DELETE para que los usuarios puedan borrar
-- tanto los mensajes que enviaron (sender_id) como los que recibieron (recipient_id)
CREATE POLICY "messages_delete_participants" ON public.messages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Recargar esquema de PostgREST
NOTIFY pgrst, 'reload schema';
