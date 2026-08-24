-- ============================================================
-- WORKY - POLÍTICA RLS PARA ACTUALIZACIÓN DE MENSAJES (Supabase)
-- Ejecutar en el Editor SQL de Supabase (SQL Editor) para
-- permitir que el receptor marque el pago y el emisor lo confirme.
-- ============================================================

-- Habilitar política de UPDATE para los participantes del chat
DROP POLICY IF EXISTS "messages_update_participants" ON public.messages;

CREATE POLICY "messages_update_participants" ON public.messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Recargar el esquema de PostgREST
NOTIFY pgrst, 'reload schema';
