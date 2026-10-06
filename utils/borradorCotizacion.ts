/**
 * El borrador de una cotización, guardado en el teléfono.
 *
 * El formulario vive solo en la memoria de la app: cerrarla a medias lo
 * perdía todo. Aquí se guarda lo escrito, uno por contacto y por cuenta —un
 * teléfono lo usan varias—, para retomarlo al volver.
 *
 * No es un mensaje del chat: ese hilo lo ve también el cliente, y vería una
 * cotización a medias. Es solo del vendedor y no sale del teléfono.
 *
 * Las fotos no se guardan: pesan megas y el almacenamiento simple del teléfono
 * tiene un tope pequeño. Se cuenta cuántas eran para avisar al retomarlo.
 */
import type { QuoteFormState } from '../hooks/useChatFormState';

export interface Borrador {
  quote: QuoteFormState;
  /** Cuántas fotos tenía y no se guardaron. */
  fotosOmitidas: number;
  guardado: number;
}

export const claveBorrador = (uid: string, contactId: string): string =>
  `worky_borrador_cotizacion:${uid}:${contactId}`;

const fotosDe = (item: any): number =>
  (item?.image ? 1 : 0) + (Array.isArray(item?.images) ? item.images.length : 0);

/**
 * Si el formulario no tiene nada que valga la pena guardar o conservar.
 * Una foto cuenta como contenido: quien llega desde «Cotizar» sobre una foto
 * del chat trae ya su línea, y esa no se debe pisar con un borrador.
 */
export const quoteVacia = (q: QuoteFormState): boolean => {
  const basicaUsada = q.items.some(i => i.description?.trim() || i.price > 0 || fotosDe(i) > 0);
  return !basicaUsada && q.sections.length === 0;
};

const sinFotos = (q: QuoteFormState): { quote: QuoteFormState; fotosOmitidas: number } => {
  let fotosOmitidas = 0;
  const limpiar = (item: any) => {
    fotosOmitidas += fotosDe(item);
    const { image: _image, ...resto } = item;
    return { ...resto, images: [] };
  };
  return {
    quote: {
      ...q,
      showProductPicker: false,
      items: q.items.map(limpiar),
      sections: q.sections.map(section => ({
        ...section,
        groups: section.groups.map(group => ({ ...group, items: group.items.map(limpiar) })),
      })),
    },
    fotosOmitidas,
  };
};

export const leerBorrador = (clave: string): Borrador | null => {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo ? (JSON.parse(crudo) as Borrador) : null;
  } catch {
    return null;
  }
};

export const borrarBorrador = (clave: string): void => {
  try {
    localStorage.removeItem(clave);
  } catch {
    /* sin almacenamiento no hay borrador, y la cotización sigue funcionando */
  }
};

/**
 * Guarda el formulario. Un formulario vacío no borra el borrador que hubiera:
 * quien abre la cotización desde una foto empieza en blanco y no tiene por qué
 * perder lo que dejó a medias. Borrar es siempre una decisión: enviar o descartar.
 */
export const guardarBorrador = (clave: string, q: QuoteFormState): Borrador | null => {
  const { quote, fotosOmitidas } = sinFotos(q);
  if (quoteVacia(quote)) return leerBorrador(clave);
  const borrador: Borrador = { quote, fotosOmitidas, guardado: Date.now() };
  try {
    localStorage.setItem(clave, JSON.stringify(borrador));
  } catch (e) {
    console.warn('No se pudo guardar el borrador de la cotización:', e);
  }
  return borrador;
};
