/**
 * QRPreviewModal — enlarged QR code preview with payment info.
 */
import React from 'react';
import { formatCurrency } from '../../../utils/currency';

interface QRPreviewModalProps {
  show: boolean;
  qrData: { qrUrl: string; metadata: any } | null;
  copiedText: string | null;
  onClose: () => void;
  onCopyPaymentInfo: (metadata: any) => void;
}

export const QRPreviewModal: React.FC<QRPreviewModalProps> = React.memo(({
  show, qrData, copiedText, onClose, onCopyPaymentInfo,
}) => {
  if (!show || !qrData) return null;

  const meta = qrData.metadata;

  return (
    <div className="absolute inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 relative border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center z-10 transition"
        >
          <i className="fa-solid fa-xmark text-sm"></i>
        </button>
        <div className="text-center">
          <h3 className="text-slate-900 font-bold text-lg mb-4 flex items-center justify-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <i className="fa-solid fa-qrcode text-sm"></i>
            </div>
            <span>Código QR de Pago</span>
          </h3>
          <div className="bg-white p-3 rounded-2xl mb-4 inline-block shadow-md border border-slate-200">
            <img src={qrData.qrUrl} alt="QR Code Preview" className="w-60 h-60 rounded-xl" />
          </div>
          {meta.bankName && (
            <div className="bg-slate-50 rounded-xl p-3.5 mb-4 text-left border border-slate-200">
              <div className="text-xs text-slate-700 space-y-1.5 font-medium">
                {meta.bankName && <div><span className="font-bold text-slate-900">Banco:</span> {meta.bankName}</div>}
                {meta.accountType && <div><span className="font-bold text-slate-900">Tipo:</span> {meta.accountType}</div>}
                {meta.accountNumber && <div><span className="font-bold text-slate-900">Cuenta:</span> {meta.accountNumber}</div>}
                {meta.holderName && <div><span className="font-bold text-slate-900">Titular:</span> {meta.holderName}</div>}
                {(meta.amount || meta.total) && (
                  <div className="pt-1 border-t border-slate-200 mt-1 font-bold text-slate-900">
                    <span>Monto:</span> {formatCurrency(meta.amount || meta.total || 0)}
                  </div>
                )}
              </div>
            </div>
          )}
          <button
            onClick={() => onCopyPaymentInfo(meta)}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/25 hover:shadow-xl transition active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {copiedText === meta.number ? (
              <><i className="fa-solid fa-check"></i> Copiado</>
            ) : (
              <><i className="fa-solid fa-copy"></i> Copiar datos de pago</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

QRPreviewModal.displayName = 'QRPreviewModal';
