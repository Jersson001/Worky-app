-- Agregar columna status a la tabla messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'sent';

-- Crear índice para queries rápidas por estado
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_chat_status ON messages(chat_id, status);
