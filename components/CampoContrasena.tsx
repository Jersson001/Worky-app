/**
 * Campo de contraseña con ojito para verla.
 *
 * Una contraseña escrita a ciegas y una sola vez se equivoca sin que nadie se
 * entere: la cuenta queda creada con la errata y el login falla después con
 * «correo o contraseña incorrectos». Verla al escribirla evita eso.
 */
import React, { useState } from 'react';

type CampoContrasenaProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const CampoContrasena: React.FC<CampoContrasenaProps> = ({ className = '', ...resto }) => {
  const [verla, setVerla] = useState(false);

  return (
    <div className="relative">
      <input
        {...resto}
        type={verla ? 'text' : 'password'}
        // Al verla pasa a ser texto: sin esto el teléfono la pone en mayúscula
        // y la «corrige».
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={`${className} pr-12`}
      />
      <button
        type="button"
        // Que tocarlo no le quite el foco al campo ni cierre el teclado.
        onMouseDown={e => e.preventDefault()}
        onClick={() => setVerla(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
        aria-label={verla ? 'Ocultar la contraseña' : 'Ver la contraseña'}
        aria-pressed={verla}
      >
        <i className={`fa-solid ${verla ? 'fa-eye-slash' : 'fa-eye'}`}></i>
      </button>
    </div>
  );
};

export default CampoContrasena;
