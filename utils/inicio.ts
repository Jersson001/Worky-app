/**
 * Las cuentas del Inicio: qué hay por cobrar, qué cotizaciones esperan respuesta
 * y cómo se escriben las cifras en una tarjeta pequeña.
 *
 * Aquí no se lee nada de la base: entran filas y salen listas, como en
 * utils/finanzas.ts. Lo que lee la base está en services/inicioService.ts.
 *
 * El Inicio ordena lo que hace una persona a diario: responder los chats, cobrar
 * y mandar cotizaciones. Estas son las dos últimas.
 */
import { TIPOS_DE_NEGOCIO } from './tiposDeNegocio';

/** Mismas filas que lee Estados Financieros, y por eso el mismo formato. */
export interface FilaPendiente {
  id: string;
  type: string;
  is_paid: boolean | null;
  timestamp: string | null;
  recipient_id: string | null;
  recipient_contact: string | null;
  metadata: Record<string, any> | null;
}

export interface ContactoDelInicio {
  id: string;
  clientName: string;
  role?: string;
}

export interface Pendiente {
  id: string;
  tipo: 'invoice' | 'collection_account' | 'quote';
  numero: string;
  monto: number;
  /** Null si el destinatario ya no está entre los contactos: no hay chat al que ir. */
  contactoId: string | null;
  cliente: string;
  fecha: Date;
  /** Solo cotizaciones: ya pasó su vigencia sin respuesta. */
  vencida: boolean;
}

export interface PendientesDelInicio {
  /** Facturas y cuentas de cobro mandadas que nadie ha marcado como pagadas. */
  porCobrar: { total: number; items: Pendiente[] };
  /** Cotizaciones mandadas sin aceptar ni rechazar. */
  cotizaciones: { items: Pendiente[] };
}

const numero = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fechaDe = (iso: string | null | undefined): Date => {
  const d = iso ? new Date(iso) : new Date(NaN);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
};

/**
 * Qué está pendiente de lo que mandó quien vende.
 *
 * Una cotización está pendiente si no tiene estado o dice `pending`: así nacen, y
 * `accepted` y `rejected` son lo único que las cierra. Una factura o cuenta de
 * cobro, mientras no se marque pagada. Lo que se manda a un proveedor no cuenta:
 * un recibo o una cuenta a un proveedor es plata que sale, no que se espera.
 */
export const armarPendientes = (
  filas: FilaPendiente[],
  contactos: ContactoDelInicio[],
  hoy: Date = new Date(),
): PendientesDelInicio => {
  const porId = new Map(contactos.map(c => [c.id, c]));
  const porCobrar: Pendiente[] = [];
  const cotizaciones: Pendiente[] = [];

  for (const f of filas) {
    const tipo = f.type;
    if (tipo !== 'invoice' && tipo !== 'collection_account' && tipo !== 'quote') continue;

    const destinatario = f.recipient_id || f.recipient_contact || null;
    const contacto = destinatario ? porId.get(destinatario) : undefined;
    if (contacto?.role === 'supplier') continue;

    const m = f.metadata || {};
    const item: Pendiente = {
      id: f.id,
      tipo,
      numero: typeof m.number === 'string' ? m.number : '',
      monto: numero(m.total ?? m.amount),
      contactoId: contacto ? contacto.id : null,
      cliente: contacto?.clientName || (typeof m.clientName === 'string' && m.clientName) || (typeof m.directedTo === 'string' && m.directedTo) || 'Sin cliente',
      fecha: fechaDe(f.timestamp),
      vencida: false,
    };

    if (tipo === 'quote') {
      if (m.status && m.status !== 'pending') continue;
      const vence = m.validUntil ? new Date(m.validUntil) : null;
      item.vencida = !!vence && !Number.isNaN(vence.getTime()) && vence.getTime() < hoy.getTime();
      cotizaciones.push(item);
    } else {
      if (f.is_paid) continue;
      porCobrar.push(item);
    }
  }

  // Lo más viejo por cobrar primero: es lo que más urge. Las cotizaciones, lo
  // más reciente primero: es con lo que el cliente todavía está.
  porCobrar.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  cotizaciones.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  return {
    porCobrar: { total: porCobrar.reduce((s, p) => s + p.monto, 0), items: porCobrar },
    cotizaciones: { items: cotizaciones },
  };
};

/**
 * La cifra corta de una tarjeta: «$850 mil», «$4,8 M». Cabe donde un monto
 * completo —«$4.850.000»— se partiría en dos renglones.
 */
export const cifraCorta = (valor: number): string => {
  const n = Math.round(valor);
  const signo = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    // Sin decimal cuando es redondo: «$5 M», no «$5,0 M».
    const texto = Number.isInteger(Math.round(m * 10) / 10) ? String(Math.round(m)) : (Math.round(m * 10) / 10).toString().replace('.', ',');
    return `${signo}$${texto} M`;
  }
  if (abs >= 1_000) return `${signo}$${Math.round(abs / 1_000)} mil`;
  return `${signo}$${abs}`;
};

export type FamiliaDeNegocio = 'obra' | 'comercio' | 'otro';

/**
 * A qué familia pertenece el negocio, para decidir qué va primero en el Inicio.
 *
 * Sin oficio declarado —o con uno que no se reconoce— se trata como obra, que es
 * lo que ya hacen los capítulos de la cotización: son los vendedores antiguos, y
 * les quitarían herramientas que usan.
 */
export const familiaDeNegocio = (businessType?: string | null): FamiliaDeNegocio =>
  TIPOS_DE_NEGOCIO.find(t => t.value === businessType)?.familia ?? 'obra';
