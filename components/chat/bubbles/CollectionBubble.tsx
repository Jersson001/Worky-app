/**
 * Collection Account (Cuenta de Cobro) message bubble component.
 */
import React from 'react';
import { Message, ContactRole } from '../../../types';
import { formatCurrency } from '../../../utils/currency';

interface CollectionBubbleProps {
  msg: Message;
  contactRole?: ContactRole;
  copiedText: string | null;
  onView: () => void;
  onMarkPayment: () => void;
  onCopyPaymentInfo: (metadata: any) => void;
  onShowQR: (qrUrl: string, metadata: any) => void;
  onUpdateMessage: (messageId: string, metadata: any) => void;
}

export const CollectionBubble: React.FC<CollectionBubbleProps> = React.memo(({
  msg, contactRole, copiedText, onView, onMarkPayment, onCopyPaymentInfo, onShowQR, onUpdateMessage,
}) => {
  const meta = msg.metadata;
  if (!meta) return null;

  return (
    <div className="bg-white text-slate-800 p-3 rounded-xl mb-1 w-64 shadow-sm border border-slate-200 relative">
      {/* Status Badge */}
      <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shadow-sm ${
        msg.isPaid ? (meta.paymentConfirmed === true ? 'bg-emerald-500 text-white' : (msg.sender === 'me' ? 'bg-amber-400 text-amber-900 animate-pulse' : 'bg-emerald-500 text-white')) : 'bg-amber-400 text-amber-900'
      }`}>
        {msg.isPaid ? (meta.paymentConfirmed === true ? 'Pagada' : (msg.sender === 'me' ? 'Por Confirmar' : 'Pagada')) : 'Pendiente'}
      </div>

      <div className="flex justify-between items-center border-b border-orange-100 pb-2 mb-2 pr-16">
        <div>
          <span className="font-bold text-orange-600 text-[10px] uppercase">Cuenta de Cobro</span>
          <div className="text-[10px] text-slate-400">{meta.number}</div>
          {meta.projectName && <div className="text-xs text-slate-700 font-semibold mt-1">{meta.projectName}</div>}
        </div>
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-sm shadow-orange-500/30">
          <i className="fa-solid fa-file-invoice text-sm"></i>
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

      <div className="text-center mb-3">
        <div className="text-xs text-slate-500 mb-1">{meta.concept}</div>
        <div className="font-bold text-slate-900 text-lg mb-3">{formatCurrency(meta.amount)}</div>

        {/* QR Payment Section */}
        {!msg.isPaid && (
          <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-lg p-3 mb-2 shadow-sm">
            <div className="text-center">
              <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wider mb-2">Escanea para pagar</p>
              <div className="flex justify-center mb-2">
                <div
                  onClick={() => {
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent('https://ejemplo-pago.com')}`;
                    onShowQR(qrUrl, meta);
                  }}
                  className="cursor-pointer hover:scale-105 transition-transform"
                >
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://ejemplo-pago.com"
                    alt="QR Code"
                    className="w-24 h-24 rounded-lg shadow-md border-2 border-white"
                  />
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-[9px] text-slate-500 mb-2">
                {meta.bankName && <span className="font-semibold">{meta.bankName}</span>}
                {meta.accountNumber && (
                  <>
                    {meta.bankName && <span>•</span>}
                    <span className="font-semibold">{meta.accountNumber}</span>
                  </>
                )}
              </div>
              <button
                onClick={() => onCopyPaymentInfo(meta)}
                className="w-full bg-orange-600 text-white py-1.5 rounded-lg text-[10px] font-bold hover:bg-orange-700 transition flex items-center justify-center gap-1.5"
              >
                {copiedText === meta.number ? (
                  <><i className="fa-solid fa-check"></i> Copiado</>
                ) : (
                  <><i className="fa-solid fa-copy"></i> Copiar datos de pago</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={onView} className="flex-1 bg-orange-600 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-orange-700 transition">
          Ver
        </button>
        {!msg.isPaid ? (() => {
          const isPendingCollection = contactRole === 'client' && msg.sender === 'me';
          return (
            <button
              onClick={onMarkPayment}
              className="flex-1 bg-amber-500 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-amber-600 transition flex items-center justify-center gap-1"
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

CollectionBubble.displayName = 'CollectionBubble';
