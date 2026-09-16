/**
 * Prueba supabase_finanzas_del_vendedor.sql en un Postgres de verdad.
 *
 * Lo que verifica es que el vendedor vea los proyectos que le aprobaron y lleve
 * sus gastos, y que nadie pueda colarle ventas falsas: ni creando un proyecto a
 * su nombre ni reescribiendo un mensaje para que parezca su cotización.
 *
 * Las políticas de partida son las de producción al 16/09/2026, copiadas tal
 * cual, y se lee con un rol sin privilegios para que RLS se aplique de verdad.
 *
 *     npm install @electric-sql/pglite --no-save
 *     node supabase_finanzas_del_vendedor.test.mjs
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const db = new PGlite();
let fallos = 0;
const ok = (nombre, condicion, detalle = '') => {
  console.log(`${condicion ? '  OK  ' : ' FALLA'}  ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  if (!condicion) fallos++;
};

const VENDE   = '11111111-1111-1111-1111-111111111111';  // carpintero
const CLIENTA = '22222222-2222-2222-2222-222222222222';  // aprueba la cotización
const INTRUSO = '33333333-3333-3333-3333-333333333333';  // quiere colarle ventas

const P_APROBADO = 'aaaaaaaa-0000-0000-0000-000000000001';
const P_FALSO    = 'aaaaaaaa-0000-0000-0000-000000000002';
const M_COT      = 'bbbbbbbb-0000-0000-0000-000000000001';
const M_HOLA     = 'bbbbbbbb-0000-0000-0000-000000000002';
const M_DEL_INTRUSO = 'bbbbbbbb-0000-0000-0000-000000000003';

// ── Andamiaje: las tablas y las políticas como están en producción ───────
await db.exec(`
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('worky.uid', true), '')::uuid;
  $$;
  CREATE ROLE authenticated;

  CREATE TABLE public.contacts (id uuid primary key, user_id uuid);
  CREATE TABLE public.projects (
    id uuid primary key, contact_id uuid references contacts(id) on delete cascade,
    name text, value numeric, quote_code text, contractor_id uuid, client_id uuid);
  CREATE TABLE public.expenses (
    id uuid primary key default gen_random_uuid(),
    project_id uuid references projects(id) on delete cascade, amount numeric);
  CREATE TABLE public.messages (
    id uuid primary key, chat_id varchar, sender_id uuid, recipient_id uuid,
    recipient_contact text, type varchar, text text, metadata jsonb,
    is_paid boolean, status varchar);

  ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
  ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
  ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

  CREATE POLICY c_own ON contacts FOR ALL USING (user_id = auth.uid());
  CREATE POLICY "Users can manage own projects" ON projects FOR ALL
    USING (EXISTS (SELECT 1 FROM contacts WHERE contacts.id = projects.contact_id AND contacts.user_id = auth.uid()));
  CREATE POLICY "Users can manage own expenses" ON expenses FOR ALL
    USING (EXISTS (SELECT 1 FROM projects JOIN contacts ON projects.contact_id = contacts.id
                   WHERE projects.id = expenses.project_id AND contacts.user_id = auth.uid()));
  CREATE POLICY messages_select_participants ON messages FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
  CREATE POLICY messages_insert_as_self ON messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);
  CREATE POLICY messages_update_participants ON messages FOR UPDATE TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = recipient_id)
    WITH CHECK (auth.uid() = sender_id OR auth.uid() = recipient_id);

  GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT USAGE ON SCHEMA auth TO authenticated;

  -- Cada quien tiene la ficha del otro.
  INSERT INTO contacts VALUES
    ('cccccccc-0000-0000-0000-000000000001', '${CLIENTA}'),   -- la de la clienta
    ('cccccccc-0000-0000-0000-000000000002', '${VENDE}'),     -- la del vendedor
    ('cccccccc-0000-0000-0000-000000000003', '${INTRUSO}');   -- la del intruso

  -- El vendedor le manda la cotización a la clienta, y a la otra un saludo.
  INSERT INTO messages VALUES
    ('${M_COT}',  'c1', '${VENDE}', '${CLIENTA}', null, 'quote', '', '{"number":"COT-1","status":"sent"}', false, 'sent'),
    ('${M_HOLA}', 'c2', '${VENDE}', '${INTRUSO}', null, 'text', 'hola', '{}', false, 'sent'),
    ('${M_DEL_INTRUSO}', 'c2', '${INTRUSO}', '${VENDE}', null, 'text', 'buenas', '{}', false, 'sent');

  -- La clienta aprueba: el proyecto nace colgado de SU ficha.
  INSERT INTO projects VALUES
    ('${P_APROBADO}', 'cccccccc-0000-0000-0000-000000000001', 'Cocina (COT-1)', 5000000, 'COT-1', '${VENDE}', '${CLIENTA}'),
  -- El intruso cuelga de su ficha un proyecto «vendido por» el carpintero.
    ('${P_FALSO}', 'cccccccc-0000-0000-0000-000000000003', 'Venta falsa', 999000000, 'COT-1', '${VENDE}', '${INTRUSO}');
`);

const como = async (uid) => {
  await db.exec(`RESET ROLE`);
  await db.exec(`SET worky.uid = '${uid}'`);
  await db.exec(`SET ROLE authenticated`);
};
const proyectosVisibles = async () =>
  (await db.query(`SELECT id FROM projects ORDER BY name`)).rows.map(r => r.id);
const intenta = async (sql, params = []) => {
  try { await db.query(sql, params); return null; } catch (e) { return e.message; }
};

console.log('\n— antes de la migración —');
await como(VENDE);
ok('el vendedor NO ve el proyecto aprobado (el fallo)', !(await proyectosVisibles()).includes(P_APROBADO));
ok('ni le puede apuntar un gasto',
   (await intenta(`INSERT INTO expenses (project_id, amount) VALUES ($1, 100)`, [P_APROBADO])) !== null);

await db.exec(`RESET ROLE`);
const sql = readFileSync('supabase_finanzas_del_vendedor.sql', 'utf8')
  .replace(/^-- ── Comprobación[\s\S]*$/m, '');
await db.exec(sql);
ok('el script se ejecuta', true);
await db.exec(sql);
ok('se puede volver a ejecutar (idempotente)', true);

console.log('\n— el vendedor —');
await como(VENDE);
let vistos = await proyectosVisibles();
ok('ve el proyecto que le aprobaron', vistos.includes(P_APROBADO));
ok('NO ve el proyecto falso que le colgó otro', !vistos.includes(P_FALSO));
ok('le apunta un gasto', (await intenta(`INSERT INTO expenses (project_id, amount) VALUES ($1, 120000)`, [P_APROBADO])) === null);
ok('y lo lee de vuelta', (await db.query(`SELECT count(*)::int n FROM expenses WHERE project_id=$1`, [P_APROBADO])).rows[0].n === 1);
ok('no puede apuntarle gastos al falso',
   (await intenta(`INSERT INTO expenses (project_id, amount) VALUES ($1, 1)`, [P_FALSO])) !== null);
const cambioValor = await db.query(`UPDATE projects SET value = 1 WHERE id=$1`, [P_APROBADO]);
ok('ve el proyecto pero no lo edita desde aquí', cambioValor.affectedRows === 0);

console.log('\n— la clienta —');
await como(CLIENTA);
ok('sigue viendo su proyecto', (await proyectosVisibles()).includes(P_APROBADO));
ok('sigue pudiendo aprobar (cambiar la metadata)',
   (await intenta(`UPDATE messages SET metadata = '{"number":"COT-1","status":"accepted"}' WHERE id=$1`, [M_COT])) === null);
ok('y marcar el estado de lectura',
   (await intenta(`UPDATE messages SET status='read' WHERE id=$1`, [M_COT])) === null);

console.log('\n— el intruso —');
await como(INTRUSO);
ok('no ve el proyecto de otros', !(await proyectosVisibles()).includes(P_APROBADO));
let error = await intenta(`UPDATE messages SET type='quote', metadata='{"number":"COT-9"}' WHERE id=$1`, [M_HOLA]);
ok('no convierte un saludo recibido en cotización', error !== null, error ?? 'lo dejó');
error = await intenta(`UPDATE messages SET sender_id=$1, recipient_id=$2 WHERE id=$3`, [VENDE, INTRUSO, M_DEL_INTRUSO]);
ok('no se hace pasar por el vendedor en un mensaje suyo', error !== null, error ?? 'lo dejó');
error = await intenta(`UPDATE messages SET chat_id='otro' WHERE id=$1`, [M_DEL_INTRUSO]);
ok('no cambia un mensaje de chat', error !== null);

await db.exec(`RESET ROLE`);
console.log(fallos ? `\n${fallos} FALLO(S)` : '\nTodo en orden.');
process.exit(fallos ? 1 : 0);
