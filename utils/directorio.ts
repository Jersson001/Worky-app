/**
 * El directorio de contactos: buscar, filtrar por rol y agrupar por letra.
 *
 * La lista de Chats ordena por lo más reciente y busca solo por nombre, que es
 * lo que hace falta para contestar mensajes. Un directorio responde otra
 * pregunta —«¿cómo se llamaba el de la cocina de Chapinero?», «dame el número de
 * la ferretería»— y por eso va en orden alfabético, busca también por teléfono,
 * correo y documento, y enseña cómo localizar a cada uno, no su último mensaje.
 *
 * Aquí no hay pantalla: entran contactos y salen listas, para poder probarlo.
 */

export type RolDeContacto = 'client' | 'supplier' | 'collaborator';
export type FiltroDeRol = 'todos' | RolDeContacto;

/** Lo que el directorio lee de un contacto. `Contact` ya lo cumple. */
export interface ContactoDelDirectorio {
  id: string;
  clientName: string;
  alias?: string;
  phone: string;
  email?: string;
  documento?: string;
  role: RolDeContacto | string;
}

/** Minúsculas y sin tildes: «Ñandú», «nandu» y «ÑANDÚ» son lo mismo al buscar. */
export const sinTildes = (texto: string): string =>
  (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const soloDigitos = (texto: string): string => (texto || '').replace(/\D/g, '');

/**
 * Si un contacto responde a lo que se buscó.
 *
 * Cada palabra escrita tiene que aparecer en alguna parte —el orden no importa—
 * así «ana restrepo» y «restrepo ana» encuentran lo mismo. Si lo escrito son
 * dígitos (de 3 en adelante), se compara con el teléfono sin espacios ni
 * guiones: el número se guardó de una forma y se busca de otra.
 */
export const coincide = (c: ContactoDelDirectorio, busqueda: string): boolean => {
  const q = sinTildes(busqueda);
  if (!q) return true;

  const digitos = soloDigitos(q);
  if (digitos.length >= 3 && digitos.length === q.replace(/[\s+()-]/g, '').length) {
    return soloDigitos(c.phone).includes(digitos) || soloDigitos(c.documento || '').includes(digitos);
  }

  const pajar = sinTildes([c.clientName, c.alias, c.phone, c.email, c.documento].filter(Boolean).join(' '));
  return q.split(/\s+/).every(palabra => pajar.includes(palabra));
};

export const filtrarContactos = <T extends ContactoDelDirectorio>(
  contactos: T[],
  rol: FiltroDeRol,
  busqueda: string,
): T[] => contactos.filter(c => (rol === 'todos' || c.role === rol) && coincide(c, busqueda));

/** Cuántos hay de cada rol, para ponerlo en los filtros. */
export const contarPorRol = (contactos: ContactoDelDirectorio[]): Record<FiltroDeRol, number> => {
  const cuenta: Record<FiltroDeRol, number> = { todos: contactos.length, client: 0, supplier: 0, collaborator: 0 };
  for (const c of contactos) {
    if (c.role === 'client' || c.role === 'supplier' || c.role === 'collaborator') cuenta[c.role]++;
  }
  return cuenta;
};

/** La letra bajo la que va un nombre; lo que no empieza con letra va en «#». */
export const letraDe = (nombre: string): string => {
  const primera = sinTildes(nombre).replace(/^[^a-z0-9ñ]+/, '').charAt(0).toUpperCase();
  return /[A-ZÑ]/.test(primera) ? primera : '#';
};

export interface GrupoDeLetra<T> {
  letra: string;
  contactos: T[];
}

/**
 * Los contactos en orden alfabético, agrupados por letra. Los de «#» van al
 * final: nombres que empiezan con un número o un símbolo, que no tienen sitio
 * entre las letras.
 */
export const agruparPorLetra = <T extends ContactoDelDirectorio>(contactos: T[]): GrupoDeLetra<T>[] => {
  const ordenados = [...contactos].sort((a, b) =>
    sinTildes(a.clientName).localeCompare(sinTildes(b.clientName), 'es'));
  const grupos = new Map<string, T[]>();
  for (const c of ordenados) {
    const letra = letraDe(c.clientName);
    grupos.set(letra, [...(grupos.get(letra) || []), c]);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b, 'es')))
    .map(([letra, lista]) => ({ letra, contactos: lista }));
};

/**
 * El número para abrir un chat de WhatsApp.
 *
 * Un celular colombiano se guarda como se escribe, de diez cifras y empezando por
 * 3, sin indicativo, y WhatsApp sin indicativo abre un chat con un número que no
 * existe. Se le pone el 57 a ese caso. Cualquier otro —con su `+`, de otro
 * país— se respeta tal cual. Devuelve vacío si no hay un número: un usuario de
 * WhatsApp (@andres.23) no tiene a qué número apuntar.
 */
export const numeroParaWhatsApp = (telefono: string): string => {
  const t = (telefono || '').trim();
  if (!t || t.startsWith('@') || /[a-z]/i.test(t)) return '';
  const d = soloDigitos(t);
  if (d.length < 7) return '';
  if (!t.startsWith('+') && d.length === 10 && d.startsWith('3')) return `57${d}`;
  return d;
};

/** Cómo localizar a alguien: su número, su usuario de WhatsApp o su correo. */
export const medioDeContacto = (c: ContactoDelDirectorio): string =>
  (c.phone || '').trim() || (c.email || '').trim() || (c.alias ? `@${c.alias.replace(/^@/, '')}` : '');
