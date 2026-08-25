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
  return COP_FORMATTER.format(parseAmount(value));
};

/**
 * Monto agrupado y sin símbolo, para mostrarlo dentro de un input.
 * 1500.5 → "1.500,5" · 1500 → "1.500" · 0 o vacío → "".
 */
export const formatAmountForInput = (value: string | number | undefined | null): string => {
  const amount = typeof value === 'number' ? value : parseAmount(value ?? '');
  if (!amount) return '';
  return amount.toLocaleString('es-CO', { maximumFractionDigits: 2 });
};

/**
 * Convierte a número un monto ya normalizado ("20000", "1500.5") o un valor
 * decimal simple (metrajes): el ÚLTIMO separador es el decimal.
 * Ej: "2,45" → 2.45, "0.6" → 0.6, "1.500,50" → 1500.50
 *
 * No intenta interpretar separadores de miles: el texto que el usuario teclea
 * en un campo de dinero lo resuelve CurrencyInput, que formatea en vivo y por
 * eso siempre sabe qué puntos puso él.
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
