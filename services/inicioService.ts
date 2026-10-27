/**
 * Lo que lee el Inicio: qué hay por cobrar, qué cotizaciones esperan respuesta y
 * cuánta caja hay este mes. Las cuentas están en utils/inicio.ts y
 * utils/finanzas.ts; aquí solo se piden las filas.
 *
 * La caja sale de la misma función que Estados Financieros
 * (`cargarDatosFinancieros` + `resumir`), a propósito: si el Inicio y el reporte
 * calcularan por separado, un día dirían cifras distintas del mismo mes.
 */
import { supabase } from './supabaseConfig';
import { getCurrentUserId } from './messagingService';
import { cargarDatosFinancieros, todas } from './finanzasService';
import { ContactoConocido, finDeMes, inicioDeMes, resumir } from '../utils/finanzas';
import { armarPendientes, FilaPendiente, PendientesDelInicio } from '../utils/inicio';

/** Una cotización sin respuesta después de tanto ya no es una espera: se olvidó. */
const DIAS_DE_COTIZACIONES = 90;

export interface ResumenDelInicio {
  /** Null si no se pudieron leer: «no sé» no es lo mismo que «no hay nada por cobrar». */
  pendientes: PendientesDelInicio | null;
  /** Cobrado menos gastos de este mes. Null si no se pudo calcular. */
  cajaDelMes: number | null;
}

const cargarPendientes = async (contactos: ContactoConocido[]): Promise<PendientesDelInicio> => {
  let yo: string;
  try { yo = getCurrentUserId(); } catch { return armarPendientes([], contactos); }

  const desde = new Date(Date.now() - DIAS_DE_COTIZACIONES * 86_400_000).toISOString();
  const columnas = 'id, type, is_paid, timestamp, recipient_id, recipient_contact, metadata';

  const [porCobrar, cotizaciones] = await Promise.all([
    // `is_paid` nace nulo en algunos mensajes viejos: nulo es no pagado.
    todas<FilaPendiente>((d, h) => supabase
      .from('messages')
      .select(columnas)
      .eq('sender_id', yo)
      .in('type', ['invoice', 'collection_account'])
      .or('is_paid.is.null,is_paid.eq.false')
      .order('timestamp', { ascending: true })
      .range(d, h)),
    // El estado de la cotización vive dentro de `metadata`, así que no se puede
    // filtrar en la consulta: se traen las recientes y se separan al armarlas.
    todas<FilaPendiente>((d, h) => supabase
      .from('messages')
      .select(columnas)
      .eq('sender_id', yo)
      .eq('type', 'quote')
      .gte('timestamp', desde)
      .order('timestamp', { ascending: false })
      .range(d, h)),
  ]);

  return armarPendientes([...porCobrar, ...cotizaciones], contactos);
};

const cargarCajaDelMes = async (contactos: ContactoConocido[]): Promise<number | null> => {
  try {
    const hoy = new Date();
    const datos = await cargarDatosFinancieros(contactos);
    return resumir(datos, inicioDeMes(hoy), finDeMes(hoy)).caja;
  } catch (e) {
    console.warn('No se pudo calcular la caja del mes:', e);
    return null;
  }
};

/**
 * Cada parte falla por su lado: sin la caja se sigue viendo lo por cobrar, y al
 * revés. Un Inicio que no abre porque falló una cifra es peor que una cifra en «—».
 */
export const cargarResumenDelInicio = async (contactos: ContactoConocido[]): Promise<ResumenDelInicio> => {
  const [pendientes, cajaDelMes] = await Promise.all([
    cargarPendientes(contactos).catch((e): null => {
      console.warn('No se pudieron leer los pendientes:', e);
      return null;
    }),
    cargarCajaDelMes(contactos),
  ]);
  return { pendientes, cajaDelMes };
};
