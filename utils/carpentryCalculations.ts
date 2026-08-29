/**
 * Cálculos y catálogo de plantillas para el modo "Cotización Personalizada"
 * (carpintería arquitectónica). Fórmula genérica para toda línea:
 *   subtotal = cantidad * costoUnitario * (medida || 1)
 * Así ML/M2 (que usan medida) y UND/GLOBAL (medida implícita 1) comparten
 * la misma lógica sin casos especiales por categoría.
 */
import { CarpentryCategoryKey, CarpentryItemGroup, CarpentryLineItem, CarpentrySection, CarpentryUnit, GremioKey, QuoteItem } from '../types';

// ─── Identificadores ─────────────────────────────────────────────────────────

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}_${Date.now()}_${idCounter++}`;

// ─── Cálculos ────────────────────────────────────────────────────────────────

/**
 * Si la unidad se multiplica por la medida o no.
 *
 * Está aquí y no repartido porque la condición vivía copiada en siete sitios
 * —el cálculo, dos vistas del documento, el HTML que se sube, el resumen de
 * WhatsApp, el formulario— y al añadir M3 habría habido que acertar en los
 * siete. Uno solo que se escape da un total distinto según dónde se mire.
 */
export const usaMedida = (unit: CarpentryUnit): boolean =>
  unit === 'ML' || unit === 'M2' || unit === 'M3';

/**
 * Cómo se lee la cantidad de una línea en el documento del cliente.
 *
 *   80 m² de pintura   ->  x1 · 80 M2
 *   12 puntos          ->  x12 PUNTO
 *   3 viajes           ->  x3 VIAJE
 *   un global          ->  x1
 *
 * La unidad se escribe también cuando no multiplica. Antes solo salía en ML y
 * M2, así que tres viajes de escombro llegaban al cliente como «x3», sin decir
 * tres qué. GLOBAL se calla porque «x1 GLOBAL» no añade nada.
 */
export const describeCantidad = (item: Pick<CarpentryLineItem, 'unit' | 'quantity' | 'measure'>): string => {
  const cantidad = `x${item.quantity ?? 1}`;
  if (usaMedida(item.unit)) {
    return item.measure ? `${cantidad} · ${item.measure} ${item.unit}` : cantidad;
  }
  return item.unit === 'GLOBAL' ? cantidad : `${cantidad} ${item.unit}`;
};

export const computeLineSubtotal = (item: CarpentryLineItem): number => {
  if (item.isTemplate) return 0;
  const measure = usaMedida(item.unit) ? (item.measure || 0) : 1;
  return (item.quantity || 0) * (item.unitCost || 0) * measure;
};

/**
 * Una línea cuenta cuando el usuario la ha tocado y suma algo.
 *
 * Las plantillas nacen con nombre, cantidad y costo de ejemplo —para que se vea
 * cómo se rellena— y `isTemplate` se limpia en cuanto se edita cualquier campo.
 * Sin eso, un grupo que solo se abrió y no se llenó llegaba al documento del
 * cliente con sus valores de ejemplo.
 *
 * Y se pide además que sume: una línea a cero es una que se empezó y se dejó a
 * medias —falta el precio, la cantidad o la medida—, y en el documento salía
 * como «$0», que al cliente le dice algo que no es.
 */
export const esLineaUsada = (item: CarpentryLineItem): boolean =>
  !!item.description && !item.isTemplate && computeLineSubtotal(item) > 0;

/**
 * Las secciones tal como deben salir en el documento: sin líneas de plantilla,
 * y sin los grupos ni las secciones que se quedan vacíos al quitarlas.
 *
 * Vive aquí porque el documento se pinta en tres sitios —la vista de la app, la
 * del enlace compartido y el HTML que se sube—, y cada uno filtraba distinto.
 */
export const seccionesConContenido = (sections: CarpentrySection[]): CarpentrySection[] =>
  (sections || [])
    .map(section => ({
      ...section,
      groups: (section.groups || [])
        .map(group => ({ ...group, items: (group.items || []).filter(esLineaUsada) }))
        .filter(group => group.items.length > 0),
    }))
    .filter(section => section.groups.length > 0);

export const computeGroupSubtotal = (group: CarpentryItemGroup): number =>
  group.items.reduce((sum, item) => sum + computeLineSubtotal(item), 0);

export const computeSectionSubtotal = (section: CarpentrySection): number =>
  section.groups.reduce((sum, group) => sum + computeGroupSubtotal(group), 0);

export const computeGrandTotal = (sections: CarpentrySection[]): number =>
  sections.reduce((sum, section) => sum + computeSectionSubtotal(section), 0);

/** Ancho * Alto -> medida en m² para ítems con unit === 'M2'. */
export const computeM2FromDimensions = (width?: number, height?: number): number =>
  (width || 0) * (height || 0);

// ─── Catálogo de categorías ──────────────────────────────────────────────────

export interface CarpentryCategoryConfig {
  key: CarpentryCategoryKey;
  gremio: GremioKey;
  label: string;
  icon: string;
  colorFrom: string;
  colorTo: string;
  shadowColor: string;
  defaultUnit: CarpentryUnit;
  /** true = nace con varios grupos sembrados de plantillas; false = un solo grupo flexible. */
  fixedGroups: boolean;
}

export const GREMIOS: { key: GremioKey; label: string }[] = [
  { key: 'carpinteria', label: 'Carpintería' },
  { key: 'obra_civil', label: 'Obra blanca y remodelación' },
];

export const CARPENTRY_CATEGORIES: CarpentryCategoryConfig[] = [
  // ── Carpintería ──
  { key: 'cocinas_integrales', gremio: 'carpinteria', label: 'Cocinas Integrales', icon: 'fa-solid fa-kitchen-set', colorFrom: 'from-blue-500', colorTo: 'to-blue-600', shadowColor: 'shadow-blue-500/30', defaultUnit: 'ML', fixedGroups: true },
  { key: 'closets', gremio: 'carpinteria', label: 'Clósets', icon: 'fa-solid fa-door-closed', colorFrom: 'from-violet-500', colorTo: 'to-violet-600', shadowColor: 'shadow-violet-500/30', defaultUnit: 'M2', fixedGroups: false },
  { key: 'puertas', gremio: 'carpinteria', label: 'Puertas', icon: 'fa-solid fa-door-open', colorFrom: 'from-emerald-500', colorTo: 'to-emerald-600', shadowColor: 'shadow-emerald-500/30', defaultUnit: 'UND', fixedGroups: false },
  { key: 'gabinetes_bano', gremio: 'carpinteria', label: 'Gabinetes de Baño', icon: 'fa-solid fa-bath', colorFrom: 'from-cyan-500', colorTo: 'to-cyan-600', shadowColor: 'shadow-cyan-500/30', defaultUnit: 'UND', fixedGroups: false },
  { key: 'centros_entretenimiento', gremio: 'carpinteria', label: 'Centros de Entretenimiento', icon: 'fa-solid fa-tv', colorFrom: 'from-amber-500', colorTo: 'to-amber-600', shadowColor: 'shadow-amber-500/30', defaultUnit: 'ML', fixedGroups: false },
  { key: 'muebles_especiales', gremio: 'carpinteria', label: 'Muebles Especiales', icon: 'fa-solid fa-couch', colorFrom: 'from-rose-500', colorTo: 'to-rose-600', shadowColor: 'shadow-rose-500/30', defaultUnit: 'GLOBAL', fixedGroups: false },

  // ── Obra blanca y remodelación ──
  { key: 'pintura_estuco', gremio: 'obra_civil', label: 'Pintura y Estuco', icon: 'fa-solid fa-fill-drip', colorFrom: 'from-sky-500', colorTo: 'to-sky-600', shadowColor: 'shadow-sky-500/30', defaultUnit: 'M2', fixedGroups: true },
  { key: 'enchapes', gremio: 'obra_civil', label: 'Enchapes y Pisos', icon: 'fa-solid fa-border-all', colorFrom: 'from-orange-500', colorTo: 'to-orange-600', shadowColor: 'shadow-orange-500/30', defaultUnit: 'M2', fixedGroups: true },
  { key: 'drywall', gremio: 'obra_civil', label: 'Drywall y Cielorrasos', icon: 'fa-solid fa-layer-group', colorFrom: 'from-teal-500', colorTo: 'to-teal-600', shadowColor: 'shadow-teal-500/30', defaultUnit: 'M2', fixedGroups: true },
  { key: 'puntos_instalaciones', gremio: 'obra_civil', label: 'Puntos e Instalaciones', icon: 'fa-solid fa-plug-circle-bolt', colorFrom: 'from-yellow-500', colorTo: 'to-yellow-600', shadowColor: 'shadow-yellow-500/30', defaultUnit: 'PUNTO', fixedGroups: true },
  { key: 'demoliciones', gremio: 'obra_civil', label: 'Demolición y Aseo', icon: 'fa-solid fa-hammer', colorFrom: 'from-stone-500', colorTo: 'to-stone-600', shadowColor: 'shadow-stone-500/30', defaultUnit: 'M2', fixedGroups: true },
  { key: 'impermeabilizacion', gremio: 'obra_civil', label: 'Impermeabilización', icon: 'fa-solid fa-umbrella', colorFrom: 'from-indigo-500', colorTo: 'to-indigo-600', shadowColor: 'shadow-indigo-500/30', defaultUnit: 'M2', fixedGroups: true },
];

export const getCategoryConfig = (key: CarpentryCategoryKey): CarpentryCategoryConfig =>
  CARPENTRY_CATEGORIES.find(c => c.key === key) || CARPENTRY_CATEGORIES[0];

// ─── Plantillas de Cocinas Integrales ────────────────────────────────────────
// Valores de ejemplo del spec, precargados como sugerencia editable con costo 0 por defecto.

interface ItemTemplate {
  description: string;
  unit: CarpentryUnit;
  measure?: number;
  unitCost?: number;
  quantity: number;
}

const emptyLineFromTemplate = (t: ItemTemplate): CarpentryLineItem => ({
  id: nextId('item'),
  description: t.description,
  unit: t.unit,
  measure: t.measure,
  unitCost: 0, // Inicia en 0 para evitar confusión de costos automáticos
  quantity: t.quantity,
  isTemplate: true,
  images: [],
  comments: '',
});

export const COCINA_TEMPLATES: Record<string, ItemTemplate[]> = {
  muebles: [
    { description: 'Mueble Superior', unit: 'ML', measure: 2.5, unitCost: 580000, quantity: 1 },
    { description: 'Mueble Base', unit: 'ML', measure: 2.5, unitCost: 680000, quantity: 1 },
    { description: 'Mueble Sobrenevera', unit: 'ML', measure: 0.6, unitCost: 580000, quantity: 1 },
    { description: 'Torre de Hornos', unit: 'UND', unitCost: 1200000, quantity: 1 },
  ],
  electrodomesticos: [
    { description: 'Estufa', unit: 'UND', unitCost: 850000, quantity: 1 },
    { description: 'Campana', unit: 'UND', unitCost: 450000, quantity: 1 },
    { description: 'Horno', unit: 'UND', unitCost: 900000, quantity: 1 },
    { description: 'Microondas', unit: 'UND', unitCost: 350000, quantity: 1 },
  ],
  meson: [
    { description: 'Mesón Granito San Gabriel', unit: 'ML', measure: 2.5, unitCost: 420000, quantity: 1 },
  ],
  herrajeria: [
    { description: 'Bisagras cierre lento', unit: 'UND', unitCost: 18000, quantity: 10 },
  ],
};

// ─── Plantillas por categoría ────────────────────────────────────────────────

/** Los grupos con los que nace una sección, en orden. */
interface GrupoPlantilla {
  label: string;
  items: ItemTemplate[];
}

/**
 * Obra blanca y remodelación.
 *
 * Las medidas y cantidades van en 1 y los costos en 0: la plantilla está para
 * recordar qué se suele cobrar en cada capítulo, no para sugerir precios. Cada
 * región y cada maestro tienen los suyos, y un número de ejemplo que se cuela
 * al documento del cliente es peor que no poner ninguno.
 *
 * La medida en 1 tampoco es un precio: es lo que hace que la línea sume en
 * cuanto se escribe el costo, sin obligar a rellenar dos campos para ver algo.
 */
const OBRA_CIVIL: Partial<Record<CarpentryCategoryKey, GrupoPlantilla[]>> = {
  pintura_estuco: [
    {
      label: 'Pintura',
      items: [
        { description: 'Pintura en muros', unit: 'M2', measure: 1, quantity: 1 },
        { description: 'Pintura en cielorraso / techo', unit: 'M2', measure: 1, quantity: 1 },
      ],
    },
    {
      label: 'Estuco y preparación',
      items: [
        { description: 'Estucado y preparación de superficie', unit: 'M2', measure: 1, quantity: 1 },
        { description: 'Resane y masillado de muros', unit: 'M2', measure: 1, quantity: 1 },
      ],
    },
  ],

  enchapes: [
    {
      label: 'Pisos',
      items: [
        { description: 'Enchape de piso en cerámica / porcelanato', unit: 'M2', measure: 1, quantity: 1 },
        { description: 'Guardaescobas / zócalos', unit: 'ML', measure: 1, quantity: 1 },
      ],
    },
    {
      label: 'Paredes',
      items: [
        { description: 'Enchape de pared en baño / cocina', unit: 'M2', measure: 1, quantity: 1 },
      ],
    },
    {
      label: 'Materiales',
      items: [
        { description: 'Pega y boquilla', unit: 'M2', measure: 1, quantity: 1 },
      ],
    },
  ],

  drywall: [
    {
      label: 'Muros',
      items: [
        { description: 'Muro en drywall, una cara', unit: 'M2', measure: 1, quantity: 1 },
        { description: 'Muro en drywall, dos caras', unit: 'M2', measure: 1, quantity: 1 },
        { description: 'Muro en superboard (zona húmeda)', unit: 'M2', measure: 1, quantity: 1 },
      ],
    },
    {
      label: 'Cielorrasos',
      items: [
        { description: 'Cielorraso en drywall', unit: 'M2', measure: 1, quantity: 1 },
        { description: 'Cielorraso en PVC', unit: 'M2', measure: 1, quantity: 1 },
      ],
    },
    {
      label: 'Detalles',
      items: [
        { description: 'Descolgado / luz indirecta', unit: 'ML', measure: 1, quantity: 1 },
      ],
    },
  ],

  puntos_instalaciones: [
    {
      label: 'Eléctricos',
      items: [
        { description: 'Punto de toma corriente', unit: 'PUNTO', quantity: 1 },
        { description: 'Punto de luz', unit: 'PUNTO', quantity: 1 },
        { description: 'Punto de interruptor', unit: 'PUNTO', quantity: 1 },
      ],
    },
    {
      label: 'Hidrosanitarios',
      items: [
        { description: 'Punto hidráulico', unit: 'PUNTO', quantity: 1 },
        { description: 'Punto sanitario / desagüe', unit: 'PUNTO', quantity: 1 },
      ],
    },
  ],

  demoliciones: [
    {
      label: 'Demolición',
      items: [
        { description: 'Demolición de muro', unit: 'M2', measure: 1, quantity: 1 },
        { description: 'Demolición de enchape existente', unit: 'M2', measure: 1, quantity: 1 },
      ],
    },
    {
      label: 'Retiro y aseo',
      items: [
        { description: 'Retiro de escombros', unit: 'VIAJE', quantity: 1 },
        { description: 'Escombro medido en volumen', unit: 'M3', measure: 1, quantity: 1 },
        { description: 'Aseo general de obra', unit: 'GLOBAL', quantity: 1 },
      ],
    },
  ],

  impermeabilizacion: [
    {
      label: 'Impermeabilización',
      items: [
        { description: 'Impermeabilización de placa / cubierta', unit: 'M2', measure: 1, quantity: 1 },
        { description: 'Impermeabilización de muros', unit: 'M2', measure: 1, quantity: 1 },
      ],
    },
    {
      label: 'Remates y masillado',
      items: [
        { description: 'Media caña / remate perimetral', unit: 'ML', measure: 1, quantity: 1 },
        { description: 'Masillado y nivelación de piso', unit: 'M2', measure: 1, quantity: 1 },
      ],
    },
  ],
};

/** Todas las categorías que nacen con grupos sembrados, en un solo sitio. */
const PLANTILLAS_POR_CATEGORIA: Partial<Record<CarpentryCategoryKey, GrupoPlantilla[]>> = {
  cocinas_integrales: [
    { label: 'Muebles', items: COCINA_TEMPLATES.muebles },
    { label: 'Electrodomésticos', items: COCINA_TEMPLATES.electrodomesticos },
    { label: 'Mesón', items: COCINA_TEMPLATES.meson },
    { label: 'Herrajería y Accesorios', items: COCINA_TEMPLATES.herrajeria },
  ],
  ...OBRA_CIVIL,
};

// ─── Fábrica de secciones ────────────────────────────────────────────────────

/** Crea una nueva sección para una categoría, sembrada con sus grupos/plantillas. */
export const createCarpentrySection = (category: CarpentryCategoryKey): CarpentrySection => {
  const config = getCategoryConfig(category);
  const plantilla = PLANTILLAS_POR_CATEGORIA[category];

  if (config.fixedGroups && plantilla) {
    const groups: CarpentryItemGroup[] = plantilla.map(({ label, items }) => ({
      id: nextId('group'),
      label,
      items: items.map(emptyLineFromTemplate),
    }));
    return { id: nextId('section'), category, name: config.label, groups };
  }

  // Resto de categorías: un solo grupo flexible, arranca con un ítem vacío.
  const blankItem: CarpentryLineItem = {
    id: nextId('item'),
    description: '',
    unit: config.defaultUnit,
    measure: usaMedida(config.defaultUnit) ? 0 : undefined,
    unitCost: 0,
    quantity: 1,
    images: [],
    comments: '',
  };
  return {
    id: nextId('section'),
    category,
    name: config.label,
    groups: [{ id: nextId('group'), label: config.label, items: [blankItem] }],
  };
};

/** Ítem en blanco para "+ Agregar ítem" dentro de un grupo ya existente. */
export const createBlankCarpentryItem = (unit: CarpentryUnit = 'UND'): CarpentryLineItem => ({
  id: nextId('item'),
  description: '',
  unit,
  measure: usaMedida(unit) ? 0 : undefined,
  unitCost: 0,
  quantity: 1,
  images: [],
  comments: '',
});

// ─── Puente hacia el flujo de cotización genérico ───────────────────────────

/**
 * Aplana todas las secciones a QuoteItem[] (description con contexto,
 * quantity=1, price=subtotal de la línea) para que el motor de impuestos
 * existente y cualquier consumidor de `items` plano sigan funcionando
 * sin cambios cuando la cotización viene en modo "personalizada".
 */
export const flattenSectionsToQuoteItems = (sections: CarpentrySection[]): QuoteItem[] => {
  const flat: QuoteItem[] = [];
  sections.forEach(section => {
    section.groups.forEach(group => {
      group.items.forEach(item => {
        if (!item.description.trim()) return;
        const subtotal = computeLineSubtotal(item);
        if (subtotal <= 0) return;
        flat.push({
          description: `${section.name} · ${group.label} · ${item.description}`,
          quantity: 1,
          price: subtotal,
        });
      });
    });
  });
  return flat;
};
