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
      {uniqueApprovedProjects.length > 0 && (
        <div className="mb-3">
          <label className="text-xs text-slate-600 font-bold mb-1 block">Proyecto</label>
          <select value={selectedProject} onChange={(e) => onProjectChange(e.target.value)} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 outline-none border border-slate-200 focus:border-orange-500">
            <option value="">-- Seleccionar proyecto --</option>
            {uniqueApprovedProjects.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
        </div>
      )}
      <input type="text" placeholder="Dirigido a (Nombre)" value={directedTo} onChange={e => onDirectedToChange(e.target.value)} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 mb-3 outline-none border border-slate-200 focus:border-indigo-500" />
      <input type="text" placeholder="NIT / CC" value={nit} onChange={e => onNitChange(e.target.value)} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 mb-3 outline-none border border-slate-200 focus:border-indigo-500" />
      <textarea placeholder="Concepto (Ej. Honorarios mes Marzo)" value={concept} onChange={e => onConceptChange(e.target.value)} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 mb-3 outline-none border border-slate-200 focus:border-indigo-500 h-24 resize-none"></textarea>
      <input type="text" placeholder="Valor" value={formatCurrency(amount)} onChange={handleAmountChange} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 mb-3 outline-none border border-slate-200 focus:border-indigo-500 font-semibold text-lg" />
      <div className="text-xs font-semibold text-slate-600 mb-2 mt-1">Cuenta para Consignación</div>
      <select value={selectedAccount} onChange={e => onAccountChange(e.target.value)} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 mb-4 outline-none border border-slate-200 focus:border-indigo-500">
        <option value="">Seleccionar cuenta...</option>
        <option value="efectivo">💵 Pago en Efectivo</option>
        {paymentAccounts.map(acc => (
          <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountType} - {acc.accountNumber}</option>
        ))}
      </select>
      <button onClick={onSend} className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold shadow hover:bg-orange-600 transition">Crear Cuenta Cobro</button>
    </ModalWrapper>
  );
});

CollectionModal.displayName = 'CollectionModal';
