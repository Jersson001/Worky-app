/**
 * Currency formatting and amount extraction utilities for COP (Colombian Peso).
 * Single source of truth — replaces 4+ inline copies of the same logic.
 */

const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/**
 * Formats a number or raw string into a COP currency display.
 * - Number → `$ 1.500.000`
 * - String → strips non-digits, then formats.
 */
export const formatCurrency = (value: string | number): string => {
  if (typeof value === 'number') {
    return COP_FORMATTER.format(value);
  }
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return `$ ${Number(digits).toLocaleString('es-CO')}`;
};

/**
 * Extracts y normaliza el monto del input del usuario.
 * Convierte "1.500,50" → "1500.50" para almacenar correctamente.
 * Permite puntos (.) y comas (,) como separadores decimales.
 */
export const extractRawAmount = (input: string): string => {
  const raw = input.replace(/[^\d.,]/g, '');
  if (!raw) return '';

  const amount = parseAmount(raw);
  return amount.toString();
};

/**
 * Convierte un string de monto a número, soportando . o , como decimal.
 * El ÚLTIMO separador es el decimal, los anteriores son de miles.
 * Ej: "1.500,50" → 1500.50, "1,500.50" → 1500.50
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
