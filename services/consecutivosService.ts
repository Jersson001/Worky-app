/**
 * La cuenta de los consecutivos: cuál fue el último COT, CC, FAC y RC de cada
 * usuario. La parte pura (formato, siguiente libre) está en utils/consecutivos.ts.
 *
 * Vive en la metadata de la cuenta (`user_metadata.consecutivos`) y no en el
 * teléfono: quien cotiza desde el celular y desde la web tiene que seguir una
 * sola cuenta, o el 007 saldría dos veces. No hace falta tabla ni migración, y
 * la metadata la lee y la escribe solo su dueño.
 *
 * Se guarda también en el teléfono, por dos razones: si la red falla al reservar
 * no se pierde la cuenta, y el número nunca retrocede —se toma el mayor de los
 * dos—. Un documento mandado con el 007 no debe volver a salir porque falló una
 * escritura.
 */
import { supabase } from './supabaseConfig';
import { getCurrentUserId } from './messagingService';
import { TipoConsecutivo, formatearConsecutivo, siguienteConsecutivo } from '../utils/consecutivos';

type Cuenta = Partial<Record<TipoConsecutivo, number>>;

const CLAVE_LOCAL = 'worky_consecutivos';
/** Más allá de esto se sigue con lo que hay en el teléfono: no se deja esperando al usuario. */
const ESPERA_MAXIMA_MS = 3000;

const leerLocal = (uid: string): Cuenta => {
  try {
    const todo = JSON.parse(localStorage.getItem(CLAVE_LOCAL) || '{}');
    return (todo && typeof todo[uid] === 'object' && todo[uid]) || {};
  } catch {
    return {};
  }
};

const guardarLocal = (uid: string, cuenta: Cuenta): void => {
  try {
    const todo = JSON.parse(localStorage.getItem(CLAVE_LOCAL) || '{}');
    localStorage.setItem(CLAVE_LOCAL, JSON.stringify({ ...todo, [uid]: cuenta }));
  } catch {
    /* sin almacenamiento queda la cuenta del servidor */
  }
};

const conLimite = <T>(promesa: Promise<T>): Promise<T | null> =>
  Promise.race([promesa, new Promise<null>(resolver => setTimeout(() => resolver(null), ESPERA_MAXIMA_MS))]);

const leerRemota = async (): Promise<Cuenta> => {
  try {
    const res = await conLimite(supabase.auth.getUser());
    const cuenta = res?.data?.user?.user_metadata?.consecutivos;
    return cuenta && typeof cuenta === 'object' ? (cuenta as Cuenta) : {};
  } catch {
    return {};
  }
};

/** De a una: dos envíos seguidos leerían la misma cuenta y repetirían el número. */
let cola: Promise<unknown> = Promise.resolve();

/**
 * Reserva el siguiente número del tipo y lo devuelve ya con formato (CC-001).
 *
 * Reservar es gastarlo: llámese justo al enviar, no al abrir el formulario. La
 * vista previa y la edición de una ya enviada no pasan por aquí.
 */
export const reservarConsecutivo = (prefijo: TipoConsecutivo, usados: unknown[] = []): Promise<string> => {
  const tarea = cola.then(async () => {
    let uid: string;
    try { uid = getCurrentUserId(); } catch { uid = 'sin-sesion'; }

    const local = leerLocal(uid);
    const remota = uid === 'sin-sesion' ? {} : await leerRemota();
    const ultimo = Math.max(local[prefijo] ?? 0, remota[prefijo] ?? 0);
    const n = siguienteConsecutivo(ultimo, prefijo, usados);

    // El mayor de cada tipo: ninguno retrocede porque el otro lado vaya atrás.
    const cuenta: Cuenta = { ...remota };
    for (const k of Object.keys(local) as TipoConsecutivo[]) cuenta[k] = Math.max(cuenta[k] ?? 0, local[k] ?? 0);
    cuenta[prefijo] = n;
    guardarLocal(uid, cuenta);
    if (uid !== 'sin-sesion') {
      try {
        await conLimite(supabase.auth.updateUser({ data: { consecutivos: cuenta } }));
      } catch (e) {
        // No se pierde el número: queda en el teléfono y el próximo envío lo sube.
        console.warn('No se pudo guardar el consecutivo en la cuenta:', e);
      }
    }
    return formatearConsecutivo(prefijo, n);
  });
  cola = tarea.catch(() => undefined);
  return tarea;
};
