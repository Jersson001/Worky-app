/**
 * ReceiptModal — create receipt (Recibo de Caja / Recibo de Pago).
 */
import React from 'react';
import { ModalWrapper } from './ModalWrapper';
import { Project, PaymentAccount, ContactRole } from '../../../types';
import { extractRawAmount } from '../../../utils/currency';

interface ReceiptModalProps {
  show: boolean;
  onClose: () => void;
  contactRole: ContactRole;
  uniqueApprovedProjects: Project[];
  paymentAccounts: PaymentAccount[];
  amount: string;
  concept: string;
  selectedAccount: string;
  onAmountChange: (value: string) => void;
  onConceptChange: (value: string) => void;
  onAccountChange: (value: string) => void;
  onSend: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = React.memo(({
  show, onClose, contactRole, uniqueApprovedProjects, paymentAccounts,
  amount, concept, selectedAccount,
  onAmountChange, onConceptChange, onAccountChange, onSend,
}) => {
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onAmountChange(extractRawAmount(e.target.value));
  };

  const title = contactRole === 'supplier' ? 'Enviar Recibo de Pago' : 'Recibo de Caja';

  return (
    <ModalWrapper show={show} onClose={onClose} title={title} icon="fa-money-bills" iconColor="text-emerald-500">
      {uniqueApprovedProjects.length > 0 && (
        <div className="mb-3">
          <label className="text-xs text-slate-600 font-bold mb-1 block">Proyecto</label>
          <select className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 outline-none border border-slate-200 focus:border-emerald-500">
            <option value="">-- Seleccionar proyecto --</option>
            {uniqueApprovedProjects.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
        </div>
      )}
      <textarea placeholder="Concepto del pago" value={concept} onChange={e => onConceptChange(e.target.value)} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 mb-3 outline-none border border-slate-200 focus:border-indigo-500 h-24 resize-none"></textarea>
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700 font-semibold">$</span>
        <input type="text" placeholder="Valor" value={amount ? Number(amount).toLocaleString('es-CO') : ''} onChange={handleAmountChange} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 pl-8 outline-none border border-slate-200 focus:border-indigo-500" />
      </div>
      <div className="text-xs font-semibold text-slate-600 mb-2">Método de Pago</div>
      <select value={selectedAccount} onChange={e => onAccountChange(e.target.value)} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 mb-4 outline-none border border-slate-200 focus:border-indigo-500">
        <option value="">Seleccionar método de pago...</option>
        <option value="efectivo">💵 Pago en Efectivo</option>
        {paymentAccounts.map(acc => (
          <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountType} - {acc.accountNumber}</option>
        ))}
      </select>
      <button onClick={onSend} className="w-full bg-emerald-500 text-white py-3 rounded-lg font-bold shadow hover:bg-emerald-600 transition">
        {contactRole === 'supplier' ? 'Enviar Recibo' : 'Generar Recibo'}
      </button>
    </ModalWrapper>
  );
});

ReceiptModal.displayName = 'ReceiptModal';
