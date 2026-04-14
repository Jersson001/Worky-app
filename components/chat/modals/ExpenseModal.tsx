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
      {(contact.role === 'supplier' || contact.projects.length > 0) && (
        <div className="mb-3">
          <label className="text-xs text-slate-700 font-bold uppercase block mb-1">Asignar a Proyecto</label>
          <select value={targetProjectId} onChange={(e) => onTargetProjectChange(e.target.value)} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
            {contact.role === 'supplier' ? (
              <>
                <option value="">-- Seleccionar --</option>
                {allContacts.filter(c => c.role === 'client').map(c =>
                  c.projects.map(p => <option key={p.id} value={p.id}>{c.clientName} - {p.name}</option>)
                )}
              </>
            ) : (
              contact.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
            )}
          </select>
        </div>
      )}
      <input type="text" placeholder="Descripción" value={description} onChange={(e) => onDescriptionChange(e.target.value)} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 mb-3 outline-none border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700 font-semibold">$</span>
        <input type="text" placeholder="Valor" value={amount ? Number(amount).toLocaleString('es-CO') : ''} onChange={handleAmountChange} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 pl-8 outline-none border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
      </div>
      <button onClick={onSave} className="w-full bg-rose-500 text-white py-3 rounded-lg font-bold shadow hover:bg-rose-600 transition">Registrar Gasto</button>
    </ModalWrapper>
  );
});

ExpenseModal.displayName = 'ExpenseModal';
