/**
 * Avisa a quienes siguen una tienda de que publicó un aviso.
 *
 * La llama un disparador de la base cada vez que se inserta una fila en
 * `avisos` (supabase_avisos.sql), mandando SOLO el id. El contenido se lee de la
 * base y no del cuerpo de la llamada, por dos razones:
 *
 *   1. Esta dirección es pública (el disparador no lleva credenciales). Si el
 *      texto viniera en la llamada, cualquiera podría fabricar una
 *      notificación con el título y el cuerpo que quisiera y mandársela a los
 *      seguidores de cualquier tienda.
 *   2. Cada aviso se envía UNA vez: se «reclama» marcando `enviado_en`, y quien
 *      llegue después —una repetición del disparador, o alguien probando la
 *      dirección— no encuentra nada que enviar.
 *
 * El envío por FCM es el mismo de notificar-mensaje. Se repite aquí en vez de
 * compartirse porque cada función de Supabase se despliega por separado.
 *
 * ── Lo que necesita configurado ──────────────────────────────────────────────
 *   FIREBASE_SERVICE_ACCOUNT   el JSON de la cuenta de servicio, entero
 *   SUPABASE_URL               las pone Supabase solas
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
/** Cuántos teléfonos se avisan a la vez. */
const EN_PARALELO = 25;

interface CuentaDeServicio {
  project_id: string;
  client_email: string;
  private_key: string;
}

const pemABinario = (pem: string): ArrayBuffer => {
  const limpio = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binario = atob(limpio);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes.buffer;
};

const base64url = (datos: ArrayBuffer | string): string => {
  const bytes = typeof datos === 'string'
    ? new TextEncoder().encode(datos)
    : new Uint8Array(datos);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const pedirPermisoAGoogle = async (cuenta: CuentaDeServicio): Promise<string> => {
  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = { alg: 'RS256', typ: 'JWT' };
  const cuerpo = {
    iss: cuenta.client_email,
    scope: FCM_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: ahora,
    exp: ahora + 3600,
  };

  const sinFirmar = `${base64url(JSON.stringify(cabecera))}.${base64url(JSON.stringify(cuerpo))}`;
  const clave = await crypto.subtle.importKey(
    'pkcs8',
    pemABinario(cuenta.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const firma = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', clave, new TextEncoder().encode(sinFirmar));
  const jwt = `${sinFirmar}.${base64url(firma)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const datos = await res.json();
  if (!res.ok) throw new Error(`Google no dio permiso: ${JSON.stringify(datos)}`);
  return datos.access_token as string;
};

/** Manda el aviso a un aparato. Devuelve si el token sigue vivo. */
const avisarAlAparato = async (
  cuenta: CuentaDeServicio,
  permiso: string,
  token: string,
  titulo: string,
  cuerpo: string,
  datos: Record<string, string>,
  imagen?: string | null,
): Promise<boolean> => {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${cuenta.project_id}/messages:send`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${permiso}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token,
          // `image`: Android la baja y la enseña grande dentro de la notificación.
          notification: { title: titulo, body: cuerpo, ...(imagen ? { image: imagen } : {}) },
          data: datos,
          android: { priority: 'high', notification: { sound: 'default' } },
        },
      }),
    },
  );

  if (res.ok) return true;

  const error = await res.text();
  const muerto = res.status === 404 || error.includes('UNREGISTERED') || error.includes('INVALID_ARGUMENT');
  if (!muerto) console.error('FCM devolvió un error:', res.status, error);
  return !muerto;
};

const EMOJI: Record<string, string> = { descuento: '🏷️', lanzamiento: '🆕', aviso: '📣' };

/** «20/11» para una fecha `YYYY-MM-DD`. */
const diaYMes = (iso: string): string => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

const responder = (cuerpo: Record<string, unknown>) =>
  new Response(JSON.stringify(cuerpo), { headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  try {
    const crudo = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!crudo) return responder({ ok: true, saltado: 'sin FIREBASE_SERVICE_ACCOUNT' });
    const cuenta = JSON.parse(crudo) as CuentaDeServicio;

    const { aviso_id } = await req.json();
    if (typeof aviso_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(aviso_id)) {
      return responder({ ok: true, saltado: 'sin aviso' });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Se reclama el aviso: solo uno gana. El resto de llamadas no encuentra nada.
    const { data: aviso } = await supabase
      .from('avisos')
      .update({ enviado_en: new Date().toISOString() })
      .eq('id', aviso_id)
      .is('enviado_en', null)
      .select('id, tienda_id, tipo, titulo, vence_en, imagen_url')
      .maybeSingle();
    if (!aviso) return responder({ ok: true, saltado: 'ya enviado o no existe' });

    const { data: seguidores } = await supabase
      .from('seguidores')
      .select('usuario_id')
      .eq('tienda_id', aviso.tienda_id);
    const ids = (seguidores ?? []).map((s) => s.usuario_id as string);
    if (!ids.length) return responder({ ok: true, avisados: 0, seguidores: 0 });

    // Los aparatos, en tandas: la lista de ids va en la dirección de la consulta.
    const tokens: string[] = [];
    for (let i = 0; i < ids.length; i += 200) {
      const { data } = await supabase
        .from('push_tokens')
        .select('token')
        .in('user_id', ids.slice(i, i + 200));
      for (const f of data ?? []) tokens.push(f.token as string);
    }
    if (!tokens.length) return responder({ ok: true, avisados: 0, seguidores: ids.length, aparatos: 0 });

    const { data: perfil } = await supabase
      .from('user_profiles')
      .select('business_name, owner_name')
      .eq('id', aviso.tienda_id)
      .maybeSingle();
    const negocio = perfil?.business_name || perfil?.owner_name || 'Una tienda que sigues';

    const hasta = aviso.vence_en ? ` · hasta el ${diaYMes(String(aviso.vence_en))}` : '';
    const cuerpo = `${EMOJI[aviso.tipo] ?? '📣'} ${aviso.titulo}${hasta}`;

    const permiso = await pedirPermisoAGoogle(cuenta);
    const datos = {
      tipo: 'aviso',
      tienda: String(aviso.tienda_id),
      aviso: String(aviso.id),
      clickAction: `worky://tienda?id=${aviso.tienda_id}`,
    };

    const muertos: string[] = [];
    for (let i = 0; i < tokens.length; i += EN_PARALELO) {
      await Promise.all(
        tokens.slice(i, i + EN_PARALELO).map(async (token) => {
          const vivo = await avisarAlAparato(cuenta, permiso, token, negocio, cuerpo, datos, aviso.imagen_url);
          if (!vivo) muertos.push(token);
        }),
      );
    }

    if (muertos.length) {
      await supabase.from('push_tokens').delete().in('token', muertos);
    }

    return responder({
      ok: true,
      seguidores: ids.length,
      aparatos: tokens.length,
      avisados: tokens.length - muertos.length,
      limpiados: muertos.length,
    });
  } catch (e) {
    console.error('No se pudo avisar:', e);
    // 200 a propósito: lo llama un disparador, y un error aquí no puede hacer que
    // el aviso no se guarde.
    return responder({ ok: false, error: String(e) });
  }
});
