/**
 * Referidos, del lado del administrador (supabase_referidos.sql).
 * Las funciones de la base comprueban que quien llama sea admin; aquí solo se
 * traducen los errores a algo que se pueda leer.
 */
import { supabase } from './supabaseConfig';
import { APP_PUBLICADA } from './catalogShareService';

export interface FilaReferidos {
  codigo: string;
  nombre: string;
  registrados: number;
  conMembresia: number;
  nuevos30d: number;
}

/** El enlace que se reparte. Siempre con el dominio publicado, como el del NFC. */
export const enlaceDeReferido = (codigo: string): string =>
  `${APP_PUBLICADA}/?ref=${encodeURIComponent(codigo)}`;

export const reporteReferidos = async (): Promise<FilaReferidos[]> => {
  const { data, error } = await supabase.rpc('reporte_referidos');
  if (error) throw new Error(error.message);
  return (data ?? []).map((f: Record<string, string | number>) => ({
    codigo: String(f.codigo),
    nombre: String(f.nombre),
    registrados: Number(f.registrados),
    conMembresia: Number(f.con_membresia),
    nuevos30d: Number(f.nuevos_30d),
  }));
};

/** Devuelve false si el código ya existía. */
export const crearCodigoReferido = async (codigo: string, nombre: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc('crear_codigo_referido', { p_codigo: codigo, p_nombre: nombre });
  if (error) throw new Error(error.message);
  return data === true;
};
