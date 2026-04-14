/**
 * Invoice message bubble component.
 */
import React from 'react';
import { Message } from '../../../types';
import { formatCurrency } from '../../../utils/currency';

interface InvoiceBubbleProps {
  msg: Message;
  onView: () => void;
  onMarkPayment: () => void;
}

export const InvoiceBubble: React.FC<InvoiceBubbleProps> = React.memo(({ msg, onView, onMarkPayment }) => {
  const meta = msg.metadata;
  if (!meta) return null;

  return (
    <div className="bg-slate-700/50 backdrop-blur-sm text-slate-200 p-3 rounded-xl mb-1 overflow-hidden w-64 shadow-lg border border-slate-600/50 relative">
      {/* Status Badge */}
      <div className="absolute top-2 right-2 z-10">
        {msg.isPaid ? (
          <span className="bg-emerald-500 text-white text-[9px] font-bold uppercase px-2 py-1 rounded-full shadow-lg">
            Pagada
          </span>
        ) : (
          <span className="bg-amber-500 text-amber-950 text-[9px] font-bold uppercase px-2 py-1 rounded-full shadow-lg">
            Pendiente
          </span>
        )}
      </div>

      <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2 border-dashed">
        <div className="pr-16">
          <span className="font-bold text-indigo-600 text-[10px] tracking-widest block uppercase">Factura</span>
          <span className="text-[10px] text-slate-400 font-mono">{meta.number}</span>
          {meta.projectName && <div className="text-xs text-slate-700 font-semibold mt-1">{meta.projectName}</div>}
        </div>
        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
          <i className="fa-solid fa-file-invoice-dollar"></i>
        </div>
      </div>

      {msg.isPaid && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 mb-2 flex items-center gap-2">
          <i className="fa-solid fa-circle-check text-emerald-600"></i>
          <div className="text-[10px] text-emerald-700">
            <div className="font-bold">PAGADO</div>
            <div>{msg.paidDate ? new Date(msg.paidDate).toLocaleDateString() : ''}</div>
          </div>
        </div>
      )}

      <div className="text-xs space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
        <div className="text-slate-400 text-[10px] uppercase font-bold">Cliente: {meta.clientName}</div>
        {meta.items.map((item: any, idx: number) => (
          <div key={idx} className="flex justify-between border-b border-slate-50 pb-1">
            <span><span className="font-bold">{item.quantity}</span> x {item.description}</span>
            <span className="font-medium text-slate-600">${(item.price * item.quantity).toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 mt-3 pt-2 flex justify-between font-bold text-sm text-slate-900 mb-3">
        <span>Total</span>
        <span>{formatCurrency(meta.total)}</span>
      </div>

      <div className="flex gap-2">
        <button onClick={onView} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2">
          <i className="fa-solid fa-eye"></i> Ver
        </button>
        {!msg.isPaid ? (
          <button
            onClick={onMarkPayment}
            className="flex-1 bg-amber-500 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-amber-600 transition flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-clock"></i> Por Pagar
          </button>
        ) : (
          <div className="flex-1 bg-slate-100 text-slate-500 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed">
            <i className="fa-solid fa-paper-plane"></i> Comprobante Enviado
          </div>
        )}
      </div>
    </div>
  );
});

InvoiceBubble.displayName = 'InvoiceBubble';
