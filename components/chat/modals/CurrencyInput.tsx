/**
 * Campo de dinero con formato en vivo, tipo calculadora: tecleas dígitos y el
 * punto de miles se va corriendo solo.
 *
 * La clave es no tener que adivinar nunca qué significa un separador: como el
 * formateo es en vivo, los puntos del texto siempre los puso este componente,
 * así que se descartan al releerlo y el decimal es la coma. Un punto recién
 * tecleado (hay uno más que en el render anterior) se toma como petición de
 * decimal y se convierte en coma, para que el teclado de Android que solo
 * ofrece punto también sirva.
 *
 * Así, borrar un carácter de "20.000" da los dígitos 2000 → "2.000", en vez de
 * releer "20.00" como veinte con dos decimales.
 *
 * onCommit entrega el monto canónico en string ("20000", "1500.5") para no
 * tocar los setters ni el guardado.
 */
import React, { useState } from 'react';
import { formatAmountForInput } from '../../../utils/currency';

interface CurrencyInputProps {
  value: number | string | undefined;
  onCommit: (raw: string) => void;
  placeholder?: string;
  className?: string;
  /** Antepone "$ " (para los campos que no pintan el símbolo por su cuenta). */
  symbol?: boolean;
}

const MAX_DECIMALS = 2;

const groupThousands = (digits: string): string =>
  digits.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/**
 * Reinterpreta el contenido del campo tras una pulsación.
 * `previous` es lo que había antes, para detectar un punto recién tecleado.
 */
const reformat = (raw: string, previous: string): { text: string; amount: number } => {
  let work = raw.replace(/[^\d.,]/g, '');

  const dotsBefore = (previous.match(/\./g) || []).length;
  const dotsNow = (work.match(/\./g) || []).length;
  if (dotsNow === dotsBefore + 1) {
    const at = work.lastIndexOf('.');
    // Solo si lo que queda detrás cabe como decimales; si no, es un pegado
    // con separadores de miles.
    if (work.length - at - 1 <= MAX_DECIMALS) {
      work = `${work.slice(0, at)},${work.slice(at + 1)}`;
    }
  }

  work = work.replace(/\./g, '');

  const comma = work.indexOf(',');
  const intDigits = (comma === -1 ? work : work.slice(0, comma)).replace(/\D/g, '');
  const decDigits = comma === -1
    ? null
    : work.slice(comma + 1).replace(/\D/g, '').slice(0, MAX_DECIMALS);

  if (!intDigits && decDigits === null) return { text: '', amount: 0 };

  const grouped = groupThousands(intDigits || '0');
  return {
    text: decDigits === null ? grouped : `${grouped},${decDigits}`,
    amount: Number(`${intDigits || '0'}.${decDigits || '0'}`),
  };
};

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value, onCommit, placeholder, className, symbol = false,
}) => {
  const [draft, setDraft] = useState<string | null>(null);

  // El borrador solo existe para conservar lo que el número perdería al
  // reimprimirse: una coma a medio teclear o un cero final ("20,50").
  const text = draft ?? formatAmountForInput(value);
  const display = text && symbol ? `$ ${text}` : text;

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      placeholder={placeholder}
      onFocus={() => setDraft(formatAmountForInput(value))}
      onChange={e => {
        const { text: next, amount } = reformat(e.target.value, display);
        setDraft(next);
        onCommit(next === '' ? '' : String(amount));
      }}
      onBlur={() => setDraft(null)}
      className={className}
    />
  );
};
