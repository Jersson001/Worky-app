/**
 * CollectionModal — create Cuenta de Cobro.
 */
import React from 'react';
import { ModalWrapper } from './ModalWrapper';
import { Project, PaymentAccount } from '../../../types';
import { formatCurrency, extractRawAmount } from '../../../utils/currency';

interface CollectionModalProps {
  show: boolean;
  onClose: () => void;
  uniqueApprovedProjects: Project[];
  paymentAccounts: PaymentAccount[];
  amount: string;
  concept: string;
  directedTo: string;
  nit: string;
  selectedAccount: string;
  selectedProject: string;
  onAmountChange: (value: string) => void;
  onConceptChange: (value: string) => void;
  onDirectedToChange: (value: string) => void;
  onNitChange: (value: string) => void;
  onAccountChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onSend: () => void;
}

export const CollectionModal: React.FC<CollectionModalProps> = React.memo(({
  show, onClose, uniqueApprovedProjects, paymentAccounts,
  amount, concept, directedTo, nit, selectedAccount, selectedProject,
  onAmountChange, onConceptChange, onDirectedToChange, onNitChange,
  onAccountChange, onProjectChange, onSend,
}) => {
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onAmountChange(extractRawAmount(e.target.value));
  };

  return (
    <ModalWrapper show={show} onClose={onClose} title="Cuenta de Cobro" icon="fa-file-invoice" iconColor="text-orange-500">
      <div className="space-y-3">
        {uniqueApprovedProjects.length > 0 && (
          <div>
            <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Proyecto</label>
            <select
              value={selectedProject}
              onChange={(e) => onProjectChange(e.target.value)}
              className="w-full bg-slate-50 text-slate-900 font-semibold rounded-xl p-3 outline-none border border-slate-200 focus:border-orange-500 focus:bg-white transition text-sm"
            >
              <option value="" className="text-slate-900 bg-white">-- Seleccionar proyecto --</option>
              {uniqueApprovedProjects.map(p => (<option key={p.id} value={p.id} className="text-slate-900 bg-white">{p.name}</option>))}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Dirigido a</label>
          <input
            type="text"
            placeholder="Nombre del cliente o empresa"
            value={directedTo}
            onChange={e => onDirectedToChange(e.target.value)}
            className="w-full bg-slate-50 text-slate-900 font-semibold placeholder-slate-400 rounded-xl p-3 outline-none border border-slate-200 focus:border-orange-500 focus:bg-white transition text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">NIT / Cédula</label>
          <input
            type="text"
            placeholder="NIT o Documento de Identidad"
            value={nit}
            onChange={e => onNitChange(e.target.value)}
            className="w-full bg-slate-50 text-slate-900 font-semibold placeholder-slate-400 rounded-xl p-3 outline-none border border-slate-200 focus:border-orange-500 focus:bg-white transition text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Concepto</label>
          <textarea
            placeholder="Concepto (Ej. Fabricación e instalación muebles cocina)"
            value={concept}
            onChange={e => onConceptChange(e.target.value)}
            className="w-full bg-slate-50 text-slate-900 font-semibold placeholder-slate-400 rounded-xl p-3 outline-none border border-slate-200 focus:border-orange-500 focus:bg-white transition text-sm h-20 resize-none"
          />
        </div>

        <div>
          <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Valor</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-base font-bold">$</span>
            <input
              type="text"
              placeholder="0"
              value={formatCurrency(amount).replace('$', '').trim()}
              onChange={handleAmountChange}
              className="w-full bg-slate-50 text-slate-900 font-bold placeholder-slate-400 rounded-xl p-3 pl-8 outline-none border border-slate-200 focus:border-orange-500 focus:bg-white transition text-base"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Cuenta para Consignación</label>
          <select
            value={selectedAccount}
            onChange={e => onAccountChange(e.target.value)}
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
