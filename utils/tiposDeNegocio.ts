/**
 * A qué se dedica quien usa Worky.
 *
 * Estaba escrito dos veces, en el registro y en el editor de perfil, y encima
 * la tabla que decide qué capítulos de cotización ve cada oficio vivía en un
 * tercer sitio. Añadir un oficio pedía acordarse de los tres, y olvidarse del
 * tercero no daba error: `gremiosVisibles` le enseña TODOS los capítulos a
 * quien no reconoce, así que una tienda de ropa habría visto «Cocinas
 * Integrales» y «Enchapes y Pisos» en su cotización.
 */
import { GremioKey } from '../types';

export interface TipoDeNegocio {
  /** Lo que se guarda en el perfil. No se cambia: hay cuentas con este valor. */
  value: string;
  label: string;
  emoji: string;
  /**
   * Qué capítulos de cotización le tocan. Vacío = solo cotización básica, que
   * es lo que necesita quien vende cosas hechas en vez de hacerlas por encargo.
   */
  gremios: GremioKey[];
  /** Para agrupar el selector. */
  familia: 'obra' | 'comercio' | 'otro';
}

export const TIPOS_DE_NEGOCIO: TipoDeNegocio[] = [
  // ── Obra y construcción ──
  { value: 'carpinteria', label: 'Carpintería', emoji: '🪚', gremios: ['carpinteria'], familia: 'obra' },
  { value: 'muebles', label: 'Muebles', emoji: '🛋️', gremios: ['carpinteria'], familia: 'obra' },
  // Quien decora suele encargar tanto el mueble como la obra.
  { value: 'decoracion', label: 'Decoración', emoji: '🪴', gremios: ['carpinteria', 'obra_civil'], familia: 'obra' },
  { value: 'construccion', label: 'Construcción', emoji: '🏗️', gremios: ['obra_civil'], familia: 'obra' },
  { value: 'reformas', label: 'Reformas', emoji: '🏠', gremios: ['obra_civil'], familia: 'obra' },
  { value: 'pintura', label: 'Pintura', emoji: '🎨', gremios: ['obra_civil'], familia: 'obra' },
  { value: 'plomeria', label: 'Plomería', emoji: '🔧', gremios: ['obra_civil'], familia: 'obra' },
  { value: 'electricidad', label: 'Electricidad', emoji: '⚡', gremios: ['obra_civil'], familia: 'obra' },

  // ── Comercio ──
  // Sin capítulos: aquí se vende de catálogo y se cotiza por cantidad, no por
  // metro lineal de mesón. Los porcentajes de pago y la cuenta sí los ven,
  // que cobrar se cobra en todos los oficios.
  { value: 'moda_textiles', label: 'Moda y textiles', emoji: '🧵', gremios: [], familia: 'comercio' },
  { value: 'calzado', label: 'Calzado', emoji: '👟', gremios: [], familia: 'comercio' },
  { value: 'belleza', label: 'Belleza', emoji: '💄', gremios: [], familia: 'comercio' },
  { value: 'articulos_varios', label: 'Artículos varios', emoji: '📦', gremios: [], familia: 'comercio' },

  { value: 'otro', label: 'Otro', emoji: '💼', gremios: [], familia: 'otro' },
];

export const FAMILIAS: { key: TipoDeNegocio['familia']; label: string }[] = [
  { key: 'obra', label: 'Obra y construcción' },
  { key: 'comercio', label: 'Comercio' },
  { key: 'otro', label: '' },
];

/** Los de una familia, en el orden en que se declararon. */
export const tiposDe = (familia: TipoDeNegocio['familia']): TipoDeNegocio[] =>
  TIPOS_DE_NEGOCIO.filter(t => t.familia === familia);

/** La tabla que consulta `gremiosVisibles`. Se deriva, no se repite. */
export const GREMIOS_POR_OFICIO: Record<string, GremioKey[]> =
  Object.fromEntries(TIPOS_DE_NEGOCIO.map(t => [t.value, t.gremios]));
