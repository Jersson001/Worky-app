/**
 * Lo que pasa cuando alguien vuelve de Google tras tocar «Guarda tu espacio».
 *
 * En la web ese botón saca la página entera a Google, y al volver la app
 * arranca de cero en el Inicio: sin esto, quien estaba en medio de un chat caía
 * en otra pantalla sin saber si había funcionado. Dos cosas hacen falta:
 *
 * 1. **Volver al chat donde estaba.** Se anota antes de irse.
 * 2. **Contarle lo que pasó si falló.** Google devuelve el error en la dirección
 *    (`?error_code=…&error_description=…`, o tras el `#`), y la librería de
 *    sesión lo lee y lo descarta sin que la app se entere. Hay que leerlo antes.
 *
 * El caso que de verdad pasa: el correo de ese Google ya tiene una cuenta en
 * Worky, y Supabase no deja pegárselo a una segunda («A user with this email
 * address has already been registered»). No se pierde nada: la persona sigue con
 * su cuenta de antes, tal cual.
 */

const CLAVE_ERROR = 'worky:retorno-error';
const CLAVE_VOLVER = 'worky:volver-al-chat';
/** Más tiempo que esto y ya no es una vuelta de Google, es otra visita. */
const VIGENCIA_MS = 15 * 60_000;

export interface ErrorDeRetorno {
  code: string;
  description: string;
}

/** Lee los parámetros de error de una dirección, estén en `?` o tras el `#`. */
export const errorEnLaDireccion = (search: string, hash: string): ErrorDeRetorno | null => {
  const q = new URLSearchParams(search);
  const h = new URLSearchParams(hash.replace(/^#/, ''));
  const get = (k: string) => q.get(k) || h.get(k) || '';
  const code = get('error_code');
  const description = get('error_description');
  const error = get('error');
  if (!code && !description && !error) return null;
  return { code: code || error, description };
};

/**
 * Se llama una sola vez al cargar la página, ANTES de que arranque la librería de
 * sesión, que lee esos mismos parámetros y los descarta. Guarda el error y los
 * quita de la dirección para que no se queden ahí.
 */
export const capturarErrorDeRetorno = (): void => {
  try {
    const error = errorEnLaDireccion(window.location.search, window.location.hash);
    if (!error) return;
    // Solo si veníamos de pedir guardar el espacio: un error en la dirección por
    // otra causa no es asunto de este aviso.
    if (!sessionStorage.getItem(CLAVE_VOLVER) && !localStorage.getItem(CLAVE_VOLVER)) return;
    sessionStorage.setItem(CLAVE_ERROR, JSON.stringify(error));
    window.history.replaceState(null, '', window.location.pathname);
  } catch { /* sin almacenamiento no hay vuelta que contar */ }
};

/** Lo lee y lo gasta: se cuenta una vez, no cada vez que se abre la app. */
export const tomarErrorDeRetorno = (): ErrorDeRetorno | null => {
  try {
    const crudo = sessionStorage.getItem(CLAVE_ERROR);
    sessionStorage.removeItem(CLAVE_ERROR);
    return crudo ? (JSON.parse(crudo) as ErrorDeRetorno) : null;
  } catch {
    return null;
  }
};

/**
 * Anota en qué chat estaba. Va en `localStorage` y no en `sessionStorage`: en
 * la web la pestaña entera viaja a Google y vuelve, pero el navegador in-app de
 * la app de Android es otra ventana y no comparte la sesión.
 */
export const recordarChatParaVolver = (contactId: string | null | undefined): void => {
  try {
    if (!contactId) return;
    localStorage.setItem(CLAVE_VOLVER, JSON.stringify({ id: contactId, cuando: Date.now() }));
  } catch { /* si no se puede anotar, se vuelve al Inicio y ya */ }
};

/** El chat al que volver, si la visita es reciente. Lo gasta al leerlo. */
export const tomarChatParaVolver = (ahora: number = Date.now()): string | null => {
  try {
    const crudo = localStorage.getItem(CLAVE_VOLVER);
    localStorage.removeItem(CLAVE_VOLVER);
    if (!crudo) return null;
    const { id, cuando } = JSON.parse(crudo);
    return typeof id === 'string' && typeof cuando === 'number' && ahora - cuando < VIGENCIA_MS ? id : null;
  } catch {
    return null;
  }
};

/** El error de Google dicho en palabras de quien chatea, con el camino de salida. */
export const mensajeDeErrorDeGoogle = (e: ErrorDeRetorno): string => {
  const texto = `${e.code} ${e.description}`.toLowerCase();
  if (texto.includes('already been registered') || texto.includes('email_exists') || texto.includes('identity_already_exists')) {
    return 'Ese correo de Google ya tiene una cuenta en Worky, y no se puede unir a esta conversación. Prueba con otro Google, o guarda tu espacio con tu correo.';
  }
  if (texto.includes('manual_linking_disabled') || texto.includes('manual linking')) {
    return 'Guardar con Google todavía no está disponible. Guarda tu espacio con tu correo.';
  }
  if (texto.includes('access_denied')) {
    return 'Cancelaste el acceso con Google. Cuando quieras, vuelve a intentarlo.';
  }
  return 'No se pudo guardar tu espacio con Google. Puedes intentarlo de nuevo o usar tu correo.';
};
