/**
 * Calificaciones de las tiendas (supabase_calificaciones.sql).
 *
 * La lectura es pública —la página del catálogo no tiene sesión—; calificar
 * exige haberle escrito a la tienda, y eso lo decide la base, no esta pantalla.
 *
 * Nada de esto puede romper el catálogo: si falla, la página se ve igual, sin
 * estrellas.
 */
import { supabase } from './supabaseConfig';

export interface ResumenDeCalificaciones {
  total: number;
  promedio: number;
  /** Cuántas hay de 1, 2, 3, 4 y 5 estrellas. */
  porEstrella: [number, number, number, number, number];
}

export interface Opinion {
  id: string;
  estrellas: number;
  comentario: string;
  /** Recortado por la base: «Ana M.». */
  nombre: string;
  creado: string;
  respuesta: string | null;
  respondidoEn: string | null;
}

export interface MiCalificacion {
  estrellas: number;
  comentario: string;
}

export const resumenDeCalificaciones = async (tiendaId: string): Promise<ResumenDeCalificaciones | null> => {
  try {
    const { data, error } = await supabase.rpc('resumen_calificaciones', { p_tienda: tiendaId });
    const f = Array.isArray(data) ? data[0] : null;
    if (error || !f) return null;
    return {
      total: Number(f.total),
      promedio: Number(f.promedio),
      porEstrella: [Number(f.e1), Number(f.e2), Number(f.e3), Number(f.e4), Number(f.e5)],
    };
  } catch {
    return null;
  }
};

export const opinionesDe = async (tiendaId: string, limite = 20): Promise<Opinion[]> => {
  try {
    const { data, error } = await supabase.rpc('calificaciones_de', { p_tienda: tiendaId, p_limite: limite });
    if (error || !Array.isArray(data)) return [];
    return data.map((f: Record<string, string | number | null>) => ({
      id: String(f.id),
      estrellas: Number(f.estrellas),
      comentario: String(f.comentario ?? ''),
      nombre: String(f.nombre ?? 'Cliente'),
      creado: String(f.creado),
      respuesta: f.respuesta ? String(f.respuesta) : null,
      respondidoEn: f.respondido_en ? String(f.respondido_en) : null,
    }));
  } catch {
    return [];
  }
};

/** ¿Puede esta persona calificar a la tienda? False sin sesión o si nunca le escribió. */
export const puedeCalificar = async (tiendaId: string): Promise<boolean> => {
  try {
    const { data: sesion } = await supabase.auth.getSession();
    if (!sesion.session) return false;
    const { data, error } = await supabase.rpc('puede_calificar', { p_tienda: tiendaId });
    return !error && data === true;
  } catch {
    return false;
  }
};

export const miCalificacion = async (tiendaId: string): Promise<MiCalificacion | null> => {
  try {
    const { data, error } = await supabase.rpc('mi_calificacion', { p_tienda: tiendaId });
    const f = Array.isArray(data) ? data[0] : null;
    return error || !f ? null : { estrellas: Number(f.estrellas), comentario: String(f.comentario ?? '') };
  } catch {
    return null;
  }
};

/** Lanza un Error con el motivo en español si la base lo rechaza. */
export const calificarTienda = async (tiendaId: string, estrellas: number, comentario: string): Promise<void> => {
  const { error } = await supabase.rpc('calificar_tienda', {
    p_tienda: tiendaId,
    p_estrellas: estrellas,
    p_comentario: comentario,
  });
  if (error) throw new Error(error.message);
};

export const quitarMiCalificacion = async (tiendaId: string): Promise<void> => {
  const { error } = await supabase.rpc('borrar_mi_calificacion', { p_tienda: tiendaId });
  if (error) throw new Error(error.message);
};

/** La tienda responde a una opinión. Vacío quita la respuesta. */
export const responderOpinion = async (opinionId: string, respuesta: string): Promise<void> => {
  const { error } = await supabase.rpc('responder_calificacion', { p_id: opinionId, p_respuesta: respuesta });
  if (error) throw new Error(error.message);
};
