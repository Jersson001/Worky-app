import React from 'react';

const NEQUI_KEY = '0091829443';
const WHATSAPP_NUMBER = '573142036659';
const WHATSAPP_MESSAGE = 'Hola, ya realicé el pago por Nequi para seguir usando Worky. Adjunto el comprobante.';

interface ProFeatureGuardProps {
  isPro?: boolean;
  trialEndsAt?: string | null;
  children: React.ReactNode;
}

export default function ProFeatureGuard({ isPro, trialEndsAt, children }: ProFeatureGuardProps) {
  const trialActive = trialEndsAt ? new Date(trialEndsAt).getTime() > Date.now() : true;

  if (isPro || trialActive) {
    return <>{children}</>;
  }

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <div className="bg-slate-700/50 p-3 rounded-xl border border-amber-500/40 h-full">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
          <i className="fa-solid fa-lock text-lg"></i>
        </div>
        <div>
          <p className="text-amber-300 text-xs font-bold">Tu periodo de prueba finalizó</p>
          <p className="text-slate-400 text-[11px] mt-1">
            Para seguir usando esta herramienta, transfiere a Nequi a la llave{' '}
            <span className="font-mono text-slate-200">{NEQUI_KEY}</span>, a nombre de{' '}
            <span className="font-semibold text-slate-200">Ferry App SAS</span>.
          </p>
        </div>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <i className="fa-brands fa-whatsapp"></i>
          Ya pagué, enviar comprobante
        </a>
      </div>
    </div>
  );
}
