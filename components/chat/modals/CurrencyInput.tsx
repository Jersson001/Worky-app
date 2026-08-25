/**
 * Campo de dinero que permite teclear decimales.
 *
 * Reformatear en cada tecla se come el separador: "1.500," se vuelve a
 * imprimir como "1.500" y la coma nunca llega a entrar. Además, una vez que
 * el texto lleva separadores de miles ya no se puede distinguir cuál era el
 * decimal. Por eso, mientras el campo tiene el foco se conserva el texto tal
 * cual se escribe (sin agrupar) y solo al salir se muestra formateado.
 *
 * onCommit entrega el monto canónico en string ("1500.5"), el mismo contrato
 * que extractRawAmount, para no tocar los setters existentes.
 */
import React, { useState } from 'react';
import { formatAmountForInput, parseAmount } from '../../../utils/currency';

interface CurrencyInputProps {
  value: number | string | undefined;
  onCommit: (raw: string) => void;
  placeholder?: string;
  className?: string;
  /** Antepone "$ " a la vista formateada (para campos sin símbolo aparte). */
  symbol?: boolean;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value, onCommit, placeholder, className, symbol = false,
}) => {
  const [draft, setDraft] = useState<string | null>(null);

  const formatted = formatAmountForInput(value);
  const display = formatted && symbol ? `$ ${formatted}` : formatted;

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft ?? display}
      placeholder={placeholder}
      onChange={e => {
        const next = e.target.value.replace(/[^\d.,]/g, '');
        setDraft(next);
        onCommit(next === '' ? '' : String(parseAmount(next)));
      }}
      onBlur={() => setDraft(null)}
      className={className}
    />
  );
};
