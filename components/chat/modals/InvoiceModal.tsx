/**
 * InvoiceModal — create and send an invoice.
 */
import React from 'react';
import { ModalWrapper } from './ModalWrapper';
import { InvoiceItem, Project } from '../../../types';
import { formatCurrency, extractRawAmount } from '../../../utils/currency';
import { calculateTax, TaxType } from '../../../utils/taxCalculations';

interface InvoiceModalProps {
  show: boolean;
  onClose: () => void;
  items: InvoiceItem[];
  selectedProject: string;
  taxType: 'none' | 'iva' | 'aiu';
  uniqueApprovedProjects: Project[];
  onAddItem: () => void;
  onUpdateItem: (index: number, field: keyof InvoiceItem, value: any) => void;
  onDeleteItem: (index: number) => void;
  onSelectProject: (value: string) => void;
  onChangeTaxType: (value: string) => void;
  onSend: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = React.memo(({
  show, onClose, items, selectedProject, taxType, uniqueApprovedProjects,
  onAddItem, onUpdateItem, onDeleteItem, onSelectProject, onChangeTaxType, onSend,
}) => {
  const handlePriceChange = (idx: number, value: string) => {
    const rawValue = extractRawAmount(value);
    onUpdateItem(idx, 'price', rawValue === '' ? '' : Number(rawValue));
  };

  const subtotal = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const result = calculateTax(subtotal, taxType as TaxType);

  return (
    <ModalWrapper show={show} onClose={onClose} title="Crear Factura" icon="fa-file-invoice-dollar" iconColor="text-indigo-500">
      <div className="space-y-3">
        {uniqueApprovedProjects.length > 0 && (
          <div>
            <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Proyecto</label>
            <select
              value={selectedProject}
              onChange={(e) => onSelectProject(e.target.value)}
              className="w-full bg-slate-50 text-slate-900 font-semibold rounded-xl p-3 outline-none border border-slate-200 focus:border-indigo-500 focus:bg-white transition text-sm"
            >
              <option value="" className="text-slate-900 bg-white">-- Seleccionar proyecto --</option>
              {uniqueApprovedProjects.map(p => (<option key={p.id} value={p.id} className="text-slate-900 bg-white">{p.name}</option>))}
            </select>
          </div>
        )}

        <div className="space-y-2.5">
          {items.map((item, idx) => (
            <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 relative group">
              <button
                onClick={() => onDeleteItem(idx)}
                className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition p-1"
              >
                <i className="fa-solid fa-trash text-xs"></i>
              </button>
              <input
                type="text"
                placeholder="Descripción del ítem..."
                value={item.description}
                onChange={e => onUpdateItem(idx, 'description', e.target.value)}
                className="w-full bg-white p-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 font-semibold placeholder-slate-400 mb-2 pr-8 outline-none focus:border-indigo-500 transition"
              />
              <div className="flex gap-2">
                <div className="w-20">
                  <input
                    type="number"
                    placeholder="Cant."
                    value={item.quantity}
                    onChange={e => onUpdateItem(idx, 'quantity', Number(e.target.value))}
                    className="w-full bg-white p-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 font-semibold text-center placeholder-slate-400 outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-semibold">$</span>
                  <input
                    type="text"
                    placeholder="Precio Unit."
                    value={item.price ? Number(item.price).toLocaleString('es-CO') : ''}
                    onChange={e => handlePriceChange(idx, e.target.value)}
                    className="w-full bg-white p-2.5 pl-7 rounded-xl border border-slate-200 text-sm text-slate-900 font-semibold placeholder-slate-400 outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onAddItem}
          className="w-full py-2.5 bg-white text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 border border-dashed border-slate-300 transition flex items-center justify-center gap-1.5"
        >
          <i className="fa-solid fa-plus text-xs"></i> Agregar Ítem
        </button>

        <div>
          <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Tipo de Impuesto</label>
          <select
            value={taxType}
            onChange={(e) => onChangeTaxType(e.target.value)}
            className="w-full bg-slate-50 text-slate-900 font-semibold rounded-xl p-3 outline-none border border-slate-200 focus:border-indigo-500 focus:bg-white transition text-sm"
          >
            <option value="none" className="text-slate-900 bg-white">Sin impuestos</option>
            <option value="iva" className="text-slate-900 bg-white">IVA (19%)</option>
            <option value="aiu" className="text-slate-900 bg-white">AIU (A:5% + I:5% + U:5% + IVA U:19%)</option>
          </select>
        </div>

        {/* Tax Summary */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
          <div className="flex justify-between text-xs text-slate-600 font-semibold">
            <span>Subtotal:</span>
            <span>${subtotal.toLocaleString()}</span>
          </div>
          {taxType !== 'none' && result.taxAmount > 0 && (
            <>
              {taxType === 'aiu' && result.breakdown && (
                <>
                  <div className="flex justify-between text-[11px] text-slate-500"><span>Administración (5%):</span><span>${result.breakdown.administracion.toLocaleString()}</span></div>
                  <div className="flex justify-between text-[11px] text-slate-500"><span>Imprevistos (5%):</span><span>${result.breakdown.imprevistos.toLocaleString()}</span></div>
                  <div className="flex justify-between text-[11px] text-slate-500"><span>Utilidad (5%):</span><span>${result.breakdown.utilidad.toLocaleString()}</span></div>
                  <div className="flex justify-between text-[11px] text-slate-500"><span>IVA Utilidad (19%):</span><span>${result.breakdown.ivaUtilidad.toLocaleString()}</span></div>
                </>
              )}
              {taxType === 'iva' && (
                <div className="flex justify-between text-xs text-slate-600 font-semibold"><span>IVA (19%):</span><span>${result.taxAmount.toLocaleString()}</span></div>
              )}
            </>
          )}
          <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
            <span>Total:</span>
            <span className="text-indigo-600">${result.total.toLocaleString()}</span>
          </div>
        </div>

        <button
          onClick={onSend}
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/25 hover:shadow-xl transition active:scale-[0.99] flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-file-invoice-dollar"></i> Generar Factura
        </button>
      </div>
    </ModalWrapper>
  );
});

InvoiceModal.displayName = 'InvoiceModal';
