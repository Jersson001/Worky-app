/**
 * Códigos de referido: `https://worky.ferryapp.co/?ref=LEO`.
 *
 * El código se guarda al llegar, porque el registro puede pasar por la
 * confirmación del correo o por Google y la dirección no sobrevive a ese viaje.
 * Cuando la cuenta ya es permanente se reclama en la base
 * (supabase_referidos.sql), que decide si vale: existe el código, la cuenta es
 * reciente y aún no tenía referido.
 */
const CLAVE = 'worky:referido';
const FORMA = /^[A-Za-z0-9]{3,20}$/;

/** Lee `?ref=` de la dirección y lo guarda. Devuelve el código si es válido. */
export const recordarReferidoDeLaUrl = (): string | null => {
  try {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (!ref || !FORMA.test(ref)) return null;
    const codigo = ref.toUpperCase();
    localStorage.setItem(CLAVE, codigo);
    return codigo;
  } catch {
    return null;
  }
};

export const referidoPendiente = (): string | null => {
  try {
    const guardado = localStorage.getItem(CLAVE);
    return guardado && FORMA.test(guardado) ? guardado : null;
  } catch {
    return null;
  }
};

export const olvidarReferido = (): void => {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* nada que olvidar */
  }
};
