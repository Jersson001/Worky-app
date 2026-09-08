/**
 * El avatar de quien no tiene foto: sus iniciales sobre un color.
 *
 * Antes se le pedían a `ui-avatars.com`, con el nombre de la persona dentro de
 * la dirección. Eso era mandarle el nombre de cada contacto a un servicio
 * ajeno —y en el formulario de Play obligaba a declarar que Worky comparte
 * nombres con terceros—, a cambio de una imagen que se dibuja en cuatro líneas.
 *
 * Se dibuja aquí, así que además sale al instante y funciona sin cobertura,
 * que es donde antes quedaban los huecos grises.
 */

/**
 * Un color estable a partir del nombre.
 *
 * Estable importa: si el color cambiara entre pantallas, la misma persona se
 * vería distinta en la lista y en el chat. Sale del nombre, así que siempre es
 * el mismo sin guardar nada.
 */
const tonoDe = (texto: string): number => {
  let h = 0;
  for (let i = 0; i < texto.length; i++) {
    h = (h * 31 + texto.charCodeAt(i)) % 360;
  }
  return h;
};

/**
 * Las iniciales: la primera letra de las dos primeras palabras.
 *
 * Se salta lo que no son letras —«3192422562» o «@lucia» darían iniciales
 * ilegibles— y cae en «?» cuando no queda nada aprovechable.
 */
const inicialesDe = (nombre: string): string => {
  const palabras = nombre
    .trim()
    .split(/\s+/)
    .map(p => p.replace(/[^\p{L}]/gu, ''))
    .filter(Boolean);

  if (palabras.length === 0) return '?';
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase();
  return (palabras[0][0] + palabras[1][0]).toUpperCase();
};

/**
 * El avatar, como imagen lista para un `src`.
 *
 * Va en `data:` y no en un archivo porque tiene que servir también dentro de
 * los documentos que se suben a Storage: allí no hay a quién pedirle nada.
 */
export const avatarDeIniciales = (nombre?: string | null): string => {
  const texto = (nombre || '').trim() || 'Contacto';
  const tono = tonoDe(texto);
  const fondo = `hsl(${tono} 58% 42%)`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">` +
    `<rect width="128" height="128" fill="${fondo}"/>` +
    `<text x="64" y="64" fill="#ffffff" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" ` +
    `font-size="52" font-weight="600" text-anchor="middle" dominant-baseline="central">` +
    `${inicialesDe(texto)}</text></svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

/**
 * La foto guardada, si de verdad sirve.
 *
 * Las filas de antes llevan dentro una dirección de `ui-avatars.com`. Se
 * descartan aquí, y no solo en la base, porque un documento compartido guarda
 * su copia de los datos y sigue vivo treinta días: sin esto, esas páginas
 * seguirían pidiéndole la imagen al tercero mucho después de limpiar las filas.
 */
export const fotoOIniciales = (foto: string | null | undefined, nombre?: string | null): string =>
  foto && !foto.includes('ui-avatars.com') ? foto : avatarDeIniciales(nombre);
