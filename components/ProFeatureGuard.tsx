import React, { useEffect, useState } from 'react';
import { KitNfcModal } from './KitNfcModal';
import { miPedidoKit, type PedidoKit } from '../services/kitNfcService';
import { NEQUI_KEY, WHATSAPP_NUMBER, PRECIO_KIT_PRIMER_MES, PRECIO_MES, enPesos } from '../utils/datosDeCobro';
const WHATSAPP_MESSAGE = 'Hola, ya realicé el pago por Nequi para seguir usando Worky. Adjunto el comprobante.';

interface ProFeatureGuardProps {
  isPro?: boolean;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
  children: React.ReactNode;
}

// El cobro es mensual: Pro vale hasta subscription_ends_at. Sin fecha, Pro no vence.
export const tieneAcceso = (
  isPro?: boolean,
  trialEndsAt?: string | null,
  subscriptionEndsAt?: string | null,
): boolean => {
  const trialActive = trialEndsAt ? new Date(trialEndsAt).getTime() > Date.now() : true;
  const proActive = !!isPro && (subscriptionEndsAt ? new Date(subscriptionEndsAt).getTime() > Date.now() : true);
  return trialActive || proActive;
};

export default function ProFeatureGuard({ isPro, trialEndsAt, subscriptionEndsAt, children }: ProFeatureGuardProps) {
  const [pidiendoKit, setPidiendoKit] = useState(false);
  const conAcceso = tieneAcceso(isPro, trialEndsAt, subscriptionEndsAt);
  // undefined mientras se pregunta; null si nunca ha pedido el kit. Solo importa
  // cuando la pantalla es la de bloqueo: la oferta del kit es de una sola vez, y
  // quien ya lo tiene —pagado de palabra o por la app— no debe verla otra vez.
  const [pedido, setPedido] = useState<PedidoKit | null | undefined>(undefined);
  useEffect(() => {
    if (conAcceso) return;
    let vigente = true;
    miPedidoKit().then((p) => { if (vigente) setPedido(p); });
    return () => { vigente = false; };
  }, [conAcceso]);

  if (conAcceso) {
    return <>{children}</>;
  }

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-violet-50 p-3 rounded-xl shadow-sm h-full">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
          <i className="fa-solid fa-lock text-lg"></i>
        </div>
        <div>
          <p className="text-slate-900 text-xs font-bold">Tu periodo de uso finalizó</p>
          <p className="text-slate-500 text-[11px] mt-1">
            Para seguir usando esta herramienta, transfiere {enPesos(PRECIO_MES)} a Nequi a la llave{' '}
            <span className="font-mono text-slate-700">{NEQUI_KEY}</span>, a nombre de{' '}
            <span className="font-semibold text-slate-700">Ferry App SAS</span>.
          </p>
        </div>
        {pedido === null && (
          <button
            type="button"
            onClick={() => setPidiendoKit(true)}
            className="mt-1 w-full bg-gradient-to-br from-blue-600 to-blue-700 text-white text-xs font-bold py-2 px-3 rounded-lg shadow-md shadow-blue-500/30 hover:shadow-lg transition"
          >
            Activa Pro con tu kit NFC · {enPesos(PRECIO_KIT_PRIMER_MES)}
          </button>
        )}
        {pedido?.estado === 'solicitado' && (
          <button
            type="button"
            onClick={() => setPidiendoKit(true)}
            className="mt-1 w-full bg-white border border-blue-200 text-blue-700 text-xs font-bold py-2 px-3 rounded-lg"
          >
            Ver mi pedido del kit
          </button>
        )}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 w-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-xs font-bold py-2 px-3 rounded-lg shadow-md shadow-emerald-500/30 hover:shadow-lg transition flex items-center justify-center gap-2"
        >
          <i className="fa-brands fa-whatsapp"></i>
          Ya pagué, enviar comprobante
        </a>
      </div>
      {pidiendoKit && <KitNfcModal onClose={() => setPidiendoKit(false)} />}
    </div>
  );
}
