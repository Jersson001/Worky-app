/** A dónde se paga hoy, a mano. Cuando entre Wompi, esto deja de mostrarse. */
export const NEQUI_KEY = '0091829443';
export const WHATSAPP_NUMBER = '573142036659';

/** Lo que cuesta el primer pago con el kit NFC, y el mes normal. En pesos. */
export const PRECIO_KIT_PRIMER_MES = 15000;
export const PRECIO_MES = 29900;

export const enPesos = (n: number): string => `$${n.toLocaleString('es-CO')}`;
