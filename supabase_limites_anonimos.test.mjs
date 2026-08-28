/**
 * Prueba supabase_limites_anonimos.sql en un Postgres de verdad.
 *
 * Lo importante es que el límite no se pase de frenada: un cliente anónimo
 * tiene que poder seguir mandando fotos por el chat, que es a lo que viene.
 *
 *     npm install @electric-sql/pglite --no-save
 *     node supabase_limites_anonimos.test.mjs
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const db = new PGlite();
let fallos = 0;
const ok = (nombre, condicion, detalle = '') => {
  console.log(`${condicion ? '  OK  ' : ' FALLA'}  ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  if (!condicion) fallos++;
};

const UID = '11111111-1111-1111-1111-111111111111';

await db.exec(`
  CREATE SCHEMA auth;
  CREATE SCHEMA storage;
  -- auth.jwt() imitado: el token se pone en una variable de sesión.
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
    SELECT coalesce(nullif(current_setting('worky.jwt', true), ''), '{}')::jsonb;
  $$;
  CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
    SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1];
  $$;
  CREATE TABLE storage.objects (id bigserial primary key, bucket_id text, name text);
  CREATE TABLE public.products (id text primary key, user_id uuid);
  CREATE ROLE authenticated;
`);

const sql = readFileSync('supabase_limites_anonimos.sql', 'utf8').replace(/^SELECT tablename[\s\S]*$/m, '');
await db.exec(sql);
ok('el script se ejecuta', true);
await db.exec(sql);
ok('se puede volver a ejecutar (idempotente)', true);

const { rows: pol } = await db.query(
  `SELECT tablename, permissive FROM pg_policies WHERE policyname LIKE 'Solo cuentas permanentes%' ORDER BY tablename`);
ok('las dos son RESTRICTIVE', pol.length === 2 && pol.every(p => p.permissive === 'RESTRICTIVE'),
   JSON.stringify(pol));

const expr = async (tabla) => {
  const { rows } = await db.query(
    `SELECT with_check AS e FROM pg_policies WHERE tablename=$1 AND policyname LIKE 'Solo cuentas permanentes%'`, [tabla]);
  return rows[0].e;
};
const STORAGE = await expr('objects');
const PRODUCTS = await expr('products');

// Tres clases de token: anónimo, permanente, y uno sin la marca.
const TOKENS = {
  anonimo:     `{"sub":"${UID}","is_anonymous":true}`,
  permanente:  `{"sub":"${UID}","is_anonymous":false}`,
  sinLaMarca:  `{"sub":"${UID}"}`,
};

const permite = async (sqlExpr, token, name = null) => {
  await db.exec(`SET worky.jwt = '${TOKENS[token]}'`);
  const { rows } = await db.query(
    `SELECT (${sqlExpr}) AS r FROM (SELECT $1::text AS name) t`, [name]);
  return rows[0].r === true;
};

const rutaCatalogo = `shared_catalogs/${UID}/1699999999.html`;
const rutaChat     = `${UID}/algun_contacto/foto.jpg`;

console.log('\n— catalogo —');
ok('el vendedor publica su catalogo',   await permite(STORAGE, 'permanente', rutaCatalogo));
ok('el anonimo NO publica catalogo',  !(await permite(STORAGE, 'anonimo',    rutaCatalogo)),
   'seria alojar HTML ajeno en tu dominio');
ok('sin la marca se trata como permanente', await permite(STORAGE, 'sinLaMarca', rutaCatalogo),
   'no dejar tirado a un usuario normal si cambia el token');

console.log('\n— fotos del chat (no se deben bloquear) —');
ok('el anonimo SI manda fotos por el chat', await permite(STORAGE, 'anonimo', rutaChat),
   'es a lo que viene el cliente del QR');
ok('el vendedor tambien', await permite(STORAGE, 'permanente', rutaChat));

console.log('\n— productos —');
ok('el vendedor crea productos',   await permite(PRODUCTS, 'permanente'));
ok('el anonimo NO crea productos', !(await permite(PRODUCTS, 'anonimo')));

console.log(fallos === 0 ? '\nTodo en verde.' : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
