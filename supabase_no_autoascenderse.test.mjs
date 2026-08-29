/**
 * Prueba supabase_no_autoascenderse.sql en un Postgres de verdad.
 *
 * Lo que verifica es que nadie pueda nombrarse administrador ni regalarse
 * Pro, ni al crear su perfil ni al editarlo, y que un admin de verdad sí
 * pueda —porque es como se conceden—.
 *
 *     npm install @electric-sql/pglite --no-save
 *     node supabase_no_autoascenderse.test.mjs
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const db = new PGlite();
let fallos = 0;
const ok = (nombre, condicion, detalle = '') => {
  console.log(`${condicion ? '  OK  ' : ' FALLA'}  ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  if (!condicion) fallos++;
};

const ANA  = '11111111-1111-1111-1111-111111111111';  // usuario normal
const JEFE = '22222222-2222-2222-2222-222222222222';  // admin de verdad

// Misma forma que la tabla real, con sus valores por defecto.
await db.exec(`
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('worky.uid', true), '')::uuid;
  $$;
  CREATE TABLE public.user_profiles (
    id uuid PRIMARY KEY,
    business_name text,
    is_admin boolean NOT NULL DEFAULT false,
    is_pro boolean NOT NULL DEFAULT false,
    trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
    subscription_ends_at timestamptz
  );
  CREATE FUNCTION public.is_current_user_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE((SELECT is_admin FROM public.user_profiles WHERE id = auth.uid()), false);
  $$;
`);

// El admin se siembra por debajo, como se haría a mano en el panel.
await db.exec(`INSERT INTO public.user_profiles (id, is_admin) VALUES ('${JEFE}', true)`);

const sql = readFileSync('supabase_no_autoascenderse.sql', 'utf8').replace(/^SELECT tgname[\s\S]*$/m, '');
await db.exec(sql);
ok('el script se ejecuta', true);
await db.exec(sql);
ok('se puede volver a ejecutar (idempotente)', true);

const como = (uid) => db.exec(`SET worky.uid = '${uid}'`);
const perfil = async (id) => (await db.query('SELECT * FROM public.user_profiles WHERE id=$1', [id])).rows[0];

console.log('\n— crear el perfil (INSERT) —');
await como(ANA);
await db.query(
  `INSERT INTO public.user_profiles (id, business_name, is_admin, is_pro, subscription_ends_at)
   VALUES ($1, 'Muebles Ana', true, true, now() + interval '10 years')`, [ANA]);
let p = await perfil(ANA);
ok('pidio ser admin y NO lo es',  p.is_admin === false, `is_admin=${p.is_admin}`);
ok('pidio ser pro y NO lo es',    p.is_pro === false,   `is_pro=${p.is_pro}`);
ok('no se regalo suscripcion',    p.subscription_ends_at === null);
ok('conserva lo que si es suyo',  p.business_name === 'Muebles Ana');
ok('su prueba dura 30 dias',      p.trial_ends_at !== null);

console.log('\n— editarlo despues (UPDATE) —');
await db.query(`UPDATE public.user_profiles SET is_admin=true, is_pro=true, business_name='Ana SAS' WHERE id=$1`, [ANA]);
p = await perfil(ANA);
ok('sigue sin ser admin',        p.is_admin === false);
ok('sigue sin ser pro',          p.is_pro === false);
ok('pero si cambia su negocio',  p.business_name === 'Ana SAS');

console.log('\n— el admin de verdad —');
await como(JEFE);
await db.query(`UPDATE public.user_profiles SET is_pro=true WHERE id=$1`, [ANA]);
p = await perfil(ANA);
ok('un admin SI puede conceder Pro', p.is_pro === true, 'es como se conceden');

await db.query(`UPDATE public.user_profiles SET is_admin=true WHERE id=$1`, [ANA]);
ok('un admin SI puede nombrar admin', (await perfil(ANA)).is_admin === true);

console.log('\n— el caso retorcido —');
// Ana ya es admin: al dejar de serlo no debe poder revertirlo ella misma.
await db.query(`UPDATE public.user_profiles SET is_admin=false WHERE id=$1`, [ANA]);
await como(ANA);
await db.query(`UPDATE public.user_profiles SET is_admin=true WHERE id=$1`, [ANA]);
ok('degradada, no se puede reascender', (await perfil(ANA)).is_admin === false);

console.log(fallos === 0 ? '\nTodo en verde.' : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
