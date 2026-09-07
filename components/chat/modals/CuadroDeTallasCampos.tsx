/**
 * El cuadro de tallas de una línea de cotización.
 *
 * Nace apagado: la mayoría de las líneas no son prendas. Al encenderlo, la
 * cantidad deja de escribirse y sale de sumar las tallas, que es como se cuenta
 * un pedido de confección.
 *
 * Cada talla lleva su propio costo, y no una rejilla con un precio único: una
 * XL lleva más tela que una S y un 40 más que un 30.
 *
 * En los capítulos de confección no hay costo de línea encima, así que cada
 * talla nueva hereda el precio de la anterior: se escribe una vez y solo se
 * toca donde cambia. En la cotización básica sí lo hay —es el precio del
 * ítem—, y las tallas que no traigan el suyo caen a él; esas se marcan.
 *
 * Y solo se enseñan las tallas que van en el pedido. La rejilla de calzado son
 * once casillas y normalmente se usan cuatro.
 */
import React from 'react';
import { CuadroDeTallas, LineaDeTalla, TipoDeTalla } from '../../../types';
import { formatCurrency } from '../../../utils/currency';
import { CurrencyInput } from './CurrencyInput';
import {
  REJILLAS, TIPOS_DE_TALLA, cuadroEnBlanco, lineasDe, totalDeTallas,
  subtotalDeTallas, costoDeLinea, tieneCostoPropio, tallasLibres,
  cambiarTipoDeTalla, tiposConDatos,
} from '../../../utils/tallas';

interface Props {
  tallas?: CuadroDeTallas;
  /** El costo de la línea. Es el que usan las tallas que no traen el suyo. */
  costoBase: number;
  onChange: (tallas: CuadroDeTallas | undefined) => void;
  /** Los botones de prenda se pintan fuera cuando ya están arriba en la fila. */
  ocultarTipos?: boolean;
}

export const CuadroDeTallasCampos: React.FC<Props> = ({
  tallas, costoBase, onChange, ocultarTipos = false,
}) => {
  const activo = !!tallas?.activo;

  if (!activo) {
    return (
      <button
        type="button"
        onClick={() => onChange(cuadroEnBlanco())}
        className="mt-2 w-full py-2 rounded-lg text-[11px] font-bold border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
      >
        <i className="fa-solid fa-shirt text-[10px]"></i> Cotizar por tallas
      </button>
    );
  }

  const cuadro = tallas!;
  const lineas = lineasDe(cuadro);
  const total = totalDeTallas(cuadro);
  const subtotal = subtotalDeTallas(cuadro, costoBase);
  const libres = tallasLibres(cuadro);

  const guardar = (nuevas: LineaDeTalla[]) => onChange({ ...cuadro, lineas: nuevas });

  // Cambiar de prenda no borra lo escrito: se guarda y vuelve si se vuelve.
  const cambiarTipo = (tipo: TipoDeTalla) => onChange(cambiarTipoDeTalla(cuadro, tipo));

  return (
    <div className="mt-2 bg-indigo-50/60 border border-indigo-200 rounded-xl p-2.5">
      {!ocultarTipos && (
        <div className="flex gap-1 mb-2.5">
          {TIPOS_DE_TALLA.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => cambiarTipo(t)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                cuadro.tipo === t
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
              }`}
            >
              <i className={`${REJILLAS[t].icono} text-[9px]`}></i>
              {REJILLAS[t].label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider flex-1">
          Talla · cantidad · costo
        </span>
        <span className="text-[10px] font-bold text-indigo-700">
          {total} {total === 1 ? 'und' : 'und'}
        </span>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="text-indigo-400 hover:text-red-500 transition"
          aria-label="Quitar las tallas"
        >
          <i className="fa-solid fa-xmark text-[11px]"></i>
        </button>
      </div>

      <div className="space-y-1.5">
        {lineas.map((l, i) => {
          const propio = tieneCostoPropio(l, costoBase);
          const set = (campo: keyof LineaDeTalla, valor: unknown) =>
            guardar(lineas.map((x, j) => (j === i ? { ...x, [campo]: valor } : x)));

          return (
            <div key={`${l.talla}-${i}`} className="flex items-center gap-1.5">
              <select
                value={l.talla}
                onChange={e => set('talla', e.target.value)}
                className="w-16 bg-white border border-indigo-200 rounded-lg p-1.5 text-[11px] font-bold text-slate-900 outline-none focus:border-indigo-500"
              >
                {/* La suya y las que quedan libres: dos filas con la misma
                    talla sumarían dos veces lo mismo. */}
                {[l.talla, ...libres].map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={l.cantidad || ''}
                onChange={e => set('cantidad', Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                placeholder="0"
                className="w-11 bg-white border border-indigo-200 rounded-lg p-1.5 text-[11px] font-bold text-center text-slate-900 outline-none focus:border-indigo-500"
              />

              <span className="text-[10px] text-slate-400">×</span>

              <div className="flex-1 min-w-0">
                <CurrencyInput
                  symbol
                  value={costoDeLinea(l, costoBase)}
                  onCommit={raw => set('costo', raw === '' ? undefined : Number(raw))}
                  className={`w-full rounded-lg p-1.5 text-[11px] font-semibold outline-none border transition ${
                    propio
                      ? 'bg-indigo-100 border-indigo-400 text-indigo-900'
                      : 'bg-white border-indigo-200 text-slate-700'
                  }`}
                />
              </div>

              <span className="w-16 text-right text-[11px] font-bold text-slate-800">
                {formatCurrency(l.cantidad * costoDeLinea(l, costoBase))}
              </span>

              <button
                type="button"
                onClick={() => guardar(lineas.filter((_, j) => j !== i))}
                className="text-slate-300 hover:text-red-500 transition px-0.5"
                aria-label={`Quitar la talla ${l.talla}`}
              >
                <i className="fa-solid fa-xmark text-[10px]"></i>
              </button>
            </div>
          );
        })}
      </div>

      {libres.length > 0 && (
        <button
          type="button"
          onClick={() => guardar([
            ...lineas,
            // Hereda el precio de la anterior. Sin costo de línea arriba, sin
            // esto habría que escribir el mismo precio en cada talla.
            { talla: libres[0], cantidad: 1, costo: lineas[lineas.length - 1]?.costo },
          ])}
          className="mt-2 w-full py-1.5 rounded-lg text-[10px] font-bold border border-dashed border-indigo-300 text-indigo-700 hover:bg-white transition"
        >
          <i className="fa-solid fa-plus text-[9px] mr-1"></i> Añadir talla
        </button>
      )}

      {/* Que se vea que lo de la otra prenda sigue ahí. Sin esto, cambiar de
          botón parece haber borrado el pedido aunque vuelva al volver. */}
      {tiposConDatos(cuadro).length > 0 && (
        <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1.5">
          <i className="fa-solid fa-box-archive text-[9px] text-slate-400"></i>
          Guardado en {tiposConDatos(cuadro).map(t => REJILLAS[t].label).join(' y ')}.
          Vuelve al cambiar de prenda.
        </p>
      )}

      {subtotal > 0 && (
        <div className="flex justify-between items-baseline mt-2 pt-2 border-t border-indigo-200">
          <span className="text-[10px] font-semibold text-slate-500">Subtotal</span>
          <span className="text-xs font-bold text-slate-900">{formatCurrency(subtotal)}</span>
        </div>
      )}
    </div>
  );
};
