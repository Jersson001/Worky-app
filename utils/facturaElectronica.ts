/**
 * De la factura de Worky al formato de Factus (`POST /v2/bills/validate`).
 *
 * Es solo traducción: no llama a nadie ni guarda nada. La conexión con Factus
 * irá en una función del servidor, porque las credenciales no pueden vivir en la
 * app (el repositorio es público y el JavaScript se lee). Ver
 * FACTURACION-ELECTRONICA.md.
 *
 * Los precios de Worky son **antes de IVA**: la factura suma el 19 % encima.
 * Factus también pide el precio sin impuesto y le aplica `taxes`, así que se
 * copian tal cual.
 */
import type { InvoiceData } from '../types';

/** 13 cédula de ciudadanía, 31 NIT. Los códigos son de la DIAN. */
export type CodigoDocumento = '13' | '31' | '22' | '41';

export interface ClienteFacturable {
  /** Cédula, NIT o RUT como lo escribió la tienda: «900.123.456-7», «1020304050». */
  documento: string;
  nombre: string;
  correo?: string;
  direccion?: string;
  telefono?: string;
  /** Si la tienda lo eligió. Si no, se infiere y `inferido` sale en true. */
  tipoDocumento?: CodigoDocumento;
}

export interface OpcionesFactura {
  /** Cuántos días de plazo si la factura está pendiente de pago. */
  diasDePlazo?: number;
  /** Porcentaje de IVA. 19 salvo que la tienda no lo cobre. */
  iva?: number;
  /** Se manda la factura por correo al cliente desde Factus. */
  enviarCorreo?: boolean;
  /** Hoy, para fijar el vencimiento. Se inyecta para poder probarlo. */
  hoy?: Date;
}

export class FacturaIncompleta extends Error {
  readonly faltantes: string[];

  constructor(faltantes: string[]) {
    super(`A la factura le falta: ${faltantes.join(', ')}`);
    this.faltantes = faltantes;
  }
}

/** Solo dígitos, y el dígito de verificación aparte si venía con guion. */
export const separarDocumento = (texto: string): { numero: string; dv?: string } => {
  const limpio = texto.trim().replace(/[.\s]/g, '');
  const [base, dv] = limpio.split('-');
  return { numero: base.replace(/\D/g, ''), dv: dv && /^\d$/.test(dv) ? dv : undefined };
};

/**
 * ¿Cédula o NIT? Con guion y dígito de verificación («900123456-7») es NIT.
 * Sin él no hay forma de saberlo con certeza —un NIT sin guion de 9 dígitos y una
 * cédula de 9 dígitos se escriben igual—, así que se supone cédula y se avisa.
 */
export const inferirTipo = (texto: string): { tipo: CodigoDocumento; inferido: boolean } => {
  const { dv } = separarDocumento(texto);
  return dv !== undefined ? { tipo: '31', inferido: false } : { tipo: '13', inferido: true };
};

const dos = (n: number): string => (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2);

const sumarDias = (desde: Date, dias: number): string => {
  const d = new Date(desde);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

export interface FacturaFactus {
  reference_code: string;
  send_email: boolean;
  payment_details: Array<{
    payment_form: '1' | '2';
    payment_method_code: string;
    amount: string;
    due_date?: string;
  }>;
  customer: {
    identification_document_code: CodigoDocumento;
    identification: string;
    dv?: string;
    legal_organization_code: '1' | '2';
    company?: string;
    names?: string;
    email?: string;
    address?: string;
    phone?: string;
  };
  items: Array<{
    code_reference: string;
    name: string;
    quantity: string;
    price: string;
    unit_measure_code: string;
    standard_code: string;
    taxes: Array<{ code: string; rate: string; is_excluded: boolean }>;
  }>;
}

export interface ResultadoTraduccion {
  factura: FacturaFactus;
  /** Cosas que se supusieron y la tienda debería confirmar antes de emitir. */
  supuestos: string[];
}

export const traducirFactura = (
  factura: InvoiceData,
  cliente: ClienteFacturable,
  opciones: OpcionesFactura = {},
): ResultadoTraduccion => {
  const { diasDePlazo = 30, iva = 19, enviarCorreo = true, hoy = new Date() } = opciones;

  // Se junta todo lo que falta para pedirlo de una vez, no de a uno.
  const faltantes: string[] = [];
  const { numero, dv } = separarDocumento(cliente.documento);
  if (!numero) faltantes.push('el documento del cliente');
  if (!cliente.nombre.trim()) faltantes.push('el nombre del cliente');
  if (factura.items.length === 0) faltantes.push('al menos un producto');
  factura.items.forEach((it, i) => {
    if (!(it.quantity > 0)) faltantes.push(`la cantidad de la línea ${i + 1}`);
    if (!(it.price >= 0)) faltantes.push(`el precio de la línea ${i + 1}`);
  });
  if (faltantes.length) throw new FacturaIncompleta(faltantes);

  const supuestos: string[] = [];
  let tipo = cliente.tipoDocumento;
  if (!tipo) {
    const inferencia = inferirTipo(cliente.documento);
    tipo = inferencia.tipo;
    if (inferencia.inferido) supuestos.push('Se supuso que el documento del cliente es una cédula; si es un NIT, hay que indicarlo.');
  }
  const esEmpresa = tipo === '31';
  if (esEmpresa && dv === undefined) {
    supuestos.push('El NIT no trae dígito de verificación; Factus puede rechazarlo.');
  }

  const base = factura.items.reduce((s, it) => s + it.quantity * it.price, 0);
  const total = base * (1 + iva / 100);
  const pagada = factura.status === 'Paid';
  if (!pagada) supuestos.push(`Pendiente de pago: se emite a crédito, a ${diasDePlazo} días.`);

  return {
    supuestos,
    factura: {
      reference_code: factura.number,
      send_email: enviarCorreo && !!cliente.correo,
      payment_details: [
        {
          payment_form: pagada ? '1' : '2',
          payment_method_code: '10',
          amount: dos(total),
          ...(pagada ? {} : { due_date: sumarDias(hoy, diasDePlazo) }),
        },
      ],
      customer: {
        identification_document_code: tipo,
        identification: numero,
        ...(dv !== undefined ? { dv } : {}),
        legal_organization_code: esEmpresa ? '1' : '2',
        ...(esEmpresa ? { company: cliente.nombre.trim() } : { names: cliente.nombre.trim() }),
        ...(cliente.correo ? { email: cliente.correo } : {}),
        ...(cliente.direccion ? { address: cliente.direccion } : {}),
        ...(cliente.telefono ? { phone: cliente.telefono } : {}),
      },
      items: factura.items.map((it, i) => ({
        code_reference: `L${String(i + 1).padStart(3, '0')}`,
        name: it.description.trim() || `Línea ${i + 1}`,
        quantity: dos(it.quantity),
        price: dos(it.price),
        unit_measure_code: '94', // unidad
        standard_code: '999', // código propio, sin estándar
        taxes: [{ code: '01', rate: dos(iva), is_excluded: false }],
      })),
    },
  };
};
