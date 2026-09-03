/**
 * El pie de la cotización: cómo se paga y bajo qué condiciones.
 *
 * Sale del formato en papel que se usaba antes de Worky. La forma de pago la
 * ve todo el mundo —cobrar se cobra en todos los oficios—, y las condiciones
 * solo carpintería y obra, que son donde se pacta plazo, anticipo y garantía.
 */
import React from 'react';
import { PaymentAccount, CondicionesCotizacion, BloqueCondiciones } from '../../../types';
import { formatCurrency } from '../../../utils/currency';
import { ORDEN_CONDICIONES, repartoDePago } from '../../../utils/condicionesCotizacion';

// ─── Forma de pago ───────────────────────────────────────────────────────────

interface FormaDePagoProps {
  total: number;
  anticipoPorcentaje: string;
  cuentaCobroId: string;
  cuentas: PaymentAccount[];
  onSetAnticipo: (valor: string) => void;
  onSetCuenta: (id: string) => void;
}

export const FormaDePagoCampos: React.FC<FormaDePagoProps> = ({
  total, anticipoPorcentaje, cuentaCobroId, cuentas, onSetAnticipo, onSetCuenta,
}) => {
  const reparto = repartoDePago(total, parseFloat(anticipoPorcentaje) || 0);

  return (
    <div className="mb-4">
      <label className="text-xs text-slate-700 font-bold uppercase mb-2 block tracking-wide">
        Forma de pago
      </label>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
        {/* Anticipo y saldo. Solo se escribe el anticipo: el saldo es el resto,
            y pedir los dos porcentajes invita a que no sumen 100. */}
        <div className="flex items-end gap-2">
          <div className="w-24">
            <label className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Anticipo</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                value={anticipoPorcentaje}
                onChange={e => onSetAnticipo(e.target.value)}
                className="w-full bg-white p-2 pr-6 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-2 pb-0.5">
            <div className="bg-white rounded-lg border border-slate-200 px-2.5 py-1.5">
              <div className="text-[10px] text-slate-500 font-semibold">Al iniciar</div>
              <div className="text-xs font-bold text-slate-800 truncate">{formatCurrency(reparto.anticipo)}</div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 px-2.5 py-1.5">
              <div className="text-[10px] text-slate-500 font-semibold">Contra entrega · {reparto.porcentajeSaldo}%</div>
              <div className="text-xs font-bold text-slate-800 truncate">{formatCurrency(reparto.saldo)}</div>
            </div>
          </div>
        </div>

        {/* La cuenta donde consignan. Sale de la libreta de datos de pago. */}
        <div>
          <label className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">
            Cuenta para consignar
          </label>
          {cuentas.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic bg-white border border-dashed border-slate-200 rounded-lg p-2.5">
              No hay cuentas registradas. Se agregan en «Datos de pago».
            </p>
          ) : (
            <select
              value={cuentaCobroId}
              onChange={e => onSetCuenta(e.target.value)}
              className="w-full bg-white p-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
            >
              <option value="">No adjuntar cuenta</option>
              {cuentas.map(c => (
                <option key={c.id} value={c.id}>
                  {c.bankName} · {c.accountType} · {c.accountNumber}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Condiciones de negociación ──────────────────────────────────────────────

interface CondicionesProps {
  condiciones: CondicionesCotizacion;
  onSetCondicion: (clave: keyof CondicionesCotizacion, campo: keyof BloqueCondiciones, valor: boolean | string) => void;
  /** Guarda lo escrito como plantilla del negocio, para las próximas. */
  onGuardarPlantilla?: () => void;
  guardandoPlantilla?: boolean;
  plantillaGuardada?: boolean;
}

export const CondicionesEditor: React.FC<CondicionesProps> = ({
  condiciones, onSetCondicion, onGuardarPlantilla, guardandoPlantilla, plantillaGuardada,
}) => {
  const [abierto, setAbierto] = React.useState<keyof CondicionesCotizacion | null>(null);
  const activas = ORDEN_CONDICIONES.filter(k => condiciones[k]?.activo).length;

  return (
    <div className="mb-4">
      <label className="text-xs text-slate-700 font-bold uppercase mb-2 block tracking-wide">
        Condiciones de negociación
        <span className="ml-1.5 text-[10px] font-semibold text-slate-400 normal-case tracking-normal">
          {activas} de {ORDEN_CONDICIONES.length} activas
        </span>
      </label>

      <div className="space-y-1.5">
        {ORDEN_CONDICIONES.map(clave => {
          const b = condiciones[clave];
          if (!b) return null;
          const estaAbierto = abierto === clave;
          const lineas = b.texto.split('\n').filter(l => l.trim()).length;

          return (
            <div
              key={clave}
              className={`rounded-xl border overflow-hidden transition ${
                b.activo ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 px-3 py-2.5">
                {/* El interruptor: lo que decide si sale en el documento. */}
                <button
                  type="button"
                  onClick={() => onSetCondicion(clave, 'activo', !b.activo)}
                  className={`relative w-9 h-5 rounded-full transition flex-shrink-0 ${
                    b.activo ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                  aria-label={b.activo ? `Quitar ${b.titulo}` : `Incluir ${b.titulo}`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                      b.activo ? 'left-[18px]' : 'left-0.5'
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setAbierto(estaAbierto ? null : clave)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className={`text-xs font-bold truncate ${b.activo ? 'text-slate-800' : 'text-slate-400'}`}>
                    {b.titulo}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {lineas} {lineas === 1 ? 'línea' : 'líneas'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAbierto(estaAbierto ? null : clave)}
                  className="text-slate-400 hover:text-slate-600 transition p-1 flex-shrink-0"
                >
                  <i className={`fa-solid ${estaAbierto ? 'fa-chevron-up' : 'fa-pen'} text-[11px]`}></i>
                </button>
              </div>

              {estaAbierto && (
                <div className="px-3 pb-3 space-y-2 bg-slate-50 border-t border-slate-200 pt-2.5">
                  <input
                    type="text"
                    value={b.titulo}
                    onChange={e => onSetCondicion(clave, 'titulo', e.target.value)}
                    className="w-full bg-white p-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                  <textarea
                    value={b.texto}
                    onChange={e => onSetCondicion(clave, 'texto', e.target.value)}
                    rows={5}
                    placeholder="Una condición por línea…"
                    className="w-full bg-white p-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 resize-none leading-relaxed"
                  />
                  <p className="text-[10px] text-slate-400">
                    Cada renglón sale como un punto en la cotización.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lo escrito aquí vale solo para esta cotización mientras no se guarde
          como plantilla. Guardarlo es lo que evita reescribirlo cada vez. */}
      {onGuardarPlantilla && (
        <button
          type="button"
          onClick={onGuardarPlantilla}
          disabled={guardandoPlantilla}
          className="mt-2 w-full py-2 rounded-xl text-[11px] font-bold border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 transition flex items-center justify-center gap-1.5 disabled:opacity-60"
        >
          {guardandoPlantilla ? (
            <><i className="fa-solid fa-circle-notch fa-spin"></i> Guardando…</>
          ) : plantillaGuardada ? (
            <><i className="fa-solid fa-check text-emerald-600"></i> Guardadas para las próximas</>
          ) : (
            <><i className="fa-regular fa-bookmark"></i> Guardar como mis condiciones de siempre</>
          )}
        </button>
      )}
    </div>
  );
};
