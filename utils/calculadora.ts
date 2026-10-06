/**
 * Calculadora básica para las medidas: «1+3+5-0,5» → 8,5.
 *
 * Quien toma medidas en obra suma tramos de pared o resta un vano, y hacerlo
 * en otra aplicación para copiar el resultado era trabajo de más. Sin `eval`:
 * es un analizador pequeño que solo entiende números, + − × ÷ y paréntesis.
 *
 * La coma y el punto valen como separador decimal: en medidas nadie escribe
 * miles, y «2.5» y «2,5» son lo mismo para quien teclea.
 */

/** Lo que una medida puede contener. Todo lo demás se descarta al teclear. */
export const filtrarExpresion = (texto: string): string =>
  texto.replace(/[^\d.,+\-*/xX×÷() ]/g, '');

/** Si lleva alguna operación, o es solo un número. */
export const esOperacion = (texto: string): boolean => /[+\-*/xX×÷()]/.test(texto.replace(/^\s*-/, ''));

/** El resultado, o null si la expresión está incompleta o no es válida. */
export const evaluarExpresion = (texto: string): number | null => {
  const fuente = texto.replace(/\s+/g, '').replace(/,/g, '.').replace(/[xX×]/g, '*').replace(/÷/g, '/');
  if (!fuente) return null;

  let i = 0;

  const numero = (): number | null => {
    const inicio = i;
    while (i < fuente.length && /[\d.]/.test(fuente[i])) i++;
    const crudo = fuente.slice(inicio, i);
    if (!crudo || crudo === '.' || (crudo.match(/\./g) || []).length > 1) return null;
    return Number(crudo);
  };

  const factor = (): number | null => {
    if (fuente[i] === '-') { i++; const v = factor(); return v === null ? null : -v; }
    if (fuente[i] === '+') { i++; return factor(); }
    if (fuente[i] === '(') {
      i++;
      const v = suma();
      if (v === null || fuente[i] !== ')') return null;
      i++;
      return v;
    }
    return numero();
  };

  const producto = (): number | null => {
    let v = factor();
    while (v !== null && (fuente[i] === '*' || fuente[i] === '/')) {
      const op = fuente[i++];
      const w = factor();
      if (w === null) return null;
      if (op === '/' && w === 0) return null;
      v = op === '*' ? v * w : v / w;
    }
    return v;
  };

  const suma = (): number | null => {
    let v = producto();
    while (v !== null && (fuente[i] === '+' || fuente[i] === '-')) {
      const op = fuente[i++];
      const w = producto();
      if (w === null) return null;
      v = op === '+' ? v + w : v - w;
    }
    return v;
  };

  const resultado = suma();
  if (resultado === null || i !== fuente.length || !Number.isFinite(resultado)) return null;
  // Sin el ruido del punto flotante: 0.1+0.2 no es 0.30000000000000004.
  return Math.round(resultado * 1e6) / 1e6;
};
