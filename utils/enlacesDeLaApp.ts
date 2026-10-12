/**
 * Enlaces de worky.ferryapp.co que Android abre dentro de la app.
 *
 * Con la app instalada, escanear el QR de una tienda abría la web: la app solo
 * estaba registrada para sus propios enlaces `worky://`. Ahora el manifiesto
 * declara también estos dominios como «enlaces de aplicación» verificados
 * (public/.well-known/assetlinks.json), y Android le entrega el enlace a la app.
 *
 * La app no tiene pantallas propias para un catálogo, un documento o un
 * registro por invitación: todo eso lo resuelve la web leyendo la URL al
 * arrancar. Por eso aquí el enlace no se interpreta: se abre el mismo en el
 * WebView, y la lógica de siempre —`?catalogo=`, `?vendedor=`, `?view=`, el
 * enlace de recuperar contraseña…— funciona sin tocarla.
 */

/** Los dominios declarados en el manifiesto. Los QR impresos usan el viejo. */
const DOMINIOS_DE_LA_APP = ['worky.ferryapp.co', 'worky-app-khaki.vercel.app'];

/**
 * Si la URL es un enlace de la app con algo que resolver, la ruta equivalente
 * dentro del WebView; si no, null.
 *
 * Solo la raíz: el manifiesto no reclama `/privacidad.html` ni `/eliminar-cuenta.html`,
 * que siguen abriéndose en el navegador. Y sin parámetros no hay nada que
 * resolver: la app ya está abierta donde estaba.
 */
export const rutaInternaDe = (url: string): string | null => {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || !DOMINIOS_DE_LA_APP.includes(u.hostname) || u.pathname !== '/') return null;
    if (!u.search && !u.hash) return null;
    return `/${u.search}${u.hash}`;
  } catch {
    return null;
  }
};

const CLAVE_ULTIMO = 'worky:enlace-abierto';
const VENTANA_MS = 15000;

/**
 * Si este enlace se acaba de abrir. Abrirlo recarga la página, y si Android
 * volviera a entregarlo se recargaría otra vez: así se corta el bucle.
 */
export const yaSeAbrioHace = (url: string): boolean => {
  try {
    const guardado = JSON.parse(sessionStorage.getItem(CLAVE_ULTIMO) || 'null') as { url: string; t: number } | null;
    return !!guardado && guardado.url === url && Date.now() - guardado.t < VENTANA_MS;
  } catch {
    return false;
  }
};

export const recordarEnlaceAbierto = (url: string): void => {
  try {
    sessionStorage.setItem(CLAVE_ULTIMO, JSON.stringify({ url, t: Date.now() }));
  } catch {
    /* sin almacenamiento no hay protección, pero tampoco hay bucle seguro: sigue */
  }
};
