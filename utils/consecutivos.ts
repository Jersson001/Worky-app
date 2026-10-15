/**
 * El número de los documentos que se mandan: COT-001, CC-001, FAC-001, RC-001.
 *
 * Hasta aquí cada uno llevaba `Math.random() * 10000`: sin orden, sin garantía
 * de ser único y sin forma de saber cuántos se han mandado. Importaba más de lo
 * que parece: el número de la cotización es también el código del proyecto que
 * nace al aprobarla, y con dos cotizaciones del mismo número el segundo
 * proyecto «ya existía» y no se creaba.
 *
 * Esto es la parte pura —formato y siguiente número—. Dónde se guarda la cuenta
 * está en services/consecutivosService.ts.
 */

/** COT cotización · CC cuenta de cobro · FAC factura · RC recibo de caja. */
export type TipoConsecutivo = 'COT' | 'CC' | 'FAC' | 'RC';

/** Tres cifras mínimo: 001, 042, 999, y después 1000 sin cortarse. */
export const formatearConsecutivo = (prefijo: TipoConsecutivo, n: number): string =>
  `${prefijo}-${String(n).padStart(3, '0')}`;

/** El número que lleva un código de este tipo, o null si no es de él. */
export const numeroDeConsecutivo = (codigo: unknown, prefijo: TipoConsecutivo): number | null => {
  if (typeof codigo !== 'string') return null;
  const m = codigo.trim().match(new RegExp(`^${prefijo}-(\\d+)$`, 'i'));
  return m ? parseInt(m[1], 10) : null;
};

/**
 * El siguiente número libre, a partir del último que se usó.
 *
 * `usados` son los códigos que ya están a la vista —los del chat abierto—: los
 * anteriores a esto eran al azar, y «COT-42» y «COT-042» son el mismo número
 * para quien los lee, así que se comparan como números y no como texto.
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
