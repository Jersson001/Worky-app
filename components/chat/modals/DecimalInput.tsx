/**
 * Input numérico que respeta lo que el usuario está tecleando.
 *
 * Un input controlado por el número ya parseado "se come" el separador decimal:
 * parseFloat("2,") === 2, así que el re-render devuelve "2" y borra la coma
 * recién tecleada. La solución es conservar el texto crudo (draft) mientras el
 * campo tiene el foco y normalizar la vista al salir.
 */
import React, { useState } from 'react';
import { parseAmount } from '../../../utils/currency';

interface DecimalInputProps {
  value: number | undefined;
  onCommit: (value: number | undefined) => void;
  placeholder?: string;
  className?: string;
}

/** 2.5 -> "2,5" (formato es-CO). */
const toDisplay = (value: number | undefined): string =>
  value === undefined || !Number.isFinite(value) ? '' : String(value).replace('.', ',');

export const DecimalInput: React.FC<DecimalInputProps> = ({ value, onCommit, placeholder, className }) => {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft ?? toDisplay(value)}
      placeholder={placeholder}
      onChange={e => {
        const next = e.target.value.replace(/[^\d.,]/g, '');
        setDraft(next);
        onCommit(next === '' ? undefined : parseAmount(next));
      }}
      onBlur={() => setDraft(null)}
      className={className}
    />
  );
};
