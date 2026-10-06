/**
 * Campo de medida que también es calculadora.
 *
 * Se escribe «1+3+5-0,5» y el valor que cuenta es el resultado, que se va
 * aplicando mientras se teclea. Al salir del campo —o con Enter— se queda
 * escrito el resultado en vez de la cuenta.
 */
import React, { useState } from 'react';
import { esOperacion, evaluarExpresion, filtrarExpresion } from '../../../utils/calculadora';
import type { CarpentryUnit } from '../../../types';

interface CalculadoraInputProps {
  value: number | undefined;
  onCommit: (value: number | undefined) => void;
  placeholder?: string;
  className?: string;
}

/** 2.5 -> "2,5" (formato es-CO). */
const aTexto = (value: number | undefined): string =>
  value === undefined || !Number.isFinite(value) ? '' : String(value).replace('.', ',');

export const CalculadoraInput: React.FC<CalculadoraInputProps> = ({ value, onCommit, placeholder, className }) => {
  const [borrador, setBorrador] = useState<string | null>(null);
  const resultado = borrador !== null && esOperacion(borrador) ? evaluarExpresion(borrador) : null;

  return (
    <div className="relative">
      <input
        type="text"
        // Sin inputMode numérico: los teclados de números no traen + ni −.
        autoComplete="off"
        value={borrador ?? aTexto(value)}
        placeholder={placeholder}
        onChange={e => {
          const siguiente = filtrarExpresion(e.target.value);
          setBorrador(siguiente);
          if (siguiente.trim() === '') {
            onCommit(undefined);
            return;
          }
          const r = evaluarExpresion(siguiente);
          // Una cuenta a medias —«1+»— no pisa el último resultado válido.
          if (r !== null) onCommit(r);
        }}
        onBlur={() => setBorrador(null)}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        className={className}
      />
      {resultado !== null && (
        <span className="absolute -top-4 right-0 text-[9px] font-bold text-emerald-600 pointer-events-none">
          = {aTexto(resultado)}
        </span>
      )}
    </div>
  );
};

/**
 * ML o M² como botones: se activa el que el trabajo necesita. Solo para las
 * líneas que se miden en una de las dos; el resto de unidades no se tocan.
 */
export const UnidadBotones: React.FC<{
  unit: CarpentryUnit;
  onChange: (unit: 'ML' | 'M2') => void;
}> = ({ unit, onChange }) => (
  <div className="flex gap-1 mb-0.5">
    {(['ML', 'M2'] as const).map(u => (
      <button
        key={u}
        type="button"
        onClick={() => { if (unit !== u) onChange(u); }}
        aria-pressed={unit === u}
        className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase transition ${
          unit === u ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
        }`}
      >
        {u === 'M2' ? 'M²' : 'ML'}
      </button>
    ))}
  </div>
);
