-- Condiciones de negociación de la cotización, guardadas por usuario.
--
-- Van en el perfil y no en cada cotización porque un carpintero manda las
-- mismas siempre: el plazo de entrega, lo que no incluye, lo que tiene que
-- poner la obra y la garantía cambian de negocio a negocio, no de cliente a
-- cliente. Se editan una vez y salen puestas en todas las cotizaciones; en una
-- concreta se pueden retocar sin tocar la plantilla.

alter table public.user_profiles
  add column if not exists condiciones_cotizacion jsonb;

comment on column public.user_profiles.condiciones_cotizacion is
  'Plantilla de condiciones de negociación: {entrega, noIncluye, suministros, garantia, notas}, cada una {activo, titulo, texto}. Nulo mientras el usuario no la haya tocado, y entonces se usan las de fábrica.';

-- El anticipo que pide de costumbre. Aparte del jsonb porque es un número que
-- se lee y se compara, no texto que solo se imprime.
alter table public.user_profiles
  add column if not exists anticipo_porcentaje smallint;

comment on column public.user_profiles.anticipo_porcentaje is
  'Porcentaje que se cobra por adelantado, de 0 a 100. El saldo es el resto. Nulo = el 50% de fábrica.';

alter table public.user_profiles
  drop constraint if exists anticipo_porcentaje_valido;
alter table public.user_profiles
  add constraint anticipo_porcentaje_valido
  check (anticipo_porcentaje is null or (anticipo_porcentaje >= 0 and anticipo_porcentaje <= 100));

-- Las políticas de user_profiles ya cubren estas columnas: cada quien lee y
-- escribe la suya. No hace falta tocarlas.
