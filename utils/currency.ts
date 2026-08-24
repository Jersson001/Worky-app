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
 * Extracts the raw numeric string from a user-typed currency input.
 * Permite puntos (.) y comas (,) como separadores decimales.
 */
export const extractRawAmount = (input: string): string => {
  return input.replace(/[^\d.,]/g, '');
};

/**
 * Convierte un string de monto a número, soportando . o , como decimal.
 * Ej: "1.500,50" → 1500.50, "1,500.50" → 1500.50
 */
export const parseAmount = (raw: string): number => {
  if (!raw) return 0;

  const normalized = raw
    .replace(/\s/g, '')
    .replace(/[.,]/g, (match) => match === ',' ? '.' : '');

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};
