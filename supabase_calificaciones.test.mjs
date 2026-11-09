/**
 * Prueba supabase_calificaciones.sql en un Postgres de verdad.
 *
 *     npm install @electric-sql/pglite --no-save
 *     node supabase_calificaciones.test.mjs
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
const ANA = '33333333-3333-3333-3333-333333333333';   // le escribió a la tienda
const LUIS = '44444444-4444-4444-4444-444444444444';  // le escribió; alias, sin nombre
const PACHO = '55555555-5555-5555-5555-555555555555'; // NO le ha escrito
const ADMIN = '66666666-6666-6666-6666-666666666666';

await db.exec(`
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id uuid primary key);
  INSERT INTO auth.users VALUES ('${TIENDA}'), ('${OTRA}'), ('${ANA}'), ('${LUIS}'), ('${PACHO}'), ('${ADMIN}');
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('worky.uid', true), '')::uuid;
  $$;
  CREATE ROLE anon;
  CREATE ROLE authenticated;
  CREATE TABLE public.user_profiles (id uuid primary key, is_admin boolean not null default false);
  INSERT INTO public.user_profiles (id, is_admin) VALUES ('${TIENDA}', false), ('${OTRA}', false), ('${ADMIN}', true);
  CREATE FUNCTION public.is_current_user_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT coalesce((SELECT is_admin FROM public.user_profiles WHERE id = auth.uid()), false);
  $$;
  CREATE TABLE public.messages (id serial primary key, sender_id uuid, recipient_id uuid);
  INSERT INTO public.messages (sender_id, recipient_id) VALUES ('${ANA}', '${TIENDA}'), ('${LUIS}', '${TIENDA}'),
    ('${TIENDA}', '${PACHO}'), ('${ANA}', '${OTRA}');
  CREATE TABLE public.public_info (user_id uuid, display_name text, alias text);
  INSERT INTO public.public_info VALUES ('${ANA}', 'Ana  María Pérez', null), ('${LUIS}', 'ethan', 'ethan'),
    ('${PACHO}', 'Pacho', null);
`);

const sql = readFileSync('supabase_calificaciones.sql', 'utf8').replace(/^SELECT c\.relname[\s\S]*$/m, '');
await db.exec(sql);
ok('el script se ejecuta', true);
await db.exec(sql);
ok('se puede volver a ejecutar (idempotente)', true);

const como = (uid) => db.exec(`SELECT set_config('worky.uid', '${uid ?? ''}', false)`);
const falla = async (f) => { try { await f(); return null; } catch (e) { return e.message; } };
const q = async (texto, params = []) => (await db.query(texto, params)).rows;
const calificar = (t, e, c = '') => q('SELECT public.calificar_tienda($1,$2,$3)', [t, e, c]);

// ── Quién puede calificar ──
await como(null);
ok('sin sesión no puede', (await q('SELECT public.puede_calificar($1) AS p', [TIENDA]))[0].p === false);
await como(ANA);
ok('quien le escribió a la tienda puede', (await q('SELECT public.puede_calificar($1) AS p', [TIENDA]))[0].p === true);
await como(PACHO);
ok('quien NO le ha escrito, no (aunque ella le escribió a él)', (await q('SELECT public.puede_calificar($1) AS p', [TIENDA]))[0].p === false);
ok('y el intento se rechaza con un motivo claro', /primero escríbele/.test((await falla(() => calificar(TIENDA, 5, 'Excelente'))) ?? ''));
await como(TIENDA);
ok('nadie se califica a sí mismo', /propia tienda/.test((await falla(() => calificar(TIENDA, 5))) ?? ''));
await como(ANA);
ok('Ana le escribió a OTRA pero no a esta: no puede calificar a una tienda ajena a su chat',
  (await q('SELECT public.puede_calificar($1) AS p', [LUIS]))[0].p === false);

// ── Calificar ──
ok('rechaza 0 estrellas', /de 1 a 5/.test((await falla(() => calificar(TIENDA, 0))) ?? ''));
ok('rechaza 6 estrellas', /de 1 a 5/.test((await falla(() => calificar(TIENDA, 6))) ?? ''));
await calificar(TIENDA, 5, '  Me entregaron a tiempo y quedó perfecto  ');
await como(LUIS);
await calificar(TIENDA, 3);
ok('dos personas calificaron', (await q('SELECT count(*)::int AS n FROM public.calificaciones'))[0].n === 2);
await como(ANA);
await calificar(TIENDA, 4, 'Cambié de opinión: muy buena atención');
ok('calificar de nuevo cambia la anterior, no duplica', (await q('SELECT count(*)::int AS n FROM public.calificaciones WHERE usuario_id = $1', [ANA]))[0].n === 1);
const mia = (await q('SELECT * FROM public.mi_calificacion($1)', [TIENDA]))[0];
ok('mi_calificacion devuelve la última', mia.estrellas === 4 && mia.comentario.startsWith('Cambié de opinión'));
await como(LUIS);
ok('Luis ve la suya y no la de Ana', (await q('SELECT * FROM public.mi_calificacion($1)', [TIENDA]))[0].estrellas === 3);

// ── Lectura pública ──
await como(null);
const r = (await q('SELECT * FROM public.resumen_calificaciones($1)', [TIENDA]))[0];
ok('el resumen se lee sin sesión: 2 opiniones, promedio 3.5', r.total === 2 && Number(r.promedio) === 3.5, JSON.stringify(r));
ok('con el reparto por estrellas', r.e3 === 1 && r.e4 === 1 && r.e5 === 0);
const vacia = (await q('SELECT * FROM public.resumen_calificaciones($1)', [OTRA]))[0];
ok('una tienda sin opiniones da 0 y promedio 0', vacia.total === 0 && Number(vacia.promedio) === 0);
const lista = await q('SELECT * FROM public.calificaciones_de($1)', [TIENDA]);
ok('solo salen los comentarios (Luis no escribió nada)', lista.length === 1 && lista[0].estrellas === 4);
ok('el nombre sale recortado: «Ana M.», sin el apellido', lista[0].nombre === 'Ana M.', lista[0].nombre);
await como(LUIS);
await calificar(TIENDA, 3, 'Regular');
await como(null);
ok('quien no tiene nombre completo sale con su alias', (await q('SELECT nombre FROM public.calificaciones_de($1)', [TIENDA])).some(f => f.nombre === 'ethan'));

// ── Responder ──
const idAna = (await q('SELECT id FROM public.calificaciones WHERE usuario_id = $1', [ANA]))[0].id;
await como(OTRA);
ok('otra tienda no responde opiniones ajenas', /No encontramos esa opinión/.test((await falla(() => q('SELECT public.responder_calificacion($1,$2)', [idAna, 'hola']))) ?? ''));
await como(ANA);
ok('un cliente no responde', /No encontramos esa opinión/.test((await falla(() => q('SELECT public.responder_calificacion($1,$2)', [idAna, 'hola']))) ?? ''));
await como(TIENDA);
await q('SELECT public.responder_calificacion($1,$2)', [idAna, '  ¡Gracias, Ana!  ']);
await como(null);
const conRespuesta = (await q('SELECT respuesta FROM public.calificaciones_de($1)', [TIENDA])).find(f => f.respuesta);
ok('la respuesta se ve en público, sin espacios de más', conRespuesta?.respuesta === '¡Gracias, Ana!');
await como(TIENDA);
await q('SELECT public.responder_calificacion($1,$2)', [idAna, '']);
ok('una respuesta vacía la quita', (await q('SELECT respuesta FROM public.calificaciones WHERE id = $1', [idAna]))[0].respuesta === null);
ok('la tienda no puede cambiar las estrellas de una opinión', await (async () => {
  await db.exec(`UPDATE public.calificaciones SET respuesta = respuesta WHERE id = '${idAna}'`);
  return (await q('SELECT estrellas FROM public.calificaciones WHERE id = $1', [idAna]))[0].estrellas === 4;
})());

// ── Moderar ──
await como(OTRA);
ok('una tienda no oculta opiniones', /administrador/.test((await falla(() => q('SELECT public.admin_ocultar_calificacion($1,true)', [idAna]))) ?? ''));
await como(ADMIN);
await q('SELECT public.admin_ocultar_calificacion($1,true)', [idAna]);
await como(null);
const r2 = (await q('SELECT * FROM public.resumen_calificaciones($1)', [TIENDA]))[0];
ok('una opinión oculta sale del promedio y de la lista', r2.total === 1 && (await q('SELECT * FROM public.calificaciones_de($1)', [TIENDA])).every(f => f.id !== idAna));

// ── Quitar la propia ──
await como(LUIS);
await q('SELECT public.borrar_mi_calificacion($1)', [TIENDA]);
ok('quien calificó puede quitar la suya', (await q('SELECT count(*)::int AS n FROM public.calificaciones WHERE usuario_id = $1', [LUIS]))[0].n === 0);
await como(OTRA);
await q('SELECT public.borrar_mi_calificacion($1)', [TIENDA]);
ok('y borrar con otra cuenta no toca la de nadie más', (await q('SELECT count(*)::int AS n FROM public.calificaciones'))[0].n === 1);

// ── Cerrado por la API ──
let directo = true;
try { await db.exec(`SET ROLE authenticated; SELECT * FROM public.calificaciones`); } catch { directo = false; }
await db.exec('RESET ROLE');
ok('la tabla no se lee por la API', !directo);
directo = true;
try { await db.exec(`SET ROLE anon; INSERT INTO public.calificaciones (tienda_id, usuario_id, estrellas) VALUES ('${TIENDA}', '${ANA}', 5)`); } catch { directo = false; }
await db.exec('RESET ROLE');
ok('ni se escribe', !directo);

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
