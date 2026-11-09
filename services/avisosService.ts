/**
 * Avisos de las tiendas a quienes las siguen (supabase_avisos.sql).
 *
 * «Seguir» nació en el teléfono (`utils/tiendasGuardadas.ts`) para no pedirle
 * cuenta a quien acaba de escanear un QR. Para que la tienda pueda avisarle, el
 * servidor tiene que saberlo: cuando hay sesión —aunque sea la anónima— lo que
 * se sigue en el teléfono se copia a la base, y desde entonces cada «seguir» y
 * cada «dejar de seguir» se refleja allá.
 *
 * Nada de esto puede romper la pantalla: sin red, sin sesión o sin la migración
 * simplemente no se sincroniza, y se reintenta en el siguiente arranque.
 */
import { supabase } from './supabaseConfig';
import { leerTiendas } from '../utils/tiendasGuardadas';
import { contarSinLeer, type TipoAviso } from '../utils/avisos';

export interface Aviso {
  id: string;
  tiendaId: string;
  negocio: string;
  tipo: TipoAviso;
  titulo: string;
  texto: string;
  /** `YYYY-MM-DD`, o null si no tiene fecha límite. */
  venceEn: string | null;
  creado: string;
}

export interface AvisoPublicado {
  id: string;
  tipo: TipoAviso;
  titulo: string;
  texto: string;
  venceEn: string | null;
  creado: string;
}

export interface DatosDeAviso {
  tipo: TipoAviso;
  titulo: string;
  texto: string;
  /** `YYYY-MM-DD`, o vacío. */
  venceEn: string;
}

const hayUsuario = async (): Promise<boolean> => {
  try {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  } catch {
    return false;
  }
};

/** Copia al servidor las tiendas que ya se seguían en este teléfono. */
export const sincronizarSeguidas = async (): Promise<void> => {
  try {
    const ids = leerTiendas().map(t => t.id).filter(id => /^[0-9a-f-]{36}$/i.test(id));
    if (ids.length === 0 || !(await hayUsuario())) return;
    await supabase.rpc('seguir_tiendas', { p_ids: ids });
  } catch {
    /* se reintenta en el siguiente arranque */
  }
};

export const seguirEnServidor = async (tiendaId: string): Promise<void> => {
  try {
    if (!(await hayUsuario())) return; // queda en el teléfono y sube al tener sesión
    await supabase.rpc('seguir_tiendas', { p_ids: [tiendaId] });
  } catch {
    /* idem */
  }
};

export const dejarDeSeguirEnServidor = async (tiendaId: string): Promise<void> => {
  try {
    if (!(await hayUsuario())) return;
    await supabase.rpc('dejar_de_seguir', { p_tienda: tiendaId });
  } catch {
    /* idem */
  }
};

// ─── El cliente ───────────────────────────────────────────────────────────────

/** Las novedades de las tiendas que sigue. Vacío si no hay nada o falla. */
export const misAvisos = async (limite = 30): Promise<Aviso[]> => {
  try {
    const { data, error } = await supabase.rpc('mis_avisos', { p_limite: limite });
    if (error || !Array.isArray(data)) return [];
    return data.map((f: Record<string, string | null>) => ({
      id: String(f.id),
      tiendaId: String(f.tienda_id),
      negocio: String(f.negocio ?? 'Una tienda'),
      tipo: f.tipo as TipoAviso,
      titulo: String(f.titulo),
      texto: String(f.texto ?? ''),
      venceEn: f.vence_en,
      creado: String(f.creado),
    }));
  } catch {
    return [];
  }
};

const VISTOS_KEY = 'worky:avisos-vistos';

export const marcarAvisosVistos = (): void => {
  try {
    localStorage.setItem(VISTOS_KEY, new Date().toISOString());
  } catch {
    /* sin almacenamiento: la bandeja avisará de más, no de menos */
  }
};

/** Cuándo se miró la bandeja por última vez, o null si nunca. */
export const ultimaVistaDeAvisos = (): string | null => {
  try {
    return localStorage.getItem(VISTOS_KEY);
  } catch {
    return null;
  }
};

export const avisosSinLeer = (avisos: Aviso[]): number => {
  let visto: string | null = null;
  try {
    visto = localStorage.getItem(VISTOS_KEY);
  } catch {
    /* idem */
  }
  return contarSinLeer(avisos.map(a => a.creado), visto);
};

// ─── La tienda ────────────────────────────────────────────────────────────────

/** Cuántas personas la siguen, o null si no se pudo saber. */
export const cuantosMeSiguen = async (): Promise<number | null> => {
  try {
    const { data, error } = await supabase.rpc('cuantos_me_siguen');
    return error || typeof data !== 'number' ? null : data;
  } catch {
    return null;
  }
};

/** Publica un aviso. Lanza un Error con el motivo en español si la base lo rechaza. */
export const publicarAviso = async (datos: DatosDeAviso): Promise<void> => {
  const { error } = await supabase.rpc('publicar_aviso', {
    p_tipo: datos.tipo,
    p_titulo: datos.titulo,
    p_texto: datos.texto,
    p_vence: datos.venceEn || null,
  });
  if (error) throw new Error(error.message);
};

export const avisosPublicados = async (): Promise<AvisoPublicado[]> => {
  try {
    const { data, error } = await supabase.rpc('mis_avisos_publicados', { p_limite: 20 });
    if (error || !Array.isArray(data)) return [];
    return data.map((f: Record<string, string | null>) => ({
      id: String(f.id),
      tipo: f.tipo as TipoAviso,
      titulo: String(f.titulo),
      texto: String(f.texto ?? ''),
      venceEn: f.vence_en,
      creado: String(f.creado),
    }));
  } catch {
    return [];
  }
};

export const borrarAviso = async (id: string): Promise<void> => {
  const { error } = await supabase.rpc('borrar_aviso', { p_id: id });
  if (error) throw new Error(error.message);
};
