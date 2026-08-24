/**
 * ChatHeader — avatar, name, project badge, menu dropdown, action buttons.
 */
import React, { useState } from 'react';
import { Contact } from '../../types';

interface ChatHeaderProps {
  contact: Contact;
  approvedProjectsCount: number;
  displayProjectName: string;
  hasMultipleProjects: boolean;
  onBack: () => void;
  onToggleInfo: () => void;
  showInfo: boolean;
  onOpenGantt?: (projectId?: string) => void;
  onOpenProductPicker: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = React.memo(({
  contact, approvedProjectsCount, displayProjectName, hasMultipleProjects,
  onBack, onToggleInfo, showInfo, onOpenGantt, onOpenProductPicker,
}) => {
  const [showChatMenu, setShowChatMenu] = useState(false);

  return (
    <div className="h-16 px-4 flex items-center justify-between flex-shrink-0 border-b border-slate-200 z-20 relative bg-white">
      <div className="flex items-center cursor-pointer" onClick={onToggleInfo}>
        <button
          onClick={(e) => { e.stopPropagation(); onBack(); }}
          className="md:hidden mr-3 text-slate-500 hover:text-slate-900 transition w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div className="relative">
          <img src={contact.avatar} alt={contact.clientName} className="w-10 h-10 rounded-full object-cover mr-3" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-slate-900 font-semibold text-[14.5px] flex items-center gap-1.5">
            {contact.alias || contact.clientName}
            {contact.alias && <span className="text-xs text-slate-400 font-normal">({contact.clientName})</span>}
          </h2>
          <span className="text-xs text-blue-600 font-medium truncate flex items-center gap-1">
            <i className="fa-solid fa-briefcase text-[10px]"></i> {displayProjectName}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 text-slate-500">
        {/* Gantt button for clients */}
        {onOpenGantt && contact.role === 'client' && contact.projects.length > 0 && (
          <button
            onClick={() => onOpenGantt(contact.projects[0]?.id)}
            className="hover:text-blue-600 transition w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100"
            title="Ver cronograma Gantt"
          >
            <i className="fa-solid fa-chart-gantt text-base"></i>
          </button>
        )}
        {/* Catalog button for suppliers */}
        {contact.role === 'supplier' && (
          <button
            onClick={onOpenProductPicker}
            className="hover:text-blue-600 transition w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100"
            title="Catálogo"
          >
            <i className="fa-solid fa-store text-base"></i>
          </button>
        )}
        <button className="hover:text-blue-600 transition w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100">
          <i className="fa-solid fa-magnifying-glass text-base"></i>
        </button>
        <div className="relative">
          <button
            className={`hover:text-blue-600 w-8 h-8 rounded-lg flex items-center justify-center transition ${showChatMenu ? 'bg-slate-100 text-blue-600' : ''}`}
            onClick={() => setShowChatMenu(!showChatMenu)}
          >
            <i className="fa-solid fa-ellipsis-vertical text-base"></i>
          </button>
          {showChatMenu && (
            <div className="absolute right-0 top-10 bg-white w-64 rounded-xl shadow-lg py-2 z-50 border border-slate-200 animate-scale-in origin-top-right">
              <button
                onClick={() => { onToggleInfo(); setShowChatMenu(false); }}
                className="w-full text-left px-4 py-3 text-slate-700 hover:bg-slate-50 text-sm flex items-center gap-3 transition"
              >
                <i className="fa-solid fa-circle-info text-blue-600"></i>
                Info. del contacto
              </button>
              {onOpenGantt && contact.projects.length > 0 && (
                <button
                  onClick={() => { setShowChatMenu(false); onOpenGantt(contact.projects[0]?.id); }}
                  className="w-full text-left px-4 py-3 text-slate-700 hover:bg-slate-50 text-sm flex items-center gap-3 transition"
                >
                  <i className="fa-solid fa-chart-gantt text-violet-600"></i>
                  Ver cronograma Gantt
                </button>
              )}
              <button
                onClick={() => { setShowChatMenu(false); onBack(); }}
                className="w-full text-left px-4 py-3 text-rose-600 hover:bg-rose-50 text-sm font-medium flex items-center gap-3 transition"
              >
                <i className="fa-solid fa-xmark"></i>
                Cerrar chat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ChatHeader.displayName = 'ChatHeader';
