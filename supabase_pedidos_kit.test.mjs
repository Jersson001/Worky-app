/**
 * Prueba supabase_pedidos_kit.sql en un Postgres de verdad.
 *
 *     npm install @electric-sql/pglite --no-save
 *     node supabase_pedidos_kit.test.mjs
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
const ANON = '33333333-3333-3333-3333-333333333333';
const ADMIN = '44444444-4444-4444-4444-444444444444';

await db.exec(`
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('worky.uid', true), '')::uuid;
  $$;
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
    SELECT CASE WHEN nullif(current_setting('worky.uid', true), '')::uuid = '${ANON}'
                THEN '{"is_anonymous": true}'::jsonb ELSE '{}'::jsonb END;
  $$;
  CREATE ROLE anon;
  CREATE ROLE authenticated;
  CREATE TABLE public.user_profiles (
    id uuid primary key, is_admin boolean not null default false, is_pro boolean not null default false,
    subscription_ends_at timestamptz, business_name text, owner_name text);
  INSERT INTO public.user_profiles (id, is_admin, business_name, owner_name) VALUES
    ('${TIENDA}', false, 'Hábitat Home', 'Ana'), ('${OTRA}', false, '', 'Luis'),
    ('${ANON}', false, '', ''), ('${ADMIN}', true, 'Worky', 'Admin');
  CREATE FUNCTION public.is_current_user_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT coalesce((SELECT is_admin FROM public.user_profiles WHERE id = auth.uid()), false);
  $$;
  -- El blindaje real de supabase_admin_panel.sql: solo el admin toca la suscripción.
  CREATE FUNCTION public.protect_subscription_fields() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN
    IF NOT public.is_current_user_admin() THEN
      NEW.is_pro := OLD.is_pro; NEW.subscription_ends_at := OLD.subscription_ends_at; NEW.is_admin := OLD.is_admin;
    END IF;
    RETURN NEW;
  END; $$;
  CREATE TRIGGER trg_protect BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_subscription_fields();
`);

const sql = readFileSync('supabase_pedidos_kit.sql', 'utf8').replace(/^SELECT c\.relname[\s\S]*$/m, '');
await db.exec(sql);
ok('el script se ejecuta', true);
await db.exec(sql);
ok('se puede volver a ejecutar (idempotente)', true);

const como = (uid) => db.exec(`SELECT set_config('worky.uid', '${uid ?? ''}', false)`);
const falla = async (f) => { try { await f(); return null; } catch (e) { return e.message; } };
const pedir = (n = 'Ana Pérez', c = '300 123 4567', d = 'Calle 17 # 99-10', b = 'Fontibón', ciu = 'Bogotá') =>
  db.query('SELECT public.solicitar_kit($1,$2,$3,$4,$5) AS id', [n, c, d, b, ciu]);

await como(null);
ok('sin sesión no se pide', (await falla(() => pedir())) !== null);
await como(ANON);
ok('una cuenta anónima no pide', /Guarda tu cuenta/.test((await falla(() => pedir())) ?? ''));

await como(TIENDA);
ok('fuera de Bogotá no hay kit', /solo se entrega en Bogotá/.test((await falla(() => pedir('Ana', '3001234567', 'Calle 1 # 2-3', '', 'Medellín'))) ?? ''));
ok('acepta «bogota d.c.» sin tilde ni mayúsculas', await (async () => {
  const r = await falla(() => pedir('Ana', '3001234567', 'Calle 1 # 2-3', '', ' BOGOTA D.C. '));
  if (r === null) await db.exec(`UPDATE public.pedidos_kit SET estado = 'cancelado'`);
  return r === null;
})());
ok('rechaza un celular de letras', /Revisa/.test((await falla(() => pedir('Ana', 'abc', 'Calle 1 # 2-3'))) ?? ''));
ok('rechaza una dirección vacía', /Revisa/.test((await falla(() => pedir('Ana', '3001234567', ' '))) ?? ''));

const { rows: [{ id }] } = await pedir();
ok('la tienda pide su kit', !!id);
const { rows: [p] } = await db.query(`SELECT celular, ciudad, estado, monto FROM public.pedidos_kit WHERE id = $1`, [id]);
ok('guarda el celular solo con dígitos y la ciudad normalizada', p.celular === '3001234567' && p.ciudad === 'Bogotá' && p.estado === 'solicitado' && p.monto === 15000, JSON.stringify(p));
ok('no puede pedir otro', /Ya pediste/.test((await falla(() => pedir())) ?? ''));
ok('ve su pedido', (await db.query('SELECT * FROM public.mi_pedido_kit()')).rows[0]?.estado === 'solicitado');

await como(OTRA);
ok('otra tienda no ve el pedido ajeno', (await db.query('SELECT * FROM public.mi_pedido_kit()')).rows.length === 0);
ok('una tienda no lista los pedidos', (await falla(() => db.query('SELECT * FROM public.pedidos_kit_admin()'))) !== null);
ok('una tienda no los cambia', (await falla(() => db.query(`SELECT public.actualizar_pedido_kit($1, 'pagado')`, [id]))) !== null);

await como(ADMIN);
const lista = (await db.query('SELECT * FROM public.pedidos_kit_admin()')).rows;
const mio = lista.find(f => f.id === id);
ok('el admin ve el pedido con el nombre del negocio', mio?.negocio === 'Hábitat Home' && mio.direccion.startsWith('Calle 17'));
ok('los cancelados salen al final de la lista', lista[lista.length - 1].estado === 'cancelado');
ok('no se envía sin pagar', /de solicitado a enviado/.test((await falla(() => db.query(`SELECT public.actualizar_pedido_kit($1, 'enviado')`, [id]))) ?? ''));

await db.query(`SELECT public.actualizar_pedido_kit($1, 'pagado')`, [id]);
const { rows: [u] } = await db.query(`SELECT is_pro, subscription_ends_at FROM public.user_profiles WHERE id = $1`, [TIENDA]);
const dias = (new Date(u.subscription_ends_at) - Date.now()) / 86400000;
ok('al marcar pagado la cuenta queda Pro ~1 mes (pasa el blindaje)', u.is_pro === true && dias > 27 && dias < 32, `${dias.toFixed(1)} días`);
ok('no se paga dos veces', (await falla(() => db.query(`SELECT public.actualizar_pedido_kit($1, 'pagado')`, [id]))) !== null);
ok('no se cancela uno pagado', (await falla(() => db.query(`SELECT public.actualizar_pedido_kit($1, 'cancelado')`, [id]))) !== null);

await db.query(`SELECT public.actualizar_pedido_kit($1, 'enviado')`, [id]);
ok('pagado pasa a enviado', (await db.query(`SELECT estado, enviado_en FROM public.pedidos_kit WHERE id = $1`, [id])).rows[0].estado === 'enviado');

// Si ya tenía Pro vigente, el mes se suma al vencimiento, no a hoy.
await db.exec(`UPDATE public.user_profiles SET subscription_ends_at = now() + interval '20 days', is_pro = true WHERE id = '${OTRA}'`);
await como(OTRA);
const r2 = (await pedir('Luis', '3109998888', 'Carrera 100 # 20-30', '', 'Bogotá')).rows[0].id;
await como(ADMIN);
await db.query(`SELECT public.actualizar_pedido_kit($1, 'pagado')`, [r2]);
const { rows: [u2] } = await db.query(`SELECT subscription_ends_at FROM public.user_profiles WHERE id = $1`, [OTRA]);
const dias2 = (new Date(u2.subscription_ends_at) - Date.now()) / 86400000;
ok('con Pro vigente, el mes se suma al vencimiento', dias2 > 49 && dias2 < 52, `${dias2.toFixed(1)} días`);

await como(TIENDA);
ok('un pedido enviado cuenta como vivo: no se puede pedir otro', /Ya pediste/.test((await falla(() => pedir())) ?? ''));

// Venta en persona.
await como(ADMIN);
await db.exec(`INSERT INTO public.user_profiles (id, is_admin, business_name) VALUES ('55555555-5555-5555-5555-555555555555', false, 'Tienda del barrio')`);
const T3 = '55555555-5555-5555-5555-555555555555';
const venta = (u, pago, dir = 'En mano') =>
  db.query('SELECT public.admin_vender_kit($1,$2,$3,$4,$5,$6) AS id', [u, 'Doña Rosa', '310 111 2222', dir, 'Fontibón', pago]);
await como(TIENDA);
ok('una tienda no registra ventas', (await falla(() => venta(T3, true))) !== null);
await como(ADMIN);
ok('no vende a una tienda que no existe', /No existe/.test((await falla(() => venta('99999999-9999-9999-9999-999999999999', true))) ?? ''));
ok('rechaza datos incompletos', /Revisa/.test((await falla(() => venta(T3, true, ' '))) ?? ''));
const v1 = (await venta(T3, true)).rows[0].id;
const { rows: [pv] } = await db.query(`SELECT estado, celular FROM public.pedidos_kit WHERE id = $1`, [v1]);
ok('venta con pago: queda pagado y con el celular limpio', pv.estado === 'pagado' && pv.celular === '3101112222', JSON.stringify(pv));
const { rows: [uv] } = await db.query(`SELECT is_pro, subscription_ends_at FROM public.user_profiles WHERE id = $1`, [T3]);
ok('y la tienda queda Pro un mes', uv.is_pro === true && (new Date(uv.subscription_ends_at) - Date.now()) / 86400000 > 27);
ok('no se le vende dos veces', /ya tiene su kit/.test((await falla(() => venta(T3, true))) ?? ''));
await db.exec(`INSERT INTO public.user_profiles (id, is_admin, business_name) VALUES ('66666666-6666-6666-6666-666666666666', false, 'Otra')`);
const v2 = (await venta('66666666-6666-6666-6666-666666666666', false)).rows[0].id;
const { rows: [pv2] } = await db.query(`SELECT estado FROM public.pedidos_kit WHERE id = $1`, [v2]);
const { rows: [uv2] } = await db.query(`SELECT is_pro FROM public.user_profiles WHERE id = '66666666-6666-6666-6666-666666666666'`);
ok('venta sin pago: queda solicitado y sin Pro', pv2.estado === 'solicitado' && uv2.is_pro === false);

let directo = true;
try { await db.exec(`SET ROLE authenticated; SELECT * FROM public.pedidos_kit`); } catch { directo = false; }
await db.exec('RESET ROLE');
ok('la tabla no se lee por la API', !directo);

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
