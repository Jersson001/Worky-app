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
    <div className="bg-gradient-to-br from-blue-50 via-white to-violet-50 p-3 rounded-xl shadow-sm h-full">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
          <i className="fa-solid fa-lock text-lg"></i>
        </div>
        <div>
          <p className="text-slate-900 text-xs font-bold">Tu periodo de prueba finalizó</p>
          <p className="text-slate-500 text-[11px] mt-1">
            Para seguir usando esta herramienta, transfiere a Nequi a la llave{' '}
            <span className="font-mono text-slate-700">{NEQUI_KEY}</span>, a nombre de{' '}
            <span className="font-semibold text-slate-700">Ferry App SAS</span>.
          </p>
        </div>
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
    </div>
  );
}
