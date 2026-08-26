/**
 * Cálculos y catálogo de plantillas para el modo "Cotización Personalizada"
 * (carpintería arquitectónica). Fórmula genérica para toda línea:
 *   subtotal = cantidad * costoUnitario * (medida || 1)
 * Así ML/M2 (que usan medida) y UND/GLOBAL (medida implícita 1) comparten
 * la misma lógica sin casos especiales por categoría.
 */
import { CarpentryCategoryKey, CarpentryItemGroup, CarpentryLineItem, CarpentrySection, CarpentryUnit, QuoteItem } from '../types';

// ─── Identificadores ─────────────────────────────────────────────────────────

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}_${Date.now()}_${idCounter++}`;

// ─── Cálculos ────────────────────────────────────────────────────────────────

export const computeLineSubtotal = (item: CarpentryLineItem): number => {
  if (item.isTemplate) return 0;
  const usesMeasure = item.unit === 'ML' || item.unit === 'M2';
  const measure = usesMeasure ? (item.measure || 0) : 1;
  return (item.quantity || 0) * (item.unitCost || 0) * measure;
};

/**
 * Una línea cuenta cuando el usuario la ha tocado.
 *
 * Las plantillas nacen con nombre, cantidad y costo de ejemplo —para que se vea
 * cómo se rellena— y `isTemplate` se limpia en cuanto se edita cualquier campo.
 * Sin este criterio, un grupo que solo se abrió y no se llenó llegaba al
 * documento del cliente con sus valores de ejemplo.
 */
export const esLineaUsada = (item: CarpentryLineItem): boolean =>
  !!item.description && !item.isTemplate;

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
  label: string;
  icon: string;
  colorFrom: string;
  colorTo: string;
  shadowColor: string;
  defaultUnit: CarpentryUnit;
  /** true = usa los 4 grupos fijos de Cocinas Integrales; false = un solo grupo flexible. */
  fixedGroups: boolean;
}

export const CARPENTRY_CATEGORIES: CarpentryCategoryConfig[] = [
  { key: 'cocinas_integrales', label: 'Cocinas Integrales', icon: 'fa-solid fa-kitchen-set', colorFrom: 'from-blue-500', colorTo: 'to-blue-600', shadowColor: 'shadow-blue-500/30', defaultUnit: 'ML', fixedGroups: true },
  { key: 'closets', label: 'Clósets', icon: 'fa-solid fa-door-closed', colorFrom: 'from-violet-500', colorTo: 'to-violet-600', shadowColor: 'shadow-violet-500/30', defaultUnit: 'M2', fixedGroups: false },
  { key: 'puertas', label: 'Puertas', icon: 'fa-solid fa-door-open', colorFrom: 'from-emerald-500', colorTo: 'to-emerald-600', shadowColor: 'shadow-emerald-500/30', defaultUnit: 'UND', fixedGroups: false },
  { key: 'gabinetes_bano', label: 'Gabinetes de Baño', icon: 'fa-solid fa-bath', colorFrom: 'from-cyan-500', colorTo: 'to-cyan-600', shadowColor: 'shadow-cyan-500/30', defaultUnit: 'UND', fixedGroups: false },
  { key: 'centros_entretenimiento', label: 'Centros de Entretenimiento', icon: 'fa-solid fa-tv', colorFrom: 'from-amber-500', colorTo: 'to-amber-600', shadowColor: 'shadow-amber-500/30', defaultUnit: 'ML', fixedGroups: false },
  { key: 'muebles_especiales', label: 'Muebles Especiales', icon: 'fa-solid fa-couch', colorFrom: 'from-rose-500', colorTo: 'to-rose-600', shadowColor: 'shadow-rose-500/30', defaultUnit: 'GLOBAL', fixedGroups: false },
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

const COCINA_GROUP_LABELS: { key: keyof typeof COCINA_TEMPLATES; label: string }[] = [
  { key: 'muebles', label: 'Muebles' },
  { key: 'electrodomesticos', label: 'Electrodomésticos' },
  { key: 'meson', label: 'Mesón' },
  { key: 'herrajeria', label: 'Herrajería y Accesorios' },
];

// ─── Fábrica de secciones ────────────────────────────────────────────────────

/** Crea una nueva sección para una categoría, sembrada con sus grupos/plantillas. */
export const createCarpentrySection = (category: CarpentryCategoryKey): CarpentrySection => {
  const config = getCategoryConfig(category);

  if (config.fixedGroups) {
    // Cocinas Integrales: 4 grupos fijos, cada uno con sus ítems de plantilla.
    const groups: CarpentryItemGroup[] = COCINA_GROUP_LABELS.map(({ key, label }) => ({
      id: nextId('group'),
      label,
      items: COCINA_TEMPLATES[key].map(emptyLineFromTemplate),
    }));
    return { id: nextId('section'), category, name: config.label, groups };
  }

  // Resto de categorías: un solo grupo flexible, arranca con un ítem vacío.
  const blankItem: CarpentryLineItem = {
    id: nextId('item'),
    description: '',
    unit: config.defaultUnit,
    measure: config.defaultUnit === 'ML' || config.defaultUnit === 'M2' ? 0 : undefined,
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
  measure: unit === 'ML' || unit === 'M2' ? 0 : undefined,
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
