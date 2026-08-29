/**
 * Prueba supabase_alias.sql en un Postgres de verdad (PGlite, en memoria).
 *
 * Existe porque `reservar_alias` decide quién se queda con un nombre, y eso
 * hay que poder comprobarlo sin tocar la base de producción: la prueba clave
 * es que nadie pueda quedarse con el alias de otro.
 *
 * Cómo correrla:
 *
 *     npm install @electric-sql/pglite --no-save
 *     node supabase_alias.test.mjs
 *
 * No hay Supabase aquí, así que se imita lo mínimo: el esquema `auth`, la
 * función `auth.uid()` y la tabla `public_info` tal como la usa la app.
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const db = new PGlite();
let fallos = 0;

const ok = (nombre, condicion, detalle = '') => {
  console.log(`${condicion ? '  OK  ' : ' FALLA'}  ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  if (!condicion) fallos++;
};

const comoUsuario = async (uid) => db.exec(`SET LOCAL ROLE NONE; SET worky.uid = '${uid}';`);

// ── Andamiaje: lo que en Supabase ya existe ────────────────────────────────
await db.exec(`
  CREATE SCHEMA IF NOT EXISTS auth;
  -- auth.uid() lee de una variable de sesión para poder cambiar de usuario.
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('worky.uid', true), '')::uuid;
  $$;
  -- Copia fiel de la tabla real, restricciones incluidas. La primera versión
  -- de esta prueba dejaba phone_or_email nullable y por eso dio verde a un
  -- reservar_alias que en producción fallaba con "null value in column
  -- phone_or_email violates not-null constraint".
  CREATE TABLE public.public_info (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    phone_or_email text NOT NULL,
    registered_at timestamptz DEFAULT now(),
    display_name text,
    avatar_url text
  );
  CREATE ROLE anon;
  CREATE ROLE authenticated;
`);

// ── Lo que vamos a probar ──────────────────────────────────────────────────
const sql = readFileSync('supabase_alias.sql', 'utf8').replace(/^NOTIFY pgrst.*$/gm, '');
try {
  await db.exec(sql);
  ok('el script entero se ejecuta', true);
} catch (e) {
  ok('el script entero se ejecuta', false, e.message);
  console.log('\nNo se puede seguir.');
  process.exit(1);
}

// Idempotencia: el encabezado promete que se puede correr dos veces.
try {
  await db.exec(sql);
  ok('se puede volver a ejecutar (idempotente)', true);
} catch (e) {
  ok('se puede volver a ejecutar (idempotente)', false, e.message);
}

console.log('\n— worky_slug —');
for (const [entrada, esperado] of [
  ['Jersson Escobar', 'jersson_escobar'],
  ['  María  José  Peña  ', 'maria_jose_pena'],
  ['Muebles & Diseño S.A.S.', 'muebles_diseno_s_a_s'],
  ['ÁÉÍÓÚ ñ Ç', 'aeiou_n_c'],
  ['@@@!!!', ''],
  ['', ''],
]) {
  const { rows } = await db.query('SELECT public.worky_slug($1) AS s', [entrada]);
  ok(`"${entrada}"`, rows[0].s === esperado, `dio "${rows[0].s}", esperaba "${esperado}"`);
}

console.log('\n— sugerir_alias —');
let { rows } = await db.query(`SELECT public.sugerir_alias('Jersson Escobar') AS a`);
const primeras = rows[0].a;
ok('devuelve 3 sugerencias', primeras.length === 3, JSON.stringify(primeras));
ok('la primera es el nombre limpio', primeras[0] === 'jersson_escobar', primeras[0]);

({ rows } = await db.query(`SELECT public.sugerir_alias('!!!') AS a`));
ok('un nombre que se queda en nada no rompe', rows[0].a.length === 3, JSON.stringify(rows[0].a));

({ rows } = await db.query(`SELECT public.sugerir_alias('Ana') AS a`));
ok('nombre de una sola palabra', rows[0].a.length === 3, JSON.stringify(rows[0].a));

({ rows } = await db.query(`SELECT public.sugerir_alias('Jo') AS a`));
ok('nombre de 2 letras: descarta los cortos', rows[0].a.every(a => a.length >= 3), JSON.stringify(rows[0].a));

console.log('\n— reservar_alias —');
const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';

await db.exec(`SET worky.uid = ''`);
try {
  await db.query(`SELECT public.reservar_alias('cualquiera')`);
  ok('sin sesión falla', false, 'dejó reservar');
} catch (e) {
  ok('sin sesión falla', /no autenticado/.test(e.message), e.message);
}

await comoUsuario(A);
({ rows } = await db.query(`SELECT public.reservar_alias('jersson_escobar') AS a`));
ok('A reserva su alias', rows[0].a === 'jersson_escobar', rows[0].a);

await comoUsuario(B);
try {
  await db.query(`SELECT public.reservar_alias('jersson_escobar')`);
  ok('B NO puede robar el alias de A', false, 'se lo llevó');
} catch (e) {
  ok('B NO puede robar el alias de A', /ya está tomado/.test(e.message), e.message);
}

// Y lo que de verdad importa: que A siga siendo el dueño.
({ rows } = await db.query(`SELECT user_id FROM public.public_info WHERE lower(alias)='jersson_escobar'`));
ok('A sigue siendo el dueño', rows[0]?.user_id === A, rows[0]?.user_id);

// Mayúsculas: mismo nombre para quien lo dicta.
await comoUsuario(B);
try {
  await db.query(`SELECT public.reservar_alias('Jersson_Escobar')`);
  ok('tampoco con otras mayúsculas', false, 'se lo llevó');
} catch (e) {
  ok('tampoco con otras mayúsculas', /ya está tomado/.test(e.message), e.message);
}

({ rows } = await db.query(`SELECT public.sugerir_alias('Jersson Escobar') AS a`));
ok('ya no sugiere el que está tomado', !rows[0].a.includes('jersson_escobar'), JSON.stringify(rows[0].a));

await comoUsuario(B);
({ rows } = await db.query(`SELECT public.reservar_alias('otro_alias') AS a`));
ok('B reserva uno libre', rows[0].a === 'otro_alias', rows[0].a);
({ rows } = await db.query(`SELECT public.reservar_alias('b_cambia') AS a`));
ok('B puede cambiar el suyo', rows[0].a === 'b_cambia', rows[0].a);
({ rows } = await db.query(`SELECT count(*)::int AS n FROM public.public_info WHERE user_id=$1`, [B]));
ok('cambiar no le crea una fila nueva', rows[0].n === 1, `${rows[0].n} filas`);

// phone_or_email es NOT NULL y es por donde busca la app. Quien entra solo con
// alias no tiene otra cosa que poner ahí.
({ rows } = await db.query(`SELECT phone_or_email FROM public.public_info WHERE user_id=$1`, [A]));
ok('el alias sirve de clave de búsqueda', rows[0].phone_or_email === 'jersson_escobar', rows[0].phone_or_email);

// A quien ya tenía correo no se le pisa al ponerse alias después.
const C = '33333333-3333-3333-3333-333333333333';
await db.query(
  `INSERT INTO public.public_info (user_id, phone_or_email, display_name) VALUES ($1,'ana@correo.com','Ana Muebles')`, [C]);
await comoUsuario(C);
await db.query(`SELECT public.reservar_alias('ana_muebles')`);
({ rows } = await db.query(`SELECT phone_or_email, display_name, alias FROM public.public_info WHERE user_id=$1`, [C]));
ok('no le pisa el correo de quien ya lo tenía', rows[0].phone_or_email === 'ana@correo.com', rows[0].phone_or_email);
ok('ni el nombre con el que aparece', rows[0].display_name === 'Ana Muebles', rows[0].display_name);
ok('y aun así se queda con el alias', rows[0].alias === 'ana_muebles', rows[0].alias);

for (const corto of ['ab', '']) {
  try {
    await db.query(`SELECT public.reservar_alias($1)`, [corto]);
    ok(`rechaza "${corto}"`, false, 'lo aceptó');
  } catch (e) {
    ok(`rechaza "${corto}"`, /entre 3 y 30/.test(e.message), e.message);
  }
}

console.log(fallos === 0 ? '\nTodo en verde.' : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
