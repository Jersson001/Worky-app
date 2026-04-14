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
      <div className="max-h-[70vh] overflow-y-auto custom-scrollbar px-1">
        {uniqueApprovedProjects.length > 0 && (
          <div className="mb-3">
            <label className="text-xs text-slate-600 font-bold mb-1 block">Proyecto</label>
            <select value={selectedProject} onChange={(e) => onSelectProject(e.target.value)} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 outline-none border border-slate-200 focus:border-indigo-500 mb-3">
              <option value="">-- Seleccionar proyecto --</option>
              {uniqueApprovedProjects.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
          </div>
        )}

        {items.map((item, idx) => (
          <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-3 relative">
            <button onClick={() => onDeleteItem(idx)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500"><i className="fa-solid fa-trash"></i></button>
            <input type="text" placeholder="Descripción" value={item.description} onChange={e => onUpdateItem(idx, 'description', e.target.value)} className="w-full bg-white p-2 rounded border border-slate-200 text-sm text-slate-700 mb-2 font-medium" />
            <div className="flex gap-2">
              <input type="number" placeholder="Cant." value={item.quantity} onChange={e => onUpdateItem(idx, 'quantity', Number(e.target.value))} className="w-20 bg-white p-2 rounded border border-slate-200 text-sm text-slate-700 text-center" />
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-semibold">$</span>
                <input type="text" placeholder="Precio Unit." value={item.price ? Number(item.price).toLocaleString('es-CO') : ''} onChange={e => handlePriceChange(idx, e.target.value)} className="w-full bg-white p-2 pl-7 rounded border border-slate-200 text-sm text-slate-700" />
              </div>
            </div>
          </div>
        ))}

        <button onClick={onAddItem} className="w-full py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 mb-4"><i className="fa-solid fa-plus mr-1"></i> Agregar Item</button>

        <div className="mb-4">
          <label className="text-xs text-slate-600 font-bold mb-1 block">Tipo de Impuesto</label>
          <select value={taxType} onChange={(e) => onChangeTaxType(e.target.value)} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 outline-none border border-slate-200 focus:border-indigo-500">
            <option value="none">Sin impuestos</option>
            <option value="iva">IVA (19%)</option>
            <option value="aiu">AIU (A:5% + I:5% + U:5% + IVA U:19%)</option>
          </select>
        </div>

        {/* Tax Summary */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4 space-y-2">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal:</span>
            <span>${subtotal.toLocaleString()}</span>
          </div>
          {taxType !== 'none' && result.taxAmount > 0 && (
            <>
              {taxType === 'aiu' && result.breakdown && (
                <>
                  <div className="flex justify-between text-xs text-slate-500"><span>Administración (5%):</span><span>${result.breakdown.administracion.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs text-slate-500"><span>Imprevistos (5%):</span><span>${result.breakdown.imprevistos.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs text-slate-500"><span>Utilidad (5%):</span><span>${result.breakdown.utilidad.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs text-slate-500"><span>IVA Utilidad (19%):</span><span>${result.breakdown.ivaUtilidad.toLocaleString()}</span></div>
                </>
              )}
              {taxType === 'iva' && (
                <div className="flex justify-between text-sm text-slate-600"><span>IVA (19%):</span><span>${result.taxAmount.toLocaleString()}</span></div>
              )}
            </>
          )}
          <div className="flex justify-between text-sm font-bold text-slate-800 border-t border-slate-200 pt-2">
            <span>Total:</span>
            <span>${result.total.toLocaleString()}</span>
          </div>
        </div>

        <button onClick={onSend} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold shadow hover:bg-indigo-700 transition">Generar Factura</button>
      </div>
    </ModalWrapper>
  );
});

InvoiceModal.displayName = 'InvoiceModal';
