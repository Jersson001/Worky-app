-- Paywall "Concierge": prueba gratuita de 30 dias + suscripcion manual (Nequi).
-- Ejecutar una sola vez en el SQL Editor de Supabase.

alter table public.user_profiles
  add column if not exists is_pro boolean not null default false,
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '30 days'),
  add column if not exists subscription_ends_at timestamptz;

comment on column public.user_profiles.is_pro is 'true si el usuario tiene suscripcion Pro activa (marcado manualmente tras pago por Nequi)';
comment on column public.user_profiles.trial_ends_at is 'fecha en la que termina el mes de prueba gratuita';
comment on column public.user_profiles.subscription_ends_at is 'fecha en la que vence la suscripcion Pro pagada (null si no aplica)';
