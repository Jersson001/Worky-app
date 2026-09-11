/**
 * Avisa al teléfono de quien recibe un mensaje.
 *
 * La llama un disparador de la base cada vez que se inserta una fila en
 * `messages`. Busca los aparatos del destinatario en `push_tokens` y le manda
 * la notificación por FCM.
 *
 * Va en el servidor y no en la app del que escribe por dos razones: el que
 * manda puede cerrar Worky en el mismo segundo —y entonces el aviso no saldría
 * nunca— y porque desde el cliente cualquiera podría mandarle notificaciones a
 * quien quisiera.
 *
 * ── Lo que necesita configurado ──────────────────────────────────────────────
 *   FIREBASE_SERVICE_ACCOUNT   el JSON de la cuenta de servicio, entero
 *   SUPABASE_URL               las pone Supabase solas
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

interface CuentaDeServicio {
  project_id: string;
  client_email: string;
  private_key: string;
}

/** El PEM de la clave privada, como lo quiere `crypto.subtle`. */
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

/**
 * El permiso para hablar con FCM.
 *
 * Se firma un JWT con la clave de la cuenta de servicio y Google lo cambia por
 * un token de una hora. La API antigua, la de la «server key» de toda la vida,
 * Google la cerró en 2024: ya no hay atajo.
 */
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
): Promise<boolean> => {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${cuenta.project_id}/messages:send`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${permiso}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: titulo, body: cuerpo },
          data: datos,
          android: { priority: 'high', notification: { sound: 'default' } },
        },
      }),
    },
  );

  if (res.ok) return true;

  // 404 y 400 con UNREGISTERED significan que ese teléfono ya no existe:
  // se desinstaló la app o se limpiaron los datos. El token se borra en vez de
  // seguir intentándolo en cada mensaje, para siempre.
  const error = await res.text();
  const muerto = res.status === 404 || error.includes('UNREGISTERED') || error.includes('INVALID_ARGUMENT');
  if (!muerto) console.error('FCM devolvió un error:', res.status, error);
  return !muerto;
};

/** Lo que se lee en la barra de notificaciones, según el tipo de mensaje. */
const resumenDelMensaje = (tipo: string, texto: string): string => {
  switch (tipo) {
    case 'image': return '📷 Te envió una foto';
    case 'file': return '📎 Te envió un archivo';
    case 'quote': return '📄 Te envió una cotización';
    case 'invoice': return '🧾 Te envió una factura';
    case 'collection_account': return '💰 Te envió una cuenta de cobro';
    case 'receipt': return '🧾 Te envió un recibo';
    case 'product': return `🛍️ ${texto || 'Te envió un producto'}`;
    default: return texto || 'Te escribió un mensaje';
  }
};

Deno.serve(async (req) => {
  try {
    const crudo = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!crudo) {
      // Sin configurar no es un error del que avisar al que escribe: el mensaje
      // se mandó bien, simplemente no hay a quién avisar todavía.
      return new Response(JSON.stringify({ ok: true, saltado: 'sin FIREBASE_SERVICE_ACCOUNT' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const cuenta = JSON.parse(crudo) as CuentaDeServicio;

    // El disparador manda la fila recién insertada, como hacen los webhooks.
    const { record } = await req.json();
    const destinatario: string | null = record?.recipient_id ?? null;
    const remitente: string | null = record?.sender_id ?? null;
    if (!destinatario || destinatario === remitente) {
      return new Response(JSON.stringify({ ok: true, saltado: 'sin destinatario' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: aparatos } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', destinatario);

    if (!aparatos?.length) {
      return new Response(JSON.stringify({ ok: true, saltado: 'sin aparatos' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Quién escribe. `public_info` es de lectura libre y tiene el nombre para
    // enseñar: sin esto la notificación diría «Worky» y no quién le escribió,
    // que es la mitad de la razón para abrirla.
    const { data: quien } = await supabase
      .from('public_info')
      .select('display_name, alias')
      .eq('user_id', remitente)
      .maybeSingle();

    const titulo = quien?.display_name || quien?.alias || 'Nuevo mensaje';
    const cuerpo = resumenDelMensaje(record?.type ?? 'text', record?.text ?? '');

    const permiso = await pedirPermisoAGoogle(cuenta);

    const muertos: string[] = [];
    await Promise.all(
      aparatos.map(async ({ token }) => {
        const vivo = await avisarAlAparato(cuenta, permiso, token, titulo, cuerpo, {
          chat: String(remitente ?? ''),
          tipo: String(record?.type ?? 'text'),
        });
        if (!vivo) muertos.push(token);
      }),
    );

    if (muertos.length) {
      await supabase.from('push_tokens').delete().in('token', muertos);
    }

    return new Response(
      JSON.stringify({ ok: true, avisados: aparatos.length - muertos.length, limpiados: muertos.length }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('No se pudo avisar:', e);
    // Se responde 200 a propósito: esto lo llama un disparador de la base, y un
    // error aquí no puede hacer que el mensaje no se guarde. Que no suene el
    // teléfono es malo; perder el mensaje es mucho peor.
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
