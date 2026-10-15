/**
 * El borrador de una cuenta de cobro, guardado en el teléfono.
 *
 * Mismo criterio que el de la cotización (utils/borradorCotizacion.ts): solo del
 * vendedor, no sale del teléfono, uno por contacto y por cuenta, y uno más por
 * cada cuenta de cobro que se copia o se edita. No hay fotos que omitir.
 */
import type { CollectionFormState } from '../hooks/useChatFormState';
import type { PaymentAccount, Project } from '../types';

/** De qué cuenta de cobro ya enviada viene el borrador, si viene de una. */
export interface OrigenCobro {
  tipo: 'copia' | 'edicion';
  messageId: string;
  numero: string;
  metadataId?: string;
}

export interface BorradorCobro {
  form: CollectionFormState;
  guardado: number;
  origen?: OrigenCobro;
}

const PREFIJO = 'worky_borrador_cobro';

export const claveBorradorCobro = (uid: string, contactId: string, origen?: Pick<OrigenCobro, 'tipo' | 'messageId'>): string =>
  `${PREFIJO}:${uid}:${contactId}${origen ? `:${origen.tipo}:${origen.messageId}` : ''}`;

/** Las viñetas sueltas no son contenido: el campo las pone solo al enfocarse. */
export const conceptoVacio = (concepto: string): boolean => !concepto.replace(/•/g, '').trim();

/** Si el formulario no tiene nada que valga la pena guardar. */
export const cobroVacio = (f: CollectionFormState): boolean =>
  conceptoVacio(f.concept) && !f.amount && !f.clientAddress.trim();

export const leerBorradorCobro = (clave: string): BorradorCobro | null => {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo ? (JSON.parse(crudo) as BorradorCobro) : null;
  } catch {
    return null;
  }
};

export const borrarBorradorCobro = (clave: string): void => {
  try {
    localStorage.removeItem(clave);
  } catch {
    /* sin almacenamiento no hay borrador, y la cuenta de cobro sigue funcionando */
  }
};

/** Un formulario vacío no borra el borrador que hubiera: borrar es enviar o descartar. */
export const guardarBorradorCobro = (clave: string, form: CollectionFormState, origen?: OrigenCobro): BorradorCobro | null => {
  if (cobroVacio(form)) return leerBorradorCobro(clave);
  const borrador: BorradorCobro = { form, guardado: Date.now(), ...(origen ? { origen } : {}) };
  try {
    localStorage.setItem(clave, JSON.stringify(borrador));
  } catch (e) {
    console.warn('No se pudo guardar el borrador de la cuenta de cobro:', e);
  }
  return borrador;
};

/** Todos los borradores de un contacto, el más reciente primero. */
export const listarBorradoresCobro = (uid: string, contactId: string): { clave: string; borrador: BorradorCobro }[] => {
  const base = claveBorradorCobro(uid, contactId);
  const encontrados: { clave: string; borrador: BorradorCobro }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const clave = localStorage.key(i);
      // «:» tras la base: sin él, el contacto «a» recogería los de «ab».
      if (!clave || (clave !== base && !clave.startsWith(`${base}:`))) continue;
      const borrador = leerBorradorCobro(clave);
      if (borrador) encontrados.push({ clave, borrador });
    }
  } catch {
    /* sin almacenamiento no hay borradores */
  }
  return encontrados.sort((a, b) => b.borrador.guardado - a.borrador.guardado);
};

/**
 * Las piezas del formulario que salen de una cuenta de cobro ya enviada.
 *
 * La cuenta de pago se copió entera en el mensaje, así que se vuelve a buscar en
 * la libreta por banco y número; si ya no está, el formulario abre sin cuenta.
 * El proyecto solo dejó su nombre: se busca por él.
 */
export const formularioDesdeCobro = (
  meta: any,
  cuentas: PaymentAccount[],
  proyectos: Project[],
  base: Pick<CollectionFormState, 'issuerRut' | 'issuerCedula' | 'issuerPhone'>,
): CollectionFormState => {
  const efectivo = meta?.bankName === 'Pago en Efectivo';
  const cuenta = efectivo
    ? undefined
    : cuentas.find(c => c.bankName === meta?.bankName && c.accountNumber === meta?.accountNumber);
  const proyecto = meta?.projectName ? proyectos.find(p => p.name === meta.projectName) : undefined;
  return {
    amount: meta?.amount != null ? String(meta.amount) : '',
    concept: String(meta?.concept ?? ''),
    directedTo: String(meta?.directedTo ?? ''),
    nit: String(meta?.nit ?? ''),
    clientAddress: String(meta?.clientAddress ?? ''),
    // Si la original no los traía —se mandó antes de que existieran— se usan
    // los de siempre del usuario, que es lo que se querría en una copia.
    issuerRut: String(meta?.issuerRut ?? base.issuerRut),
    issuerCedula: String(meta?.issuerCedula ?? base.issuerCedula),
    issuerPhone: String(meta?.issuerPhone ?? base.issuerPhone),
    selectedAccount: efectivo ? 'efectivo' : (cuenta?.id ?? ''),
    selectedProject: proyecto?.id ?? '',
  };
};
