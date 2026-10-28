/**
 * Prueba supabase_referidos.sql en un Postgres de verdad.
 *
 *     npm install @electric-sql/pglite --no-save
 *     node supabase_referidos.test.mjs
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const db = new PGlite();
let fallos = 0;
const ok = (nombre, condicion, detalle = '') => {
  console.log(`${condicion ? '  OK  ' : ' FALLA'}  ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  if (!condicion) fallos++;
};

const NUEVA = '11111111-1111-1111-1111-111111111111';
const VIEJA = '22222222-2222-2222-2222-222222222222';
const ANON = '33333333-3333-3333-3333-333333333333';
const ADMIN = '44444444-4444-4444-4444-444444444444';

await db.exec(`
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id uuid primary key, created_at timestamptz not null default now());
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('worky.uid', true), '')::uuid;
  $$;
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
    SELECT CASE WHEN nullif(current_setting('worky.uid', true), '')::uuid = '${ANON}'
                THEN '{"is_anonymous": true}'::jsonb ELSE '{}'::jsonb END;
  $$;
  CREATE ROLE anon;
  CREATE ROLE authenticated;
  INSERT INTO auth.users VALUES ('${NUEVA}', now()), ('${VIEJA}', now() - interval '10 days'),
                                ('${ANON}', now()), ('${ADMIN}', now());
  CREATE TABLE public.user_profiles (id uuid primary key, is_admin boolean not null default false, subscription_ends_at timestamptz);
  INSERT INTO public.user_profiles (id, is_admin)
    VALUES ('${NUEVA}', false), ('${VIEJA}', false), ('${ANON}', false), ('${ADMIN}', true);
  CREATE FUNCTION public.is_current_user_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT coalesce((SELECT is_admin FROM public.user_profiles WHERE id = auth.uid()), false);
  $$;
`);

const sql = readFileSync('supabase_referidos.sql', 'utf8').replace(/^SELECT c\.relname[\s\S]*$/m, '');
await db.exec(sql);
ok('el script se ejecuta', true);
await db.exec(sql);
ok('se puede volver a ejecutar (idempotente)', true);

const como = (uid) => db.exec(`SELECT set_config('worky.uid', '${uid ?? ''}', false)`);
const reclamar = async (c) => (await db.query('SELECT public.reclamar_referido($1) AS r', [c])).rows[0].r;
const crear = async (c, n) => (await db.query('SELECT public.crear_codigo_referido($1, $2) AS r', [c, n])).rows[0].r;
const falla = async (f) => { try { await f(); return false; } catch { return true; } };

await como(NUEVA);
ok('un usuario común no crea códigos', await falla(() => crear('LEO', 'Leo')));
await como(ADMIN);
ok('el admin crea un código', (await crear('leo', 'Leo contra el tiempo')) === true);
ok('el código queda en mayúsculas',
  (await db.query(`SELECT 1 FROM public.codigos_referido WHERE codigo = 'LEO'`)).rows.length === 1);
ok('crear el mismo otra vez no duplica', (await crear('LEO', 'Otro')) === false);
ok('rechaza un código con espacios', await falla(() => crear('MI CODIGO', 'x')));
ok('rechaza un código muy corto', await falla(() => crear('AB', 'x')));

await como(NUEVA);
ok('una cuenta nueva reclama el código (en minúsculas también)', (await reclamar('leo')) === true);
ok('no se puede reclamar dos veces', (await reclamar('LEO')) === false);
await db.exec(`INSERT INTO public.codigos_referido VALUES ('MILENA', 'Milena')`);
ok('ni cambiar a otro código después', (await reclamar('MILENA')) === false);
ok('queda atribuida a LEO',
  (await db.query(`SELECT codigo FROM public.referidos WHERE usuario_id = '${NUEVA}'`)).rows[0]?.codigo === 'LEO');

await como(VIEJA);
ok('una cuenta de hace 10 días no puede atribuirse', (await reclamar('LEO')) === false);
await como(ANON);
ok('una cuenta anónima no cuenta', (await reclamar('LEO')) === false);
await como(null);
ok('sin sesión no reclama', (await reclamar('LEO')) === false);
await como(ADMIN);
ok('un código que no existe no atribuye', (await reclamar('NOEXISTE')) === false);

// Reporte.
await db.exec(`UPDATE public.user_profiles SET subscription_ends_at = now() + interval '20 days' WHERE id = '${NUEVA}'`);
await como(NUEVA);
ok('un usuario común no ve el reporte', await falla(() => db.query('SELECT * FROM public.reporte_referidos()')));
await como(ADMIN);
const rep = (await db.query('SELECT * FROM public.reporte_referidos()')).rows;
const leo = rep.find(f => f.codigo === 'LEO');
ok('LEO trajo 1, con membresía 1, nuevos 1',
  Number(leo?.registrados) === 1 && Number(leo?.con_membresia) === 1 && Number(leo?.nuevos_30d) === 1, JSON.stringify(leo));
const milena = rep.find(f => f.codigo === 'MILENA');
ok('un código sin referidos sale en ceros', Number(milena?.registrados) === 0 && Number(milena?.con_membresia) === 0);
await db.exec(`UPDATE public.user_profiles SET subscription_ends_at = now() - interval '1 day' WHERE id = '${NUEVA}'`);
const rep2 = (await db.query('SELECT * FROM public.reporte_referidos()')).rows.find(f => f.codigo === 'LEO');
ok('una membresía vencida ya no cuenta', Number(rep2?.registrados) === 1 && Number(rep2?.con_membresia) === 0);

let directo = true;
try { await db.exec(`SET ROLE authenticated; SELECT * FROM public.referidos`); } catch { directo = false; }
await db.exec('RESET ROLE');
ok('las tablas no se leen por la API', !directo);

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
