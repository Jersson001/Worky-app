/**
 * El cuadro de tallas de una línea de cotización.
 *
 * En confección la cantidad no se escribe, se cuenta: un pedido de uniformes
 * no son «20 camisas», son 3 S, 8 M, 6 L y 3 XL. Ese desglose es lo que el
 * cliente revisa y lo que se manda a producción.
 *
 * Y cada talla lleva su propio costo, porque una XL lleva más tela que una S y
 * un 40 más que un 30. Con un solo precio por línea había que elegir entre
 * perder la diferencia o cobrársela a todas.
 */
import { CuadroDeTallas, LineaDeTalla, TipoDeTalla } from '../types';

/**
 * Las tallas de cada rejilla, como se piden aquí.
 *
 * Pantalón va de dos en dos porque es como se fabrica y como se pide; las
 * impares existen pero casi nadie las maneja en dotación. Calzado cubre de la
 * 34 a la 44, que es el rango de una dotación mixta.
 */
/**
 * Las tallas de un equipo, en el orden en que se piensan: primero los niños
 * por edad, luego las de niño por letra que usan algunas marcas, y al final el
 * adulto. Un pedido de escuela deportiva mezcla las tres.
 */
const TALLAS_DEPORTIVAS = [
  '4', '6', '8', '10', '12', '14', '16',
  'S-niño', 'M-niño', 'L-niño',
  'XS', 'S', 'M', 'L', 'XL', 'XXL',
];

export const REJILLAS: Record<TipoDeTalla, { label: string; icono: string; tallas: string[] }> = {
  letra: {
    label: 'Camisa',
    icono: 'fa-solid fa-shirt',
    tallas: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  },
  pantalon: {
    label: 'Pantalón',
    icono: 'fa-solid fa-user-tie',
    tallas: ['28', '30', '32', '34', '36', '38', '40'],
  },
  calzado: {
    label: 'Calzado',
    icono: 'fa-solid fa-shoe-prints',
    tallas: ['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44'],
  },
  /**
   * Tallas de niño, por edad.
   *
   * Hacen falta en cuanto se cotiza para una escuela deportiva o un colegio:
   * media plantilla es infantil y no cabe en XS–XXL. Se pide en una línea
   * aparte de la de adulto, que es como se manda a producción.
   */
  infantil: {
    label: 'Infantil',
    icono: 'fa-solid fa-child',
    tallas: ['4', '6', '8', '10', '12', '14', '16'],
  },

  // ── Ropa deportiva ────────────────────────────────────────────────────────
  camiseta:    { label: 'Camiseta',         icono: 'fa-solid fa-shirt',      tallas: TALLAS_DEPORTIVAS },
  pantaloneta: { label: 'Pantaloneta',      icono: 'fa-solid fa-person-running', tallas: TALLAS_DEPORTIVAS },
  medias:      { label: 'Medias',           icono: 'fa-solid fa-socks',      tallas: TALLAS_DEPORTIVAS },
  uniforme:    { label: 'Uniforme completo', icono: 'fa-solid fa-futbol',    tallas: TALLAS_DEPORTIVAS },
};

/**
 * Las rejillas que se le ofrecen a cada oficio.
 *
 * En deportiva no se pregunta por una rejilla de medida sino por qué prenda es,
 * porque un equipo compra o solo camisetas, o solo pantalonetas, o el uniforme
 * completo. Enseñarle ahí «Calzado» no le sirve de nada.
 */
export const TIPOS_DEPORTIVA: TipoDeTalla[] = ['camiseta', 'pantaloneta', 'medias', 'uniforme'];

/**
 * Qué prenda es, deducido de cómo se llama la línea.
 *
 * Sirve para que el cuadro arranque en la prenda correcta: en el grupo de
 * pantalonetas, encender las tallas tiene que dar pantaloneta y no camiseta,
 * que es la primera de la lista.
 */
/**
 * Si la línea todavía se llama como la puso la aplicación.
 *
 * Es lo que permite renombrarla al cambiar de prenda sin pisarle nunca un
 * nombre escrito a mano: «Camiseta local con patrocinador» se respeta,
 * «Camiseta» a secas se sustituye.
 */
export const esNombreDePrenda = (descripcion?: string): boolean => {
  const d = (descripcion || '').trim();
  if (!d || d === 'Uniforme') return true;
  return TIPOS_DEPORTIVA.some(t => REJILLAS[t].label === d);
};

export const tipoPorNombre = (descripcion?: string): TipoDeTalla | undefined => {
  const d = (descripcion || '').toLowerCase();
  if (d.includes('pantaloneta')) return 'pantaloneta';
  if (d.includes('media')) return 'medias';
  if (d.includes('camiseta')) return 'camiseta';
  if (d.includes('uniforme')) return 'uniforme';
  return undefined;
};

/**
 * Las de confección en general. No se derivan de `REJILLAS` porque ahí viven
 * también las de deportiva, y a un taller de uniformes empresariales
 * ofrecerle «Uniforme completo» no le dice nada.
 */
export const TIPOS_DE_TALLA: TipoDeTalla[] = ['letra', 'pantalon', 'calzado', 'infantil'];

/** Un cuadro nuevo, con la primera talla puesta para no arrancar en blanco. */
export const cuadroEnBlanco = (tipo: TipoDeTalla = 'letra'): CuadroDeTallas => ({
  activo: true,
  tipo,
  lineas: [{ talla: REJILLAS[tipo].tallas[0], cantidad: 1 }],
});

/**
 * Las líneas del cuadro, vengan como vengan.
 *
 * Los cuadros guardados antes de que cada talla tuviera su costo llevaban un
 * `cantidades: { M: 4 }` en vez de una lista. Se traducen al vuelo para que las
 * cotizaciones ya enviadas se sigan leyendo igual.
 */
export const lineasDe = (c?: CuadroDeTallas): LineaDeTalla[] => {
  if (!c?.activo) return [];
  if (c.lineas) return c.lineas;
  const viejas = (c as { cantidades?: Record<string, number> }).cantidades;
  if (!viejas) return [];
  return REJILLAS[c.tipo].tallas
    .filter(t => Number(viejas[t]) > 0)
    .map(t => ({ talla: t, cantidad: Number(viejas[t]) }));
};

/** Cuántas prendas hay en total. Es la cantidad de la línea. */
export const totalDeTallas = (c?: CuadroDeTallas): number =>
  lineasDe(c).reduce((s, l) => s + (Number(l.cantidad) || 0), 0);

/**
 * Lo que cuesta el cuadro entero.
 *
 * Cada talla usa su costo, y las que no lo tengan puesto caen al de la línea:
 * así el precio se escribe una vez y solo se toca donde se sale de lo normal.
 */
export const subtotalDeTallas = (c: CuadroDeTallas | undefined, costoBase: number): number =>
  lineasDe(c).reduce(
    (s, l) => s + (Number(l.cantidad) || 0) * (l.costo ?? costoBase ?? 0),
    0,
  );

/** El costo que le toca a una talla: el suyo, o el de la línea. */
export const costoDeLinea = (l: LineaDeTalla, costoBase: number): number =>
  l.costo ?? costoBase ?? 0;

/** Si esa talla se salió del precio base. Se marca en el formulario. */
export const tieneCostoPropio = (l: LineaDeTalla, costoBase: number): boolean =>
  l.costo !== undefined && l.costo !== costoBase;

/** Las tallas que aún no están en el cuadro, para poder añadirlas. */
export const tallasLibres = (c?: CuadroDeTallas): string[] => {
  if (!c) return [];
  const usadas = new Set(lineasDe(c).map(l => l.talla));
  return REJILLAS[c.tipo].tallas.filter(t => !usadas.has(t));
};

/**
 * El desglose en una línea: «S 2 · M 2 · XL 1».
 *
 * Va así y no como tabla porque tiene que caber bajo el nombre de la prenda en
 * el documento, al lado del precio, sin robarle sitio a la descripción.
 */
export const resumenDeTallas = (c?: CuadroDeTallas): string =>
  lineasDe(c).filter(l => l.cantidad > 0).map(l => `${l.talla} ${l.cantidad}`).join(' · ');

/** Si hay algo que enseñar. */
export const hayTallas = (c?: CuadroDeTallas): boolean =>
  lineasDe(c).some(l => l.cantidad > 0);

/** Si alguna prenda lleva número o nombre estampado. */
export const hayNumeracion = (c?: CuadroDeTallas): boolean =>
  lineasDe(c).some(l => !!l.numero?.trim() || !!l.nombre?.trim());

/**
 * El listado de prendas para el documento, una por renglón.
 *
 * Cuando llevan número y nombre no vale el resumen de una línea: el cliente
 * tiene que poder repasar su lista jugador por jugador y ver que están todos y
 * bien escritos. Un nombre mal impreso es una prenda perdida.
 */
export const detalleDeTallas = (
  c?: CuadroDeTallas,
): { talla: string; cantidad: number; numero: string; nombre: string }[] =>
  lineasDe(c)
    .filter(l => l.cantidad > 0)
    .map(l => ({
      talla: l.talla,
      cantidad: l.cantidad,
      numero: l.numero?.trim() ?? '',
      nombre: l.nombre?.trim() ?? '',
    }));

/**
 * Lo que cuesta una línea de la cotización básica.
 *
 * Existe porque el subtotal se calculaba a mano —`price * quantity`— en ocho
 * sitios: el formulario, el envío, las dos vistas del documento, el HTML que
 * se sube. Con el costo por talla eso deja de ser cierto, y acertar en los
 * ocho no es algo que salga bien dos veces seguidas.
 */
export const subtotalDeItem = (
  item: { price: number; quantity: number; tallas?: CuadroDeTallas },
): number =>
  item.tallas?.activo
    ? subtotalDeTallas(item.tallas, item.price || 0)
    : (item.price || 0) * (item.quantity || 0);
