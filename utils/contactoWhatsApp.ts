/**
 * Cómo se localiza a alguien en WhatsApp: por su número o por su usuario.
 *
 * WhatsApp deja escribir desde un nombre de usuario —«@andres.23»— sin enseñar
 * el número, y hay clientes que llegan así. Su contacto se guarda en el mismo
 * campo que el teléfono, porque es lo mismo para quien vende: por dónde le
 * escribe. Pero no se puede tratar como un número: el enlace de WhatsApp se
 * queda con los dígitos, y de «@andres.23_MSG» sacaba el número 23.
 */

/** Si lo guardado es un usuario de WhatsApp y no un número. */
export const esUsuarioDeWhatsApp = (valor?: string | null): boolean => {
  const v = (valor ?? '').trim();
  // Un número puede traer +, espacios, guiones o paréntesis, pero no letras.
  return v.startsWith('@') || /[a-z]/i.test(v);
};

/** El número, o vacío si lo que hay es un usuario. Para lo que necesita dígitos. */
export const telefonoDe = (valor?: string | null): string =>
  esUsuarioDeWhatsApp(valor) ? '' : (valor ?? '').trim();

/**
 * Lo escrito en el formulario, listo para guardar.
 *
 * Un usuario se guarda con su @ y sin espacios, que es como lo enseña WhatsApp
 * y como lo va a buscar quien vende: «andres.23» y «@andres.23» son el mismo.
 */
export const normalizarContactoWhatsApp = (valor: string): string => {
  const v = valor.trim();
  if (!esUsuarioDeWhatsApp(v)) return v;
  return `@${v.replace(/^@+/, '').replace(/\s+/g, '')}`;
};
