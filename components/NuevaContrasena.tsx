/**
 * Poner una contraseña nueva, al volver del enlace del correo.
 *
 * Es la segunda mitad de recuperar la cuenta. La primera —pedir el enlace— vive
 * en la pantalla de acceso; aquí se llega ya con sesión, porque el enlace de
 * Supabase la trae puesta. Eso es justo lo que obliga a que esto exista: sin
 * esta pantalla el enlace metía a la persona en la aplicación con la contraseña
 * vieja todavía sin cambiar, que era la que no recordaba.
 */
import React, { useState } from 'react';
import { supabase } from '../services/supabaseConfig';

interface Props {
  /** El correo de la cuenta que se está recuperando, si se sabe. */
  correo?: string | null;
  /** Ya está cambiada: se sigue a la aplicación. */
  onListo: () => void;
  /** Se arrepintió, o el enlace no era suyo. Cierra la sesión del enlace. */
  onCancelar: () => void;
}

export const NuevaContrasena: React.FC<Props> = ({ correo, onListo, onCancelar }) => {
  const [password, setPassword] = useState('');
  const [repetida, setRepetida] = useState('');
  const [verla, setVerla] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    // Se comprueba aquí y no solo con `minLength`: el navegador del correo
    // puede autocompletar y saltarse la validación del formulario.
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== repetida) {
      setError('Las dos contraseñas no son iguales.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      onListo();
    } catch (err: any) {
      console.error('Error cambiando la contraseña:', err);
      // El caso que de verdad pasa: tardó y el enlace caducó. Decirlo así, y
      // no «error 401», es la diferencia entre volver a pedirlo y rendirse.
      const msg = String(err?.message ?? '').toLowerCase();
      if (msg.includes('expired') || msg.includes('invalid') || err?.status === 401) {
        setError('El enlace ya caducó. Pide uno nuevo desde «¿Olvidaste tu contraseña?».');
      } else if (msg.includes('should be different') || msg.includes('same as')) {
        setError('Esa es la contraseña que ya tenías. Escribe una distinta.');
      } else {
        setError(err?.message ? `No se pudo cambiar: ${err.message}` : 'No se pudo cambiar la contraseña.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6 text-center">
          <img src="/worky-logo.png" alt="Worky" className="w-40 mb-3 drop-shadow-sm" />
        </div>

        <form onSubmit={guardar} className="bg-white rounded-3xl p-7 sm:p-8 border border-slate-200/90 shadow-2xl shadow-slate-200/60 space-y-4">
          <div>
            <h2 className="text-slate-900 text-lg font-extrabold">Elige una contraseña nueva</h2>
            <p className="text-slate-500 text-sm mt-1">
              {correo
                ? <>Para la cuenta <span className="font-bold text-slate-700">{correo}</span>.</>
                : 'La usarás para entrar a partir de ahora.'}
            </p>
          </div>

          <div>
            <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Contraseña nueva</label>
            <div className="relative">
              <input
                type={verla ? 'text' : 'password'}
                className="w-full p-3.5 pr-12 bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-xl outline-none focus:border-blue-600 focus:bg-white transition placeholder-slate-400 text-sm"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={6}
                autoFocus
                required
              />
              {/* Verla es lo que evita el segundo intento fallido: se está
                  escribiendo a ciegas una contraseña que aún no se sabe de
                  memoria. */}
              <button
                type="button"
                onClick={() => setVerla(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                aria-label={verla ? 'Ocultar la contraseña' : 'Ver la contraseña'}
              >
                <i className={`fa-solid ${verla ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Repítela</label>
            <input
              type={verla ? 'text' : 'password'}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-xl outline-none focus:border-blue-600 focus:bg-white transition placeholder-slate-400 text-sm"
              placeholder="La misma de arriba"
              value={repetida}
              onChange={e => setRepetida(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-xs font-semibold bg-red-50 p-3 rounded-xl border border-red-200 flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation text-sm"></i>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl font-bold text-base hover:shadow-xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar y entrar'}
          </button>

          <button
            type="button"
            onClick={onCancelar}
            className="w-full text-slate-500 hover:text-slate-700 text-xs font-bold transition"
          >
            Cancelar
          </button>
        </form>
      </div>
    </div>
  );
};

export default NuevaContrasena;
