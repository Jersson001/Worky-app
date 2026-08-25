/**
 * Campo de dinero que permite teclear decimales.
 *
 * Reformatear en cada tecla se come el separador: "1.500," se vuelve a
 * imprimir como "1.500" y la coma nunca llega a entrar. Por eso, mientras el
 * campo tiene el foco se conserva el texto tal cual se escribe y solo al
 * salir se muestra formateado.
 *
 * El texto en edición sí conserva los puntos de miles que puso el formateo,
 * así que interpretarlo requiere parseMoney (parseAmount leería el último
 * punto de "200.000" como decimal y daría 200).
 *
 * onCommit entrega el monto canónico en string ("1500.5") para no tocar los
 * setters ni el guardado.
 */
import React, { useState } from 'react';
import { formatAmountForInput, parseMoney } from '../../../utils/currency';

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
      onFocus={() => setDraft(formatted)}
      onChange={e => {
        const next = e.target.value.replace(/[^\d.,]/g, '');
        setDraft(next);
        onCommit(next === '' ? '' : String(parseMoney(next)));
      }}
      onBlur={() => setDraft(null)}
      className={className}
    />
  );
};
