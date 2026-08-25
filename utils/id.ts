/**
 * Identificadores para las entidades que se guardan en la base de datos.
 *
 * Todas las tablas (products, categories, projects, expenses,
 * payment_accounts, contacts, messages) tienen la columna `id` de tipo uuid.
 * La app venía generando `Date.now().toString()`, que Postgres rechaza con
 * "invalid input syntax for type uuid" (22P02): el guardado fallaba y, como
 * el error se ignoraba, el dato solo parecía haberse guardado.
 */

/** uuid v4. Usa crypto.randomUUID cuando está disponible. */
export const newId = (): string => {
  // randomUUID exige contexto seguro; en http:// plano no existe.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; // versión 4
    b[8] = (b[8] & 0x3f) | 0x80; // variante RFC 4122
    const hex = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Último recurso: sin API criptográfica. No es uniforme, pero es un uuid
  // válido y basta para que Postgres lo acepte.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};
