-- ============================================================
-- WORKY - CORRECCIÓN DEL CHAT 1-A-1 (ejecutar en SQL Editor)
-- Idempotente: se puede correr varias veces sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Destinatario explícito en messages
--    Sin esto no hay forma segura de saber quién debe leer cada
--    mensaje, y el RLS queda adivinando.
-- ------------------------------------------------------------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_ts      ON public.messages(chat_id, timestamp);

-- La columna 'sender' guardaba 'me'/'other', que es relativo a quien mira.
-- Se deriva en el cliente desde sender_id. Se elimina para que nadie la use.
ALTER TABLE public.messages DROP COLUMN IF EXISTS sender;

-- ------------------------------------------------------------
-- 2. RLS de messages: participante = remitente O destinatario
--    La policy anterior impedía ver tus propios mensajes.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view messages from their chats"   ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages to their chats"   ON public.messages;
DROP POLICY IF EXISTS "messages_select_participants"               ON public.messages;
DROP POLICY IF EXISTS "messages_insert_as_self"                    ON public.messages;

CREATE POLICY "messages_select_participants" ON public.messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "messages_insert_as_self" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ------------------------------------------------------------
-- 3. user_profiles: faltaba INSERT -> el registro fallaba siempre
--    Se mantiene privado (solo el dueño lee su fila completa).
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
CREATE POLICY "user_profiles_insert_own" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------
-- 4. Búsqueda de contactos sin exponer datos sensibles
--    public_info es la tabla pública; se le agregan los campos
--    mínimos para pintar un contacto (nombre + avatar).
--    Así user_profiles (nit, dirección, teléfono) sigue privado.
-- ------------------------------------------------------------
ALTER TABLE public.public_info
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url   TEXT;

-- ------------------------------------------------------------
-- 5. Contador de no-leídos del DESTINATARIO
--    El remitente no puede escribir en la fila del otro (RLS lo
--    bloquea), por eso va como SECURITY DEFINER. El guard impide
--    que alguien manipule conversaciones ajenas: solo se puede
--    insertar una fila cuyo contact_id sea uno mismo.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bump_unread(p_recipient UUID, p_last TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'no autenticado';
  END IF;
  IF p_recipient = auth.uid() THEN
    RETURN; -- no se notifica a uno mismo
  END IF;

  INSERT INTO public.user_chats (user_id, contact_id, last_message, last_message_time, unread)
  VALUES (p_recipient, auth.uid(), p_last, NOW(), 1)
  ON CONFLICT (user_id, contact_id) DO UPDATE
    SET last_message      = EXCLUDED.last_message,
        last_message_time = EXCLUDED.last_message_time,
        unread            = user_chats.unread + 1;
END $$;

REVOKE ALL ON FUNCTION public.bump_unread(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_unread(UUID, TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 6. Habilitar Realtime en messages
--    Sin esto Postgres no publica los INSERT y el listener
--    se queda mudo aunque el código sea correcto.
-- ------------------------------------------------------------
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- El SQL Editor corre todo en UNA transaccion: si esto falla, revierte
-- el script entero. Por eso se capturan todas las excepciones.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Realtime no configurado automaticamente (%). Actívalo en Database > Replication.', SQLERRM;
END $$;

-- ------------------------------------------------------------
-- 7. Refrescar la caché de esquema de PostgREST
--    Sin esto la API sigue reportando "column does not exist"
--    aunque la columna ya exista en Postgres.
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Verificación: las 3 filas deben decir OK
-- ------------------------------------------------------------
SELECT 'messages.recipient_id' AS control,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='messages'
                           AND column_name='recipient_id')
            THEN 'OK' ELSE 'FALTA' END AS estado
UNION ALL
SELECT 'public_info.display_name',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='public_info'
                           AND column_name='display_name')
            THEN 'OK' ELSE 'FALTA' END
UNION ALL
SELECT 'messages en realtime',
       CASE WHEN EXISTS (SELECT 1 FROM pg_publication_tables
                         WHERE pubname='supabase_realtime' AND tablename='messages')
            THEN 'OK' ELSE 'FALTA' END;
