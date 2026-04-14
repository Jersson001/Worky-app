/**
 * MessageBubble — dispatcher component that renders the correct bubble
 * based on message type. Wraps all bubbles in a unified layout.
 */
import React from 'react';
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
  onCopyPaymentInfo: (metadata: any) => void;
  onShowQR: (qrUrl: string, metadata: any) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
  msg, contactRole, contactName, copiedText,
  onViewDocument, onMarkPayment, onUpdateMessage, onCopyPaymentInfo, onShowQR,
}) => {
  const isSystem = msg.metadata?.isSystem;

  return (
    <div className={`flex mb-4 ${isSystem ? 'justify-center' : msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
      {isSystem ? (
        <div className="bg-amber-500/10 text-amber-400 text-xs px-4 py-2 rounded-full shadow-lg border border-amber-500/20 my-2 font-medium tracking-wide flex items-center gap-2 backdrop-blur-sm">
          {msg.text.includes('Gasto') ? <i className="fa-solid fa-money-bill-wave"></i> : <i className="fa-solid fa-check-circle"></i>}
          {msg.text}
        </div>
      ) : (
        <div
          className={`max-w-[85%] md:max-w-[65%] px-4 py-3 rounded-2xl text-sm shadow-lg relative group ${
            msg.sender === 'me'
              ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-br-none shadow-blue-500/20'
              : 'bg-slate-800/80 backdrop-blur-sm text-slate-200 rounded-bl-none border border-slate-700/50'
          }`}
        >
          {/* Type-specific bubble content */}
          {msg.type === 'invoice' && msg.metadata && (
            <InvoiceBubble
              msg={msg}
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
          {msg.type === 'image' && msg.metadata?.url && (
            <div className="rounded-lg overflow-hidden max-w-xs">
              <img src={msg.metadata.url} alt="Imagen enviada" className="w-full h-auto" />
            </div>
          )}

          {/* File Content */}
          {msg.type === 'file' && msg.metadata && (
            <FileBubble msg={msg} />
          )}

          {/* Text Content */}
          {!['invoice', 'quote', 'receipt', 'collection_account', 'product', 'image', 'file'].includes(msg.type) && (
            <div className="whitespace-pre-wrap leading-relaxed px-1 break-all">{msg.text}</div>
          )}

          {/* Timestamp */}
          <div className={`text-[10px] float-right mt-1 ml-2 flex items-center gap-1 opacity-70 ${msg.sender === 'me' ? 'text-indigo-100' : 'text-slate-400'}`}>
            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {msg.sender === 'me' && <i className="fa-solid fa-check-double"></i>}
          </div>
        </div>
      )}
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';
