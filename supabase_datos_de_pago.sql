-- Datos de pago: QR de cobro y cuentas de terceros.
-- Aplicado en producción el 01/09/2026. Se deja aquí como constancia de lo
-- que hay en la base, igual que el resto de supabase_*.sql del repo.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. QR de cobro en las cuentas propias
-- ─────────────────────────────────────────────────────────────────────────────
-- Guarda la dirección del archivo en Storage, no la imagen. Un QR en base64
-- dentro de la fila se descarga entero cada vez que se abre la libreta de
-- cuentas, que es lo que ya nos pasó con las fotos del catálogo.
alter table public.payment_accounts
  add column if not exists qr_image text;

comment on column public.payment_accounts.qr_image is
  'URL pública del QR de cobro en el bucket chat_media. Nulo si la cuenta no tiene QR.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Cuentas de terceros: a quién le paga el usuario
-- ─────────────────────────────────────────────────────────────────────────────
-- Vivían solo en el localStorage del navegador, así que se perdían al cambiar
-- de teléfono o reinstalar. Misma forma que payment_accounts, que son las
-- cuentas propias donde le consignan a él.
create table if not exists public.third_party_accounts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  alias varchar not null,
  bank_name varchar not null,
  account_type varchar,
  account_number varchar not null,
  holder_name varchar not null,
  document_id varchar,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists third_party_accounts_user_id_idx
  on public.third_party_accounts (user_id);

alter table public.third_party_accounts enable row level security;

-- Cada quien ve y toca solo las suyas. Se limita al rol `authenticated`: sin
-- sesión no hay nada que hacer aquí, y así no se depende de que auth.uid()
-- sea nulo para negar el acceso.
drop policy if exists "Users can view own third party accounts" on public.third_party_accounts;
create policy "Users can view own third party accounts"
  on public.third_party_accounts for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can manage own third party accounts" on public.third_party_accounts;
create policy "Users can manage own third party accounts"
  on public.third_party_accounts for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Las cuentas anónimas son clientes que llegaron por un catálogo: no tienen
-- por qué crear la libreta de pagos de nadie. Mismo criterio que products.
drop policy if exists "Solo cuentas permanentes crean cuentas de terceros" on public.third_party_accounts;
create policy "Solo cuentas permanentes crean cuentas de terceros"
  on public.third_party_accounts for insert
  to authenticated
  with check (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
