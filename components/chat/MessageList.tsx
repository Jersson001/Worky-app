/**
 * MessageList — scrollable message area with auto-scroll.
 */
import React, { useRef, useEffect, useMemo } from 'react';
import { Message, ContactRole } from '../../types';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  showSystemMessages: boolean;
  contactRole: ContactRole;
  contactName: string;
  copiedText: string | null;
  onViewDocument: (type: 'quote' | 'invoice' | 'receipt' | 'collection_account', data: any) => void;
  onMarkPayment: (msg: Message) => void;
  onUpdateMessage: (messageId: string, metadata: any) => void;
  onCopyPaymentInfo: (metadata: any) => void;
  onShowQR: (qrUrl: string, metadata: any) => void;
}

export const MessageList: React.FC<MessageListProps> = React.memo(({
  messages, showSystemMessages, contactRole, contactName, copiedText,
  onViewDocument, onMarkPayment, onUpdateMessage, onCopyPaymentInfo, onShowQR,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      if (msg.type === 'expense' || msg.type === 'expense_receipt') return false;
      return msg.metadata?.isSystem ? showSystemMessages : true;
    });
  }, [messages, showSystemMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [filteredMessages, showSystemMessages]);

  return (
    <div
      className="flex-1 overflow-y-auto p-4 relative"
      style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.95) 100%)' }}
    >
      {filteredMessages.map((msg) => (
        <MessageBubble
          key={msg.id}
          msg={msg}
          contactRole={contactRole}
          contactName={contactName}
          copiedText={copiedText}
          onViewDocument={onViewDocument}
          onMarkPayment={onMarkPayment}
          onUpdateMessage={onUpdateMessage}
          onCopyPaymentInfo={onCopyPaymentInfo}
          onShowQR={onShowQR}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
});

MessageList.displayName = 'MessageList';
