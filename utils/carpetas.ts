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

/** Lo que se «abre» para ver los productos que no están en ninguna carpeta. */
export const SIN_CARPETA = '__sin_carpeta__';

/** Un producto cuya carpeta ya no existe cuenta como «sin carpeta»: no se pierde de vista. */
export const estaSinCarpeta = (p: { categoryId?: string | null }, todas: ProductCategory[]): boolean =>
  !p.categoryId || !todas.some(c => c.id === p.categoryId);

/**
 * Los productos que se ven al tener algo abierto.
 * Nada abierto (`null`) = todos; `SIN_CARPETA` = los que no están en ninguna; una
 * carpeta = solo los suyos, sin los de sus subcarpetas (esas se abren aparte).
 */
export const productosVisibles = <P extends { categoryId?: string | null }>(
  productos: P[],
  abierta: string | null,
  todas: ProductCategory[],
): P[] => {
  if (abierta === null) return productos;
  if (abierta === SIN_CARPETA) return productos.filter(p => estaSinCarpeta(p, todas));
  return productos.filter(p => p.categoryId === abierta);
};

/** La carpeta donde se guarda un producto nuevo según lo que esté abierto. Vacío = ninguna. */
export const carpetaParaProductoNuevo = (abierta: string | null): string =>
  abierta && abierta !== SIN_CARPETA ? abierta : '';
