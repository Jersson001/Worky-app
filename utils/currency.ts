/**
 * Currency formatting and amount extraction utilities for COP (Colombian Peso).
 * Single source of truth — replaces 4+ inline copies of the same logic.
 */

const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Formats a number or raw string into a COP currency display.
 * - Number → `$ 1.500.000`
 * - String → se interpreta con parseAmount, así que conserva los decimales
 *   (antes se descartaban al filtrar por dígitos y el monto mostrado no
 *   coincidía con el almacenado).
 */
export const formatCurrency = (value: string | number): string => {
  if (typeof value === 'number') {
    return COP_FORMATTER.format(value);
  }
  if (!/\d/.test(value)) return '';
  return COP_FORMATTER.format(parseMoney(value));
};

/**
 * Convierte texto de dinero a número distinguiendo el separador decimal del
 * de miles. Hace falta porque el campo se muestra agrupado ("2.000.000") y al
 * editarlo esos puntos vuelven a entrar al parser.
 *
 * - "1.500,50" / "1,500.50" → 1500.5   (dos separadores: el último es decimal)
 * - "2.000.000" / "2.00.000" → 2000000 (el mismo separador repetido: miles)
 * - "200.000"                → 200000  (3 dígitos detrás: miles; el peso no
 *                                       usa 3 decimales)
 * - "1500,75" / "2,5"        → 1500.75 / 2.5
 */
export const parseMoney = (raw: string): number => {
  const cleaned = (raw ?? '').replace(/[^\d.,]/g, '');
  if (!cleaned) return 0;

  const separators = (cleaned.match(/[.,]/g) || []).length;
  const mixed = cleaned.includes('.') && cleaned.includes(',');

  let decimalIndex = -1;
  if (mixed) {
    decimalIndex = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','));
  } else if (separators === 1) {
    const i = cleaned.search(/[.,]/);
    // Exactamente 3 dígitos detrás ⇒ separador de miles, no decimal.
    if (cleaned.length - i - 1 !== 3) decimalIndex = i;
  }
  // Un mismo separador repetido ⇒ todos son de miles.

  const intPart = (decimalIndex === -1 ? cleaned : cleaned.slice(0, decimalIndex)).replace(/\D/g, '');
  const decPart = decimalIndex === -1 ? '' : cleaned.slice(decimalIndex + 1).replace(/\D/g, '');

  const n = Number(`${intPart || '0'}.${decPart || '0'}`);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Monto agrupado y sin símbolo, para mostrarlo dentro de un input.
 * 1500.5 → "1.500,5" · 1500 → "1.500" · 0 o vacío → "".
 */
export const formatAmountForInput = (value: string | number | undefined | null): string => {
  const amount = typeof value === 'number' ? value : parseMoney(value ?? '');
  if (!amount) return '';
  return amount.toLocaleString('es-CO', { maximumFractionDigits: 2 });
};

/**
 * Convierte a número un valor decimal simple (metrajes, cantidades), donde no
 * hay separadores de miles: el ÚLTIMO separador es siempre el decimal.
 * Ej: "2,45" → 2.45, "0.6" → 0.6, "1.500,50" → 1500.50
 *
 * Para dinero usa parseMoney, que además reconoce el separador de miles.
 */
export const parseAmount = (raw: string): number => {
  if (!raw) return 0;

  let normalized = raw.replace(/\s/g, '');

  if (/[.,]/.test(normalized)) {
    const lastSeparatorIndex = Math.max(
      normalized.lastIndexOf('.'),
      normalized.lastIndexOf(',')
    );

    const beforeLast = normalized.substring(0, lastSeparatorIndex).replace(/[.,]/g, '');
    const afterLast = normalized.substring(lastSeparatorIndex + 1);

    normalized = beforeLast + '.' + afterLast;
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};
