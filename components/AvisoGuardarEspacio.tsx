/**
 * El aviso que ve quien entró sin cuenta —por un QR, con un alias— mientras
 * chatea: «Guarda tu espacio».
 *
 * Antes decía «Completa el registro» y llevaba a un formulario de correo,
 * contraseña y celular, los tres obligatorios. Era mucho pedirle a quien solo
 * preguntó por un sofá, y por eso casi nadie lo hacía. Ahora el camino corto es
 * Google, en un toque, y el correo queda como alternativa.
 *
 * Lo que se guarda es la MISMA cuenta —el mismo id de usuario—, no una nueva:
 * `linkIdentity` le añade Google a la cuenta anónima en vez de crear otra, y así
 * los mensajes y las tiendas que ya tenía siguen siendo suyos. Entrar con Google
 * desde la pantalla de acceso, en cambio, abre una cuenta nueva y deja atrás lo
 * anterior: por eso esto no es el botón del login.
 *
 * El aviso no se puede cerrar mientras la cuenta siga anónima: es lo único que le
 * dice que su conversación se pierde si cambia de teléfono o borra los datos.
 */
import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { LogoGoogle } from './LoginScreen';

interface AvisoGuardarEspacioProps {
  /**
   * Vincula Google a la cuenta actual. Devuelve true si el navegador se va a
   * Google —la web, donde la página se abandona— y false si se abrió aparte, como
   * en la app de Android: ahí el botón tiene que volver a estar disponible.
   */
  onGoogle: () => Promise<boolean>;
  /** Abre el formulario de correo. */
  onCorreo: () => void;
  /**
   * Un error que ya pasó: quien intentó guardar con Google vuelve a una página
   * nueva, y lo que falló hay que contárselo aquí, no dejarlo sin respuesta.
   */
  errorInicial?: string;
}

/** El error de Supabase dicho en palabras de quien chatea, con el camino de salida. */
const mensajeDe = (e: any): string => {
  const codigo = String(e?.code ?? '');
  const texto = String(e?.message ?? '').toLowerCase();
  if (codigo === 'identity_already_exists' || texto.includes('already') && texto.includes('identity')) {
    return 'Ese Google ya tiene una cuenta en Worky. Prueba con otro, o guarda tu espacio con tu correo.';
  }
  if (codigo === 'manual_linking_disabled' || texto.includes('manual linking')) {
    return 'Guardar con Google todavía no está disponible. Guarda tu espacio con tu correo.';
  }
  return 'No se pudo conectar con Google. Puedes guardar tu espacio con tu correo.';
};

export const AvisoGuardarEspacio: React.FC<AvisoGuardarEspacioProps> = ({ onGoogle, onCorreo, errorInicial = '' }) => {
  const [cargando, setCargando] = useState(false);
  const [errorPropio, setError] = useState('');
  // El propio de este intento manda; si no hay, el que llegó de la vuelta de Google.
  const error = errorPropio || errorInicial;

  const guardar = async () => {
    setError('');
    setCargando(true);
    try {
      const seVaDeLaPagina = await onGoogle();
      if (!seVaDeLaPagina) setCargando(false);
    } catch (e) {
      console.error('Guardar el espacio con Google:', e);
      setError(mensajeDe(e));
      setCargando(false);
    }
  };

  return (
    <div className="bg-rey-50 border-t-2 border-rey-200 px-4 py-3">
      <div className="flex items-start gap-2.5">
        <ShieldCheck size={20} strokeWidth={1.75} className="text-rey-600 shrink-0 mt-0.5" />
        <p className="text-rey-900 text-[13px] font-semibold leading-snug">
          Guarda tu espacio para no perder esta conversación si cambias de teléfono.
        </p>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={guardar}
          disabled={cargando}
          className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 px-3.5 py-2 rounded-xl text-[13px] font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-60"
        >
          <LogoGoogle />
          {cargando ? 'Conectando…' : 'Continuar con Google'}
        </button>
        <button
          type="button"
          onClick={onCorreo}
          disabled={cargando}
          className="text-rey-700 hover:text-rey-900 text-[13px] font-bold px-2 py-2 underline underline-offset-2 disabled:opacity-60"
        >
          Usar mi correo
        </button>
      </div>

      {error && (
        <p className="mt-2 text-[12px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
          {error}
        </p>
      )}
    </div>
  );
};

export default AvisoGuardarEspacio;
