/**
 * Cómo se escribe una calificación: «★★★★☆», «4,6», «12 opiniones».
 * Texto puro, sin red ni pantalla, para poder probarlo.
 */

/** «★★★★☆» para un número de 0 a 5; se redondea y se acota. */
export const estrellasEnTexto = (n: number): string => {
  const llenas = Math.max(0, Math.min(5, Math.round(n)));
  return '★'.repeat(llenas) + '☆'.repeat(5 - llenas);
};

/** 4.6 → «4,6». El decimal con coma, como se escribe en Colombia. Un entero sale sin decimal: 4 → «4,0». */
export const promedioEnTexto = (promedio: number): string =>
  (Math.round(promedio * 10) / 10).toFixed(1).replace('.', ',');

export const textoDeOpiniones = (total: number): string =>
  total === 1 ? '1 opinión' : `${total} opiniones`;

/** Lo que va en la cabecera del catálogo: invita a calificar si nadie lo ha hecho. */
export const textoDeLaCabecera = (total: number, promedio: number): string =>
  total === 0 ? '☆ Sé el primero en calificar' : `★ ${promedioEnTexto(promedio)} · ${textoDeOpiniones(total)}`;

/**
 * El ancho de cada barra del reparto, de 5 estrellas a 1, en porcentaje.
 * Si nadie ha calificado, todas en 0: sin dividir entre cero.
 */
export const repartoEnPorcentajes = (porEstrella: [number, number, number, number, number]): number[] => {
  const total = porEstrella.reduce((s, n) => s + n, 0);
  if (total === 0) return [0, 0, 0, 0, 0];
  // De 5 a 1: la lista llega de 1 a 5.
  return [4, 3, 2, 1, 0].map(i => Math.round((porEstrella[i] / total) * 100));
};
