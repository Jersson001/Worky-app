/**
 * Prueba supabase_invitaciones_contacto.sql en un Postgres de verdad.
 *
 * Lo que verifica es que un cliente que se registra con la invitación del
 * vendedor pase a ser su contacto manual —ficha, mensajes y proyectos—, y que
 * nadie más pueda: ni sin correo, ni con un token inventado, ni con uno usado.
 *
 *     npm install @electric-sql/pglite --no-save
 *     node supabase_invitaciones_contacto.test.mjs
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const db = new PGlite();
let fallos = 0;
const ok = (nombre, condicion, detalle = '') => {
  console.log(`${condicion ? '  OK  ' : ' FALLA'}  ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  if (!condicion) fallos++;
};

const VENDE   = 'f1111111-1111-1111-1111-111111111111';  // el carpintero
const ANDRES  = '02222222-2222-2222-2222-222222222222';  // el cliente, se registra con correo
const ANONIMO = '33333333-3333-3333-3333-333333333333';  // entró con alias, sin correo
const INTRUSO = '44444444-4444-4444-4444-444444444444';  // tiene correo, no tiene el enlace
const OTRO    = '55555555-5555-5555-5555-555555555555';  // otro vendedor

const MANUAL      = 'aaaaaaaa-0000-0000-0000-000000000001';  // la ficha manual de Andrés
const REGISTRADO  = 'aaaaaaaa-0000-0000-0000-000000000002';  // una ficha de alguien con cuenta
const DE_OTRO     = 'aaaaaaaa-0000-0000-0000-000000000003';  // una ficha manual de OTRO

// ── Andamiaje: lo que Supabase ya trae y las tablas implicadas ──────────
await db.exec(`
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('worky.uid', true), '')::uuid;
  $$;
  CREATE TABLE auth.users (id uuid primary key, email text, is_anonymous boolean default false);
  CREATE ROLE authenticated;
  CREATE ROLE anon;

  CREATE TABLE public.contacts (
    id uuid primary key, user_id uuid, contact_user_id uuid, client_name text,
    unique (user_id, contact_user_id));
  CREATE TABLE public.messages (
    id uuid primary key default gen_random_uuid(), chat_id text, sender_id uuid,
    recipient_id uuid, recipient_contact text, type text default 'text', text text);
  CREATE TABLE public.projects (id uuid primary key, contact_id uuid, client_id uuid, name text);
  CREATE TABLE public.user_chats (user_id uuid, contact_id uuid, last_message text,
    last_message_time timestamptz, unread int, unique (user_id, contact_id));

  -- El freno de los mensajes, como quedó en producción el 16/09.
  CREATE FUNCTION public.mensaje_no_cambia_de_dueno() RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    IF NEW.sender_id IS DISTINCT FROM OLD.sender_id OR NEW.recipient_id IS DISTINCT FROM OLD.recipient_id
       OR NEW.recipient_contact IS DISTINCT FROM OLD.recipient_contact OR NEW.chat_id IS DISTINCT FROM OLD.chat_id
    THEN RAISE EXCEPTION 'Un mensaje no puede cambiar de remitente, destinatario, chat ni tipo'; END IF;
    RETURN NEW;
  END $$;
  CREATE TRIGGER mensaje_no_cambia_de_dueno BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.mensaje_no_cambia_de_dueno();

  ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
  CREATE POLICY m_sel ON public.messages FOR SELECT USING (auth.uid() IN (sender_id, recipient_id));
  CREATE POLICY m_upd ON public.messages FOR UPDATE TO authenticated
    USING (auth.uid() IN (sender_id, recipient_id)) WITH CHECK (auth.uid() IN (sender_id, recipient_id));
  GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT USAGE ON SCHEMA auth TO authenticated;

  INSERT INTO auth.users VALUES
    ('${VENDE}', 'carpintero@x.co', false), ('${ANDRES}', 'andres@x.co', false),
    ('${ANONIMO}', null, true), ('${INTRUSO}', 'intruso@x.co', false), ('${OTRO}', 'otro@x.co', false);

  INSERT INTO public.contacts VALUES
    ('${MANUAL}', '${VENDE}', null, 'Andrés Sanabria'),
    ('${REGISTRADO}', '${VENDE}', '${INTRUSO}', 'Alguien con cuenta'),
    ('${DE_OTRO}', '${OTRO}', null, 'Cliente del otro');

  -- Lo que el vendedor le mandó cuando Andrés era manual.
  INSERT INTO public.messages (chat_id, sender_id, recipient_contact, text) VALUES
    ((SELECT string_agg(x, '_' ORDER BY x COLLATE "C") FROM unnest(ARRAY['${VENDE}', '${MANUAL}']) x),
     '${VENDE}', '${MANUAL}', 'Hola Andrés'),
    ((SELECT string_agg(x, '_' ORDER BY x COLLATE "C") FROM unnest(ARRAY['${VENDE}', '${MANUAL}']) x),
     '${VENDE}', '${MANUAL}', '📋 Cotización COT-1');
  INSERT INTO public.projects VALUES ('bbbbbbbb-0000-0000-0000-000000000001', '${MANUAL}', null, 'Cocina');
`);

const sql = readFileSync('supabase_invitaciones_contacto.sql', 'utf8');
await db.exec(sql);
ok('el script se ejecuta', true);
await db.exec(sql);
ok('se puede volver a ejecutar (idempotente)', true);

const como = async (uid) => {
  await db.exec(`RESET ROLE`);
  await db.exec(`SET worky.uid = '${uid}'`);
  await db.exec(`SET ROLE authenticated`);
};
const valor = async (q, p = []) => (await db.query(q, p)).rows[0];
const intenta = async (q, p = []) => { try { await db.query(q, p); return null; } catch (e) { return e.message; } };
const chatDe = (a, b) => [a, b].sort().join('_');   // igual que getChatId

console.log('\n— el vendedor pide la invitación —');
await como(VENDE);
const { t: token } = await valor(`SELECT public.crear_invitacion_contacto($1) t`, [MANUAL]);
ok('para su contacto manual, sí', !!token);
ok('la segunda vez devuelve la misma', (await valor(`SELECT public.crear_invitacion_contacto($1) t`, [MANUAL])).t === token);
ok('para un contacto que ya tiene cuenta, no', (await valor(`SELECT public.crear_invitacion_contacto($1) t`, [REGISTRADO])).t === null);
ok('para el contacto de otro vendedor, no', (await valor(`SELECT public.crear_invitacion_contacto($1) t`, [DE_OTRO])).t === null);
ok('nadie lee la tabla directamente', (await intenta(`SELECT * FROM public.invitaciones_contacto`)) !== null);

console.log('\n— quien no debe —');
await como(ANONIMO);
ok('una cuenta sin correo no la reclama', (await valor(`SELECT public.reclamar_contacto($1) v`, [token])).v === null);
await como(INTRUSO);
ok('con un token inventado no pasa nada',
   (await valor(`SELECT public.reclamar_contacto(gen_random_uuid()) v`)).v === null);
await como(VENDE);
ok('el vendedor no se reclama a sí mismo', (await valor(`SELECT public.reclamar_contacto($1) v`, [token])).v === null);
await db.exec(`RESET ROLE`);
ok('y nada de eso tocó la ficha', (await valor(`SELECT contact_user_id FROM contacts WHERE id=$1`, [MANUAL])).contact_user_id === null);

console.log('\n— Andrés se registra y la reclama —');
await como(ANDRES);
ok('le devuelve el vendedor', (await valor(`SELECT public.reclamar_contacto($1) v`, [token])).v === VENDE);
await db.exec(`RESET ROLE`);
ok('la ficha manual ahora es su cuenta', (await valor(`SELECT contact_user_id FROM contacts WHERE id=$1`, [MANUAL])).contact_user_id === ANDRES);
const msgs = (await db.query(`SELECT * FROM messages WHERE sender_id=$1 AND text <> 'suelto'`, [VENDE])).rows;
ok('sus dos mensajes pasaron a él', msgs.length === 2 && msgs.every(m => m.recipient_id === ANDRES && m.recipient_contact === null));
ok('con el chat_id que calcula la app', msgs.every(m => m.chat_id === chatDe(VENDE, ANDRES)), msgs[0]?.chat_id);
ok('el proyecto queda a su nombre', (await valor(`SELECT client_id FROM projects`)).client_id === ANDRES);
ok('el vendedor tiene la conversación en su lista',
   (await valor(`SELECT count(*)::int n FROM user_chats WHERE user_id=$1 AND contact_id=$2`, [VENDE, ANDRES])).n === 1);
await como(ANDRES);
ok('y Andrés ya lee los mensajes', (await valor(`SELECT count(*)::int n FROM messages`)).n === 2);

console.log('\n— la invitación ya no sirve —');
await como(INTRUSO);
ok('otro no la puede reusar', (await valor(`SELECT public.reclamar_contacto($1) v`, [token])).v === null);
await como(VENDE);
ok('y ya no hay invitación nueva para ese contacto', (await valor(`SELECT public.crear_invitacion_contacto($1) t`, [MANUAL])).t === null);

console.log('\n— el freno sigue para los clientes —');
await como(ANDRES);
const error = await intenta(`UPDATE messages SET sender_id=$1`, [ANDRES]);
ok('Andrés no puede cambiar el remitente de un mensaje', error !== null, error ?? 'lo dejó');

console.log('\n— si ya había entrado antes por otro enlace —');
await db.exec(`RESET ROLE`);
const MANUAL2 = 'aaaaaaaa-0000-0000-0000-000000000009';
const DUPLICADA = 'aaaaaaaa-0000-0000-0000-000000000010';
await db.exec(`
  INSERT INTO contacts VALUES ('${MANUAL2}', '${OTRO}', null, 'Andrés (manual del otro)'),
                              ('${DUPLICADA}', '${OTRO}', '${ANDRES}', 'Usuario');`);
await como(OTRO);
const { t: token2 } = await valor(`SELECT public.crear_invitacion_contacto($1) t`, [MANUAL2]);
await como(ANDRES);
ok('la reclama', (await valor(`SELECT public.reclamar_contacto($1) v`, [token2])).v === OTRO);
await db.exec(`RESET ROLE`);
const fichas = (await db.query(`SELECT id, client_name FROM contacts WHERE user_id=$1 AND contact_user_id=$2`, [OTRO, ANDRES])).rows;
ok('queda una sola ficha, la manual con su nombre', fichas.length === 1 && fichas[0].id === MANUAL2, JSON.stringify(fichas));

console.log(fallos ? `\n${fallos} FALLO(S)` : '\nTodo en orden.');
process.exit(fallos ? 1 : 0);
