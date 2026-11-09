/**
 * ¿Dónde pueden llegarle notificaciones a quien usa Worky?
 *
 * - **App de Android:** sí, con la app cerrada (FCM, `services/pushService.ts`).
 * - **Navegador de escritorio:** un aviso mientras la página está abierta, aunque
 *   sea en otra pestaña. Es lo único que hace `Notification` a secas.
 * - **Navegador del celular (iPhone o Android):** nada. `new Notification()` no
 *   existe en Safari de iPhone fuera de una web instalada, y en Chrome de Android
 *   lanza un error; las notificaciones web de verdad pedirían un servicio aparte
 *   que Worky no tiene.
 *
 * Por eso no se le pide permiso a quien está en el celular: se lo concedería
 * creyendo que recibirá avisos, y no le llegaría ninguno.
 *
 * Aquí solo va la detección, sin tocar nada del navegador, para poder probarla.
 */

export type Plataforma = 'android' | 'ios' | 'otra';

/** iPhone, iPad —que desde iPadOS 13 dice ser un Mac con pantalla táctil— o Android. */
export const detectarPlataforma = (userAgent: string, puntosTactiles = 0): Plataforma => {
  if (/Android/i.test(userAgent)) return 'android';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  if (/Macintosh/i.test(userAgent) && puntosTactiles > 1) return 'ios';
  return 'otra';
};

export const esCelular = (plataforma: Plataforma): boolean => plataforma !== 'otra';

/** Si vale la pena pedirle permiso de notificaciones al navegador. */
export const convienePedirPermiso = (plataforma: Plataforma, appNativa: boolean, tieneNotification: boolean): boolean =>
  tieneNotification && !appNativa && !esCelular(plataforma);

/**
 * Lo que se le dice a quien usa Worky en el navegador del celular sobre las
 * notificaciones. Vacío si no hace falta decirle nada.
 */
export const avisoDeNotificaciones = (plataforma: Plataforma, appNativa: boolean): string => {
  if (appNativa || plataforma === 'otra') return '';
  return plataforma === 'ios'
    ? 'En iPhone, Worky todavía no puede notificarte con la página cerrada: los avisos de tus tiendas los verás aquí cuando abras Worky.'
    : 'Desde el navegador, los avisos de tus tiendas los verás aquí cuando abras Worky. Para que te suene el celular aunque la tengas cerrada, instala la app de Worky desde Google Play.';
};
