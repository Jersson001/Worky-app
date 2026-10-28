/**
 * Prueba supabase_visitas_catalogo.sql en un Postgres de verdad.
 *
 *     npm install @electric-sql/pglite --no-save
 *     node supabase_visitas_catalogo.test.mjs
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const db = new PGlite();
let fallos = 0;
const ok = (nombre, condicion, detalle = '') => {
  console.log(`${condicion ? '  OK  ' : ' FALLA'}  ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  if (!condicion) fallos++;
};

const TIENDA = '11111111-1111-1111-1111-111111111111';
const OTRA = '22222222-2222-2222-2222-222222222222';
const ADMIN = '33333333-3333-3333-3333-333333333333';

await db.exec(`
  CREATE SCHEMA auth;
  -- auth.uid() imitado: el usuario se pone en una variable de sesión.
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('worky.uid', true), '')::uuid;
  $$;
  CREATE ROLE anon;
  CREATE ROLE authenticated;
  CREATE TABLE public.user_profiles (id uuid primary key, is_admin boolean not null default false);
  INSERT INTO public.user_profiles VALUES ('${TIENDA}', false), ('${OTRA}', false), ('${ADMIN}', true);
  CREATE FUNCTION public.is_current_user_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT coalesce((SELECT is_admin FROM public.user_profiles WHERE id = auth.uid()), false);
  $$;
`);

const sql = readFileSync('supabase_visitas_catalogo.sql', 'utf8').replace(/^SELECT c\.relname[\s\S]*$/m, '');
await db.exec(sql);
ok('el script se ejecuta', true);
await db.exec(sql);
ok('se puede volver a ejecutar (idempotente)', true);

const como = async (uid) => db.exec(`SELECT set_config('worky.uid', '${uid ?? ''}', false)`);
const reg = async (v, via, quien) =>
  (await db.query('SELECT public.registrar_visita($1, $2, $3) AS r', [v, via, quien])).rows[0].r;

await como(null);
ok('registra una visita por QR', (await reg(TIENDA, 'qr', 'visitante-aaaa')) === true);
ok('la misma persona, mismo origen, en seguida: no cuenta otra vez', (await reg(TIENDA, 'qr', 'visitante-aaaa')) === false);
ok('la misma persona por NFC sí cuenta (otro origen)', (await reg(TIENDA, 'nfc', 'visitante-aaaa')) === true);
ok('otra persona por QR cuenta', (await reg(TIENDA, 'qr', 'visitante-bbbb')) === true);
ok('pasados 30 minutos vuelve a contar', await (async () => {
  await db.exec(`UPDATE public.visitas_catalogo SET creada = now() - interval '31 minutes'
                 WHERE visitante = 'visitante-bbbb'`);
  return (await reg(TIENDA, 'qr', 'visitante-bbbb')) === true;
})());
ok('rechaza un origen inventado', (await reg(TIENDA, 'hackeo', 'visitante-cccc')) === false);
ok('rechaza un visitante demasiado corto', (await reg(TIENDA, 'qr', 'x')) === false);
ok('rechaza un vendedor que no existe',
  (await reg('99999999-9999-9999-9999-999999999999', 'qr', 'visitante-dddd')) === false);

// La tabla no se toca por la API.
let insertoDirecto = true;
try {
  await db.exec(`SET ROLE anon; INSERT INTO public.visitas_catalogo (vendedor_id, via, visitante)
                 VALUES ('${TIENDA}', 'qr', 'visitante-eeee')`);
} catch { insertoDirecto = false; }
await db.exec('RESET ROLE');
ok('anon no inserta directo en la tabla', !insertoDirecto);

let leyoDirecto = true;
try {
  await db.exec(`SET ROLE authenticated; SELECT * FROM public.visitas_catalogo`);
} catch { leyoDirecto = false; }
await db.exec('RESET ROLE');
ok('un usuario no lee la tabla directo', !leyoDirecto);

// Resumen.
await como(TIENDA);
const { rows: r1 } = await db.query('SELECT * FROM public.resumen_visitas()');
const qr = r1.find(f => f.via === 'qr');
const nfc = r1.find(f => f.via === 'nfc');
ok('la tienda ve sus QR: 3 visitas de 2 personas', Number(qr?.visitas) === 3 && Number(qr?.visitantes) === 2,
  JSON.stringify(qr));
ok('la tienda ve sus NFC: 1', Number(nfc?.visitas) === 1);

let vioAjena = true;
try { await db.query('SELECT * FROM public.resumen_visitas($1)', [OTRA]); } catch { vioAjena = false; }
ok('una tienda no ve las visitas de otra', !vioAjena);

await como(ADMIN);
const { rows: r2 } = await db.query('SELECT * FROM public.resumen_visitas($1)', [TIENDA]);
ok('el admin sí ve las de cualquiera', r2.length === 2);

await como(null);
let vioSinSesion = true;
try { await db.query('SELECT * FROM public.resumen_visitas($1)', [TIENDA]); } catch { vioSinSesion = false; }
ok('sin sesión no se lee el resumen', !vioSinSesion);

await como(TIENDA);
const { rows: r3 } = await db.query('SELECT * FROM public.resumen_visitas(NULL, 1)');
ok('la ventana de días filtra: solo cuenta lo reciente', r3.reduce((s, f) => s + Number(f.visitas), 0) >= 1);

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
