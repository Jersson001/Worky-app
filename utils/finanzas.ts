/**
 * Las cuentas de Estados Financieros.
 *
 * Aquí no se lee nada de la base: entran filas y salen cifras, para que se
 * pueda probar con datos sin montar la pantalla.
 *
 * Tres números distintos que antes se confundían en uno solo, «ingresos»:
 *
 * - **Vendido**: lo que vale lo que se cerró. Un proyecto con valor.
 * - **Cobrado**: la plata que entró de verdad. Recibos de caja, y facturas y
 *   cuentas de cobro marcadas como pagadas —el mismo criterio que el balance
 *   del proyecto en la ficha del contacto—.
 * - **Gastos**: lo que costó hacerlo.
 *
 * El reporte contaba como ingreso el valor entero del proyecto el día en que
 * nacía: una cocina de 54 millones aprobada hoy salía como 54 millones de caja
 * este mes, aunque solo hubiera entrado el anticipo.
 */

export type CategoriaGasto = 'material' | 'labor' | 'other';
export type TipoDeCobro = 'receipt' | 'invoice' | 'collection_account';

/** Un proyecto con valor: lo vendido. */
export interface Venta {
  id: string;
  fecha: Date;
  proyecto: string;
  cliente: string;
  valor: number;
  etapa: string;
}

/** Plata que entra o que sale. */
export interface Movimiento {
  id: string;
  fecha: Date;
  tipo: 'cobro' | 'gasto';
  concepto: string;
  /** Vacío si el cobro no se pudo atar a ningún proyecto. */
  proyectoId: string | null;
  proyecto: string;
  cliente: string;
  monto: number;
  categoria?: CategoriaGasto;
  documento?: TipoDeCobro;
}

export interface DatosFinancieros {
  ventas: Venta[];
  movimientos: Movimiento[];
}

// ── Filas tal como llegan de la base ─────────────────────────────────────

export interface FilaProyecto {
  id: string;
  name: string | null;
  value: number | string | null;
  stage: string | null;
  start_date: string | null;
  created_at?: string | null;
  contact_id: string | null;
  client_id: string | null;
}

export interface FilaGasto {
  id: string;
  project_id: string;
  description: string | null;
  amount: number | string | null;
  category: string | null;
  date: string | null;
}

export interface FilaCobro {
  id: string;
  type: string;
  is_paid: boolean | null;
  paid_date: string | null;
  timestamp: string | null;
  recipient_id: string | null;
  recipient_contact: string | null;
  metadata: Record<string, any> | null;
}

export interface ContactoConocido {
  id: string;
  clientName: string;
  role?: string;
}

export const DOCUMENTOS_DE_COBRO: TipoDeCobro[] = ['receipt', 'invoice', 'collection_account'];

const numero = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fecha = (...candidatas: (string | null | undefined)[]): Date => {
  for (const c of candidatas) {
    if (!c) continue;
    const d = new Date(c);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
};

/**
 * Si un documento es plata que ya entró.
 *
 * El recibo de caja no se marca como pagado: es el comprobante de un avance que
 * el cliente ya entregó, así que existir es haberse cobrado. La factura y la
 * cuenta de cobro se mandan antes de que paguen, y cuentan cuando se marcan.
 */
export const esCobroHecho = (f: Pick<FilaCobro, 'type' | 'is_paid'>): boolean =>
  f.type === 'receipt' || ((f.type === 'invoice' || f.type === 'collection_account') && !!f.is_paid);

const CONCEPTO_POR_DOCUMENTO: Record<TipoDeCobro, string> = {
  receipt: 'Recibo de caja',
  invoice: 'Factura pagada',
  collection_account: 'Cuenta de cobro pagada',
};

/**
 * Arma las ventas y los movimientos de quien vende.
 *
 * Los proyectos que entran aquí ya vienen filtrados a los suyos como
 * contratista; los cobros, a los documentos que él mandó.
 */
export const armarDatosFinancieros = (
  proyectos: FilaProyecto[],
  gastos: FilaGasto[],
  cobros: FilaCobro[],
  contactos: ContactoConocido[],
): DatosFinancieros => {
  const porId = new Map(contactos.map(c => [c.id, c]));
  const nombreDe = (...ids: (string | null | undefined)[]) => {
    for (const id of ids) {
      const c = id ? porId.get(id) : undefined;
      if (c) return c.clientName;
    }
    return 'Sin cliente';
  };

  const proyectoPorId = new Map(proyectos.map(p => [p.id, p]));
  // Los cobros viejos no llevan el id del proyecto, solo su nombre. Si dos
  // proyectos se llaman igual no se adivina: queda sin proyecto.
  const proyectoPorNombre = new Map<string, FilaProyecto | null>();
  for (const p of proyectos) {
    const clave = (p.name || '').trim();
    if (!clave) continue;
    proyectoPorNombre.set(clave, proyectoPorNombre.has(clave) ? null : p);
  }

  const ventas: Venta[] = proyectos
    .filter(p => numero(p.value) > 0)
    .map(p => ({
      id: p.id,
      fecha: fecha(p.start_date, p.created_at),
      proyecto: p.name || 'Proyecto',
      cliente: nombreDe(p.client_id, p.contact_id),
      valor: numero(p.value),
      etapa: p.stage || '',
    }));

  const movimientos: Movimiento[] = [];

  for (const g of gastos) {
    const p = proyectoPorId.get(g.project_id);
    if (!p) continue;
    const categoria = (['material', 'labor'].includes(g.category || '') ? g.category : 'other') as CategoriaGasto;
    movimientos.push({
      id: `gasto-${g.id}`,
      fecha: fecha(g.date),
      tipo: 'gasto',
      concepto: g.description || 'Gasto',
      proyectoId: p.id,
      proyecto: p.name || 'Proyecto',
      cliente: nombreDe(p.client_id, p.contact_id),
      monto: numero(g.amount),
      categoria,
    });
  }

  for (const c of cobros) {
    if (!esCobroHecho(c)) continue;
    const destinatario = c.recipient_id || c.recipient_contact;
    // Un recibo a un proveedor es plata que sale, no que entra.
    if (destinatario && porId.get(destinatario)?.role === 'supplier') continue;

    const m = c.metadata || {};
    const monto = numero(m.total ?? m.amount);
    if (monto <= 0) continue;

    const nombreProyecto = typeof m.projectName === 'string' ? m.projectName.trim() : '';
    const p = (m.projectId && proyectoPorId.get(m.projectId))
      || (nombreProyecto ? proyectoPorNombre.get(nombreProyecto) : undefined)
      || null;

    const documento = c.type as TipoDeCobro;
    movimientos.push({
      id: `cobro-${c.id}`,
      // Se cobró cuando se marcó pagado; el recibo, cuando se emitió.
      fecha: fecha(c.paid_date, c.timestamp),
      tipo: 'cobro',
      concepto: (typeof m.concept === 'string' && m.concept.trim()) || CONCEPTO_POR_DOCUMENTO[documento],
      proyectoId: p?.id ?? null,
      proyecto: p?.name || nombreProyecto || 'Sin proyecto',
      cliente: nombreDe(destinatario, p?.client_id, p?.contact_id),
      monto,
      documento,
    });
  }

  movimientos.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  ventas.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  return { ventas, movimientos };
};

// ── Resúmenes ────────────────────────────────────────────────────────────

export interface Resumen {
  vendido: number;
  cobrado: number;
  gastos: number;
  /** Cobrado menos gastos: la plata que queda. */
  caja: number;
  porCategoria: Record<CategoriaGasto, number>;
}

const dentro = (d: Date, desde?: Date, hasta?: Date) =>
  (!desde || d >= desde) && (!hasta || d <= hasta);

export const resumir = (datos: DatosFinancieros, desde?: Date, hasta?: Date): Resumen => {
  const r: Resumen = { vendido: 0, cobrado: 0, gastos: 0, caja: 0, porCategoria: { material: 0, labor: 0, other: 0 } };
  for (const v of datos.ventas) if (dentro(v.fecha, desde, hasta)) r.vendido += v.valor;
  for (const m of datos.movimientos) {
    if (!dentro(m.fecha, desde, hasta)) continue;
    if (m.tipo === 'cobro') r.cobrado += m.monto;
    else {
      r.gastos += m.monto;
      r.porCategoria[m.categoria || 'other'] += m.monto;
    }
  }
  r.caja = r.cobrado - r.gastos;
  return r;
};

export interface Mes extends Resumen {
  /** `AAAA-MM`, que ordena bien como texto. */
  clave: string;
  etiqueta: string;
}

const claveDeMes = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const inicioDeMes = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const finDeMes = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

/**
 * Los meses con movimiento, del más reciente al más antiguo.
 *
 * Se ordenaba con `new Date('sept 2026 1')`, que da fecha inválida con los
 * meses en español: el orden salía al azar.
 */
export const porMes = (datos: DatosFinancieros): Mes[] => {
  const fechas = new Map<string, Date>();
  for (const v of datos.ventas) fechas.set(claveDeMes(v.fecha), v.fecha);
  for (const m of datos.movimientos) fechas.set(claveDeMes(m.fecha), m.fecha);
  return Array.from(fechas.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([clave, d]) => ({
      clave,
      etiqueta: d.toLocaleString('es-CO', { month: 'short', year: 'numeric' }),
      ...resumir(datos, inicioDeMes(d), finDeMes(d)),
    }));
};

/** Los años con algo, del más reciente al más antiguo; siempre el actual. */
export const anosConDatos = (datos: DatosFinancieros, hoy = new Date()): number[] => {
  const anos = new Set<number>([hoy.getFullYear()]);
  for (const v of datos.ventas) anos.add(v.fecha.getFullYear());
  for (const m of datos.movimientos) anos.add(m.fecha.getFullYear());
  return Array.from(anos).sort((a, b) => b - a);
};

/** Cuánto se ha cobrado de cada proyecto, en toda su vida. */
export const cobradoPorProyecto = (datos: DatosFinancieros): Map<string, number> => {
  const r = new Map<string, number>();
  for (const m of datos.movimientos) {
    if (m.tipo === 'cobro' && m.proyectoId) r.set(m.proyectoId, (r.get(m.proyectoId) || 0) + m.monto);
  }
  return r;
};

export const NOMBRE_CATEGORIA: Record<CategoriaGasto, string> = {
  material: 'Materia prima',
  labor: 'Mano de obra',
  other: 'Otros',
};
