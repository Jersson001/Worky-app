/**
 * Prueba supabase_avisos.sql en un Postgres de verdad.
 *
 *     npm install @electric-sql/pglite --no-save
 *     node supabase_avisos.test.mjs
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
const ANA = '33333333-3333-3333-3333-333333333333'; // clienta con cuenta
const ANON = '44444444-4444-4444-4444-444444444444'; // clienta anónima
const LUIS = '55555555-5555-5555-5555-555555555555'; // no la sigue nadie

await db.exec(`
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id uuid primary key);
  INSERT INTO auth.users VALUES ('${TIENDA}'), ('${OTRA}'), ('${ANA}'), ('${ANON}'), ('${LUIS}');
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('worky.uid', true), '')::uuid;
  $$;
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
    SELECT CASE WHEN nullif(current_setting('worky.uid', true), '')::uuid = '${ANON}'
                THEN '{"is_anonymous": true}'::jsonb ELSE '{}'::jsonb END;
  $$;
  CREATE ROLE anon;
  CREATE ROLE authenticated;
  CREATE TABLE public.user_profiles (id uuid primary key, business_name text, owner_name text);
  INSERT INTO public.user_profiles VALUES ('${TIENDA}', 'Hábitat Home', 'Ana'), ('${OTRA}', '', 'Luis'),
    ('${ANA}', '', 'Ana Clienta');
  -- pg_net imitado: apunta cada llamada para ver qué se mandó.
  CREATE SCHEMA net;
  CREATE TABLE net.llamadas (url text, body jsonb);
  CREATE FUNCTION net.http_post(url text, headers jsonb, body jsonb) RETURNS bigint LANGUAGE plpgsql AS $$
  BEGIN INSERT INTO net.llamadas VALUES (url, body); RETURN 1; END; $$;
`);

const sql = readFileSync('supabase_avisos.sql', 'utf8').replace(/^SELECT c\.relname[\s\S]*$/m, '');
await db.exec(sql);
ok('el script se ejecuta', true);
await db.exec(sql);
ok('se puede volver a ejecutar (idempotente)', true);

const como = (uid) => db.exec(`SELECT set_config('worky.uid', '${uid ?? ''}', false)`);
const falla = async (f) => { try { await f(); return null; } catch (e) { return e.message; } };
const q = async (texto, params = []) => (await db.query(texto, params)).rows;
const seguir = async (ids) => (await q('SELECT public.seguir_tiendas($1::uuid[]) AS n', [ids]))[0].n;
const publicar = (t = 'descuento', ti = '20% en cocinas', tx = 'Solo esta semana', v = null, img = null) =>
  q('SELECT public.publicar_aviso($1,$2,$3,$4,$5) AS id', [t, ti, tx, v, img]);
const BASE = 'https://vdkjfogtumzoiprsvyub.supabase.co/storage/v1/object/public/chat_media';

// ── Seguir ──
await como(null);
ok('sin sesión no se sigue', (await seguir([TIENDA])) === 0);
await como(ANA);
ok('una clienta sigue una tienda', (await seguir([TIENDA])) === 1);
ok('seguir otra vez no duplica', (await seguir([TIENDA])) === 0);
ok('ignora tiendas que no existen y a sí misma', (await seguir(['99999999-9999-9999-9999-999999999999', ANA])) === 0);
await como(ANON);
ok('una cuenta anónima también puede seguir', (await seguir([TIENDA])) === 1);
await como(TIENDA);
ok('la tienda ve cuántos la siguen', (await q('SELECT public.cuantos_me_siguen() AS n'))[0].n === 2);
await como(OTRA);
ok('otra tienda ve 0', (await q('SELECT public.cuantos_me_siguen() AS n'))[0].n === 0);

// ── Publicar ──
await como(ANON);
ok('una cuenta anónima no publica', /con cuenta/.test((await falla(() => publicar())) ?? ''));
await como(LUIS);
ok('quien no tiene tienda no publica', /No encontramos tu tienda/.test((await falla(() => publicar())) ?? ''));
await como(TIENDA);
ok('rechaza un título muy corto', /Revisa el aviso/.test((await falla(() => publicar('aviso', 'a'))) ?? ''));
ok('rechaza un tipo inventado', /Revisa el aviso/.test((await falla(() => publicar('spam'))) ?? ''));
ok('rechaza una fecha límite que ya pasó', /ya pasó/.test((await falla(() => publicar('descuento', '20% en cocinas', '', '2020-01-01'))) ?? ''));
const hoyMas = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
const [{ id: a1 }] = await publicar('descuento', '20% en cocinas', 'Solo esta semana', hoyMas(5));
ok('la tienda publica un aviso', !!a1);
const llamadas = await q('SELECT * FROM net.llamadas');
ok('al publicar se llama a la función con SOLO el id', llamadas.length === 1 && Object.keys(llamadas[0].body).join() === 'aviso_id' && llamadas[0].body.aviso_id === a1, JSON.stringify(llamadas[0]?.body));
ok('apunta a notificar-aviso', /\/functions\/v1\/notificar-aviso$/.test(llamadas[0].url));
const [{ id: a2 }] = await publicar('lanzamiento', 'Llegó la colección nueva');
ok('un segundo aviso entra', !!a2);
ok('el tercero del día se frena', /2 avisos hoy/.test((await falla(() => publicar('aviso', 'Otro más'))) ?? ''));
await db.exec(`UPDATE public.avisos SET creado = now() - interval '25 hours' WHERE id = '${a1}'`);
ok('pasadas 24 horas se puede publicar de nuevo', !!(await publicar('aviso', 'Horario de fin de semana'))[0].id);
ok('la tabla tiene los 3 avisos que entraron', (await q('SELECT count(*)::int AS n FROM public.avisos'))[0].n === 3);

// ── Imagen ──
await db.exec(`UPDATE public.avisos SET creado = now() - interval '30 hours'`);
const propia = `${BASE}/${TIENDA}/avisos/1731000000_ab12cd.jpg`;
const [{ id: aImg }] = await publicar('lanzamiento', 'Colección nueva con foto', '', null, propia);
ok('un aviso puede llevar una imagen subida por la propia tienda',
  (await q('SELECT imagen_url FROM public.avisos WHERE id = $1', [aImg]))[0].imagen_url === propia);
ok('la imagen de OTRA tienda se rechaza', /no es válida/.test((await falla(() => publicar('aviso', 'Con imagen ajena', '', null, `${BASE}/${OTRA}/avisos/x.jpg`))) ?? ''));
ok('una dirección de otro sitio se rechaza', /no es válida/.test((await falla(() => publicar('aviso', 'Con imagen de afuera', '', null, 'https://malo.example.com/pixel.gif'))) ?? ''));
ok('otro bucket de nuestro Storage también', /no es válida/.test((await falla(() => publicar('aviso', 'Otro bucket', '', null, 'https://vdkjfogtumzoiprsvyub.supabase.co/storage/v1/object/public/files/' + TIENDA + '/x.jpg'))) ?? ''));
const [{ id: aVacia }] = await publicar('aviso', 'Imagen vacia vale', '', null, '   ');
ok('una imagen vacía equivale a sin imagen', (await q('SELECT imagen_url FROM public.avisos WHERE id = $1', [aVacia]))[0].imagen_url === null);
await db.exec(`DELETE FROM public.avisos WHERE id = '${aVacia}'`);
await db.exec(`UPDATE public.avisos SET creado = now() - interval '30 hours' WHERE tienda_id = '${TIENDA}'`);

// ── Ver ──
await como(ANA);
const mios = await q('SELECT * FROM public.mis_avisos()');
ok('la clienta ve los avisos de la tienda que sigue', mios.length === 4 && mios.every(f => f.tienda_id === TIENDA), String(mios.length));
ok('y ve la imagen del que la lleva', mios.find(f => f.id === aImg)?.imagen_url === propia);
ok('con el nombre del negocio', mios[0].negocio === 'Hábitat Home');
ok('los más nuevos primero', mios[0].creado >= mios[mios.length - 1].creado);
await como(LUIS);
ok('quien no sigue a nadie no ve nada', (await q('SELECT * FROM public.mis_avisos()')).length === 0);
await como(OTRA);
ok('quien sigue a otra tienda no ve los de esta', (await q('SELECT * FROM public.mis_avisos()')).length === 0);

await db.exec(`UPDATE public.avisos SET vence_en = '2020-01-01' WHERE id = '${a1}'`);
await como(ANA);
ok('una oferta vencida sale de la bandeja', (await q('SELECT * FROM public.mis_avisos()')).every(f => f.id !== a1));
await db.exec(`UPDATE public.avisos SET creado = now() - interval '61 days' WHERE id = '${a2}'`);
ok('lo de hace más de 60 días también', (await q('SELECT * FROM public.mis_avisos()')).every(f => f.id !== a2));

// ── Dejar de seguir ──
await q('SELECT public.dejar_de_seguir($1)', [TIENDA]);
ok('al dejar de seguir ya no ve nada', (await q('SELECT * FROM public.mis_avisos()')).length === 0);
await como(ANON);
ok('dejar de seguir no afecta a los demás seguidores', (await q('SELECT * FROM public.mis_avisos()')).length >= 1);

// ── La tienda ve y borra lo suyo ──
await como(TIENDA);
ok('la tienda ve sus avisos publicados, con su imagen', (await q('SELECT * FROM public.mis_avisos_publicados()')).length === 4 && (await q('SELECT * FROM public.mis_avisos_publicados()')).some(f => f.imagen_url === propia));
await como(OTRA);
ok('otra tienda no ve los ajenos', (await q('SELECT * FROM public.mis_avisos_publicados()')).length === 0);
await q('SELECT public.borrar_aviso($1)', [a1]);
ok('y no los borra', (await q('SELECT count(*)::int AS n FROM public.avisos WHERE id = $1', [a1]))[0].n === 1);
await como(TIENDA);
await q('SELECT public.borrar_aviso($1)', [a1]);
ok('la tienda sí borra el suyo', (await q('SELECT count(*)::int AS n FROM public.avisos WHERE id = $1', [a1]))[0].n === 0);

// ── Las tablas no se tocan por la API ──
let directo = true;
try { await db.exec(`SET ROLE authenticated; SELECT * FROM public.seguidores`); } catch { directo = false; }
await db.exec('RESET ROLE');
ok('seguidores no se lee por la API', !directo);
directo = true;
try { await db.exec(`SET ROLE authenticated; INSERT INTO public.avisos (tienda_id, tipo, titulo) VALUES ('${TIENDA}', 'aviso', 'Falso')`); } catch { directo = false; }
await db.exec('RESET ROLE');
ok('avisos no se escribe por la API', !directo);

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
