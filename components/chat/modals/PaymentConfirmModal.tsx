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
    <div className="absolute inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center">
          <i className="fa-solid fa-xmark"></i>
        </button>
        <h3 className="text-slate-800 font-bold text-lg mb-6 flex items-center gap-2">
          <i className="fa-solid fa-circle-check text-emerald-500"></i> Confirmar Pago
        </h3>
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-sm text-slate-600 mb-2">{getDocLabel()}</div>
            <div className="text-xs text-slate-400 mb-1">
              {pendingPayment.metadata?.number && `#${pendingPayment.metadata.number}`}
            </div>
            {pendingPayment.metadata?.amount && (
              <div className="text-lg font-bold text-slate-800">{formatCurrency(pendingPayment.metadata.amount)}</div>
            )}
            {pendingPayment.metadata?.total && (
              <div className="text-lg font-bold text-slate-800">{formatCurrency(pendingPayment.metadata.total)}</div>
            )}
          </div>
          <p className="text-sm text-slate-600 text-center">¿Confirmas que este documento ha sido pagado?</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-lg font-bold hover:bg-slate-300 transition">
              Cancelar
            </button>
            <button onClick={onConfirm} className="flex-1 bg-emerald-500 text-white py-3 rounded-lg font-bold hover:bg-emerald-600 transition flex items-center justify-center gap-2">
              <i className="fa-solid fa-check"></i> Confirmar Pago
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

PaymentConfirmModal.displayName = 'PaymentConfirmModal';
