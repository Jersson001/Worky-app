/**
 * El kit NFC con el primer mes de Pro (supabase_pedidos_kit.sql).
 *
 * Las validaciones de verdad las hace la base: aquí solo se piden las cosas y se
 * traducen los errores a algo que se pueda leer.
 */
import { supabase } from './supabaseConfig';

export type EstadoPedidoKit = 'solicitado' | 'pagado' | 'enviado' | 'cancelado';

export interface PedidoKit {
  id: string;
  estado: EstadoPedidoKit;
  monto: number;
  creado: string;
}

export interface DatosDeEnvio {
  nombre: string;
  celular: string;
  direccion: string;
  barrio: string;
  ciudad: string;
}

export interface PedidoKitAdmin extends DatosDeEnvio {
  id: string;
  usuarioId: string;
  negocio: string;
  estado: EstadoPedidoKit;
  monto: number;
  creado: string;
}

/** El pedido vivo de la cuenta, o null. Null también si la base no responde. */
export const miPedidoKit = async (): Promise<PedidoKit | null> => {
  try {
    const { data, error } = await supabase.rpc('mi_pedido_kit');
    if (error || !Array.isArray(data) || data.length === 0) return null;
    const f = data[0];
    return { id: f.id, estado: f.estado, monto: Number(f.monto), creado: f.creado };
  } catch {
    return null;
  }
};

/** Pide el kit. Lanza un Error con el motivo en español si la base lo rechaza. */
export const solicitarKit = async (datos: DatosDeEnvio): Promise<void> => {
  const { error } = await supabase.rpc('solicitar_kit', {
    p_nombre: datos.nombre,
    p_celular: datos.celular,
    p_direccion: datos.direccion,
    p_barrio: datos.barrio,
    p_ciudad: datos.ciudad,
  });
  if (error) throw new Error(error.message);
};

export const pedidosKitAdmin = async (): Promise<PedidoKitAdmin[]> => {
  const { data, error } = await supabase.rpc('pedidos_kit_admin');
  if (error) throw new Error(error.message);
  return (data ?? []).map((f: Record<string, string | number>) => ({
    id: String(f.id),
    usuarioId: String(f.usuario_id),
    negocio: String(f.negocio ?? ''),
    nombre: String(f.nombre),
    celular: String(f.celular),
    direccion: String(f.direccion),
    barrio: String(f.barrio ?? ''),
    ciudad: String(f.ciudad),
    estado: f.estado as EstadoPedidoKit,
    monto: Number(f.monto),
    creado: String(f.creado),
  }));
};

export const actualizarPedidoKit = async (id: string, estado: EstadoPedidoKit): Promise<void> => {
  const { error } = await supabase.rpc('actualizar_pedido_kit', { p_id: id, p_estado: estado });
  if (error) throw new Error(error.message);
};

/** El admin vende el kit en persona. Si ya pagó, la tienda queda Pro un mes. */
export const venderKit = async (usuarioId: string, datos: Omit<DatosDeEnvio, 'ciudad'>, yaPago: boolean): Promise<void> => {
  const { error } = await supabase.rpc('admin_vender_kit', {
    p_usuario: usuarioId,
    p_nombre: datos.nombre,
    p_celular: datos.celular,
    p_direccion: datos.direccion,
    p_barrio: datos.barrio,
    p_ya_pago: yaPago,
  });
  if (error) throw new Error(error.message);
};
