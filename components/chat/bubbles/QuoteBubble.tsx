/**
 * Quote message bubble component.
 */
import React from 'react';
import { Message } from '../../../types';
import { formatCurrency } from '../../../utils/currency';

interface QuoteBubbleProps {
  msg: Message;
  onView: () => void;
  onUpdateMessage: (messageId: string, metadata: any) => void;
}

export const QuoteBubble: React.FC<QuoteBubbleProps> = React.memo(({ msg, onView, onUpdateMessage }) => {
  const meta = msg.metadata;
  if (!meta) return null;

  return (
    <div className={`bg-white text-slate-800 p-3.5 rounded-xl mb-1 w-64 border ${meta.status === 'accepted' ? 'border-emerald-300' : 'border-slate-200'}`}>
      <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 mb-2.5">
        <div className="flex-1">
          <span className="font-bold text-slate-900 text-[13px] block">
            Cotización {meta.number ? `#${meta.number}` : ''}
          </span>
          {meta.mode === 'personalizada' && meta.sections?.length ? (
            <div className="text-xs text-slate-500 mt-0.5 truncate">
              Cotización personalizada · {meta.sections.length} {meta.sections.length === 1 ? 'sección' : 'secciones'}
            </div>
          ) : meta.items?.[0]?.description && (
            <div className="text-xs text-slate-500 mt-0.5 truncate">{meta.items[0].description}</div>
          )}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ml-2 text-white shadow-sm ${meta.status === 'accepted' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30' : 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30'}`}>
          {meta.status === 'accepted' ? <i className="fa-solid fa-check text-sm"></i> : <i className="fa-solid fa-file-invoice-dollar text-sm"></i>}
        </div>
      </div>

      <div className="font-bold text-center text-slate-900 text-lg mb-3">{formatCurrency(meta.total)}</div>
      <div className="text-[10px] text-center text-slate-400 mb-3">
        Válido hasta: {new Date(meta.validUntil).toLocaleDateString()}
      </div>

      <button onClick={onView} className="w-full bg-slate-100 text-slate-600 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition mb-2">
        Ver Detalle
      </button>

      {/* Status Actions */}
      {meta.status === 'accepted' ? (
        <div className="w-full bg-emerald-50 text-emerald-700 py-2 rounded-lg text-xs font-bold border border-emerald-100 flex items-center justify-center gap-1">
          <i className="fa-solid fa-check-circle"></i> Aprobada & Proyecto Creado
        </div>
      ) : meta.status === 'rejected' ? (
        <div className="w-full bg-rose-50 text-rose-700 py-2 rounded-lg text-xs font-bold border border-rose-100 flex items-center justify-center gap-1">
          <i className="fa-solid fa-circle-xmark"></i> Rechazada
        </div>
      ) : msg.sender !== 'me' ? (
        <div className="flex gap-2">
          <button
            onClick={() => onUpdateMessage(msg.id, { metadata: { ...meta, status: 'rejected', approved: false } })}
            className="flex-1 bg-rose-50 text-rose-600 hover:bg-rose-100 py-2 rounded-lg text-xs font-bold transition border border-rose-100"
          >
            Rechazar
          </button>
          <button
            onClick={() => onUpdateMessage(msg.id, { metadata: { ...meta, status: 'accepted', approved: true } })}
            className="flex-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 py-2 rounded-lg text-xs font-bold transition border border-emerald-100"
          >
            Aprobar
          </button>
        </div>
      ) : (
        <div className="w-full bg-slate-50 text-slate-500 py-2 rounded-lg text-xs font-bold border border-slate-100 flex items-center justify-center gap-1">
          <i className="fa-solid fa-clock"></i> Pendiente de Aprobación
        </div>
      )}
    </div>
  );
});

QuoteBubble.displayName = 'QuoteBubble';
