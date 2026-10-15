/**
 * CollectionModal — create Cuenta de Cobro.
 */
import React from 'react';
import { ModalWrapper } from './ModalWrapper';
import { CurrencyInput } from './CurrencyInput';
import { Project, PaymentAccount } from '../../../types';
import { CollectionFormState } from '../../../hooks/useChatFormState';

interface CollectionModalProps {
  show: boolean;
  onClose: () => void;
  uniqueApprovedProjects: Project[];
  paymentAccounts: PaymentAccount[];
  form: CollectionFormState;
  onField: <K extends keyof CollectionFormState>(field: K, value: CollectionFormState[K]) => void;
  onSend: () => void;
}

const VINETA = '• ';
const INPUT = 'w-full bg-slate-50 text-slate-900 font-semibold placeholder-slate-400 rounded-xl p-3 outline-none border border-slate-200 focus:border-orange-500 focus:bg-white transition text-sm';
const LABEL = 'text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide';

/**
 * El concepto de una cuenta de cobro suele ser una lista de trabajos, no una
 * frase. Cada línea lleva su viñeta y Enter abre la siguiente; Enter sobre una
 * viñeta vacía la quita, que es como se sale de la lista.
 */
const ConceptoConVinetas: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const poner = (texto: string, cursor: number) => {
    onChange(texto);
    requestAnimationFrame(() => ref.current?.setSelectionRange(cursor, cursor));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const el = e.currentTarget;
    const pos = el.selectionStart;
    const inicio = value.lastIndexOf('\n', pos - 1) + 1;
    const linea = value.slice(inicio, pos);

    if (linea === VINETA.trim() || linea === VINETA) {
      // Viñeta vacía: se borra y termina la lista.
      const texto = value.slice(0, inicio) + value.slice(pos);
      poner(texto, inicio);
      return;
    }
    const insertar = '\n' + VINETA;
    poner(value.slice(0, pos) + insertar + value.slice(el.selectionEnd), pos + insertar.length);
  };

  return (
    <textarea
      ref={ref}
      placeholder={`${VINETA}Fabricación e instalación muebles cocina\n${VINETA}Remodelación del baño`}
      value={value}
      onFocus={() => { if (!value) poner(VINETA, VINETA.length); }}
      onBlur={() => { if (value.trim() === VINETA.trim()) onChange(''); }}
      onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      className={`${INPUT} h-32 resize-y`}
    />
  );
};

export const CollectionModal: React.FC<CollectionModalProps> = React.memo(({
  show, onClose, uniqueApprovedProjects, paymentAccounts, form, onField, onSend,
}) => {
  return (
    <ModalWrapper show={show} onClose={onClose} title="Cuenta de Cobro" icon="fa-file-invoice" iconColor="text-orange-500">
      <div className="space-y-3">
        {uniqueApprovedProjects.length > 0 && (
          <div>
            <label className={LABEL}>Proyecto</label>
            <select
              value={form.selectedProject}
              onChange={(e) => onField('selectedProject', e.target.value)}
              className="w-full bg-slate-50 text-slate-900 font-semibold rounded-xl p-3 outline-none border border-slate-200 focus:border-orange-500 focus:bg-white transition text-sm"
            >
              <option value="" className="text-slate-900 bg-white">-- Seleccionar proyecto --</option>
              {uniqueApprovedProjects.map(p => (<option key={p.id} value={p.id} className="text-slate-900 bg-white">{p.name}</option>))}
            </select>
          </div>
        )}

        <p className="text-[11px] font-bold text-orange-600 uppercase tracking-wider pt-1">Cliente</p>

        <div>
          <label className={LABEL}>Dirigido a</label>
          <input type="text" placeholder="Nombre del cliente o empresa" value={form.directedTo}
            onChange={e => onField('directedTo', e.target.value)} className={INPUT} />
        </div>

        <div>
          <label className={LABEL}>NIT / Cédula del cliente</label>
          <input type="text" inputMode="numeric" placeholder="NIT o Documento de Identidad" value={form.nit}
            onChange={e => onField('nit', e.target.value)} className={INPUT} />
        </div>

        <div>
          <label className={LABEL}>Dirección del cliente</label>
          <input type="text" placeholder="Ej. Cra 19 a #86a-21, Bogotá" value={form.clientAddress}
            onChange={e => onField('clientAddress', e.target.value)} className={INPUT} />
        </div>

        <p className="text-[11px] font-bold text-orange-600 uppercase tracking-wider pt-1">Tus datos (quien cobra)</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Tu RUT</label>
            <input type="text" inputMode="numeric" placeholder="1015993161-3" value={form.issuerRut}
              onChange={e => onField('issuerRut', e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Tu cédula</label>
            <input type="text" inputMode="numeric" placeholder="1.015.993.161" value={form.issuerCedula}
              onChange={e => onField('issuerCedula', e.target.value)} className={INPUT} />
          </div>
        </div>

        <div>
          <label className={LABEL}>Tu celular</label>
          <input type="tel" inputMode="tel" placeholder="3142036659" value={form.issuerPhone}
            onChange={e => onField('issuerPhone', e.target.value)} className={INPUT} />
        </div>

        <p className="text-[11px] font-bold text-orange-600 uppercase tracking-wider pt-1">Cobro</p>

        <div>
          <label className={LABEL}>Concepto</label>
          <ConceptoConVinetas value={form.concept} onChange={v => onField('concept', v)} />
          <p className="text-[11px] text-slate-500 mt-1">Enter agrega otra viñeta; Enter en una vacía la quita.</p>
        </div>

        <div>
          <label className={LABEL}>Valor</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-base font-bold">$</span>
            <CurrencyInput
              placeholder="0"
              value={form.amount}
              onCommit={v => onField('amount', v)}
              className="w-full bg-slate-50 text-slate-900 font-bold placeholder-slate-400 rounded-xl p-3 pl-8 outline-none border border-slate-200 focus:border-orange-500 focus:bg-white transition text-base"
            />
          </div>
        </div>

        <div>
          <label className={LABEL}>Cuenta para Consignación</label>
          <select
            value={form.selectedAccount}
            onChange={e => onField('selectedAccount', e.target.value)}
            className="w-full bg-slate-50 text-slate-900 font-semibold rounded-xl p-3 outline-none border border-slate-200 focus:border-orange-500 focus:bg-white transition text-sm"
          >
            <option value="" className="text-slate-900 bg-white">Seleccionar cuenta...</option>
            <option value="efectivo" className="text-slate-900 bg-white">💵 Pago en Efectivo</option>
            {paymentAccounts.map(acc => (
              <option key={acc.id} value={acc.id} className="text-slate-900 bg-white">{acc.bankName} - {acc.accountType} - {acc.accountNumber}</option>
            ))}
          </select>
        </div>

        <button
          onClick={onSend}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-500/25 hover:shadow-xl transition active:scale-[0.99] flex items-center justify-center gap-2 mt-2"
        >
          <i className="fa-solid fa-file-invoice"></i> Crear Cuenta de Cobro
        </button>
      </div>
    </ModalWrapper>
  );
});

CollectionModal.displayName = 'CollectionModal';
