/**
 * PaymentConfirmModal — confirm payment on a document.
 */
import React from 'react';
import { formatCurrency } from '../../../utils/currency';

interface PaymentConfirmModalProps {
  show: boolean;
  pendingPayment: { id: string; type: string; metadata: any } | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const PaymentConfirmModal: React.FC<PaymentConfirmModalProps> = React.memo(({
  show, pendingPayment, onClose, onConfirm,
}) => {
  if (!show || !pendingPayment) return null;

  const getDocLabel = () => {
    switch (pendingPayment.type) {
      case 'invoice': return 'Factura';
      case 'collection_account': return 'Cuenta de Cobro';
      case 'receipt': return 'Recibo de Caja';
      default: return 'Documento';
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 relative border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition"
        >
          <i className="fa-solid fa-xmark text-sm"></i>
        </button>
        <h3 className="text-slate-900 font-bold text-lg mb-4 flex items-center gap-2.5 pr-8">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-circle-check text-sm"></i>
          </div>
          <span>Confirmar Pago</span>
        </h3>
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{getDocLabel()}</div>
            <div className="text-xs text-slate-400 mb-2">
              {pendingPayment.metadata?.number && `#${pendingPayment.metadata.number}`}
            </div>
            {pendingPayment.metadata?.amount && (
              <div className="text-xl font-bold text-slate-900">{formatCurrency(pendingPayment.metadata.amount)}</div>
            )}
            {pendingPayment.metadata?.total && (
              <div className="text-xl font-bold text-slate-900">{formatCurrency(pendingPayment.metadata.total)}</div>
            )}
          </div>
          <p className="text-sm font-medium text-slate-600 text-center">¿Confirmas que este documento ha sido pagado?</p>
          <div className="flex gap-2.5 pt-1">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/25 hover:shadow-xl transition active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-check"></i> Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

PaymentConfirmModal.displayName = 'PaymentConfirmModal';
