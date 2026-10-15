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
 * Las fotos recién tomadas no se guardan: pesan megas y el almacenamiento
 * simple del teléfono tiene un tope pequeño. Se cuenta cuántas eran para avisar
 * al retomarlo. Las que ya están subidas son solo un enlace y sí se conservan:
 * una copia de otra cotización las trae todas, y perderlas por una recarga
 * obligaba a buscarlas de nuevo.
 *
 * Hay un borrador por contacto para la cotización que se hace de cero, y uno más
 * por cada cotización que se copia o se edita: son trabajos distintos, y empezar
 * una copia no debe pisar lo que se llevaba escrito en otra.
 */
import type { QuoteFormState } from '../hooks/useChatFormState';

/** De qué cotización ya enviada viene el borrador, si viene de una. */
export interface OrigenBorrador {
  tipo: 'copia' | 'edicion';
  messageId: string;
  numero: string;
  metadataId?: string;
}

export interface Borrador {
  quote: QuoteFormState;
  /** Cuántas fotos tenía y no se guardaron. */
  fotosOmitidas: number;
  guardado: number;
  origen?: OrigenBorrador;
}

const PREFIJO = 'worky_borrador_cotizacion';

export const claveBorrador = (uid: string, contactId: string, origen?: Pick<OrigenBorrador, 'tipo' | 'messageId'>): string =>
  `${PREFIJO}:${uid}:${contactId}${origen ? `:${origen.tipo}:${origen.messageId}` : ''}`;

/** Una foto recién tomada viaja como data URI; una ya subida, como enlace. */
const esLocal = (foto: unknown): boolean => typeof foto === 'string' && foto.startsWith('data:');

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
    const { image, images, ...resto } = item;
    const subidas: string[] = Array.isArray(images) ? images.filter((f: unknown) => !esLocal(f)) : [];
    fotosOmitidas += fotosDe(item) - subidas.length - (image && !esLocal(image) ? 1 : 0);
    return { ...resto, ...(image && !esLocal(image) ? { image } : {}), images: subidas };
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
export const guardarBorrador = (clave: string, q: QuoteFormState, origen?: OrigenBorrador): Borrador | null => {
  const { quote, fotosOmitidas } = sinFotos(q);
  if (quoteVacia(quote)) return leerBorrador(clave);
  const borrador: Borrador = { quote, fotosOmitidas, guardado: Date.now(), ...(origen ? { origen } : {}) };
  try {
    localStorage.setItem(clave, JSON.stringify(borrador));
  } catch (e) {
    console.warn('No se pudo guardar el borrador de la cotización:', e);
  }
  return borrador;
};

/**
 * Todos los borradores de un contacto: el de la cotización de cero y los de
 * cada copia o edición que quedó a medias. El más reciente primero.
 */
export const listarBorradores = (uid: string, contactId: string): { clave: string; borrador: Borrador }[] => {
  const base = claveBorrador(uid, contactId);
  const encontrados: { clave: string; borrador: Borrador }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const clave = localStorage.key(i);
      // «:» tras la base: sin él, el contacto «a» recogería los de «ab».
      if (!clave || (clave !== base && !clave.startsWith(`${base}:`))) continue;
      const borrador = leerBorrador(clave);
      if (borrador) encontrados.push({ clave, borrador });
    }
  } catch {
    /* sin almacenamiento no hay borradores */
  }
  return encontrados.sort((a, b) => b.borrador.guardado - a.borrador.guardado);
};
