-- ============================================================
-- WORKY - MENSAJES A CONTACTOS QUE NO TIENEN CUENTA
-- Ejecutar en el Editor SQL de Supabase. Idempotente.
--
-- Por qué: `messages.recipient_id` es uuid con clave foránea a `auth.users`,
-- así que un contacto creado a mano no puede ser destinatario y la base
-- rechazaba la fila. La app se tragaba el error y pintaba el mensaje igual:
-- las cotizaciones parecían enviadas y desaparecían al refrescar.
--
-- La conversación con ese contacto se identifica por `chat_id`, que admite
-- texto libre, así que basta con dejar el destinatario en nulo y guardar
-- aparte a quién iba dirigido.
-- ============================================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS recipient_contact TEXT;

COMMENT ON COLUMN public.messages.recipient_contact IS
  'Contacto destinatario cuando no es un usuario de Worky. Con esto puesto, recipient_id va nulo.';

-- Las conversaciones se leen siempre por chat_id.
CREATE INDEX IF NOT EXISTS idx_messages_chat_id
  ON public.messages (chat_id);

-- Las políticas actuales ya sirven: quien manda es el dueño de la fila
-- (`auth.uid() = sender_id`), así que puede insertarla y leerla. No hace falta
-- tocarlas, y no se tocan: son las que protegen el chat entre usuarios.

NOTIFY pgrst, 'reload schema';

-- Comprobación: debe aparecer la columna.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'messages'
  AND column_name IN ('recipient_id', 'recipient_contact')
ORDER BY column_name;
