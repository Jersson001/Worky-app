/**
 * Invoice message bubble component.
 */
import React from 'react';
import { Message, ContactRole } from '../../../types';
import { formatCurrency } from '../../../utils/currency';

interface InvoiceBubbleProps {
  msg: Message;
  contactRole?: ContactRole;
  onView: () => void;
  onMarkPayment: () => void;
  onUpdateMessage: (messageId: string, metadata: any) => void;
}

export const InvoiceBubble: React.FC<InvoiceBubbleProps> = React.memo(({ msg, contactRole, onView, onMarkPayment, onUpdateMessage }) => {
  const meta = msg.metadata;
  if (!meta) return null;

  return (
    <div className="bg-slate-700/50 backdrop-blur-sm text-slate-200 p-3 rounded-xl mb-1 overflow-hidden w-64 shadow-lg border border-slate-600/50 relative">
      {/* Status Badge */}
      <div className="absolute top-2 right-2 z-10">
        {msg.isPaid ? (
          meta.paymentConfirmed === true ? (
            <span className="bg-emerald-500 text-white text-[9px] font-bold uppercase px-2 py-1 rounded-full shadow-lg">
              Pagada
            </span>
          ) : (
            msg.sender === 'me' ? (
              <span className="bg-amber-500 text-amber-950 text-[9px] font-bold uppercase px-2 py-1 rounded-full shadow-lg animate-pulse">
                Por Confirmar
              </span>
            ) : (
              <span className="bg-emerald-500 text-white text-[9px] font-bold uppercase px-2 py-1 rounded-full shadow-lg">
                Pagada
              </span>
            )
          )
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
        meta.paymentConfirmed === true ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 mb-2 flex items-center gap-2 text-slate-800">
            <i className="fa-solid fa-circle-check text-emerald-600"></i>
            <div className="text-[10px] text-emerald-700">
              <span className="font-bold text-slate-800 block text-[9px] uppercase tracking-wider">
                PAGO CONFIRMADO
              </span>
              <span>{msg.paidDate ? new Date(msg.paidDate).toLocaleDateString() : ''}</span>
            </div>
          </div>
        ) : msg.sender === 'me' ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2 flex items-center gap-2 text-slate-800 animate-pulse">
            <i className="fa-solid fa-triangle-exclamation text-amber-600 animate-pulse"></i>
            <div className="text-[10px] text-amber-700 font-bold uppercase block text-[9px] tracking-wider">
              Pago por Confirmar
            </div>
          </div>
        ) : null
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
        {!msg.isPaid ? (() => {
          const isPendingCollection = contactRole === 'client' && msg.sender === 'me';
          return (
            <button
              onClick={onMarkPayment}
              className="flex-1 bg-amber-500 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-amber-600 transition flex items-center justify-center gap-2"
            >
              <i className={isPendingCollection ? "fa-solid fa-hand-holding-dollar" : "fa-solid fa-clock"}></i>
              {isPendingCollection ? 'Por Cobrar' : 'A Pagar'}
            </button>
          );
        })() : (
          meta.paymentConfirmed === true ? (
            <div className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20">
              <i className="fa-solid fa-check-circle"></i> Confirmado
            </div>
          ) : msg.sender === 'me' ? (
            <div className="flex-1 flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateMessage(msg.id, {
                    ...msg,
                    metadata: { ...meta, paymentConfirmed: true }
                  });
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 shadow-sm"
                title="Confirmar Pago"
              >
                <i className="fa-solid fa-check text-[11px]"></i> Confirmar
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateMessage(msg.id, {
                    ...msg,
                    isPaid: false,
                    paidDate: null,
                    metadata: { ...meta, paymentConfirmed: false }
                  });
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 shadow-sm"
                title="Rechazar Pago"
              >
                <i className="fa-solid fa-xmark text-[11px]"></i> Rechazar
              </button>
            </div>
          ) : (
            <div className="flex-1 bg-amber-500 text-white py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm animate-pulse">
              <i className="fa-solid fa-clock"></i> Por Confirmar
            </div>
          )
        )}
      </div>
    </div>
  );
});

InvoiceBubble.displayName = 'InvoiceBubble';
