/**
 * Cálculos y catálogo de plantillas para el modo "Cotización Personalizada"
 * (carpintería arquitectónica). Fórmula genérica para toda línea:
 *   subtotal = cantidad * costoUnitario * (medida || 1)
 * Así ML/M2 (que usan medida) y UND/GLOBAL (medida implícita 1) comparten
 * la misma lógica sin casos especiales por categoría.
 */
import { CarpentryCategoryKey, CarpentryItemGroup, CarpentryLineItem, CarpentryMaterial, CarpentrySection, CarpentryUnit, GremioKey, MaterialUnit, QuoteItem } from '../types';
import { GREMIOS_POR_OFICIO } from './tiposDeNegocio';

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
 * Un número como se lee aquí: coma decimal y un decimal como mucho.
 *
 * El área sale de multiplicar ancho por alto, y en coma flotante 2,6 × 2,2 da
 * 5.720000000000001. Eso llegaba tal cual al documento del cliente, que leía
 * una cifra de dieciséis decimales donde debía ver 5,7 m².
 */
export const formatMedida = (n: number): string =>
  n.toLocaleString('es-CO', { maximumFractionDigits: 1 });

/** Cómo se nombra cada unidad de cara al cliente. */
const UNIDAD_CORTA: Record<CarpentryUnit, string> = {
  ML: 'ml',
  M2: 'm²',
  M3: 'm³',
  UND: 'und',
  PUNTO: 'punto',
  VIAJE: 'viaje',
  GLOBAL: '',
};

/** Solo las que se cuentan de a una pluralizan: «12 puntos», pero «5,7 m²». */
const PLURALIZA: CarpentryUnit[] = ['PUNTO', 'VIAJE'];

/**
 * Cómo se lee la cantidad de una línea en el documento del cliente.
 *
 *   80 m² de pintura        ->  80 m²
 *   3 clósets de 5,7 m²     ->  3 × 5,7 m²
 *   12 puntos               ->  12 puntos
 *   una puerta              ->  1 und
 *   un global               ->  (nada)
 *
 * Sin la «x» delante cuando no multiplica: «x1 UND» leído por un cliente parece
 * un código, no una cantidad. La unidad se escribe siempre —tres viajes de
 * escombro como «x3» no decían tres qué— salvo GLOBAL, que no añade nada.
 */
export const describeCantidad = (item: Pick<CarpentryLineItem, 'unit' | 'quantity' | 'measure'>): string => {
  const cantidad = item.quantity ?? 1;
  const unidad = UNIDAD_CORTA[item.unit];

  if (usaMedida(item.unit)) {
    if (!item.measure) return cantidad > 1 ? `${cantidad} und` : '';
    const medida = `${formatMedida(item.measure)} ${unidad}`;
    return cantidad > 1 ? `${cantidad} × ${medida}` : medida;
  }

  if (!unidad) return cantidad > 1 ? `${cantidad} ×` : '';
  const nombre = cantidad > 1 && PLURALIZA.includes(item.unit) ? `${unidad}s` : unidad;
  return `${cantidad} ${nombre}`;
};

/**
 * Cómo se lee la cantidad de material en el documento: «3 GALON».
 *
 * No reutiliza describeCantidad porque el material no lleva medida ni comparte
 * unidad con el trabajo: son 80 m² de muro, pero 3 galones de pintura.
 */
export const describeMaterial = (material?: CarpentryMaterial): string =>
  material ? `${formatMedida(material.quantity ?? 1)} ${material.unit || 'UND'}` : '';

/** Solo la mano de obra de una línea. */
export const computeLineSubtotal = (item: CarpentryLineItem): number => {
  if (item.isTemplate) return 0;
  const measure = usaMedida(item.unit) ? (item.measure || 0) : 1;
  return (item.quantity || 0) * (item.unitCost || 0) * measure;
};

/**
 * Solo el material de una línea.
 *
 * Cantidad por precio y nada más: el material se compra por unidades de venta
 * —galones, bultos, cajas— y su precio ya es el de esa unidad. Multiplicarlo
 * además por los metros del trabajo, como se hacía al principio, cobraba un
 * galón por cada metro cuadrado.
 */
export const computeMaterialSubtotal = (item: CarpentryLineItem): number => {
  const m = item.material;
  if (!m?.activo || item.isTemplate) return 0;
  return (m.quantity || 0) * (m.unitCost || 0);
};

/**
 * Cuánto material hace falta para el trabajo de esta línea.
 *
 * Los metros del trabajo divididos por lo que cubre una unidad, redondeando
 * hacia arriba: medio galón no se compra. Es la cuenta que el maestro hace de
 * cabeza en la ferretería, y equivocarla es quedarse corto a mitad de obra.
 *
 * Devuelve null cuando no hay con qué calcular —falta el rendimiento, o el
 * trabajo no se mide en metros— y entonces la cantidad la pone él.
 */
export const cantidadSugerida = (item: CarpentryLineItem, rendimiento?: number): number | null => {
  const r = rendimiento ?? item.material?.rendimiento;
  if (!r || r <= 0) return null;
  const trabajo = (usaMedida(item.unit) ? (item.measure || 0) : 1) * (item.quantity || 0);
  if (trabajo <= 0) return null;
  return Math.ceil(trabajo / r);
};

/** Lo que cuesta la línea entera. Es lo que suman los grupos y el total. */
export const computeLineTotal = (item: CarpentryLineItem): number =>
  computeLineSubtotal(item) + computeMaterialSubtotal(item);

/**
 * Los capítulos que son solo materiales —«Aparatos y Materiales»— no llevan
 * mano de obra: sus líneas cuentan enteras del lado del material.
 */
export const esSeccionDeMateriales = (section: CarpentrySection): boolean =>
  !!getCategoryConfig(section.category).soloMaterial;

const sumarLineas = (section: CarpentrySection, f: (i: CarpentryLineItem) => number): number =>
  section.groups.reduce((s, g) => s + g.items.reduce((n, i) => n + f(i), 0), 0);

export const computeManoDeObraTotal = (sections: CarpentrySection[]): number =>
  (sections || []).reduce(
    (s, sec) => s + (esSeccionDeMateriales(sec) ? 0 : sumarLineas(sec, computeLineSubtotal)),
    0,
  );

export const computeMaterialesTotal = (sections: CarpentrySection[]): number =>
  (sections || []).reduce(
    (s, sec) => s + sumarLineas(sec, esSeccionDeMateriales(sec) ? computeLineSubtotal : computeMaterialSubtotal),
    0,
  );

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
 *
 * No se pide nombre. Se pedía, y dejaba fuera del documento a quien adjunta la
 * foto del clóset y le pone el precio sin escribirle nada: la sección entera se
 * quedaba sin líneas, el documento se caía a la tabla plana y las fotos —que
 * solo se pintan en la vista por secciones— desaparecían. Entre esas dos cosas,
 * `isTemplate` y que sume ya dicen si la línea está usada.
 */
export const esLineaUsada = (item: CarpentryLineItem): boolean =>
  !item.isTemplate && computeLineTotal(item) > 0;

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
  group.items.reduce((sum, item) => sum + computeLineTotal(item), 0);

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
  /**
   * true = el capítulo entero es material, sin mano de obra. Sus líneas cuentan
   * del lado de los materiales en el reparto del documento, y no ofrecen el
   * interruptor de material —serían material dentro de material—.
   */
  soloMaterial?: boolean;
}

export const GREMIOS: { key: GremioKey; label: string }[] = [
  { key: 'carpinteria', label: 'Carpintería' },
  { key: 'obra_civil', label: 'Obra blanca y remodelación' },
];

/**
 * Qué capítulos le tocan a cada oficio.
 *
 * Worky no es solo para gente de obra: sirve a cualquiera que le lleve cuentas
 * claras a sus clientes —un abogado, un sastre— y a esos la cotización básica
 * les basta y les sobra. Enseñarle a un abogado un capítulo de «Drywall y
 * Cielorrasos» no es una opción de más, es ruido que le hace dudar de si la app
 * es para él.
 *
 * Las claves son los `value` del selector de WelcomeOnboarding.
 */
// La tabla vive en utils/tiposDeNegocio, junto a la lista que se le enseña
// a quien se registra: separadas, añadir un oficio en una y olvidarlo en la
// otra no daba error, solo le enseñaba capítulos de obra a una tienda.

/**
 * Los gremios que debe ver alguien, según su tipo de negocio.
 *
 * Sin oficio declarado se enseñan todos, y no es un descuido: era casi la mitad
 * de los usuarios cuando esto se escribió, gente que ya venía usando los
 * capítulos. Esconderles de un día para otro algo que tenían se sentiría como
 * que la app se rompió. Quien se registra ahora sí elige oficio, así que el
 * hueco se cierra solo.
 */
export const gremiosVisibles = (businessType?: string | null): GremioKey[] => {
  const oficio = (businessType || '').trim().toLowerCase();
  if (!oficio) return GREMIOS.map(g => g.key);
  const gremios = GREMIOS_POR_OFICIO[oficio];
  // Un oficio que no esté en la tabla —escrito a mano, o añadido después sin
  // pasar por aquí— ve todo antes que quedarse sin nada.
  return gremios ?? GREMIOS.map(g => g.key);
};

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
  { key: 'aparatos_materiales', gremio: 'obra_civil', label: 'Aparatos y Materiales', icon: 'fa-solid fa-faucet', colorFrom: 'from-fuchsia-500', colorTo: 'to-fuchsia-600', shadowColor: 'shadow-fuchsia-500/30', defaultUnit: 'UND', fixedGroups: true, soloMaterial: true },
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
  /**
   * Con qué material se hace este trabajo y cuánto cubre cada unidad.
   *
   * Los rendimientos son puntos de partida, no verdades: cambian con el
   * producto, las manos que se den y cómo esté la superficie. Por eso el campo
   * queda a la vista y editable en el formulario. Los costos siguen en 0: el
   * precio lo pone cada quien.
   */
  material?: { descripcion?: string; unit: MaterialUnit; rendimiento?: number };
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
  // El material queda apagado pero con su unidad y su rendimiento puestos, para
  // que al encender el interruptor ya sepa en qué se compra y cuánto cunde.
  material: t.material ? { activo: false, ...t.material } : undefined,
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
        { description: 'Pintura en muros', unit: 'M2', measure: 1, quantity: 1, material: { descripcion: 'Pintura', unit: 'GALON', rendimiento: 30 } },
        { description: 'Pintura en cielorraso / techo', unit: 'M2', measure: 1, quantity: 1, material: { descripcion: 'Pintura', unit: 'GALON', rendimiento: 30 } },
      ],
    },
    {
      label: 'Estuco y preparación',
      items: [
        { description: 'Estucado y preparación de superficie', unit: 'M2', measure: 1, quantity: 1, material: { descripcion: 'Estuco', unit: 'BULTO', rendimiento: 8 } },
        { description: 'Resane y masillado de muros', unit: 'M2', measure: 1, quantity: 1, material: { descripcion: 'Masilla', unit: 'BULTO', rendimiento: 12 } },
      ],
    },
  ],

  enchapes: [
    {
      label: 'Pisos',
      items: [
        { description: 'Enchape de piso en cerámica / porcelanato', unit: 'M2', measure: 1, quantity: 1, material: { descripcion: 'Cerámica', unit: 'CAJA', rendimiento: 1.5 } },
        { description: 'Guardaescobas / zócalos', unit: 'ML', measure: 1, quantity: 1, material: { descripcion: 'Guardaescoba', unit: 'UND', rendimiento: 2.4 } },
      ],
    },
    {
      label: 'Paredes',
      items: [
        { description: 'Enchape de pared en baño / cocina', unit: 'M2', measure: 1, quantity: 1, material: { descripcion: 'Cerámica de pared', unit: 'CAJA', rendimiento: 1.5 } },
      ],
    },
    {
      label: 'Materiales',
      items: [
        { description: 'Pega y boquilla', unit: 'M2', measure: 1, quantity: 1, material: { descripcion: 'Pegante', unit: 'BULTO', rendimiento: 5 } },
      ],
    },
  ],

  drywall: [
    {
      label: 'Muros',
      items: [
        { description: 'Muro en drywall, una cara', unit: 'M2', measure: 1, quantity: 1, material: { descripcion: 'Lámina de drywall', unit: 'LAMINA', rendimiento: 2.9 } },
        { description: 'Muro en drywall, dos caras', unit: 'M2', measure: 1, quantity: 1, material: { descripcion: 'Lámina de drywall', unit: 'LAMINA', rendimiento: 1.45 } },
        { description: 'Muro en superboard (zona húmeda)', unit: 'M2', measure: 1, quantity: 1, material: { descripcion: 'Lámina de superboard', unit: 'LAMINA', rendimiento: 2.9 } },
      ],
    },
    {
      label: 'Cielorrasos',
      items: [
        { description: 'Cielorraso en drywall', unit: 'M2', measure: 1, quantity: 1, material: { descripcion: 'Lámina de drywall', unit: 'LAMINA', rendimiento: 2.9 } },
        { description: 'Cielorraso en PVC', unit: 'M2', measure: 1, quantity: 1, material: { descripcion: 'Lámina de PVC', unit: 'LAMINA', rendimiento: 1.2 } },
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
        { description: 'Punto de toma corriente', unit: 'PUNTO', quantity: 1, material: { descripcion: 'Toma y cableado', unit: 'UND', rendimiento: 1 } },
        { description: 'Punto de luz', unit: 'PUNTO', quantity: 1, material: { descripcion: 'Roseta y cableado', unit: 'UND', rendimiento: 1 } },
        { description: 'Punto de interruptor', unit: 'PUNTO', quantity: 1, material: { descripcion: 'Interruptor y cableado', unit: 'UND', rendimiento: 1 } },
      ],
    },
    {
      label: 'Hidrosanitarios',
      items: [
        { description: 'Punto hidráulico', unit: 'PUNTO', quantity: 1, material: { descripcion: 'Tubería y accesorios', unit: 'UND', rendimiento: 1 } },
        { description: 'Punto sanitario / desagüe', unit: 'PUNTO', quantity: 1, material: { descripcion: 'Tubería y accesorios', unit: 'UND', rendimiento: 1 } },
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

  // Los que compra el cliente o pone el maestro, pero que no son mano de obra:
  // van sueltos, sin trabajo asociado.
  aparatos_materiales: [
    {
      label: 'Sanitarios',
      items: [
        { description: 'Sanitario / inodoro', unit: 'UND', quantity: 1 },
        { description: 'Lavamanos', unit: 'UND', quantity: 1 },
        { description: 'Ducha / cabina', unit: 'UND', quantity: 1 },
      ],
    },
    {
      label: 'Griferías',
      items: [
        { description: 'Grifería de lavamanos', unit: 'UND', quantity: 1 },
        { description: 'Grifería de ducha', unit: 'UND', quantity: 1 },
        { description: 'Grifería de cocina', unit: 'UND', quantity: 1 },
      ],
    },
    {
      label: 'Cerámica y enchapes',
      items: [
        { description: 'Cerámica / porcelanato de piso', unit: 'M2', measure: 1, quantity: 1 },
        { description: 'Cerámica de pared', unit: 'M2', measure: 1, quantity: 1 },
      ],
    },
    {
      label: 'Iluminación y otros',
      items: [
        { description: 'Lámparas / luminarias', unit: 'UND', quantity: 1 },
        { description: 'Accesorios de baño', unit: 'UND', quantity: 1 },
      ],
    },
  ],

  impermeabilizacion: [
    {
      label: 'Impermeabilización',
      items: [
        { description: 'Impermeabilización de placa / cubierta', unit: 'M2', measure: 1, quantity: 1, material: { descripcion: 'Impermeabilizante', unit: 'CUÑETE', rendimiento: 20 } },
        { description: 'Impermeabilización de muros', unit: 'M2', measure: 1, quantity: 1, material: { descripcion: 'Impermeabilizante', unit: 'CUÑETE', rendimiento: 25 } },
      ],
    },
    {
      label: 'Remates y masillado',
      items: [
        { description: 'Media caña / remate perimetral', unit: 'ML', measure: 1, quantity: 1 },
        { description: 'Masillado y nivelación de piso', unit: 'M2', measure: 1, quantity: 1, material: { descripcion: 'Cemento', unit: 'BULTO', rendimiento: 4 } },
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

/**
 * El material que se propone al encender el interruptor.
 *
 * Copia la medida y la cantidad de la mano de obra —los 80 m² de pintura son
 * los mismos 80 m² de muro— y deja el costo en 0, que es el único dato que el
 * maestro tiene que buscar. Todo es editable después: a veces se compra de más
 * por desperdicio.
 */
export const materialSugerido = (item: CarpentryLineItem): CarpentryMaterial => {
  const previo = item.material;
  const rendimiento = previo?.rendimiento;
  return {
    activo: true,
    descripcion: previo?.descripcion,
    unit: previo?.unit || 'UND',
    rendimiento,
    quantity: cantidadSugerida(item, rendimiento) ?? previo?.quantity ?? 1,
    unitCost: previo?.unitCost || 0,
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
        // Sin nombre pero con precio, la línea igual se cobra: se la nombra con
        // su capítulo. Descartarla, como se hacía antes, dejaba una cotización
        // cuyo total salía en pantalla pero cuyo desglose venía vacío, y el
        // envío se cancelaba sin decir nada —el botón estaba habilitado porque
        // computeGrandTotal sí la contaba—. Quien adjunta la foto del clóset y
        // le pone el precio ya dijo lo que era.
        const desc = item.description.trim();
        // El capítulo, sin repetirse: en «Clósets» el grupo también se llama
        // «Clósets», y la línea salía como «Clósets · Clósets».
        const capitulo = group.label === section.name
          ? section.name
          : `${section.name} · ${group.label}`;
        const base = desc ? `${capitulo} · ${desc}` : capitulo;
        const manoDeObra = computeLineSubtotal(item);
        if (manoDeObra > 0) {
          flat.push({ description: base, quantity: 1, price: manoDeObra });
        }
        // El material va como línea propia: es lo que permite que el desglose
        // plano cuadre con el total, y que se lea aparte de la mano de obra.
        const material = computeMaterialSubtotal(item);
        if (material > 0) {
          const que = item.material?.descripcion?.trim();
          flat.push({
            description: `${base} — Material${que ? `: ${que}` : ''}`,
            quantity: 1,
            price: material,
          });
        }
      });
    });
  });
  return flat;
};
