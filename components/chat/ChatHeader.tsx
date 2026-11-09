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
  /**
   * Va al Inicio. Solo se pinta en el teléfono: con un chat abierto la barra de
   * abajo se esconde, y quien llegó directo al chat —por un QR, o tocando una
   * notificación— no tenía ninguna señal de cómo salir de ahí. La flecha de atrás
   * es un icono gris pequeño que no dice adónde lleva.
   */
  onGoHome?: () => void;
  onToggleInfo: () => void;
  showInfo: boolean;
  onOpenGantt?: (projectId?: string) => void;
  onOpenProductPicker: () => void;
  /**
   * Abre el catálogo público de este contacto. Solo llega si lo tiene publicado:
   * sin él no hay botón.
   */
  onVerCatalogo?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = React.memo(({
  contact, approvedProjectsCount, displayProjectName, hasMultipleProjects,
  onBack, onGoHome, onToggleInfo, showInfo, onOpenGantt, onOpenProductPicker, onVerCatalogo,
}) => {
  const [showChatMenu, setShowChatMenu] = useState(false);

  return (
    <div className="h-16 px-4 flex items-center justify-between flex-shrink-0 border-b border-slate-200 z-20 relative bg-white">
      <div className="flex items-center cursor-pointer min-w-0" onClick={onToggleInfo}>
        {/* En el escritorio no hay flecha: el chat convive con la lista. En el teléfono
            va a la derecha, junto a «Inicio» (más abajo): la esquina izquierda quedaba
            tapada en algunos iPhone. */}
        <div className="relative flex-shrink-0">
          <img src={contact.avatar} alt={contact.clientName} className="w-10 h-10 rounded-full object-cover mr-3" />
        </div>
        <div className="flex flex-col min-w-0">
          <h2 className="text-slate-900 font-semibold text-[14.5px] flex items-center gap-1.5 truncate">
            {contact.alias || contact.clientName}
            {contact.alias && <span className="text-xs text-slate-400 font-normal">({contact.clientName})</span>}
          </h2>
          <span className="text-xs text-blue-600 font-medium truncate flex items-center gap-1">
            <i className="fa-solid fa-briefcase text-[10px]"></i> {displayProjectName}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 text-slate-500 flex-shrink-0">
        {/* Volver y Inicio, juntos y a la vista. Solo en el teléfono. */}
        <button
          onClick={onBack}
          aria-label="Volver"
          title="Volver"
          className="md:hidden w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
        >
          <i className="fa-solid fa-arrow-left text-lg"></i>
        </button>
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
        {/* Inicio: la salida a la pantalla principal, a la vista y con su nombre. */}
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="md:hidden w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
            title="Ir al inicio"
            aria-label="Ir al inicio"
          >
            <i className="fa-solid fa-house text-lg"></i>
          </button>
        )}
        {/* Su catálogo: para volver a ver lo que vende quien está al otro lado.
            Quien llega por un QR y se pone a chatear no tenía cómo regresar a
            los productos de la tienda. */}
        {onVerCatalogo && (
          <button
            onClick={onVerCatalogo}
            className="hover:text-blue-600 transition w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100"
            title={`Ver el catálogo de ${contact.alias || contact.clientName}`}
            aria-label="Ver su catálogo"
          >
            <i className="fa-solid fa-store text-base"></i>
          </button>
        )}
        {/* Mandarle al proveedor un producto del catálogo PROPIO. Llevaba el
            mismo icono de tienda y el título «Catálogo», y se confundía con el
            de arriba: parecía abrir el del proveedor y abría el tuyo. */}
        {contact.role === 'supplier' && (
          <button
            onClick={onOpenProductPicker}
            className="hover:text-blue-600 transition w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100"
            title="Mandar un producto de mi catálogo"
            aria-label="Mandar un producto de mi catálogo"
          >
            <i className="fa-solid fa-box-open text-base"></i>
          </button>
        )}
        {/* Sin función todavía. En el teléfono se esconde: el sitio lo necesita «Inicio». */}
        <button className="hidden md:flex hover:text-blue-600 transition w-8 h-8 rounded-lg items-center justify-center hover:bg-slate-100">
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
              {onGoHome && (
                <button
                  onClick={() => { setShowChatMenu(false); onGoHome(); }}
                  className="md:hidden w-full text-left px-4 py-3 text-slate-700 hover:bg-slate-50 text-sm flex items-center gap-3 transition"
                >
                  <i className="fa-solid fa-house text-blue-600"></i>
                  Ir al inicio
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
