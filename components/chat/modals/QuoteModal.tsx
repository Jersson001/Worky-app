/**
 * QuoteModal — create and send a quote with tax options, images, and product picker.
 * Soporta dos modos: "Básica" (lista plana de ítems) y "Personalizada" (secciones
 * de carpintería con grupos/plantillas y cálculo automático, función Pro).
 */
import React, { useState } from 'react';
import { ModalWrapper } from './ModalWrapper';
import { DecimalInput } from './DecimalInput';
import { CurrencyInput } from './CurrencyInput';
import ProFeatureGuard from '../../ProFeatureGuard';
import { QuoteItem, Product, ContactRole, QuoteMode, CarpentrySection, CarpentryCategoryKey, CarpentryLineItem, CarpentryUnit } from '../../../types';
import { formatCurrency } from '../../../utils/currency';
import { leerImagenReducida } from '../../../utils/imagen';
import { calculateTax } from '../../../utils/taxCalculations';
import { CARPENTRY_CATEGORIES, CarpentryCategoryConfig, computeGrandTotal, computeSectionSubtotal, computeGroupSubtotal, computeLineSubtotal } from '../../../utils/carpentryCalculations';

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
  // Personalizada (carpintería) — función Pro
  isPro?: boolean;
  trialEndsAt?: string | null;
  mode: QuoteMode;
  sections: CarpentrySection[];
  onSetMode: (mode: QuoteMode) => void;
  onAddSection: (category: CarpentryCategoryKey) => void;
  onRemoveSection: (sectionId: string) => void;
  onAddCarpentryItem: (sectionId: string, groupId: string) => void;
  onUpdateCarpentryItem: (sectionId: string, groupId: string, itemId: string, field: keyof CarpentryLineItem, value: any) => void;
  onRemoveCarpentryItem: (sectionId: string, groupId: string, itemId: string) => void;
}

const UNIT_LABEL: Record<CarpentryUnit, string> = { ML: 'Metro lineal', M2: 'Metro cuadrado', UND: 'Unidad', GLOBAL: 'Global' };

const CarpentryItemRow: React.FC<{
  item: CarpentryLineItem;
  onUpdate: (field: keyof CarpentryLineItem, value: any) => void;
  onRemove: () => void;
  allowUnitChange?: boolean;
}> = ({ item, onUpdate, onRemove, allowUnitChange = true }) => {
  const subtotal = computeLineSubtotal(item);

  return (
    <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200/80 relative group">
      <button
        onClick={onRemove}
        className="absolute top-2.5 right-2.5 text-slate-300 hover:text-red-500 transition p-1"
      >
        <i className="fa-solid fa-trash text-xs"></i>
      </button>
      <input
        type="text"
        placeholder="Descripción del ítem..."
        value={item.description}
        onChange={e => onUpdate('description', e.target.value)}
        className="w-full bg-transparent text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none border-b border-transparent focus:border-slate-300 transition mb-2 pr-7"
      />
      <div className="flex flex-wrap gap-1.5 items-end">
        {allowUnitChange && (
          <div className="w-20">
            <label className="text-[9px] text-slate-400 font-semibold uppercase block mb-0.5">Unidad</label>
            <select
              value={item.unit}
              onChange={e => onUpdate('unit', e.target.value as CarpentryUnit)}
              className="w-full bg-slate-50 p-1.5 rounded-lg text-[11px] font-semibold text-slate-900 outline-none border border-slate-200 focus:border-blue-500 focus:bg-white transition"
            >
              {(Object.keys(UNIT_LABEL) as CarpentryUnit[]).map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        )}
        {item.unit === 'M2' && (
          <>
            <div className="w-16">
              <label className="text-[9px] text-slate-400 font-semibold uppercase block mb-0.5">Ancho</label>
              <DecimalInput
                value={item.width}
                onCommit={value => onUpdate('width', value)}
                className="w-full bg-slate-50 p-1.5 rounded-lg text-[11px] text-slate-900 outline-none border border-slate-200 focus:border-blue-500 focus:bg-white transition"
              />
            </div>
            <div className="w-16">
              <label className="text-[9px] text-slate-400 font-semibold uppercase block mb-0.5">Alto</label>
              <DecimalInput
                value={item.height}
                onCommit={value => onUpdate('height', value)}
                className="w-full bg-slate-50 p-1.5 rounded-lg text-[11px] text-slate-900 outline-none border border-slate-200 focus:border-blue-500 focus:bg-white transition"
              />
            </div>
            <div className="w-16">
              <label className="text-[9px] text-slate-400 font-semibold uppercase block mb-0.5">M²</label>
              <div className="w-full bg-slate-100 p-1.5 rounded-lg text-[11px] text-slate-600 font-bold text-center border border-slate-200">
                {(item.measure || 0).toFixed(2).replace('.', ',')}
              </div>
            </div>
          </>
        )}
        {item.unit === 'ML' && (
          <div className="w-16">
            <label className="text-[9px] text-slate-400 font-semibold uppercase block mb-0.5">ML</label>
            <DecimalInput
              value={item.measure}
              onCommit={value => onUpdate('measure', value)}
              className="w-full bg-slate-50 p-1.5 rounded-lg text-[11px] text-slate-900 outline-none border border-slate-200 focus:border-blue-500 focus:bg-white transition"
            />
          </div>
        )}
        <div className="w-14">
          <label className="text-[9px] text-slate-400 font-semibold uppercase block mb-0.5">Cant.</label>
          <input
            type="number"
            value={item.quantity}
            onChange={e => onUpdate('quantity', Number(e.target.value))}
            className="w-full bg-slate-50 p-1.5 rounded-lg text-[11px] text-slate-900 text-center outline-none border border-slate-200 focus:border-blue-500 focus:bg-white transition"
          />
        </div>
        <div className="flex-1 min-w-[90px]">
          <label className="text-[9px] text-slate-400 font-semibold uppercase block mb-0.5">Costo unitario</label>
          <CurrencyInput
            symbol
            value={item.unitCost}
            onCommit={raw => onUpdate('unitCost', raw === '' ? 0 : Number(raw))}
            placeholder="$0"
            className="w-full bg-slate-50 p-1.5 rounded-lg text-[11px] text-slate-900 outline-none border border-slate-200 focus:border-blue-500 focus:bg-white transition"
          />
        </div>
        <div className="w-24 text-right">
          <label className="text-[9px] text-slate-400 font-semibold uppercase block mb-0.5">Subtotal</label>
          <div className={`text-xs font-bold py-1.5 ${subtotal > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
            {formatCurrency(subtotal)}
          </div>
        </div>
      </div>
      {/* Image upload buttons */}
      <div className="mt-2.5">
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.multiple = true; input.capture = 'environment' as any; input.onchange = (e) => {
              const files = (e.target as HTMLInputElement).files;
              if (files) {
                // Se reducen al adjuntarlas: a tamaño original, tres fotos son unos
                // 20 MB dentro del mensaje, que luego se cargan en cada apertura del
                // chat y viajan en cada envío.
                void Promise.all(Array.from(files).map(leerImagenReducida)).then(reducidas => {
                  onUpdate('images', [...(item.images || []), ...reducidas.filter(Boolean)]);
                });
              }
            }; input.click(); }}
            className="flex-1 bg-purple-50 text-purple-700 py-2 rounded-lg border border-purple-200 text-xs font-bold hover:bg-purple-100 transition flex items-center justify-center gap-1.5"
          >
            <i className="fa-solid fa-camera"></i> Cámara
          </button>
          <button
            type="button"
            onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.multiple = true; input.onchange = (e) => {
              const files = (e.target as HTMLInputElement).files;
              if (files) {
                // Se reducen al adjuntarlas: a tamaño original, tres fotos son unos
                // 20 MB dentro del mensaje, que luego se cargan en cada apertura del
                // chat y viajan en cada envío.
                void Promise.all(Array.from(files).map(leerImagenReducida)).then(reducidas => {
                  onUpdate('images', [...(item.images || []), ...reducidas.filter(Boolean)]);
                });
              }
            }; input.click(); }}
            className="flex-1 bg-pink-50 text-pink-700 py-2 rounded-lg border border-pink-200 text-xs font-bold hover:bg-pink-100 transition flex items-center justify-center gap-1.5"
          >
            <i className="fa-solid fa-image"></i> Galería
          </button>
        </div>
        {item.images && item.images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {item.images.map((imageUrl, imgIdx) => (
              <div key={imgIdx} className="relative rounded-lg overflow-hidden border border-slate-200">
                <img src={imageUrl} className="w-full h-20 object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    const newImages = item.images!.filter((_, i) => i !== imgIdx);
                    onUpdate('images', newImages);
                  }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-red-600 shadow"
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-2.5">
        <label className="text-[9px] text-slate-400 font-semibold uppercase block mb-1">Comentarios (Opcional)</label>
        <textarea
          value={item.comments || ''}
          onChange={e => onUpdate('comments', e.target.value)}
          placeholder="Notas o especificaciones adicionales..."
          className="w-full bg-slate-50 p-2 rounded-lg text-xs text-slate-900 placeholder-slate-400 outline-none border border-slate-200 focus:border-blue-500 focus:bg-white transition resize-none"
          rows={3}
        />
      </div>
    </div>
  );
};

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
  isPro, trialEndsAt, mode, sections, onSetMode, onAddSection, onRemoveSection,
  onAddCarpentryItem, onUpdateCarpentryItem, onRemoveCarpentryItem,
}) => {
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  // grupos activos (toggle ON) dentro de secciones fixedGroups (Cocinas Integrales)
  const [activeGroups, setActiveGroups] = useState<Record<string, boolean>>({});
  // grupos expandidos (muestran ítems) — solo para grupos activos
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Al elegir una categoría, abrir su panel de una vez: es lo que el usuario
  // va a editar. onAddSection no devuelve el id, así que se detecta la que entró.
  const sectionCount = React.useRef(sections.length);
  React.useEffect(() => {
    if (sections.length > sectionCount.current) {
      setExpandedSectionId(sections[sections.length - 1].id);
    }
    sectionCount.current = sections.length;
  }, [sections]);

  const editingSection = sections.find(s => s.id === expandedSectionId) ?? null;

  const toggleGroupActive = (groupId: string) => {
    setActiveGroups(prev => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      // si se desactiva, también colapsar
      if (!next[groupId]) setExpandedGroups(eg => ({ ...eg, [groupId]: false }));
      else setExpandedGroups(eg => ({ ...eg, [groupId]: true })); // activar = expandir
      return next;
    });
  };

  const basicaSubtotal = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const personalizadaSubtotal = computeGrandTotal(sections);
  const subtotal = mode === 'personalizada' ? personalizadaSubtotal : basicaSubtotal;

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
  const canSend = mode === 'personalizada' ? personalizadaSubtotal > 0 : items.some(i => i.description && i.price > 0);

  /**
   * Cuerpo editable de una sección. Se renderiza en el panel flotante, no
   * en la lista, para no editar dentro de un carril estrecho que además
   * comparte scroll con el resto del formulario.
   */
  const renderSectionBody = (section: CarpentrySection, config: CarpentryCategoryConfig) => (
                        <div className="px-3 pb-3 pt-2 space-y-2 bg-slate-100">
                          {section.groups.map(group => {
                            const groupSubtotal = computeGroupSubtotal(group);
                            const isFixed = config.fixedGroups;
                            const isActive = isFixed ? !!activeGroups[group.id] : true;
                            const isGroupExpanded = isFixed ? !!expandedGroups[group.id] : true;

                            if (isFixed) {
                              // ── Toggle button mode (Cocinas Integrales) ──
                              return (
                                <div key={group.id} className="rounded-xl overflow-hidden border border-slate-200">
                                  {/* Toggle header */}
                                  <div
                                    className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors ${
                                      isActive
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-slate-500 hover:bg-slate-50'
                                    }`}
                                    onClick={() => toggleGroupActive(group.id)}
                                  >
                                    {/* Toggle pill */}
                                    <div className={`w-9 h-5 rounded-full flex-shrink-0 flex items-center px-0.5 transition-colors ${
                                      isActive ? 'bg-white/30' : 'bg-slate-200'
                                    }`}>
                                      <div className={`w-4 h-4 rounded-full shadow transition-all ${
                                        isActive ? 'translate-x-4 bg-white' : 'translate-x-0 bg-white'
                                      }`} />
                                    </div>
                                    <span className={`flex-1 text-xs font-bold uppercase tracking-wide ${
                                      isActive ? 'text-white' : 'text-slate-600'
                                    }`}>{group.label}</span>
                                    {isActive && groupSubtotal > 0 && (
                                      <span className="text-[10px] font-semibold text-white/80">{formatCurrency(groupSubtotal)}</span>
                                    )}
                                    {isActive && (
                                      <button
                                        onClick={e => { e.stopPropagation(); setExpandedGroups(eg => ({ ...eg, [group.id]: !eg[group.id] })); }}
                                        className="ml-1 text-white/70 hover:text-white transition"
                                      >
                                        <i className={`fa-solid fa-chevron-down text-xs transition-transform ${isGroupExpanded ? 'rotate-180' : ''}`} />
                                      </button>
                                    )}
                                  </div>

                                  {/* Items — solo si activo y expandido */}
                                  {isActive && isGroupExpanded && (
                                    <div className="bg-slate-50 p-2.5 space-y-2">
                                      {group.items.map(item => {
                                        const subtotal = computeLineSubtotal(item);
                                        const isTemplate = !!item.isTemplate;
                                        return (
                                          <div key={item.id} className="bg-white p-2.5 rounded-lg shadow-sm relative">
                                            <button
                                              onClick={() => onRemoveCarpentryItem(section.id, group.id, item.id)}
                                              className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition"
                                            >
                                              <i className="fa-solid fa-trash text-xs" />
                                            </button>
                                            {/* Description */}
                                            <input
                                              type="text"
                                              value={isTemplate ? '' : item.description}
                                              placeholder={isTemplate ? item.description : 'Nombre del ítem...'}
                                              onChange={e => {
                                                if (isTemplate) onUpdateCarpentryItem(section.id, group.id, item.id, 'isTemplate', false);
                                                onUpdateCarpentryItem(section.id, group.id, item.id, 'description', e.target.value);
                                              }}
                                              className={`w-full bg-transparent text-xs font-semibold mb-1.5 pr-6 outline-none border-b border-transparent focus:border-slate-300 transition ${
                                                isTemplate ? 'text-slate-900 placeholder-slate-900' : 'text-slate-700 placeholder-slate-400'
                                              }`}
                                            />
                                            <div className="flex flex-wrap gap-1.5 items-end">
                                              {item.unit === 'ML' && (
                                                <div className="w-16">
                                                  <label className="text-[9px] text-slate-400 font-semibold uppercase block mb-0.5">ML</label>
                                                  <DecimalInput
                                                    value={isTemplate ? undefined : item.measure}
                                                    placeholder={isTemplate ? String(item.measure ?? '') : undefined}
                                                    onCommit={value => {
                                                      onUpdateCarpentryItem(section.id, group.id, item.id, 'isTemplate', false);
                                                      onUpdateCarpentryItem(section.id, group.id, item.id, 'measure', value);
                                                    }}
                                                    className={`w-full bg-slate-50 p-1.5 rounded-lg text-[11px] outline-none border border-slate-200 ${
                                                      isTemplate ? 'text-slate-300 placeholder-slate-300' : 'text-slate-900'
                                                    }`}
                                                  />
                                                </div>
                                              )}
                                              <div className="w-14">
                                                <label className="text-[9px] text-slate-400 font-semibold uppercase block mb-0.5">Cant.</label>
                                                <input
                                                  type="number"
                                                  value={isTemplate ? '' : item.quantity}
                                                  placeholder={isTemplate ? String(item.quantity) : undefined}
                                                  onChange={e => {
                                                    onUpdateCarpentryItem(section.id, group.id, item.id, 'isTemplate', false);
                                                    onUpdateCarpentryItem(section.id, group.id, item.id, 'quantity', Number(e.target.value));
                                                  }}
                                                  className={`w-full bg-slate-50 p-1.5 rounded-lg text-[11px] text-center outline-none border border-slate-200 ${
                                                    isTemplate ? 'text-slate-300 placeholder-slate-300' : 'text-slate-900'
                                                  }`}
                                                />
                                              </div>
                                              <div className="flex-1 min-w-[90px]">
                                                <label className="text-[9px] text-slate-400 font-semibold uppercase block mb-0.5">Costo unitario</label>
                                                <CurrencyInput
                                                  symbol
                                                  value={isTemplate ? undefined : item.unitCost}
                                                  onCommit={raw => {
                                                    // Al editar, quitar flag de plantilla
                                                    onUpdateCarpentryItem(section.id, group.id, item.id, 'isTemplate', false);
                                                    onUpdateCarpentryItem(section.id, group.id, item.id, 'unitCost', raw === '' ? 0 : Number(raw));
                                                  }}
                                                  placeholder="$0"
                                                  className={`w-full bg-slate-50 p-1.5 rounded-lg text-[11px] outline-none border border-slate-200 ${
                                                    isTemplate || !item.unitCost ? 'text-slate-400 placeholder-slate-400' : 'text-slate-900'
                                                  }`}
                                                />
                                              </div>
                                              <div className="w-24 text-right">
                                                <label className="text-[9px] text-slate-400 font-semibold uppercase block mb-0.5">Subtotal</label>
                                                <div className={`text-xs font-bold py-1.5 ${
                                                  subtotal > 0 ? 'text-slate-900' : 'text-slate-400'
                                                }`}>
                                                  {formatCurrency(subtotal)}
                                                </div>
                                              </div>
                                            </div>
                                            {/* Image upload buttons */}
                                            <div className="mt-2.5">
                                              <div className="flex items-center gap-2 mb-2">
                                                <button
                                                  type="button"
                                                  onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.multiple = true; input.capture = 'environment' as any; input.onchange = (e) => {
                                                    const files = (e.target as HTMLInputElement).files;
                                                    if (files) {
                                                      // Reducidas al adjuntar: ver utils/imagen.
                                                      void Promise.all(Array.from(files).map(leerImagenReducida)).then(reducidas => {
                                                        onUpdateCarpentryItem(section.id, group.id, item.id, 'images',
                                                          [...(item.images || []), ...reducidas.filter(Boolean)]);
                                                      });
                                                    }
                                                  }; input.click(); }}
                                                  className="flex-1 bg-purple-50 text-purple-700 py-2 rounded-lg border border-purple-200 text-xs font-bold hover:bg-purple-100 transition flex items-center justify-center gap-1.5"
                                                >
                                                  <i className="fa-solid fa-camera"></i> Cámara
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.multiple = true; input.onchange = (e) => {
                                                    const files = (e.target as HTMLInputElement).files;
                                                    if (files) {
                                                      // Reducidas al adjuntar: ver utils/imagen.
                                                      void Promise.all(Array.from(files).map(leerImagenReducida)).then(reducidas => {
                                                        onUpdateCarpentryItem(section.id, group.id, item.id, 'images',
                                                          [...(item.images || []), ...reducidas.filter(Boolean)]);
                                                      });
                                                    }
                                                  }; input.click(); }}
                                                  className="flex-1 bg-pink-50 text-pink-700 py-2 rounded-lg border border-pink-200 text-xs font-bold hover:bg-pink-100 transition flex items-center justify-center gap-1.5"
                                                >
                                                  <i className="fa-solid fa-image"></i> Galería
                                                </button>
                                              </div>
                                              {item.images && item.images.length > 0 && (
                                                <div className="grid grid-cols-3 gap-2 mt-2">
                                                  {item.images.map((imageUrl, imgIdx) => (
                                                    <div key={imgIdx} className="relative rounded-lg overflow-hidden border border-slate-200">
                                                      <img src={imageUrl} className="w-full h-20 object-cover" />
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          const newImages = item.images!.filter((_, i) => i !== imgIdx);
                                                          onUpdateCarpentryItem(section.id, group.id, item.id, 'images', newImages);
                                                        }}
                                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-red-600 shadow"
                                                      >
                                                        <i className="fa-solid fa-times"></i>
                                                      </button>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                              <div className="mt-2.5">
                                                <label className="text-[9px] text-slate-400 font-semibold uppercase block mb-1">Comentarios</label>
                                                <textarea
                                                  value={item.comments || ''}
                                                  onChange={e => onUpdateCarpentryItem(section.id, group.id, item.id, 'comments', e.target.value)}
                                                  placeholder="Notas o especificaciones..."
                                                  className="w-full bg-slate-50 p-2 rounded-lg text-xs text-slate-900 placeholder-slate-400 outline-none border border-slate-200 focus:border-blue-500 focus:bg-white transition resize-none"
                                                  rows={2}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                      <button
                                        type="button"
                                        onClick={() => onAddCarpentryItem(section.id, group.id)}
                                        className="w-full py-2 bg-white text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 border border-dashed border-slate-300 transition flex items-center justify-center gap-1.5"
                                      >
                                        <i className="fa-solid fa-plus text-xs" /> Agregar Ítem
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            // ── Modo normal (otras categorías) ──
                            return (
                              <div key={group.id}>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{group.label}</span>
                                  <span className="text-[10px] font-semibold text-slate-600">{formatCurrency(groupSubtotal)}</span>
                                </div>
                                <div className="space-y-1.5">
                                  {group.items.map(item => (
                                    <CarpentryItemRow
                                      key={item.id}
                                      item={item}
                                      allowUnitChange={!config.fixedGroups}
                                      onUpdate={(field, value) => onUpdateCarpentryItem(section.id, group.id, item.id, field, value)}
                                      onRemove={() => onRemoveCarpentryItem(section.id, group.id, item.id)}
                                    />
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onAddCarpentryItem(section.id, group.id)}
                                  className="mt-2 w-full py-2 bg-white text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 border border-dashed border-slate-300 transition flex items-center justify-center gap-1.5"
                                >
                                  <i className="fa-solid fa-plus text-xs"></i> Agregar Ítem
                                </button>
                              </div>
                            );
                          })}
                        </div>
  );

  /** Panel flotante de edición: ocupa todo el modal mientras se arma la sección. */
  const sectionEditor = editingSection && (() => {
    const config = CARPENTRY_CATEGORIES.find(c => c.key === editingSection.category)!;
    return (
      <div className="absolute inset-0 z-10 flex flex-col bg-slate-100 rounded-2xl overflow-hidden animate-fade-in">
        <div className={`flex items-center gap-2.5 p-3.5 flex-shrink-0 bg-gradient-to-r ${config.colorFrom} ${config.colorTo}`}>
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <i className={`${config.icon} text-xs text-white`}></i>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold truncate text-white">{editingSection.name}</div>
            <div className="text-[10px] font-semibold text-white/70">{formatCurrency(computeSectionSubtotal(editingSection))}</div>
          </div>
          <button
            type="button"
            onClick={() => setExpandedSectionId(null)}
            className="text-white/70 hover:text-white transition p-1"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {renderSectionBody(editingSection, config)}
        </div>

        <div className="p-3 flex-shrink-0 bg-white border-t border-slate-200">
          <button
            type="button"
            onClick={() => setExpandedSectionId(null)}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/25 hover:shadow-xl transition active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-check"></i> Listo
          </button>
        </div>
      </div>
    );
  })();

  return (
    <ModalWrapper
      show={show}
      onClose={onClose}
      title={title}
      icon="fa-file-invoice-dollar"
      iconColor="text-blue-600"
      overlay={sectionEditor}
    >
      {/* Mode tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
        <button
          type="button"
          onClick={() => onSetMode('basica')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${mode === 'basica' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Básica
        </button>
        <button
          type="button"
          onClick={() => onSetMode('personalizada')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${mode === 'personalizada' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Personalizada
          {!isPro && <i className="fa-solid fa-crown text-amber-500 text-[10px]"></i>}
        </button>
      </div>

      <div className="space-y-4">
        {/* Validity */}
        <div>
          <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Vigencia (Días)</label>
          <select
            value={validDays}
            onChange={e => onSetValidDays(e.target.value)}
            className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
          >
            <option value="7" className="text-slate-900 bg-white">7 Días</option>
            <option value="15" className="text-slate-900 bg-white">15 Días</option>
            <option value="30" className="text-slate-900 bg-white">30 Días</option>
          </select>
        </div>

        {/* Client data */}
        <div>
          <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Datos del Cliente (Opcional)</label>
          <input
            type="text"
            value={clientAddress}
            onChange={(e) => onSetClientAddress(e.target.value)}
            placeholder="Dirección del cliente"
            className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 placeholder-slate-400 mb-2 outline-none focus:border-blue-500 focus:bg-white transition"
          />
          <input
            type="tel"
            value={clientPhone}
            onChange={(e) => onSetClientPhone(e.target.value)}
            placeholder="Teléfono del cliente"
            className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition"
          />
        </div>

        {mode === 'basica' ? (
          <>
            {/* Items */}
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
                    placeholder="Producto o servicio..."
                    value={item.description}
                    onChange={e => onUpdateItem(idx, 'description', e.target.value)}
                    className="w-full bg-white p-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 font-semibold placeholder-slate-400 mb-2 pr-8 outline-none focus:border-blue-500 transition"
                  />
                  <div className="flex gap-2">
                    <div className="w-20">
                      <input
                        type="number"
                        placeholder="Cant."
                        value={item.quantity}
                        onChange={e => onUpdateItem(idx, 'quantity', Number(e.target.value))}
                        className="w-full bg-white p-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 font-semibold text-center placeholder-slate-400 outline-none focus:border-blue-500 transition"
                      />
                    </div>
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-semibold">$</span>
                      <CurrencyInput
                        placeholder="Precio Unit."
                        value={item.price}
                        onCommit={raw => onUpdateItemPrice(idx, raw)}
                        className="w-full bg-white p-2.5 pl-7 rounded-xl border border-slate-200 text-sm text-slate-900 font-semibold placeholder-slate-400 outline-none focus:border-blue-500 transition"
                      />
                    </div>
                  </div>
                  {/* Image upload buttons */}
                  <div className="mt-2.5">
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.multiple = true; input.capture = 'environment' as any; input.onchange = (e) => onImageUpload(e as any, idx); input.click(); }}
                        className="flex-1 bg-purple-50 text-purple-700 py-2 rounded-lg border border-purple-200 text-xs font-bold hover:bg-purple-100 transition flex items-center justify-center gap-1.5"
                      >
                        <i className="fa-solid fa-camera"></i> Cámara
                      </button>
                      <button
                        type="button"
                        onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.multiple = true; input.onchange = (e) => onImageUpload(e as any, idx); input.click(); }}
                        className="flex-1 bg-pink-50 text-pink-700 py-2 rounded-lg border border-pink-200 text-xs font-bold hover:bg-pink-100 transition flex items-center justify-center gap-1.5"
                      >
                        <i className="fa-solid fa-image"></i> Galería
                      </button>
                    </div>
                    {item.images && item.images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {item.images.map((imageUrl, imgIdx) => (
                          <div key={imgIdx} className="relative rounded-lg overflow-hidden border border-slate-200">
                            <img src={imageUrl} className="w-full h-20 object-cover" />
                            <button
                              type="button"
                              onClick={() => onRemoveImage(idx, imgIdx)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-red-600 shadow"
                            >
                              <i className="fa-solid fa-times"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {(!item.images || item.images.length === 0) && item.image && (
                      <div className="relative inline-block mt-2 rounded-lg overflow-hidden border border-slate-200">
                        <img src={item.image} className="w-full h-20 object-cover" />
                        <button
                          type="button"
                          onClick={() => onUpdateItemImage(idx, '')}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-red-600 shadow"
                        >
                          <i className="fa-solid fa-times"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add item buttons */}
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={onAddItem}
                className="flex-1 py-2.5 bg-white text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 border border-dashed border-slate-300 transition flex items-center justify-center gap-1.5"
              >
                <i className="fa-solid fa-plus text-xs"></i> Ítem Vacío
              </button>
              <button
                type="button"
                onClick={() => onShowProductPicker(true)}
                className="flex-1 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 border border-blue-200 transition flex items-center justify-center gap-1.5"
              >
                <i className="fa-solid fa-box text-xs"></i> Catálogo
              </button>
            </div>

            {/* Product picker */}
            {showProductPicker && (
              <div className="mb-4 bg-white border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                <div className="text-xs font-bold text-slate-700 mb-2 uppercase">Seleccionar Producto</div>
                {products.length > 0 ? (
                  products.map(p => (
                    <div key={p.id} onClick={() => onAddProductToQuote(p)} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                      <img src={p.image} className="w-8 h-8 rounded object-cover" alt={p.name} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate">{p.name}</div>
                        <div className="text-[10px] text-slate-500">{formatCurrency(p.price)}</div>
                      </div>
                      <i className="fa-solid fa-plus text-indigo-500"></i>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-slate-400 text-xs italic">
                    No hay productos en el catálogo. Agrega productos desde la sección de Catálogo.
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <ProFeatureGuard isPro={isPro} trialEndsAt={trialEndsAt}>
            <div className="mb-4">
              {/* Category picker */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {CARPENTRY_CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => { onAddSection(cat.key); }}
                    className="bg-white p-2.5 rounded-xl shadow-sm hover:shadow-md transition flex flex-col items-center gap-1.5"
                  >
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${cat.colorFrom} ${cat.colorTo} flex items-center justify-center text-white shadow-sm ${cat.shadowColor}`}>
                      <i className={`${cat.icon} text-sm`}></i>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-700 text-center leading-tight">{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Added sections */}
              <div className="space-y-3">
                {sections.map(section => {
                  const config = CARPENTRY_CATEGORIES.find(c => c.key === section.category)!;
                  const sectionSubtotal = computeSectionSubtotal(section);
                  const itemCount = section.groups.reduce((n, g) => n + g.items.filter(i => !i.isTemplate).length, 0);
                  return (
                    <div
                      key={section.id}
                      onClick={() => setExpandedSectionId(section.id)}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors duration-200"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${config.colorFrom} ${config.colorTo}`}>
                        <i className={`${config.icon} text-xs text-white`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate text-slate-900">{section.name}</div>
                        <div className="text-[10px] font-semibold text-slate-500">
                          {formatCurrency(sectionSubtotal)}
                          {itemCount > 0 && <span className="text-slate-400"> · {itemCount} ítem{itemCount === 1 ? '' : 's'}</span>}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemoveSection(section.id); }}
                        className="transition p-1 text-slate-400 hover:text-red-500"
                      >
                        <i className="fa-solid fa-trash text-xs"></i>
                      </button>
                      <i className="fa-solid fa-pen-to-square text-xs text-slate-400"></i>
                    </div>
                  );
                })}
              </div>

              {sections.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Elige una categoría arriba para empezar a armar la cotización.
                </div>
              )}
            </div>
          </ProFeatureGuard>
        )}

        {/* Tax Options */}
        <div className="mb-4">
          <label className="text-xs text-slate-700 font-bold uppercase mb-2 block tracking-wide">Impuestos</label>
          <div className="flex bg-slate-100 p-1 rounded-xl mb-3">
            {(['none', 'percentage', 'aiu'] as const).map(type => (
              <button key={type} type="button" onClick={() => onSetTaxType(type)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${taxType === type ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {type === 'none' ? 'No aplica' : type === 'percentage' ? 'Porcentaje' : 'AIU'}
              </button>
            ))}
          </div>
          {taxType === 'percentage' && (
            <div className="flex items-center gap-2">
              <input type="number" value={taxPercentage} onChange={(e) => onSetTaxPercentage(e.target.value)} placeholder="19" className="w-24 bg-white p-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500" />
              <span className="text-sm font-bold text-slate-600">%</span>
            </div>
          )}
          {taxType === 'aiu' && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-2">
              <p className="font-bold mb-2 text-xs text-blue-800">AIU (Administración, Imprevistos, Utilidad)</p>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px] text-blue-700 font-semibold block mb-1">Administración (%)</label><input type="number" value={aiuAdmin} onChange={(e) => onSetAIUAdmin(e.target.value)} className="w-full bg-white p-2 rounded-lg border border-blue-200 text-xs font-semibold text-slate-900" step="0.1" min="0" /></div>
                <div><label className="text-[10px] text-blue-700 font-semibold block mb-1">Imprevistos (%)</label><input type="number" value={aiuImprevistos} onChange={(e) => onSetAIUImprevistos(e.target.value)} className="w-full bg-white p-2 rounded-lg border border-blue-200 text-xs font-semibold text-slate-900" step="0.1" min="0" /></div>
                <div><label className="text-[10px] text-blue-700 font-semibold block mb-1">Utilidad (%)</label><input type="number" value={aiuUtilidad} onChange={(e) => onSetAIUUtilidad(e.target.value)} className="w-full bg-white p-2 rounded-lg border border-blue-200 text-xs font-semibold text-slate-900" step="0.1" min="0" /></div>
                <div><label className="text-[10px] text-blue-700 font-semibold block mb-1">IVA sobre Utilidad (%)</label><input type="number" value={aiuIva} onChange={(e) => onSetAIUIva(e.target.value)} className="w-full bg-white p-2 rounded-lg border border-blue-200 text-xs font-semibold text-slate-900" step="0.1" min="0" /></div>
              </div>
            </div>
          )}
        </div>

        {/* Total Summary */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-4 space-y-2">
          <div className="flex justify-between text-xs text-slate-600 font-semibold"><span>Subtotal:</span><span>{formatCurrency(subtotal)}</span></div>
          {taxType !== 'none' && result.taxAmount > 0 && (
            <>
              {taxType === 'aiu' && result.breakdown && (
                <>
                  <div className="flex justify-between text-[11px] text-slate-500"><span>Administración ({aiuAdmin}%):</span><span>{formatCurrency(result.breakdown.administracion)}</span></div>
                  <div className="flex justify-between text-[11px] text-slate-500"><span>Imprevistos ({aiuImprevistos}%):</span><span>{formatCurrency(result.breakdown.imprevistos)}</span></div>
                  <div className="flex justify-between text-[11px] text-slate-500"><span>Utilidad ({aiuUtilidad}%):</span><span>{formatCurrency(result.breakdown.utilidad)}</span></div>
                  <div className="flex justify-between text-[11px] text-slate-500"><span>IVA sobre Utilidad ({aiuIva}%):</span><span>{formatCurrency(result.breakdown.ivaUtilidad)}</span></div>
                  <div className="flex justify-between text-xs font-bold text-blue-700 border-t border-slate-200 pt-1 mt-1"><span>Total AIU:</span><span>{formatCurrency(result.taxAmount)}</span></div>
                </>
              )}
              {taxType === 'percentage' && (
                <div className="flex justify-between text-xs text-slate-600 font-semibold"><span>Impuesto ({taxPercentage}%):</span><span>{formatCurrency(result.taxAmount)}</span></div>
              )}
            </>
          )}
          <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2"><span>Total:</span><span className="text-blue-600">{formatCurrency(result.total)}</span></div>
        </div>

        <button
          onClick={onSend}
          disabled={!canSend}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/25 hover:shadow-xl transition active:scale-[0.99] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-paper-plane"></i> {contactRole === 'supplier' ? 'Enviar Cotización' : 'Crear Cotización'}
        </button>
      </div>
    </ModalWrapper>
  );
});

QuoteModal.displayName = 'QuoteModal';
