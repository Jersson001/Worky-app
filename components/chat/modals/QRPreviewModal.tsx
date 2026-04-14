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
    <div className="absolute inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center z-10"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
        <div className="text-center">
          <h3 className="text-slate-800 font-bold text-lg mb-4 flex items-center justify-center gap-2">
            <i className="fa-solid fa-qrcode text-indigo-500"></i> Código QR de Pago
          </h3>
          <div className="bg-white p-4 rounded-xl mb-4 inline-block shadow-lg">
            <img src={qrData.qrUrl} alt="QR Code Preview" className="w-64 h-64 rounded-lg" />
          </div>
          {meta.bankName && (
            <div className="bg-slate-50 rounded-lg p-4 mb-4 text-left">
              <div className="text-xs text-slate-600 space-y-1">
                {meta.bankName && <div><span className="font-bold">Banco:</span> {meta.bankName}</div>}
                {meta.accountType && <div><span className="font-bold">Tipo:</span> {meta.accountType}</div>}
                {meta.accountNumber && <div><span className="font-bold">Cuenta:</span> {meta.accountNumber}</div>}
                {meta.holderName && <div><span className="font-bold">Titular:</span> {meta.holderName}</div>}
                {(meta.amount || meta.total) && (
                  <div><span className="font-bold">Monto:</span> {formatCurrency(meta.amount || meta.total || 0)}</div>
                )}
              </div>
            </div>
          )}
          <button
            onClick={() => onCopyPaymentInfo(meta)}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
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
