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
  direccion: 'Carrera 112 No. 23 C 21',
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
export const VERSION_POLITICAS = '2026-09-01';

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
