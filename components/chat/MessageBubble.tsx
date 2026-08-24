/**
 * MessageBubble — dispatcher component that renders the correct bubble
 * based on message type. Wraps all bubbles in a unified layout.
 * Includes long-press context menu for copying, sharing, and deleting messages.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Message, ContactRole } from '../../types';
import { InvoiceBubble } from './bubbles/InvoiceBubble';
import { QuoteBubble } from './bubbles/QuoteBubble';
import { CollectionBubble } from './bubbles/CollectionBubble';
import { ReceiptBubble } from './bubbles/ReceiptBubble';
import { FileBubble } from './bubbles/FileBubble';

interface MessageBubbleProps {
  msg: Message;
  contactRole: ContactRole;
  contactName: string;
  copiedText: string | null;
  onViewDocument: (type: 'quote' | 'invoice' | 'receipt' | 'collection_account', data: any) => void;
  onMarkPayment: (msg: Message) => void;
  onUpdateMessage: (messageId: string, metadata: any) => void;
  onDeleteMessage?: (messageId: string) => void;
  onCopyPaymentInfo: (metadata: any) => void;
  onShowQR: (qrUrl: string, metadata: any) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
  msg, contactRole, contactName, copiedText,
  onViewDocument, onMarkPayment, onUpdateMessage, onDeleteMessage, onCopyPaymentInfo, onShowQR,
}) => {
  const isSystem = msg.metadata?.isSystem;

  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const dragStartRef = useRef(0);
  const dragStartYRef = useRef(0);
  const isTouchRejectedRef = useRef(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Limpiar temporizador al desmontar
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const startLongPress = () => {
    cancelLongPress();
    longPressTimerRef.current = setTimeout(() => {
      setShowMenu(true);
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(40);
        } catch (_) {}
      }
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Evitar arrastre si se hace clic en un elemento interactivo
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return;
    }

    startLongPress();

    if (!onDeleteMessage) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = e.clientX;
    dragStartYRef.current = e.clientY;
    setIsDragging(true);
    isTouchRejectedRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const deltaX = e.clientX - dragStartRef.current;
    const deltaY = e.clientY - dragStartYRef.current;

    // Si hay un movimiento mayor a 8px, cancelar long press
    if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
      cancelLongPress();
    }

    if (!isDragging) return;
    if (isTouchRejectedRef.current) return;

    // Si hay un scroll vertical significativo inicial, cancelar el gesto de arrastre
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10 && dragX === 0) {
      isTouchRejectedRef.current = true;
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
      return;
    }

    // Solo permitir arrastre hacia la derecha
    if (deltaX > 0) {
      setDragX(deltaX);
    } else {
      setDragX(0);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    cancelLongPress();
    if (!isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
    setIsDragging(false);

    if (dragX >= 100) {
      setDragX(400); // Animar hacia la derecha completamente
      setTimeout(() => {
        onDeleteMessage?.(msg.id);
      }, 200);
    } else {
      setDragX(0); // Volver suavemente
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    cancelLongPress();
    if (!isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
    setIsDragging(false);
    setDragX(0);
  };

  const [toastMessage, setToastMessage] = useState('¡Copiado al portapapeles!');

  const triggerToast = (msgText: string) => {
    setToastMessage(msgText);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  // Helper para extraer la URL pública del archivo si el mensaje contiene un archivo o imagen
  const getFileUrl = (): string | null => {
    return msg.mediaUrl || msg.metadata?.url || msg.metadata?.downloadUrl || msg.metadata?.fileUrl || msg.metadata?.publicUrl || null;
  };

  // Helper para determinar si el mensaje es de tipo archivo o imagen
  const isFileOrImage = (): boolean => {
    return msg.type === 'image' || msg.type === 'file' || !!msg.mediaUrl || !!msg.metadata?.url;
  };

  const handleCopy = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShowMenu(false);

    const fileUrl = getFileUrl();
    let textToCopy = '';

    if (isFileOrImage() && fileUrl) {
      textToCopy = msg.text ? `${msg.text}\n${fileUrl}` : fileUrl;
    } else {
      textToCopy = msg.text || msg.metadata?.title || msg.metadata?.description || '';
    }

    if (textToCopy) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        triggerToast(isFileOrImage() ? '¡Enlace de archivo copiado!' : '¡Texto copiado!');
      } catch (err) {
        console.error('Error al copiar:', err);
      }
    }
  };

  const handleShare = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShowMenu(false);

    const fileUrl = getFileUrl();
    const isFile = isFileOrImage();

    let shareData: ShareData = {};
    let fallbackText = '';

    if (isFile && fileUrl) {
      shareData = {
        title: msg.metadata?.fileName || 'Archivo de Worky',
        text: msg.text || undefined,
        url: fileUrl,
      };
      fallbackText = fileUrl;
    } else {
      const text = msg.text || msg.metadata?.title || msg.metadata?.description || '';
      shareData = {
        title: 'Mensaje de Worky',
        text: text,
      };
      fallbackText = text;
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error al compartir con Web Share API, aplicando fallback:', err);
          if (fallbackText) {
            try {
              await navigator.clipboard.writeText(fallbackText);
              triggerToast('¡Enlace copiado al portapapeles!');
            } catch (_) {}
          }
        }
      }
    } else {
      // Fallback a copiar si navigator.share no está disponible en el navegador/SO
      if (fallbackText) {
        try {
          await navigator.clipboard.writeText(fallbackText);
          triggerToast(isFile ? '¡Enlace de archivo copiado!' : '¡Copiado al portapapeles!');
        } catch (err) {
          console.error('Error en fallback de compartir:', err);
        }
      }
    }
  };

  const handleDelete = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShowMenu(false);
    if (onDeleteMessage) {
      onDeleteMessage(msg.id);
    }
  };

  return (
    <div className={`flex mb-4 relative ${isSystem ? 'justify-center' : msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
      {/* Toast Feedback Visual de "Copiado" */}
      {showToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg border border-emerald-400/30 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Overlay transparente para cerrar el menú si se hace clic afuera */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
          onClick={() => setShowMenu(false)}
          onTouchStart={() => setShowMenu(false)}
        />
      )}

      {isSystem ? (
        <div className="bg-amber-500/10 text-amber-400 text-xs px-4 py-2 rounded-full shadow-lg border border-amber-500/20 my-2 font-medium tracking-wide flex items-center gap-2 backdrop-blur-sm">
          {msg.text.includes('Gasto') ? <i className="fa-solid fa-money-bill-wave"></i> : <i className="fa-solid fa-check-circle"></i>}
          {msg.text}
        </div>
      ) : (
        <div className={`relative max-w-[85%] md:max-w-[65%] rounded-2xl overflow-visible w-fit ${msg.sender === 'me' ? 'ml-auto' : 'mr-auto'}`}>
          {/* Fondo rojo con papelera (Swipe to delete) */}
          {onDeleteMessage && (
            <div
              className="absolute inset-0 bg-red-600/95 text-white flex items-center justify-start px-6 rounded-2xl transition-opacity duration-150 overflow-hidden"
              style={{
                opacity: Math.min(1, dragX / 100),
              }}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <i className={`fa-solid fa-trash text-sm ${dragX >= 100 ? 'scale-125 text-white animate-bounce' : 'scale-100 text-red-200'}`}></i>
                <span className={dragX >= 100 ? 'text-white' : 'text-red-200'}>
                  {dragX >= 100 ? 'Suelta para eliminar' : 'Desliza para borrar'}
                </span>
              </div>
            </div>
          )}

          {/* Menú Contextual Flotante (Popover UI) */}
          {showMenu && (
            <div
              className={`absolute z-50 -top-12 ${
                msg.sender === 'me' ? 'right-0' : 'left-0'
              } bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl rounded-2xl p-1 flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150`}
            >
              {/* Botón Copiar (Hojas superpuestas) */}
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition-colors"
                title={isFileOrImage() ? 'Copiar enlace del archivo' : 'Copiar texto'}
              >
                <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
                <span>Copiar</span>
              </button>

              <div className="w-px h-4 bg-slate-700/60" />

              {/* Botón Compartir (Nodo de compartir) */}
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition-colors"
                title={isFileOrImage() ? 'Compartir archivo' : 'Compartir mensaje'}
              >
                <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-5.367 3 3 0 000 5.367zm0 8.975a3 3 0 100-5.367 3 3 0 000 5.367z" />
                </svg>
                <span>Compartir</span>
              </button>

              {/* Botón Borrar */}
              {onDeleteMessage && (
                <>
                  <div className="w-px h-4 bg-slate-700/60" />
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    title="Borrar mensaje"
                  >
                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Borrar</span>
                  </button>
                </>
              )}
            </div>
          )}

          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onMouseDown={startLongPress}
            onMouseUp={cancelLongPress}
            onMouseLeave={cancelLongPress}
            onTouchStart={startLongPress}
            onTouchEnd={cancelLongPress}
            onTouchMove={cancelLongPress}
            style={{
              touchAction: onDeleteMessage ? 'pan-y' : 'auto',
              transform: `translateX(${dragX}px)`,
              transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
            }}
            className={`w-fit px-4 py-3 rounded-2xl text-sm shadow-lg relative select-none cursor-grab active:cursor-grabbing ${
              msg.sender === 'me'
                ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-br-none shadow-blue-500/20'
                : 'bg-slate-800/80 backdrop-blur-sm text-slate-200 rounded-bl-none border border-slate-700/50'
            }`}
          >
            <div className="flex flex-col">
              {/* Type-specific bubble content */}
              {msg.type === 'invoice' && msg.metadata && (
                <InvoiceBubble
                  msg={msg}
                  contactRole={contactRole}
                  onView={() => onViewDocument('invoice', msg.metadata)}
                  onMarkPayment={() => onMarkPayment(msg)}
                />
              )}

              {msg.type === 'quote' && msg.metadata && (
                <QuoteBubble
                  msg={msg}
                  onView={() => onViewDocument('quote', msg.metadata)}
                  onUpdateMessage={onUpdateMessage}
                />
              )}

              {msg.type === 'collection_account' && msg.metadata && (
                <CollectionBubble
                  msg={msg}
                  contactRole={contactRole}
                  copiedText={copiedText}
                  onView={() => onViewDocument('collection_account', msg.metadata)}
                  onMarkPayment={() => onMarkPayment(msg)}
                  onCopyPaymentInfo={onCopyPaymentInfo}
                  onShowQR={onShowQR}
                />
              )}

              {msg.type === 'receipt' && msg.metadata && (
                <ReceiptBubble
                  msg={msg}
                  contactRole={contactRole}
                  contactName={contactName}
                  copiedText={copiedText}
                  onView={() => onViewDocument('receipt', msg.metadata)}
                  onMarkPayment={() => onMarkPayment(msg)}
                  onCopyPaymentInfo={onCopyPaymentInfo}
                  onShowQR={onShowQR}
                />
              )}

              {/* Image Content */}
              {((msg.type === 'image' && msg.metadata?.url) || (msg.mediaUrl && msg.mediaType?.startsWith('image/'))) && (
                <div className="rounded-lg overflow-hidden max-w-xs my-1">
                  <img src={msg.mediaUrl || msg.metadata?.url} alt="Imagen enviada" className="w-full h-auto max-h-80 object-contain rounded-md" />
                </div>
              )}

              {/* File Content */}
              {((msg.type === 'file' && msg.metadata) || (msg.mediaUrl && !msg.mediaType?.startsWith('image/'))) && (
                <FileBubble msg={msg} />
              )}

              {/* Text Content */}
              {!['invoice', 'quote', 'receipt', 'collection_account', 'product', 'image', 'file'].includes(msg.type) && !msg.mediaUrl && (
                <div className="whitespace-pre-wrap leading-relaxed px-1 break-all">{msg.text}</div>
              )}

              {/* Timestamp */}
              <div className={`text-[10px] self-end mt-1.5 ml-2 flex items-center gap-1 opacity-70 ${msg.sender === 'me' ? 'text-indigo-100' : 'text-slate-400'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {msg.sender === 'me' && <i className="fa-solid fa-check-double"></i>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';
