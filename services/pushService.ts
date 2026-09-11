/**
 * Notificaciones con la app cerrada.
 *
 * Lo de dentro —el panel y los avisos que saltan mientras se está mirando— ya
 * existía. Esto es lo otro: que suene el teléfono cuando un cliente escribe y
 * Worky no está abierta. Es lo que separa una app de chat de una lista de
 * mensajes que hay que ir a mirar.
 *
 * Solo en el teléfono. En el navegador no se registra nada: las notificaciones
 * web son otra cosa, con otro permiso y otro camino, y llamar aquí al plugin
 * fuera de la app instalada solo da un error de «no implementado».
 */
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabaseConfig';

/** Si este aparato puede recibirlas. En el navegador, no. */
export const puedeRecibirPush = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('PushNotifications');

/**
 * Guarda el token de este aparato.
 *
 * Se escribe en cada arranque y no solo la primera vez: FCM lo rota por su
 * cuenta —al reinstalar, al limpiar los datos, cada cierto tiempo— y un token
 * viejo no falla al enviar, simplemente no llega. `visto_en` sirve para
 * limpiar después los que lleven meses sin aparecer.
 */
const guardarToken = async (token: string) => {
  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id;
  if (!userId) return;

  const { error } = await supabase.from('push_tokens').upsert(
    {
      token,
      user_id: userId,
      plataforma: Capacitor.getPlatform(),
      visto_en: new Date().toISOString(),
    },
    { onConflict: 'token' },
  );
  if (error) console.warn('No se pudo guardar el token de notificaciones:', error.message);
};

/**
 * Pide permiso y engancha este aparato.
 *
 * Se llama después de entrar, no al abrir la app: el token se guarda contra una
 * cuenta, y sin sesión no hay a quién colgárselo. Además, pedir el permiso
 * nada más abrir —antes de que la persona sepa qué es Worky— es la forma más
 * segura de que lo niegue para siempre.
 *
 * Devuelve si quedó enganchado, para poder decirlo en la interfaz sin tener que
 * volver a preguntarle al sistema.
 */
export const engancharNotificaciones = async (
  alLlegarMensaje?: (titulo: string, cuerpo: string, datos: Record<string, unknown>) => void,
): Promise<boolean> => {
  if (!puedeRecibirPush()) return false;

  try {
    // En Android 13 y posteriores esto abre el diálogo del sistema; en los
    // anteriores el permiso viene dado y devuelve «granted» sin preguntar.
    let permiso = await PushNotifications.checkPermissions();
    if (permiso.receive === 'prompt' || permiso.receive === 'prompt-with-rationale') {
      permiso = await PushNotifications.requestPermissions();
    }
    if (permiso.receive !== 'granted') return false;

    // Los oyentes se ponen antes de registrar: el token puede llegar de
    // inmediato, y si no hay quien lo escuche se pierde hasta el siguiente
    // arranque.
    await PushNotifications.removeAllListeners();

    await PushNotifications.addListener('registration', token => {
      void guardarToken(token.value);
    });

    await PushNotifications.addListener('registrationError', err => {
      // El caso típico: falta google-services.json o el proyecto de Firebase no
      // corresponde al paquete. Se avisa y se sigue: la app funciona igual, solo
      // que sin avisos.
      console.warn('No se pudo registrar para notificaciones:', JSON.stringify(err));
    });

    // Con la app abierta el sistema no pinta nada: llega aquí y lo enseña la
    // propia aplicación, que es lo que ya hacía con los mensajes en vivo.
    await PushNotifications.addListener('pushNotificationReceived', n => {
      alLlegarMensaje?.(n.title ?? 'Worky', n.body ?? '', n.data ?? {});
    });

    await PushNotifications.register();
    return true;
  } catch (e) {
    console.warn('Notificaciones no disponibles:', e);
    return false;
  }
};

/**
 * Suelta este aparato al cerrar sesión.
 *
 * Sin esto, quien presta el teléfono o cambia de cuenta seguiría recibiendo los
 * mensajes del anterior: el token sigue colgado de aquel usuario y FCM no sabe
 * nada de sesiones.
 */
export const soltarNotificaciones = async (token?: string) => {
  if (!puedeRecibirPush()) return;
  try {
    await PushNotifications.removeAllListeners();
    if (token) await supabase.from('push_tokens').delete().eq('token', token);
  } catch (e) {
    console.warn('No se pudo soltar el aparato:', e);
  }
};
