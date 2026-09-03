/**
 * El cuadro de tallas de una línea de cotización.
 *
 * En confección la cantidad no se escribe, se cuenta: un pedido de uniformes
 * no son «20 camisas», son 3 S, 8 M, 6 L y 3 XL. Ese desglose es lo que el
 * cliente revisa y lo que se manda a producción, y sin un sitio donde ponerlo
 * acababa escrito a mano en el campo de comentarios.
 */
import { CuadroDeTallas, TipoDeTalla } from '../types';

/**
 * Las tallas de cada rejilla, como se piden aquí.
 *
 * Pantalón va de dos en dos porque es como se fabrica y como se pide; las
 * impares existen pero casi nadie las maneja en dotación. Calzado cubre de la
 * 34 a la 44, que es el rango de una dotación mixta.
 */
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
};

export const TIPOS_DE_TALLA = Object.keys(REJILLAS) as TipoDeTalla[];

/** Un cuadro nuevo, apagado y en blanco. */
export const cuadroEnBlanco = (tipo: TipoDeTalla = 'letra'): CuadroDeTallas => ({
  activo: true,
  tipo,
  cantidades: {},
});

/** Cuántas prendas hay en total. Es la cantidad de la línea. */
export const totalDeTallas = (c?: CuadroDeTallas): number =>
  c?.activo
    ? Object.values(c.cantidades).reduce((s, n) => s + (Number(n) || 0), 0)
    : 0;

/** Solo las tallas que llevan algo, en el orden de la rejilla. */
export const tallasConCantidad = (c?: CuadroDeTallas): { talla: string; cantidad: number }[] => {
  if (!c?.activo) return [];
  return REJILLAS[c.tipo].tallas
    .map(talla => ({ talla, cantidad: Number(c.cantidades[talla]) || 0 }))
    .filter(t => t.cantidad > 0);
};

/**
 * El desglose en una línea: «S 3 · M 8 · L 6 · XL 3».
 *
 * Va así y no como tabla porque tiene que caber bajo el nombre de la prenda
 * en el documento, al lado del precio, sin robarle sitio a la descripción.
 */
export const resumenDeTallas = (c?: CuadroDeTallas): string =>
  tallasConCantidad(c).map(t => `${t.talla} ${t.cantidad}`).join(' · ');

/** Si hay algo que enseñar. */
export const hayTallas = (c?: CuadroDeTallas): boolean => tallasConCantidad(c).length > 0;
