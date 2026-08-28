/**
 * Prueba supabase_storage_por_dueno.sql en un Postgres de verdad.
 *
 * Lo que verifica es quién puede escribir sobre el archivo de quién, así que
 * las rutas no son inventadas: se construyen igual que en services/
 * storageService.ts, catalogShareService.ts y whatsappService.ts.
 *
 *     npm install @electric-sql/pglite --no-save
 *     node supabase_storage_por_dueno.test.mjs
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const db = new PGlite();
let fallos = 0;
const ok = (nombre, condicion, detalle = '') => {
  console.log(`${condicion ? '  OK  ' : ' FALLA'}  ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  if (!condicion) fallos++;
};

const ANA  = '11111111-1111-1111-1111-111111111111';
const BETO = '22222222-2222-2222-2222-222222222222';

// ── Andamiaje: lo que Supabase ya trae ────────────────────────────────────
await db.exec(`
  CREATE SCHEMA auth;
  CREATE SCHEMA storage;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('worky.uid', true), '')::uuid;
  $$;
  -- Misma semántica que la de Supabase: los tramos de carpeta, sin el archivo.
  CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
    SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1];
  $$;
  CREATE TABLE storage.objects (id bigserial primary key, bucket_id text, name text);
  CREATE ROLE authenticated;
`);

const sql = readFileSync('supabase_storage_por_dueno.sql', 'utf8')
  .replace(/^SELECT policyname[\s\S]*$/m, '');   // la comprobación final no aplica aquí
await db.exec(sql);
ok('el script se ejecuta', true);
await db.exec(sql);
ok('se puede volver a ejecutar (idempotente)', true);

// Se extraen las expresiones de las políticas y se evalúan tal cual.
const expr = async (cmd) => {
  const { rows } = await db.query(
    `SELECT coalesce(with_check, qual) AS e FROM pg_policies
     WHERE schemaname='storage' AND tablename='objects' AND cmd=$1`, [cmd]);
  return rows[0]?.e ?? null;
};
const INSERT = await expr('INSERT');
const DELETE = await expr('DELETE');

ok('ya no existe politica de UPDATE', (await expr('UPDATE')) === null,
   'sobrescribir el archivo de otro era el agujero grave');

const permite = async (sqlExpr, uid, bucket, name) => {
  await db.exec(`SET worky.uid = '${uid}'`);
  const { rows } = await db.query(
    `SELECT (${sqlExpr}) AS r FROM (SELECT $1::text AS bucket_id, $2::text AS name) t`,
    [bucket, name]);
  return rows[0].r === true;
};

// ── Rutas reales, tal como las arma la app ────────────────────────────────
const rutaChat     = (uid, contacto) => `${uid}/${contacto}/1699_foto.jpg`;      // storageService:53
const rutaProducto = (uid) => `${uid}/productos/1699_a1b2c3.jpg`;                // storageService:95
const rutaCatalogo = (uid) => `shared_catalogs/${uid}/1699999999.html`;          // catalogShareService
const rutaDoc      = (id)  => `shared_docs/doc_1699999999_a1b2c3.json`;          // whatsappService:137

console.log('\n— subir (INSERT) —');
ok('Ana sube su foto de chat',      await permite(INSERT, ANA, 'chat_media', rutaChat(ANA, BETO)));
ok('Ana sube su foto de producto',  await permite(INSERT, ANA, 'chat_media', rutaProducto(ANA)));
ok('Ana publica su catalogo',       await permite(INSERT, ANA, 'chat_media', rutaCatalogo(ANA)));
ok('Ana comparte un documento',     await permite(INSERT, ANA, 'chat_media', rutaDoc()));

ok('Beto NO escribe en la carpeta de Ana',
   !(await permite(INSERT, BETO, 'chat_media', rutaChat(ANA, BETO))),
   'era lo que dejaba pisar fotos ajenas');
ok('Beto NO publica en el catalogo de Ana',
   !(await permite(INSERT, BETO, 'chat_media', rutaCatalogo(ANA))),
   'esto es suplantar a Ana ante sus clientes');
ok('nadie escribe en la raiz del bucket',
   !(await permite(INSERT, ANA, 'chat_media', 'suelto.html')));
ok('otro bucket no se cuela',
   !(await permite(INSERT, ANA, 'files', rutaProducto(ANA))));

// El caso retorcido: una carpeta que se llama como el id de otro.
ok('Beto NO se disfraza con una subcarpeta',
   !(await permite(INSERT, BETO, 'chat_media', `${BETO}/../${ANA}/x.jpg`.replace('/../', '/')) &&
     await permite(INSERT, BETO, 'chat_media', `${ANA}/x.jpg`)));

console.log('\n— borrar (DELETE) —');
ok('Ana borra su foto',            await permite(DELETE, ANA, 'chat_media', rutaProducto(ANA)));
ok('Ana borra su catalogo viejo',  await permite(DELETE, ANA, 'chat_media', rutaCatalogo(ANA)));
ok('Beto NO borra la foto de Ana', !(await permite(DELETE, BETO, 'chat_media', rutaProducto(ANA))));
ok('Beto NO borra el catalogo de Ana', !(await permite(DELETE, BETO, 'chat_media', rutaCatalogo(ANA))));
ok('nadie borra documentos compartidos',
   !(await permite(DELETE, ANA, 'chat_media', rutaDoc())),
   'un enlace ya repartido no debe poder romperse');

console.log(fallos === 0 ? '\nTodo en verde.' : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
