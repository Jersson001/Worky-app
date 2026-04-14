/**
 * QuoteModal — create and send a quote with tax options, images, and product picker.
 */
import React from 'react';
import { ModalWrapper } from './ModalWrapper';
import { QuoteItem, Product, ContactRole } from '../../../types';
import { formatCurrency, extractRawAmount } from '../../../utils/currency';
import { calculateTax } from '../../../utils/taxCalculations';

interface QuoteModalProps {
  show: boolean;
  onClose: () => void;
  contactRole: ContactRole;
  items: QuoteItem[];
  validDays: string;
  taxType: 'none' | 'percentage' | 'aiu';
  taxPercentage: string;
  aiuAdmin: string;
  aiuImprevistos: string;
  aiuUtilidad: string;
  aiuIva: string;
  clientAddress: string;
  clientPhone: string;
  showProductPicker: boolean;
  products: Product[];
  // Item actions
  onAddItem: () => void;
  onDeleteItem: (index: number) => void;
  onUpdateItem: (index: number, field: keyof QuoteItem, value: any) => void;
  onUpdateItemPrice: (index: number, value: string) => void;
  onAddProductToQuote: (product: Product) => void;
  onShowProductPicker: (show: boolean) => void;
  // Image actions
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>, idx: number) => void;
  onRemoveImage: (itemIndex: number, imageIndex: number) => void;
  onUpdateItemImage: (index: number, url: string) => void;
  // Field setters
  onSetValidDays: (value: string) => void;
  onSetTaxType: (value: string) => void;
  onSetTaxPercentage: (value: string) => void;
  onSetAIUAdmin: (value: string) => void;
  onSetAIUImprevistos: (value: string) => void;
  onSetAIUUtilidad: (value: string) => void;
  onSetAIUIva: (value: string) => void;
  onSetClientAddress: (value: string) => void;
  onSetClientPhone: (value: string) => void;
  onSend: () => void;
}

export const QuoteModal: React.FC<QuoteModalProps> = React.memo(({
  show, onClose, contactRole,
  items, validDays, taxType, taxPercentage,
  aiuAdmin, aiuImprevistos, aiuUtilidad, aiuIva,
  clientAddress, clientPhone, showProductPicker, products,
  onAddItem, onDeleteItem, onUpdateItem, onUpdateItemPrice,
  onAddProductToQuote, onShowProductPicker,
  onImageUpload, onRemoveImage, onUpdateItemImage,
  onSetValidDays, onSetTaxType, onSetTaxPercentage,
  onSetAIUAdmin, onSetAIUImprevistos, onSetAIUUtilidad, onSetAIUIva,
  onSetClientAddress, onSetClientPhone, onSend,
}) => {
  const subtotal = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const result = calculateTax(subtotal, taxType, {
    percentage: parseFloat(taxPercentage) || 19,
    aiu: {
      adminPercent: parseFloat(aiuAdmin) || 5,
      imprevistosPercent: parseFloat(aiuImprevistos) || 5,
      utilidadPercent: parseFloat(aiuUtilidad) || 5,
      ivaPercent: parseFloat(aiuIva) || 19,
    },
  });

  const title = contactRole === 'supplier' ? 'Enviar Cotización' : 'Nueva Cotización';

  return (
    <ModalWrapper show={show} onClose={onClose} title={title} icon="fa-file-contract" iconColor="text-teal-500">
      <div className="max-h-[70vh] overflow-y-auto custom-scrollbar px-1">
        {/* Validity */}
        <div className="mb-4">
          <label className="text-xs text-slate-700 font-bold uppercase block mb-1">Vigencia (Días)</label>
          <select value={validDays} onChange={e => onSetValidDays(e.target.value)} className="w-full bg-slate-50 p-2 rounded border border-slate-200 text-sm">
            <option value="7">7 Días</option>
            <option value="15">15 Días</option>
            <option value="30">30 Días</option>
          </select>
        </div>

        {/* Client data */}
        <div className="mb-4">
          <label className="text-xs text-slate-700 font-bold uppercase block mb-1">Datos del Cliente (Opcional)</label>
          <input type="text" value={clientAddress} onChange={(e) => onSetClientAddress(e.target.value)} placeholder="Dirección" className="w-full bg-slate-50 p-2 rounded border border-slate-200 text-sm text-slate-700 mb-2" />
          <input type="tel" value={clientPhone} onChange={(e) => onSetClientPhone(e.target.value)} placeholder="Teléfono" className="w-full bg-slate-50 p-2 rounded border border-slate-200 text-sm text-slate-700" />
        </div>

        {/* Items */}
        {items.map((item, idx) => (
          <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-3 relative group">
            <button onClick={() => onDeleteItem(idx)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500"><i className="fa-solid fa-trash"></i></button>
            <input type="text" placeholder="Producto / Servicio" value={item.description} onChange={e => onUpdateItem(idx, 'description', e.target.value)} className="w-full bg-white p-2 rounded border border-slate-200 text-sm text-slate-700 mb-2 font-medium" />
            <div className="flex gap-2">
              <input type="number" placeholder="Cant." value={item.quantity} onChange={e => onUpdateItem(idx, 'quantity', Number(e.target.value))} className="w-20 bg-white p-2 rounded border border-slate-200 text-sm text-slate-700 text-center" />
              <input type="text" placeholder="Precio Unit." value={item.price > 0 ? formatCurrency(item.price) : ''} onChange={e => onUpdateItemPrice(idx, e.target.value)} className="flex-1 bg-white p-2 rounded border border-slate-200 text-sm text-slate-700 font-semibold" />
            </div>
            {/* Image upload buttons */}
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-2">
                <button type="button" onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.multiple = true; input.capture = 'environment' as any; input.onchange = (e) => onImageUpload(e as any, idx); input.click(); }} className="flex-1 bg-purple-50 text-purple-600 py-2 rounded border border-purple-200 text-xs font-bold hover:bg-purple-100 transition">
                  <i className="fa-solid fa-camera mr-1"></i> Cámara
                </button>
                <button type="button" onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.multiple = true; input.onchange = (e) => onImageUpload(e as any, idx); input.click(); }} className="flex-1 bg-pink-50 text-pink-600 py-2 rounded border border-pink-200 text-xs font-bold hover:bg-pink-100 transition">
                  <i className="fa-solid fa-image mr-1"></i> Galería
                </button>
              </div>
              {item.images && item.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {item.images.map((imageUrl, imgIdx) => (
                    <div key={imgIdx} className="relative">
                      <img src={imageUrl} className="w-full h-24 rounded border border-slate-200 object-cover" />
                      <button type="button" onClick={() => onRemoveImage(idx, imgIdx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600">
                        <i className="fa-solid fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {(!item.images || item.images.length === 0) && item.image && (
                <div className="relative inline-block mt-2">
                  <img src={item.image} className="w-full h-24 rounded border border-slate-200 object-cover" />
                  <button type="button" onClick={() => onUpdateItemImage(idx, '')} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600">
                    <i className="fa-solid fa-times"></i>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Add item buttons */}
        <div className="flex gap-2 mb-4">
          <button onClick={onAddItem} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200"><i className="fa-solid fa-plus mr-1"></i> Item Vacío</button>
          <button onClick={() => onShowProductPicker(true)} className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100"><i className="fa-solid fa-box mr-1"></i> Catálogo</button>
        </div>

        {/* Product picker */}
        {showProductPicker && (
          <div className="mb-4 bg-white border border-slate-200 rounded-lg p-2 max-h-40 overflow-y-auto">
            <div className="text-xs font-bold text-slate-700 mb-2 px-2 uppercase">Seleccionar Producto</div>
            {products.map(p => (
              <div key={p.id} onClick={() => onAddProductToQuote(p)} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                <img src={p.image} className="w-8 h-8 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{p.name}</div>
                  <div className="text-[10px] text-slate-500">${p.price.toLocaleString()}</div>
                </div>
                <i className="fa-solid fa-plus text-indigo-500"></i>
              </div>
            ))}
          </div>
        )}

        {/* Tax Options */}
        <div className="mb-4">
          <label className="text-xs text-slate-700 font-bold uppercase block mb-2">Impuestos</label>
          <div className="flex bg-slate-100 p-1 rounded-lg mb-3">
            {(['none', 'percentage', 'aiu'] as const).map(type => (
              <button key={type} type="button" onClick={() => onSetTaxType(type)}
                className={`flex-1 py-2 text-xs font-bold rounded transition ${taxType === type ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {type === 'none' ? 'No aplica' : type === 'percentage' ? 'Porcentaje' : 'AIU'}
              </button>
            ))}
          </div>
          {taxType === 'percentage' && (
            <div className="flex items-center gap-2">
              <input type="number" value={taxPercentage} onChange={(e) => onSetTaxPercentage(e.target.value)} placeholder="19" className="w-24 bg-white p-2 rounded border border-slate-200 text-sm" />
              <span className="text-sm text-slate-600">%</span>
            </div>
          )}
          {taxType === 'aiu' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <p className="font-semibold mb-2 text-xs text-blue-700">AIU (Administración, Imprevistos, Utilidad)</p>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px] text-blue-600 block mb-1">Administración (%)</label><input type="number" value={aiuAdmin} onChange={(e) => onSetAIUAdmin(e.target.value)} className="w-full bg-white p-2 rounded border border-blue-200 text-xs" step="0.1" min="0" /></div>
                <div><label className="text-[10px] text-blue-600 block mb-1">Imprevistos (%)</label><input type="number" value={aiuImprevistos} onChange={(e) => onSetAIUImprevistos(e.target.value)} className="w-full bg-white p-2 rounded border border-blue-200 text-xs" step="0.1" min="0" /></div>
                <div><label className="text-[10px] text-blue-600 block mb-1">Utilidad (%)</label><input type="number" value={aiuUtilidad} onChange={(e) => onSetAIUUtilidad(e.target.value)} className="w-full bg-white p-2 rounded border border-blue-200 text-xs" step="0.1" min="0" /></div>
                <div><label className="text-[10px] text-blue-600 block mb-1">IVA sobre Utilidad (%)</label><input type="number" value={aiuIva} onChange={(e) => onSetAIUIva(e.target.value)} className="w-full bg-white p-2 rounded border border-blue-200 text-xs" step="0.1" min="0" /></div>
              </div>
            </div>
          )}
        </div>

        {/* Total Summary */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4 space-y-2">
          <div className="flex justify-between text-sm text-slate-600"><span>Subtotal:</span><span>${subtotal.toLocaleString()}</span></div>
          {taxType !== 'none' && result.taxAmount > 0 && (
            <>
              {taxType === 'aiu' && result.breakdown && (
                <>
                  <div className="flex justify-between text-sm text-slate-600"><span>Administración ({aiuAdmin}%):</span><span>${result.breakdown.administracion.toLocaleString()}</span></div>
                  <div className="flex justify-between text-sm text-slate-600"><span>Imprevistos ({aiuImprevistos}%):</span><span>${result.breakdown.imprevistos.toLocaleString()}</span></div>
                  <div className="flex justify-between text-sm text-slate-600"><span>Utilidad ({aiuUtilidad}%):</span><span>${result.breakdown.utilidad.toLocaleString()}</span></div>
                  <div className="flex justify-between text-sm text-slate-600"><span>IVA sobre Utilidad ({aiuIva}%):</span><span>${result.breakdown.ivaUtilidad.toLocaleString()}</span></div>
                  <div className="flex justify-between text-sm font-semibold text-slate-700 border-t border-slate-200 pt-1 mt-1"><span>Total AIU:</span><span>${result.taxAmount.toLocaleString()}</span></div>
                </>
              )}
              {taxType === 'percentage' && (
                <div className="flex justify-between text-sm text-slate-600"><span>Impuesto ({taxPercentage}%):</span><span>${result.taxAmount.toLocaleString()}</span></div>
              )}
            </>
          )}
          <div className="flex justify-between text-sm font-bold text-slate-800 border-t border-slate-200 pt-2"><span>Total:</span><span>${result.total.toLocaleString()}</span></div>
        </div>

        <button onClick={onSend} className="w-full bg-teal-500 text-white py-3 rounded-lg font-bold shadow hover:bg-teal-600 transition">Enviar Cotización</button>
      </div>
    </ModalWrapper>
  );
});

QuoteModal.displayName = 'QuoteModal';
