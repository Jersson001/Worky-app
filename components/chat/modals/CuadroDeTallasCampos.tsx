/**
 * El cuadro de tallas de una línea de cotización.
 *
 * Nace apagado: la mayoría de las líneas no son prendas, y una rejilla de
 * once casillas encima de cada ítem estorbaría más de lo que ayuda. Al
 * encenderlo, la cantidad deja de escribirse y sale de sumar las tallas, que
 * es como se cuenta un pedido de confección.
 */
import React from 'react';
import { CuadroDeTallas, TipoDeTalla } from '../../../types';
import { REJILLAS, TIPOS_DE_TALLA, cuadroEnBlanco, totalDeTallas } from '../../../utils/tallas';

interface Props {
  tallas?: CuadroDeTallas;
  onChange: (tallas: CuadroDeTallas | undefined) => void;
}

export const CuadroDeTallasCampos: React.FC<Props> = ({ tallas, onChange }) => {
  const activo = !!tallas?.activo;
  const total = totalDeTallas(tallas);

  const cambiarTipo = (tipo: TipoDeTalla) => {
    // Las cantidades no se arrastran: una M de camisa no es una 32 de
    // pantalón, y conservarlas dejaría números en tallas que ya no existen.
    onChange({ activo: true, tipo, cantidades: {} });
  };

  const ponerCantidad = (talla: string, valor: string) => {
    if (!tallas) return;
    const n = Math.max(0, Math.floor(Number(valor) || 0));
    const cantidades = { ...tallas.cantidades };
    if (n > 0) cantidades[talla] = n;
    else delete cantidades[talla];
    onChange({ ...tallas, cantidades });
  };

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

  const rejilla = REJILLAS[tallas!.tipo];

  return (
    <div className="mt-2 bg-indigo-50/60 border border-indigo-200 rounded-xl p-2.5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex-1">
          Tallas
        </span>
        <span className="text-[11px] font-bold text-indigo-700">
          {total} {total === 1 ? 'unidad' : 'unidades'}
        </span>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="text-indigo-400 hover:text-red-500 transition p-0.5"
          aria-label="Quitar el cuadro de tallas"
        >
          <i className="fa-solid fa-xmark text-xs"></i>
        </button>
      </div>

      {/* Qué se está cotizando: camisa, pantalón o calzado. */}
      <div className="flex gap-1 mb-2.5">
        {TIPOS_DE_TALLA.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => cambiarTipo(t)}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 ${
              tallas!.tipo === t
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
            }`}
          >
            <i className={`${REJILLAS[t].icono} text-[9px]`}></i>
            {REJILLAS[t].label}
          </button>
        ))}
      </div>

      {/* La rejilla. Se deja vacío lo que no lleva nada: un cero en cada casilla
          obliga a distinguir de un vistazo el cero escrito del no pedido. */}
      <div className="grid grid-cols-6 gap-1.5">
        {rejilla.tallas.map(talla => {
          const n = tallas!.cantidades[talla];
          return (
            <div key={talla}>
              <label className="block text-[9px] font-bold text-slate-500 text-center mb-0.5">
                {talla}
              </label>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={n ?? ''}
                onChange={e => ponerCantidad(talla, e.target.value)}
                placeholder="—"
                className={`w-full p-1.5 rounded-lg border text-xs font-bold text-center outline-none transition ${
                  n
                    ? 'bg-white border-indigo-300 text-slate-900'
                    : 'bg-white/60 border-slate-200 text-slate-400 placeholder-slate-300'
                } focus:border-indigo-500`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
