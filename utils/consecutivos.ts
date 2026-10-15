/**
 * El número de los documentos que se crean: COT-A001, CC-A001, FAC-A001,
 * RC-A001 y RG-A001. Un documento nuevo con número entra aquí, no con su propio
 * `Math.random()`.
 *
 * Hasta aquí cada uno llevaba `Math.random() * 10000`: sin orden, sin garantía
 * de ser único y sin forma de saber cuántos se han mandado. Importaba más de lo
 * que parece: el número de la cotización es también el código del proyecto que
 * nace al aprobarla, y con dos cotizaciones del mismo número el segundo
 * proyecto «ya existía» y no se creaba.
 *
 * La letra es la serie. Cada serie lleva 999 documentos —A001 a A999— y al
 * llenarse empieza la siguiente: B001, y así hasta Z999, que sigue con AA001.
 * Así el número se queda siempre en tres cifras y cabe en cualquier lado.
 *
 * Internamente solo se cuenta cuántos se han mandado (1, 2, 3…); la serie y el
 * número salen de esa cuenta. Es lo que se guarda.
 *
 * Esto es la parte pura —formato y siguiente número—. Dónde se guarda la cuenta
 * está en services/consecutivosService.ts.
 */

/** COT cotización · CC cuenta de cobro · FAC factura · RC recibo de caja · RG comprobante de gasto. */
export type TipoConsecutivo = 'COT' | 'CC' | 'FAC' | 'RC' | 'RG';

/** Cuántos documentos caben en una serie antes de pasar a la letra siguiente. */
export const POR_SERIE = 999;

/** 0 → A, 25 → Z, 26 → AA, 27 → AB… (como las columnas de una hoja de cálculo). */
const letrasDeSerie = (indice: number): string => {
  let letras = '';
  let i = indice;
  do {
    letras = String.fromCharCode(65 + (i % 26)) + letras;
    i = Math.floor(i / 26) - 1;
  } while (i >= 0);
  return letras;
};

/** A → 0, Z → 25, AA → 26. Lo contrario de `letrasDeSerie`. */
const indiceDeLetras = (letras: string): number =>
  letras.toUpperCase().split('').reduce((acc, c) => acc * 26 + (c.charCodeAt(0) - 64), 0) - 1;

/** El documento número `n` (1, 2, 3…) con su serie: 1 → CC-A001, 1000 → CC-B001. */
export const formatearConsecutivo = (prefijo: TipoConsecutivo, n: number): string => {
  const base = Math.max(1, Math.floor(n)) - 1;
  const serie = letrasDeSerie(Math.floor(base / POR_SERIE));
  const numero = (base % POR_SERIE) + 1;
  return `${prefijo}-${serie}${String(numero).padStart(3, '0')}`;
};

/**
 * Cuántos documentos van, según un código de este tipo; null si no es de él.
 *
 * Entiende también los anteriores a las series —«COT-042», sin letra, y los que
 * eran al azar—: se leen como la cifra que traen, que es lo que ve quien los
 * tiene delante.
 */
export const numeroDeConsecutivo = (codigo: unknown, prefijo: TipoConsecutivo): number | null => {
  if (typeof codigo !== 'string') return null;
  const m = codigo.trim().match(new RegExp(`^${prefijo}-([A-Za-z]*)(\\d+)$`, 'i'));
  if (!m) return null;
  const cifras = parseInt(m[2], 10);
  return m[1] ? indiceDeLetras(m[1]) * POR_SERIE + cifras : cifras;
};

/**
 * El siguiente número libre, a partir del último que se usó.
 *
 * `usados` son los códigos que ya están a la vista —los del chat abierto—, para
 * no repetir uno que ya está ahí. «COT-42» y «COT-042» son el mismo número para
 * quien los lee, así que se comparan como números y no como texto.
 */
export const siguienteConsecutivo = (ultimo: number, prefijo: TipoConsecutivo, usados: unknown[] = []): number => {
  const ocupados = new Set<number>();
  for (const u of usados) {
    const n = numeroDeConsecutivo(u, prefijo);
    if (n !== null) ocupados.add(n);
  }
  let n = Math.max(0, Math.floor(ultimo || 0)) + 1;
  while (ocupados.has(n)) n++;
  return n;
};
