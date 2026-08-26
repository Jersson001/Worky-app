-- ============================================================
-- WORKY - CORREO EN LOS CONTACTOS
-- Ejecutar en el Editor SQL de Supabase. Idempotente.
--
-- Por qué: al agregar un contacto a mano solo se pedía el teléfono, y el
-- aviso decía que serviría de "ancla de vinculación" cuando el cliente se
-- registrara. No podía funcionar: los usuarios se identifican por correo
-- —`public_info.phone_or_email` guarda el correo, porque el registro es por
-- correo— así que el teléfono nunca iba a emparejar con nadie.
-- ============================================================

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Se guarda en minúsculas desde la app, igual que en public_info, para que
-- las búsquedas comparen lo mismo. El índice es para el emparejamiento.
CREATE INDEX IF NOT EXISTS idx_contacts_email
  ON public.contacts (email);

NOTIFY pgrst, 'reload schema';

-- Comprobación: debe aparecer la columna.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'email';
