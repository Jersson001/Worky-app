/**
 * Los datos legales de la aplicación, en un solo sitio.
 *
 * Viven aquí porque los usan tres cosas que no se hablan entre ellas: la
 * casilla de aceptación del registro, la pantalla de «Legal» y el pie de los
 * documentos. Tenerlos repetidos terminaba en una pantalla diciendo un NIT y
 * otra diciendo otro.
 */

/** Quién publica Worky. Del RUT, no de memoria. */
export const EMPRESA = {
  razonSocial: 'FERRY APP S.A.S.',
  nit: '902.028.115-2',
  // No es la del RUT: esa es la casa del representante legal y estas páginas
  // las ve cualquiera que abra la app. La Ley 1581 sí pide una dirección del
  // responsable, así que va esta, de correspondencia.
  direccion: 'Calle 22J No. 114A 46',
  ciudad: 'Bogotá D.C., Colombia',
  correo: 'contacto@ferryapp.co',
} as const;

/**
 * Las páginas legales van en `public/`, así que Vite las copia al build y
 * Capacitor las empaqueta: el enlace funciona igual en la web y dentro de la
 * aplicación, y sin conexión.
 */
export const URL_PRIVACIDAD = '/privacidad.html';
export const URL_TERMINOS = '/terminos.html';

/**
 * Qué versión de los documentos aceptó quien se registra.
 *
 * Se guarda con la fecha de aceptación porque la Ley 1581 pide poder probar
 * la autorización, y el titular puede pedirla. Sin la versión, la prueba solo
 * diría «aceptó algo, algún día».
 *
 * Al cambiar los documentos se sube esta fecha, y a quien aceptó una versión
 * anterior habrá que volver a pedírsela.
 */
// 2026-09-20: la política añade el token de notificaciones y a Google como
// encargado, para el aviso y para «Inicia sesión con Google».
export const VERSION_POLITICAS = '2026-09-20';

/** El año del aviso de derechos: arranca en el de la constitución. */
export const ANIO_INICIAL = 2025;

export const avisoDerechos = (): string => {
  const ahora = new Date().getFullYear();
  const periodo = ahora > ANIO_INICIAL ? `${ANIO_INICIAL}–${ahora}` : `${ANIO_INICIAL}`;
  return `© ${periodo} ${EMPRESA.razonSocial}. Todos los derechos reservados.`;
};

/** Lo que se guarda al aceptar, para poder probarlo después. */
export const constanciaDeAceptacion = () => ({
  acepto_politicas_en: new Date().toISOString(),
  version_politicas: VERSION_POLITICAS,
});
