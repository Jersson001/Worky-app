/**
 * «Activa Pro con tu kit NFC»: $15.000 por la etiqueta y el primer mes.
 *
 * Por ahora solo se entrega en Bogotá y se paga por Nequi: la tienda deja su
 * dirección, paga, y el administrador marca el pedido como pagado, que le da el
 * mes de Pro. Cuando entre Wompi, el pago se confirma solo.
 */
import React, { useEffect, useState } from 'react';
import { miPedidoKit, solicitarKit, type PedidoKit } from '../services/kitNfcService';
import { NEQUI_KEY, WHATSAPP_NUMBER, PRECIO_KIT_PRIMER_MES, PRECIO_MES, enPesos } from '../utils/datosDeCobro';

interface Props {
  onClose: () => void;
}

const CAMPO = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500';

export const KitNfcModal: React.FC<Props> = ({ onClose }) => {
  const [pedido, setPedido] = useState<PedidoKit | null | undefined>(undefined);
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [direccion, setDireccion] = useState('');
  const [barrio, setBarrio] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    miPedidoKit().then((p) => { if (vigente) setPedido(p); });
    return () => { vigente = false; };
  }, []);

  const enviar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await solicitarKit({ nombre, celular, direccion, barrio, ciudad: 'Bogotá' });
      setPedido(await miPedidoKit());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const whatsapp = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hola, ya pagué ${enPesos(PRECIO_KIT_PRIMER_MES)} por el kit NFC y el primer mes de Worky. Adjunto el comprobante.`,
  )}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 p-5 pb-3">
          <div>
            <h3 className="text-slate-900 font-bold text-base">Activa Pro con tu kit NFC</h3>
            <p className="text-xs text-slate-500 mt-1">
              La etiqueta para tu vitrina más tu primer mes de Pro, por{' '}
              <b className="text-slate-800">{enPesos(PRECIO_KIT_PRIMER_MES)}</b>. Desde el segundo mes,{' '}
              {enPesos(PRECIO_MES)} al mes.
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="w-8 h-8 shrink-0 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="px-5 pb-5">
          {pedido === undefined ? (
            <p className="text-sm text-slate-400 py-6 text-center">Cargando…</p>
          ) : pedido === null ? (
            <div className="space-y-2.5">
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 leading-snug">
                Por ahora el kit se entrega solo en <b>Bogotá</b>.
              </p>
              <input className={CAMPO} placeholder="Nombre de quien recibe" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              <input className={CAMPO} placeholder="Celular" inputMode="tel" value={celular} onChange={(e) => setCelular(e.target.value)} />
              <input className={CAMPO} placeholder="Dirección (calle, número, local)" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
              <input className={CAMPO} placeholder="Barrio (opcional)" value={barrio} onChange={(e) => setBarrio(e.target.value)} />
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <button
                onClick={enviar}
                disabled={enviando || !nombre.trim() || !celular.trim() || !direccion.trim()}
                className="w-full bg-gradient-to-br from-blue-600 to-blue-700 text-white text-sm font-bold py-2.5 rounded-xl shadow-md shadow-blue-500/30 disabled:opacity-40"
              >
                {enviando ? 'Enviando…' : 'Pedir mi kit'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {pedido.estado === 'solicitado' && (
                <>
                  <p className="text-sm text-slate-800 font-semibold">Listo, recibimos tu pedido.</p>
                  <p className="text-xs text-slate-600 leading-snug">
                    Para confirmarlo, transfiere <b>{enPesos(pedido.monto)}</b> a Nequi a la llave{' '}
                    <span className="font-mono text-slate-800">{NEQUI_KEY}</span>, a nombre de{' '}
                    <b>Ferry App SAS</b>, y mándanos el comprobante. Al confirmarlo se activa tu mes de Pro y
                    preparamos tu kit.
                  </p>
                  <a
                    href={whatsapp} target="_blank" rel="noopener noreferrer"
                    className="w-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2"
                  >
                    <i className="fa-brands fa-whatsapp"></i> Ya pagué, enviar comprobante
                  </a>
                </>
              )}
              {pedido.estado === 'pagado' && (
                <p className="text-sm text-slate-800">
                  <b>Pago confirmado.</b> Tu mes de Pro ya está activo y estamos preparando tu kit.
                </p>
              )}
              {pedido.estado === 'enviado' && (
                <p className="text-sm text-slate-800">
                  <b>Tu kit va en camino.</b> Tu mes de Pro ya está activo.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
