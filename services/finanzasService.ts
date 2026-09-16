/**
 * Lo que lee Estados Financieros.
 *
 * El reporte armaba sus cifras con los proyectos que traían los contactos en
 * memoria, y esos contactos se cargan con `projects: []`: los proyectos solo se
 * piden al abrir un chat. Así que solo sumaba los chats abiertos en la sesión,
 * y como al abrirlo se deselecciona el contacto, lo normal era $0.
 *
 * Aquí se pide todo de una vez y directo a la base. Para que el vendedor vea
 * los proyectos que le aprobaron hace falta supabase_finanzas_del_vendedor.sql:
 * sin él la base le niega los que nacieron desde el lado del cliente.
 */
import { supabase } from './supabaseConfig';
import { getCurrentUserId } from './messagingService';
import {
  armarDatosFinancieros, ContactoConocido, DatosFinancieros, DOCUMENTOS_DE_COBRO,
  FilaCobro, FilaGasto, FilaProyecto,
} from '../utils/finanzas';

const PAGINA = 1000;

/** Supabase devuelve como mucho mil filas por consulta: se piden por tandas. */
const todas = async <T,>(consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> => {
  const filas: T[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await consulta(desde, desde + PAGINA - 1);
    if (error) throw error;
    filas.push(...(data || []));
    if (!data || data.length < PAGINA) return filas;
  }
};

export const cargarDatosFinancieros = async (contactos: ContactoConocido[]): Promise<DatosFinancieros> => {
  // `getCurrentUserId` lanza sin sesión; sin sesión no hay nada que sumar.
  let yo: string;
  try { yo = getCurrentUserId(); } catch { return { ventas: [], movimientos: [] }; }

  const [proyectos, cobros] = await Promise.all([
    // Los míos como contratista. Los que no tienen contratista son anteriores a
    // esa columna, y si la base los deja ver es porque cuelgan de mis fichas.
    todas<FilaProyecto>((d, h) => supabase
      .from('projects')
      .select('id, name, value, stage, start_date, created_at, contact_id, client_id')
      .or(`contractor_id.eq.${yo},contractor_id.is.null`)
      .order('start_date', { ascending: false })
      .range(d, h)),
    todas<FilaCobro>((d, h) => supabase
      .from('messages')
      .select('id, type, is_paid, paid_date, timestamp, recipient_id, recipient_contact, metadata')
      .eq('sender_id', yo)
      .in('type', DOCUMENTOS_DE_COBRO)
      .order('timestamp', { ascending: false })
      .range(d, h)),
  ]);

  // Los gastos, de todos los proyectos en tandas: `in` con miles de ids no cabe
  // en la URL de una sola petición.
  const ids = proyectos.map(p => p.id);
  const gastos: FilaGasto[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const tanda = ids.slice(i, i + 200);
    gastos.push(...await todas<FilaGasto>((d, h) => supabase
      .from('expenses')
      .select('id, project_id, description, amount, category, date')
      .in('project_id', tanda)
      .range(d, h)));
  }

  return armarDatosFinancieros(proyectos, gastos, cobros, contactos);
};
