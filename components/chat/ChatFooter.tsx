/**
 * ChatFooter — input, attach menu, camera, send/mic button.
 */
import React, { useState, useCallback } from 'react';
import { ContactRole } from '../../types';

interface AttachMenuItem {
  icon: string;
  color: string;
  label: string;
  action: () => void;
}

interface ChatFooterProps {
  contactRole: ContactRole;
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
  contactRole, onSendMessage,
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
    if (contactRole === 'supplier') {
      return [
        { icon: 'fa-file-contract', color: 'bg-gradient-to-r from-teal-500 to-emerald-500', label: 'Cotizar', action: onOpenQuote },
        { icon: 'fa-money-bills', color: 'bg-gradient-to-r from-emerald-500 to-green-500', label: 'Recibo', action: onOpenReceipt },
        { icon: 'fa-circle-minus', color: 'bg-gradient-to-r from-rose-500 to-red-500', label: 'Registrar Nuevo Gasto', action: onOpenExpense },
      ];
    }
    return [
      { icon: 'fa-file-contract', color: 'bg-gradient-to-r from-teal-500 to-emerald-500', label: 'Cotización', action: onOpenQuote },
      { icon: 'fa-file-invoice', color: 'bg-gradient-to-r from-orange-500 to-amber-500', label: 'Cuenta de Cobro', action: onOpenCollection },
      { icon: 'fa-file-invoice-dollar', color: 'bg-gradient-to-r from-blue-500 to-violet-500', label: 'Factura', action: onOpenInvoice },
      { icon: 'fa-money-bills', color: 'bg-gradient-to-r from-emerald-500 to-green-500', label: 'Recibo', action: onOpenReceipt },
      { icon: 'fa-store', color: 'bg-gradient-to-r from-cyan-500 to-blue-500', label: 'Catálogo', action: onOpenProductPicker },
      { icon: 'fa-circle-minus', color: 'bg-gradient-to-r from-rose-500 to-red-500', label: 'Registrar Nuevo Gasto', action: onOpenExpense },
      { icon: 'fa-paperclip', color: 'bg-gradient-to-r from-purple-500 to-violet-500', label: 'Archivo', action: onTriggerDocumentInput },
    ];
  };

  return (
    <div
      className="min-h-[68px] px-4 py-3 flex items-center gap-3 z-20 border-t border-slate-700/50 backdrop-blur-lg"
      style={{ background: 'linear-gradient(135deg, rgba(30,58,95,0.95) 0%, rgba(15,23,42,0.98) 100%)' }}
    >
      <button className="text-slate-500 text-xl hover:text-blue-400 transition">
        <i className="fa-regular fa-face-smile"></i>
      </button>

      <div className="relative">
        <button
          onClick={() => setShowAttachMenu(!showAttachMenu)}
          className={`text-xl transition w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-700/50 ${showAttachMenu ? 'text-blue-400 rotate-45 bg-blue-500/20' : 'text-slate-400'}`}
        >
          <i className="fa-solid fa-plus"></i>
        </button>

        {showAttachMenu && (
          <div className="absolute bottom-16 left-0 flex flex-col gap-3 animate-scale-in z-50 ml-1">
            {getMenuItems().map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 group cursor-pointer"
                onClick={() => { item.action(); setShowAttachMenu(false); }}
              >
                <div className={`w-12 h-12 rounded-full ${item.color} flex items-center justify-center shadow-lg hover:scale-110 transition text-white border-2 border-slate-700 ring-2 ring-slate-800`}>
                  <i className={`fa-solid ${item.icon} text-lg`}></i>
                </div>
                <span className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded-full shadow-lg border border-slate-700 font-bold hidden group-hover:block whitespace-nowrap animate-fade-in">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <input
        type="text"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribe un mensaje..."
        className="flex-1 bg-slate-800/50 text-white text-sm rounded-xl px-4 py-3 outline-none border border-slate-700/50 focus:bg-slate-800 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition placeholder-slate-500"
      />

      {/* Camera button */}
      <div className="relative">
        <button onClick={onCameraCapture} className="text-slate-400 text-xl hover:text-blue-400 transition" title="Cámara">
          <i className="fa-solid fa-camera"></i>
        </button>
      </div>

      {/* Clip/Attach button */}
      <button onClick={onTriggerDocumentInput} className="text-slate-400 text-xl hover:text-blue-400 transition" title="Adjuntar archivo" type="button">
        <i className="fa-solid fa-paperclip"></i>
      </button>

      {inputText ? (
        <button onClick={handleSend} className="text-white bg-gradient-to-r from-blue-600 to-violet-600 w-10 h-10 rounded-full flex items-center justify-center hover:from-blue-500 hover:to-violet-500 transition shadow-lg shadow-blue-500/30">
          <i className="fa-solid fa-paper-plane text-sm"></i>
        </button>
      ) : (
        <button className="text-slate-400 text-xl hover:text-blue-400 transition">
          <i className="fa-solid fa-microphone"></i>
        </button>
      )}
    </div>
  );
});

ChatFooter.displayName = 'ChatFooter';
