/**
 * Carpetas y subcarpetas del catálogo.
 *
 * Un solo nivel: una subcarpeta cuelga de una carpeta principal y no tiene
 * subcarpetas propias. La pantalla no deja crear más, pero estas funciones no
 * se fían de ello: si un dato llegara con dos niveles —una subcarpeta colgando
 * de otra subcarpeta—, la de abajo se trata como principal en vez de perderse
 * con sus productos.
 */
import type { ProductCategory } from '../types';

/** Si es de primer nivel: sin madre, con una madre que ya no existe, o con una madre que a su vez es subcarpeta. */
export const esPrincipal = (c: ProductCategory, todas: ProductCategory[]): boolean => {
  if (!c.parentId) return true;
  const madre = todas.find(x => x.id === c.parentId);
  return !madre || !!madre.parentId;
};

export const carpetasPrincipales = (todas: ProductCategory[]): ProductCategory[] =>
  todas.filter(c => esPrincipal(c, todas));

export const subcarpetasDe = (todas: ProductCategory[], idMadre: string): ProductCategory[] =>
  todas.filter(c => c.parentId === idMadre && !esPrincipal(c, todas));

/** La carpeta y sus subcarpetas: lo que cuenta «dentro» de una carpeta principal. */
export const idsDeCarpeta = (todas: ProductCategory[], id: string): string[] => [
  id,
  ...subcarpetasDe(todas, id).map(s => s.id),
];

/** «Jean › Jean hombre» para una subcarpeta; el nombre a secas para el resto. */
export const etiquetaDeCarpeta = (c: ProductCategory, todas: ProductCategory[]): string => {
  if (esPrincipal(c, todas)) return c.name;
  const madre = todas.find(x => x.id === c.parentId);
  return madre ? `${madre.name} › ${c.name}` : c.name;
};

/** Las carpetas en orden de lectura: cada principal seguida de sus subcarpetas. */
export const carpetasEnOrden = (todas: ProductCategory[]): ProductCategory[] =>
  carpetasPrincipales(todas).flatMap(c => [c, ...subcarpetasDe(todas, c.id)]);
