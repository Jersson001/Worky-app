import React, { useEffect, useState } from 'react';
import { authService } from '../services/authService';

interface PhoneVerificationProps {
  phone: string; // E.164, ej: +573142036659
  onVerified: () => void;
  onBack?: () => void;
  onLogout?: () => void;
}

const RESEND_COOLDOWN_SECONDS = 30;

export const PhoneVerification: React.FC<PhoneVerificationProps> = ({ phone, onVerified, onBack, onLogout }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [sentOnce, setSentOnce] = useState(false);

  // Enviar el código automáticamente al entrar a esta pantalla.
  useEffect(() => {
    handleSend(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSend = async (silent = false) => {
    setError('');
    setInfo('');
    setResending(true);
    try {
      await authService.sendPhoneVerification(phone);
      setSentOnce(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      if (!silent) setInfo('Código reenviado.');
    } catch (err: any) {
      setError(err?.message ? `No se pudo enviar el SMS: ${err.message}` : 'No se pudo enviar el código SMS.');
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 4) {
      setError('Ingresa el código completo.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authService.verifyPhoneCode(phone, code.trim());
      onVerified();
    } catch (err: any) {
      const msg = String(err?.message ?? '').toLowerCase();
      if (msg.includes('expired') || msg.includes('invalid')) {
        setError('Código incorrecto o vencido. Solicita uno nuevo.');
      } else {
        setError(err?.message ? `Error al verificar: ${err.message}` : 'No se pudo verificar el código.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-screen min-h-screen font-sans items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)' }}>
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center mb-5 mx-auto shadow-lg shadow-blue-500/30">
            <i className="fa-solid fa-comment-sms text-white text-2xl"></i>
          </div>
          <h2 className="text-white text-xl font-bold text-center mb-1">Verifica tu celular</h2>
          <p className="text-slate-400 text-sm text-center mb-6">
            Enviamos un código por SMS a <span className="text-slate-200 font-semibold">{phone}</span>
          </p>

          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              maxLength={8}
              value={code}
              onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Código de 6 dígitos"
              className="w-full p-4 bg-slate-700/50 border border-slate-600 text-white text-center text-2xl tracking-[0.4em] rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition placeholder:tracking-normal placeholder:text-base placeholder-slate-500"
            />

            {error && <p className="text-red-400 text-sm font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</p>}
            {info && <p className="text-emerald-400 text-sm font-medium bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">{info}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-500 hover:to-violet-500 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verificando...' : 'Verificar'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => handleSend(false)}
              disabled={resending || cooldown > 0}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {cooldown > 0 ? `Reenviar código (${cooldown}s)` : resending ? 'Enviando...' : sentOnce ? 'Reenviar código' : 'Enviar código'}
            </button>
          </div>

          {(onBack || onLogout) && (
            <div className="mt-4 pt-4 border-t border-slate-700/50 text-center">
              <button
                onClick={onBack || onLogout}
                className="text-slate-500 hover:text-slate-300 text-xs transition"
              >
                {onBack ? 'Volver' : 'Cerrar sesión'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
