/**
 * ReceiptModal — create receipt (Recibo de Caja / Recibo de Pago).
 */
import React from 'react';
import { ModalWrapper } from './ModalWrapper';
import { CurrencyInput } from './CurrencyInput';
import { Project, PaymentAccount, ContactRole } from '../../../types';

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
  const title = contactRole === 'supplier' ? 'Enviar Recibo de Pago' : 'Recibo de Caja';

  return (
    <ModalWrapper show={show} onClose={onClose} title={title} icon="fa-money-bills" iconColor="text-emerald-500">
      <div className="space-y-3">
        {uniqueApprovedProjects.length > 0 && (
          <div>
            <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Proyecto</label>
            <select className="w-full bg-slate-50 text-slate-900 font-semibold rounded-xl p-3 outline-none border border-slate-200 focus:border-emerald-500 focus:bg-white transition text-sm">
              <option value="" className="text-slate-900 bg-white">-- Seleccionar proyecto --</option>
              {uniqueApprovedProjects.map(p => (<option key={p.id} value={p.id} className="text-slate-900 bg-white">{p.name}</option>))}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Concepto</label>
          <textarea
            placeholder="Concepto del pago (ej. Abono inicial 50%)"
            value={concept}
            onChange={e => onConceptChange(e.target.value)}
            className="w-full bg-slate-50 text-slate-900 font-semibold placeholder-slate-400 rounded-xl p-3 outline-none border border-slate-200 focus:border-emerald-500 focus:bg-white transition text-sm h-20 resize-none"
          />
        </div>

        <div>
          <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Valor</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-base font-bold">$</span>
            <CurrencyInput
              placeholder="0"
              value={amount}
              onCommit={onAmountChange}
              className="w-full bg-slate-50 text-slate-900 font-bold placeholder-slate-400 rounded-xl p-3 pl-8 outline-none border border-slate-200 focus:border-emerald-500 focus:bg-white transition text-base"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Método de Pago</label>
          <select
            value={selectedAccount}
            onChange={e => onAccountChange(e.target.value)}
            className="w-full bg-slate-50 text-slate-900 font-semibold rounded-xl p-3 outline-none border border-slate-200 focus:border-emerald-500 focus:bg-white transition text-sm"
          >
            <option value="" className="text-slate-900 bg-white">Seleccionar método de pago...</option>
            <option value="efectivo" className="text-slate-900 bg-white">💵 Pago en Efectivo</option>
            {paymentAccounts.map(acc => (
              <option key={acc.id} value={acc.id} className="text-slate-900 bg-white">{acc.bankName} - {acc.accountType} - {acc.accountNumber}</option>
            ))}
          </select>
        </div>

        <button
          onClick={onSend}
          className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/25 hover:shadow-xl transition active:scale-[0.99] flex items-center justify-center gap-2 mt-2"
        >
          <i className="fa-solid fa-money-bills"></i> {contactRole === 'supplier' ? 'Enviar Recibo' : 'Generar Recibo'}
        </button>
      </div>
    </ModalWrapper>
  );
});

ReceiptModal.displayName = 'ReceiptModal';
