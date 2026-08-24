import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChatGroup, SubGroup, GroupMessage, Contact, GroupMember } from '../types';

interface GroupChatWindowProps {
  group: ChatGroup;
  messages: GroupMessage[];
  contacts: Contact[];
  activeSubGroupId?: string;
  onSendMessage: (message: Omit<GroupMessage, 'id' | 'timestamp'>) => void;
  onBack: () => void;
  onOpenGroupSettings: () => void;
  onSelectSubGroup: (subGroupId: string | null) => void;
}

export const GroupChatWindow: React.FC<GroupChatWindowProps> = ({
  group,
  messages,
  contacts,
  activeSubGroupId,
  onSendMessage,
  onBack,
  onOpenGroupSettings,
  onSelectSubGroup,
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [showMembersList, setShowMembersList] = useState(false);
  const [replyingTo, setReplyingTo] = useState<GroupMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter messages based on active subgroup
  const filteredMessages = useMemo(() => {
    if (activeSubGroupId) {
      return messages.filter(m => m.subGroupId === activeSubGroupId);
    }
    return messages.filter(m => !m.subGroupId);
  }, [messages, activeSubGroupId]);

  // Get active subgroup info
  const activeSubGroup = useMemo(() => {
    if (!activeSubGroupId) return null;
    return group.subGroups?.find(sg => sg.id === activeSubGroupId) || null;
  }, [group.subGroups, activeSubGroupId]);

  // Get member info
  const getContactInfo = (contactId: string): Contact | null => {
    if (contactId === 'me') return null;
    return contacts.find(c => c.id === contactId) || null;
  };

  const getMemberRole = (contactId: string): string => {
    const member = group.members.find(m => m.contactId === contactId);
    if (!member) return '';
    return member.role === 'admin' ? '👑 Admin' : member.role === 'viewer' ? '👁 Visor' : '';
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredMessages]);

  const handleSend = () => {
    if (!inputMessage.trim()) return;

    onSendMessage({
      groupId: group.id,
      subGroupId: activeSubGroupId,
      text: inputMessage,
      senderId: 'me',
      senderName: 'Tú',
      senderAvatar: '',
      type: 'text',
      replyTo: replyingTo ? replyingTo.id : undefined,
    });

    setInputMessage('');
    setReplyingTo(null);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const msgDate = new Date(date);
    if (msgDate.toDateString() === today.toDateString()) {
      return 'Hoy';
    }
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (msgDate.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    }
    return msgDate.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' });
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: GroupMessage[] }[] = [];
    let currentDate = '';

    filteredMessages.forEach(msg => {
      const date = formatDate(msg.timestamp);
      if (date !== currentDate) {
        groups.push({ date, messages: [msg] });
        currentDate = date;
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  }, [filteredMessages]);

  const getReplyMessage = (replyToId: string): GroupMessage | undefined => {
    return messages.find(m => m.id === replyToId);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-slate-500 hover:text-slate-900 transition p-2 hover:bg-slate-100 rounded-lg lg:hidden"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>

          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md ${
            activeSubGroup
              ? ''
              : group.type === 'project'
                ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-emerald-500/30'
                : 'bg-gradient-to-br from-blue-600 to-blue-700 shadow-blue-500/30'
          }`}
          style={activeSubGroup ? { backgroundColor: activeSubGroup.color } : {}}>
            <i
              className={`fa-solid ${activeSubGroup ? activeSubGroup.icon : group.type === 'project' ? 'fa-folder-tree' : 'fa-users'} text-xl`}
            ></i>
          </div>

          <div>
            <h3 className="text-slate-900 font-bold flex items-center gap-2">
              {activeSubGroup ? activeSubGroup.name : group.name}
              {activeSubGroup && (
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">
                  {group.name}
                </span>
              )}
            </h3>
            <p className="text-slate-500 text-xs flex items-center gap-2">
              <i className="fa-solid fa-users"></i>
              {activeSubGroup
                ? `${activeSubGroup.members.length} miembros en subgrupo`
                : `${group.members.length} miembros`
              }
              {group.subGroups && group.subGroups.length > 0 && !activeSubGroup && (
                <span className="text-blue-600">
                  • {group.subGroups.length} subgrupos
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Members button */}
          <button
            onClick={() => setShowMembersList(true)}
            className="text-slate-500 hover:text-slate-900 transition p-2 hover:bg-slate-100 rounded-lg"
            title="Ver miembros"
          >
            <i className="fa-solid fa-user-group"></i>
          </button>

          {/* Settings button */}
          <button
            onClick={onOpenGroupSettings}
            className="text-slate-500 hover:text-slate-900 transition p-2 hover:bg-slate-100 rounded-lg"
            title="Configuración"
          >
            <i className="fa-solid fa-gear"></i>
          </button>
        </div>
      </div>

      {/* Subgroups tabs */}
      {group.subGroups && group.subGroups.length > 0 && (
        <div className="bg-white border-b border-slate-100 p-2 flex gap-2 overflow-x-auto">
          <button
            onClick={() => onSelectSubGroup(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition flex items-center gap-2 ${
              !activeSubGroupId
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30'
                : 'bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200'
            }`}
          >
            <i className="fa-solid fa-users"></i>
            General
          </button>
          {group.subGroups.map(sg => (
            <button
              key={sg.id}
              onClick={() => onSelectSubGroup(sg.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition flex items-center gap-2 ${
                activeSubGroupId === sg.id
                  ? 'text-white shadow-md'
                  : 'bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200'
              }`}
              style={activeSubGroupId === sg.id ? {
                background: `linear-gradient(135deg, ${sg.color}, ${sg.color}CC)`,
                boxShadow: `0 4px 10px -2px ${sg.color}4D`
              } : {}}
            >
              <i className={`fa-solid ${sg.icon}`} style={{ color: activeSubGroupId === sg.id ? 'white' : sg.color }}></i>
              {sg.name}
              <span className="text-xs opacity-70">({sg.members.length})</span>
            </button>
          ))}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100">
        {groupedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30 mb-4">
              <i className="fa-solid fa-comments text-2xl"></i>
            </div>
            <p className="font-medium text-slate-600">No hay mensajes aún</p>
            <p className="text-sm text-slate-400">Sé el primero en escribir en {activeSubGroup ? 'este subgrupo' : 'este grupo'}</p>
          </div>
        ) : (
          groupedMessages.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-3">
              {/* Date separator */}
              <div className="flex items-center justify-center my-4">
                <div className="bg-white shadow-sm px-4 py-1 rounded-full text-xs text-slate-500 font-medium">
                  {group.date}
                </div>
              </div>

              {/* Messages */}
              {group.messages.map((msg, idx) => {
                const isMe = msg.senderId === 'me';
                const contact = getContactInfo(msg.senderId);
                const replyMsg = msg.replyTo ? getReplyMessage(msg.replyTo) : undefined;

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2 max-w-[80%] ${isMe ? 'flex-row-reverse' : ''}`}>
                      {/* Avatar */}
                      {!isMe && (
                        <img
                          src={contact?.avatar || 'https://i.pravatar.cc/100?u=' + msg.senderId}
                          alt={msg.senderName}
                          className="w-8 h-8 rounded-full mt-1 flex-shrink-0"
                        />
                      )}

                      {/* Message bubble */}
                      <div className="flex flex-col gap-1">
                        {/* Sender name (for non-me messages) */}
                        {!isMe && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-600 font-medium">{msg.senderName}</span>
                            {getMemberRole(msg.senderId) && (
                              <span className="text-slate-400">{getMemberRole(msg.senderId)}</span>
                            )}
                          </div>
                        )}

                        {/* Bubble */}
                        <div
                          className={`rounded-2xl px-4 py-2.5 ${
                            isMe
                              ? 'bg-blue-50 text-slate-900 rounded-tr-sm'
                              : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-sm'
                          }`}
                        >
                          {/* Reply preview */}
                          {replyMsg && (
                            <div className={`mb-2 pb-2 border-l-2 pl-2 text-xs ${
                              isMe ? 'border-blue-300 text-blue-700/70' : 'border-slate-300 text-slate-500'
                            }`}>
                              <span className="font-medium">{replyMsg.senderName}</span>
                              <p className="truncate">{replyMsg.text}</p>
                            </div>
                          )}

                          <p className="break-words">{msg.text}</p>

                          <div className={`flex items-center gap-2 mt-1 text-[10px] ${
                            isMe ? 'text-slate-500 justify-end' : 'text-slate-400'
                          }`}>
                            <span>{formatTime(msg.timestamp)}</span>
                            {isMe && (
                              <i className="fa-solid fa-check-double text-blue-500"></i>
                            )}
                          </div>
                        </div>

                        {/* Quick actions */}
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className={`text-xs text-slate-400 hover:text-slate-700 transition opacity-0 hover:opacity-100 ${isMe ? 'text-right' : ''}`}
                        >
                          <i className="fa-solid fa-reply mr-1"></i> Responder
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <i className="fa-solid fa-reply text-blue-600"></i>
            <span className="text-slate-500">Respondiendo a</span>
            <span className="text-slate-900 font-medium">{replyingTo.senderName}</span>
            <span className="text-slate-500 truncate max-w-[200px]">"{replyingTo.text}"</span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-slate-400 hover:text-slate-900 transition"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <button className="text-slate-400 hover:text-slate-700 transition p-2">
            <i className="fa-solid fa-paperclip text-lg"></i>
          </button>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Mensaje para ${activeSubGroup ? activeSubGroup.name : group.name}...`}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 rounded-xl outline-none focus:border-blue-500 transition placeholder-slate-400"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!inputMessage.trim()}
            className="bg-gradient-to-br from-blue-600 to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/30 hover:shadow-lg transition"
          >
            <i className="fa-solid fa-paper-plane"></i>
          </button>
        </div>
      </div>

      {/* Members Modal */}
      {showMembersList && (
        <div className="absolute inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-slate-900 font-bold flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
                  <i className="fa-solid fa-users"></i>
                </div>
                Miembros del Grupo
              </h3>
              <button
                onClick={() => setShowMembersList(false)}
                className="w-9 h-9 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {group.members.map(member => {
                const contact = getContactInfo(member.contactId);
                const isMe = member.contactId === 'me';

                return (
                  <div
                    key={member.id}
                    className="p-4 flex items-center gap-3 border-b border-slate-100 hover:bg-slate-50 transition"
                  >
                    {isMe ? (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold shadow-sm">
                        Yo
                      </div>
                    ) : (
                      <img
                        src={contact?.avatar || 'https://i.pravatar.cc/100?u=' + member.contactId}
                        alt={contact?.clientName || 'Miembro'}
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-slate-900 font-medium">
                        {isMe ? 'Tú' : contact?.clientName || 'Usuario'}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {member.role === 'admin' && '👑 Administrador'}
                        {member.role === 'member' && '👤 Miembro'}
                        {member.role === 'viewer' && '👁 Visor'}
                      </p>
                    </div>
                    {member.role === 'admin' && (
                      <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded-lg text-xs font-bold">
                        Admin
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <p className="text-center text-slate-500 text-sm">
                {group.members.length} miembros en total
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
