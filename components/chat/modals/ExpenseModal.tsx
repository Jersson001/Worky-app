/**
 * ExpenseModal — register an expense against a project.
 */
import React from 'react';
import { ModalWrapper } from './ModalWrapper';
import { Contact, Project } from '../../../types';
import { formatCurrency, extractRawAmount } from '../../../utils/currency';

interface ExpenseModalProps {
  show: boolean;
  onClose: () => void;
  contact: Contact;
  allContacts: Contact[];
  amount: string;
  description: string;
  targetProjectId: string;
  onAmountChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTargetProjectChange: (value: string) => void;
  onSave: () => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = React.memo(({
  show, onClose, contact, allContacts,
  amount, description, targetProjectId,
  onAmountChange, onDescriptionChange, onTargetProjectChange, onSave,
}) => {
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onAmountChange(extractRawAmount(e.target.value));
  };

  return (
    <ModalWrapper show={show} onClose={onClose} title="Registrar Gasto" icon="fa-circle-minus" iconColor="text-rose-500">
      <div className="space-y-3">
        {(contact.role === 'supplier' || contact.projects.length > 0) && (
          <div>
            <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Asignar a Proyecto</label>
            <select
              value={targetProjectId}
              onChange={(e) => onTargetProjectChange(e.target.value)}
              className="w-full bg-slate-50 text-slate-900 font-semibold rounded-xl p-3 border border-slate-200 outline-none focus:border-rose-500 focus:bg-white transition text-sm"
            >
              {contact.role === 'supplier' ? (
                <>
                  <option value="" className="text-slate-900 bg-white">-- Seleccionar proyecto --</option>
                  {allContacts.filter(c => c.role === 'client').map(c =>
                    c.projects.map(p => <option key={p.id} value={p.id} className="text-slate-900 bg-white">{c.clientName} - {p.name}</option>)
                  )}
                </>
              ) : (
                contact.projects.map(p => <option key={p.id} value={p.id} className="text-slate-900 bg-white">{p.name}</option>)
              )}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Descripción</label>
          <input
            type="text"
            placeholder="Descripción del gasto (ej. Compra de bisagras)"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className="w-full bg-slate-50 text-slate-900 font-semibold placeholder-slate-400 rounded-xl p-3 outline-none border border-slate-200 focus:border-rose-500 focus:bg-white transition text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Valor</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-base font-bold">$</span>
            <input
              type="text"
              placeholder="0"
              value={amount ? Number(amount).toLocaleString('es-CO') : ''}
              onChange={handleAmountChange}
              className="w-full bg-slate-50 text-slate-900 font-bold placeholder-slate-400 rounded-xl p-3 pl-8 outline-none border border-slate-200 focus:border-rose-500 focus:bg-white transition text-base"
            />
          </div>
        </div>

        <button
          onClick={onSave}
          className="w-full bg-gradient-to-r from-rose-500 to-rose-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-rose-500/25 hover:shadow-xl transition active:scale-[0.99] flex items-center justify-center gap-2 mt-2"
        >
          <i className="fa-solid fa-circle-minus"></i> Registrar Gasto
        </button>
      </div>
    </ModalWrapper>
  );
});

ExpenseModal.displayName = 'ExpenseModal';
