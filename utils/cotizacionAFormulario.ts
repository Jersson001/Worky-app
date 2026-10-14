/**
 * De una cotización ya enviada de vuelta al formulario.
 *
 * Es lo que permite copiarla o editarla sin armar todo otra vez: el cliente que
 * quiere «lo mismo con otra medida» recibe el mismo documento con tres cambios,
 * no uno nuevo desde cero.
 *
 * Lo que el formulario no guarda tal cual lo manda la cotización —los días de
 * vigencia, la cuenta de cobro— se deduce de lo que quedó escrito en ella.
 */
import type { QuoteFormState } from '../hooks/useChatFormState';
import type { PaymentAccount } from '../types';

const VIGENCIAS = [7, 15, 30];

/** La cotización guarda fechas, no días: se vuelve a la vigencia más cercana. */
const diasDeVigencia = (meta: any): string => {
  const desde = new Date(meta.date).getTime();
  const hasta = new Date(meta.validUntil).getTime();
  if (!Number.isFinite(desde) || !Number.isFinite(hasta)) return '15';
  const dias = Math.round((hasta - desde) / 86_400_000);
  const cercana = VIGENCIAS.reduce((mejor, v) => (Math.abs(v - dias) < Math.abs(mejor - dias) ? v : mejor), VIGENCIAS[0]);
  return String(cercana);
};

const texto = (n: unknown, porDefecto: string): string =>
  typeof n === 'number' && Number.isFinite(n) ? String(n) : porDefecto;

export const formularioDesdeCotizacion = (
  meta: any,
  cuentas: PaymentAccount[],
): Partial<QuoteFormState> => {
  // Copia profunda: lo que se edite en el formulario no puede tocar el mensaje
  // del chat, que es lo que ya vio el cliente.
  const copia = structuredClone(meta);
  const personalizada = copia.mode === 'personalizada' && Array.isArray(copia.sections);

  const cuenta = copia.formaPago?.cuenta;
  const cuentaCobro = cuenta
    ? cuentas.find(c => c.accountNumber === cuenta.accountNumber && c.bankName === cuenta.bankName)
    : undefined;

  return {
    mode: personalizada ? 'personalizada' : 'basica',
    // En personalizada las líneas salen de las secciones: los ítems del mensaje
    // son esas mismas líneas aplanadas, y volverlas a meter las duplicaría.
    ...(personalizada ? { sections: copia.sections } : {}),
    ...(!personalizada && Array.isArray(copia.items) && copia.items.length ? { items: copia.items } : {}),
    validDays: diasDeVigencia(copia),
    taxType: copia.taxType ?? 'none',
    taxPercentage: texto(copia.taxPercentage, '19'),
    aiuAdmin: texto(copia.aiuAdmin, '5'),
    aiuImprevistos: texto(copia.aiuImprevistos, '5'),
    aiuUtilidad: texto(copia.aiuUtilidad, '5'),
    aiuIva: texto(copia.aiuIva, '19'),
    clientAddress: copia.clientAddress ?? '',
    clientPhone: copia.clientPhone ?? '',
    clientDocumento: copia.clientDocumento ?? '',
    anticipoPorcentaje: texto(copia.formaPago?.anticipoPorcentaje, '50'),
    cuentaCobroId: cuentaCobro?.id ?? '',
    ...(copia.condiciones ? { condiciones: copia.condiciones } : {}),
  };
};
