/**
 * ChatFooter — input, attach menu, camera, send/mic button.
 */
import React, { useState, useCallback } from 'react';
import { ContactRole } from '../../types';

interface AttachMenuItem {
  icon: string;
  bg: string;
  shadow: string;
  label: string;
  action: () => void;
}

interface ChatFooterProps {
  contactRole: ContactRole;
  /** Quien mira es un cliente, no alguien que vende con Worky. Ver App.tsx. */
  esCliente?: boolean;
  contactPhone?: string;
  onSendMessage: (text: string) => void;
  onOpenQuote: () => void;
  onOpenCollection: () => void;
  onOpenInvoice: () => void;
  onOpenReceipt: () => void;
  onOpenExpense: () => void;
  onOpenProductPicker: () => void;
  onTriggerDocumentInput: () => void;
  onCameraCapture: () => void;
}

export const ChatFooter: React.FC<ChatFooterProps> = React.memo(({
  contactRole, esCliente = false, onSendMessage,
  onOpenQuote, onOpenCollection, onOpenInvoice, onOpenReceipt,
  onOpenExpense, onOpenProductPicker, onTriggerDocumentInput, onCameraCapture,
}) => {
  const [inputText, setInputText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const handleSend = useCallback(() => {
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  }, [inputText, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const getMenuItems = (): AttachMenuItem[] => {
    const archivo = { icon: 'fa-paperclip', bg: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/30', label: 'Archivo', action: onTriggerDocumentInput };

    // Un cliente solo necesita poder mandar cosas: el plano, la foto de la
    // medida, el PDF que le piden. Cotizar, cobrar y anotar gastos son
    // herramientas de quien vende, y ahí solo estorban.
    if (esCliente) return [archivo];

    // Con un proveedor no se cotiza: la cotización la manda el otro lado. Pero
    // esta rama la usa también el vendedor que le compra a SU proveedor, y ahí
    // el recibo y el gasto son justo lo que hace falta al pagarle.
    if (contactRole === 'supplier') {
      return [
        archivo,
        { icon: 'fa-receipt', bg: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/30', label: 'Recibo', action: onOpenReceipt },
        { icon: 'fa-money-bill-transfer', bg: 'from-rose-500 to-rose-600', shadow: 'shadow-rose-500/30', label: 'Registrar gasto', action: onOpenExpense },
      ];
    }
    return [
      { icon: 'fa-file-invoice-dollar', bg: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/30', label: 'Cotización', action: onOpenQuote },
      { icon: 'fa-hand-holding-dollar', bg: 'from-violet-500 to-violet-600', shadow: 'shadow-violet-500/30', label: 'Cuenta de Cobro', action: onOpenCollection },
      { icon: 'fa-file-invoice', bg: 'from-indigo-500 to-indigo-600', shadow: 'shadow-indigo-500/30', label: 'Factura', action: onOpenInvoice },
      { icon: 'fa-receipt', bg: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/30', label: 'Recibo', action: onOpenReceipt },
      { icon: 'fa-store', bg: 'from-cyan-500 to-cyan-600', shadow: 'shadow-cyan-500/30', label: 'Catálogo', action: onOpenProductPicker },
      { icon: 'fa-money-bill-transfer', bg: 'from-rose-500 to-rose-600', shadow: 'shadow-rose-500/30', label: 'Registrar gasto', action: onOpenExpense },
      { icon: 'fa-paperclip', bg: 'from-slate-500 to-slate-600', shadow: 'shadow-slate-500/20', label: 'Archivo', action: onTriggerDocumentInput },
    ];
  };

  return (
    <div className="min-h-[64px] px-3 py-2.5 flex items-center gap-2 z-20 border-t border-slate-200 bg-white">
      <div className="relative">
        <button
          onClick={() => setShowAttachMenu(!showAttachMenu)}
          className={`transition w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 ${showAttachMenu ? 'text-blue-600 rotate-45 bg-blue-50 border-blue-200' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          <i className="fa-solid fa-plus text-sm"></i>
        </button>

        {showAttachMenu && (
          <>
            <div
              className="fixed inset-0 bg-slate-900/30 z-40"
              onClick={() => setShowAttachMenu(false)}
            />
            <div className="absolute bottom-14 left-0 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 w-64 animate-scale-in origin-bottom-left">
              <div className="text-[13px] font-bold text-slate-900 mb-3">¿Qué querés enviar?</div>
              <div className="grid grid-cols-3 gap-3">
                {getMenuItems().map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    className="flex flex-col items-center gap-1.5"
                    onClick={() => { item.action(); setShowAttachMenu(false); }}
                  >
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.bg} text-white flex items-center justify-center shadow-md ${item.shadow}`}>
                      <i className={`fa-solid ${item.icon} text-lg`}></i>
                    </div>
                    <span className="text-[10.5px] font-medium text-slate-600 text-center leading-tight">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <input
        type="text"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribe un mensaje"
        className="flex-1 bg-slate-100 text-slate-900 text-sm rounded-full px-4 py-2.5 outline-none border border-transparent focus:bg-white focus:border-blue-500 transition placeholder-slate-400"
      />

      {/* Camera button */}
      <button onClick={onCameraCapture} className="text-slate-500 hover:text-slate-900 transition w-9 h-9 flex items-center justify-center" title="Cámara">
        <i className="fa-solid fa-camera text-base"></i>
      </button>

      {/* Clip/Attach button */}
      <button onClick={onTriggerDocumentInput} className="text-slate-500 hover:text-slate-900 transition w-9 h-9 flex items-center justify-center hidden sm:flex" title="Adjuntar archivo" type="button">
        <i className="fa-solid fa-paperclip text-base"></i>
      </button>

      {inputText ? (
        <button onClick={handleSend} className="text-white bg-blue-600 w-9 h-9 rounded-full flex items-center justify-center hover:bg-blue-700 transition flex-shrink-0">
          <i className="fa-solid fa-paper-plane text-sm"></i>
        </button>
      ) : (
        <button className="text-slate-500 hover:text-slate-900 transition w-9 h-9 flex items-center justify-center flex-shrink-0">
          <i className="fa-solid fa-microphone text-base"></i>
        </button>
      )}
    </div>
  );
});

ChatFooter.displayName = 'ChatFooter';
