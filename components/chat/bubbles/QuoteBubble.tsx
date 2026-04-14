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
    <div className={`bg-white text-slate-800 p-3 rounded-xl mb-1 w-64 shadow-sm border-2 ${meta.status === 'accepted' ? 'border-emerald-400' : 'border-slate-100'}`}>
      <div className="flex justify-between items-center border-b border-teal-100 pb-2 mb-2">
        <div className="flex-1">
          <span className="font-bold text-teal-600 text-[10px] uppercase block">
            Cotización
          </span>
          <div className="text-[10px] text-slate-400">{meta.number}</div>
          {meta.items?.[0]?.description && (
            <div className="text-xs text-slate-700 font-semibold mt-1">{meta.items[0].description}</div>
          )}
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${meta.status === 'accepted' ? 'bg-emerald-100 text-emerald-600' : 'bg-teal-50 text-teal-600'}`}>
          {meta.status === 'accepted' ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-file-contract"></i>}
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
      ) : msg.sender === 'me' ? (
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
