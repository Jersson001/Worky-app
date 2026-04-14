/**
 * Tax calculation utilities for Colombian invoicing.
 * Unifies AIU / IVA / percentage tax logic that was duplicated 3× in ChatWindow.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AIUParams {
  adminPercent: number;      // default 5
  imprevistosPercent: number; // default 5
  utilidadPercent: number;    // default 5
  ivaPercent: number;         // default 19 (applied on utilidad only)
}

export interface AIUBreakdown {
  administracion: number;
  imprevistos: number;
  utilidad: number;
  ivaUtilidad: number;
  totalTax: number;
}

export interface TaxResult {
  subtotal: number;
  taxAmount: number;
  total: number;
  breakdown?: AIUBreakdown;
}

export type TaxType = 'none' | 'iva' | 'percentage' | 'aiu';

// ─── Constants ───────────────────────────────────────────────────────────────

export const DEFAULT_AIU: AIUParams = {
  adminPercent: 5,
  imprevistosPercent: 5,
  utilidadPercent: 5,
  ivaPercent: 19,
};

export const DEFAULT_IVA_RATE = 19;

// ─── Calculators ─────────────────────────────────────────────────────────────

/**
 * Calculate AIU breakdown and total tax from a subtotal.
 */
export const calculateAIU = (
  subtotal: number,
  params: Partial<AIUParams> = {}
): AIUBreakdown => {
  const p = { ...DEFAULT_AIU, ...params };

  const administracion = subtotal * (p.adminPercent / 100);
  const imprevistos   = subtotal * (p.imprevistosPercent / 100);
  const utilidad      = subtotal * (p.utilidadPercent / 100);
  const ivaUtilidad   = utilidad * (p.ivaPercent / 100);

  return {
    administracion,
    imprevistos,
    utilidad,
    ivaUtilidad,
    totalTax: administracion + imprevistos + utilidad + ivaUtilidad,
  };
};

/**
 * Calculate simple percentage-based tax.
 */
export const calculatePercentageTax = (
  subtotal: number,
  percentage: number
): number => {
  return subtotal * (percentage / 100);
};

/**
 * Unified tax dispatcher — single entry point for any tax type.
 */
export const calculateTax = (
  subtotal: number,
  taxType: TaxType,
  options: {
    percentage?: number;
    aiu?: Partial<AIUParams>;
  } = {}
): TaxResult => {
  switch (taxType) {
    case 'iva': {
      const taxAmount = calculatePercentageTax(subtotal, DEFAULT_IVA_RATE);
      return { subtotal, taxAmount, total: subtotal + taxAmount };
    }

    case 'percentage': {
      const pct = options.percentage ?? DEFAULT_IVA_RATE;
      const taxAmount = calculatePercentageTax(subtotal, pct);
      return { subtotal, taxAmount, total: subtotal + taxAmount };
    }

    case 'aiu': {
      const breakdown = calculateAIU(subtotal, options.aiu);
      return {
        subtotal,
        taxAmount: breakdown.totalTax,
        total: subtotal + breakdown.totalTax,
        breakdown,
      };
    }

    case 'none':
    default:
      return { subtotal, taxAmount: 0, total: subtotal };
  }
};
