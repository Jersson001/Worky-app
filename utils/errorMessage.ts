/**
 * Texto legible de un error desconocido.
 *
 * Los errores de Supabase son objetos planos ({ message, details, hint, code }),
 * no instancias de Error: con String(error) salía "[object Object]", que no
 * dice nada de lo que falló.
 */
export const describeError = (error: unknown): string => {
  if (!error) return 'Error desconocido';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;

  const e = error as Record<string, unknown>;
  const partes = [e.message, e.details, e.hint]
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0);

  if (partes.length) {
    return e.code ? `${partes.join(' — ')} (código ${e.code})` : partes.join(' — ');
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};
