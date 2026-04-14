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
 * Use this in every `onChange` handler that deals with money fields.
 */
export const extractRawAmount = (input: string): string => {
  return input.replace(/\D/g, '');
};

/**
 * Converts a raw amount string to a number, defaulting to 0 if empty.
 */
export const parseAmount = (raw: string): number => {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
};
