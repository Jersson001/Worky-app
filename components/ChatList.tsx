
import React, { useState } from 'react';
import { Contact, UserStatus, ChatGroup } from '../types';

interface ChatListProps {
  contacts: Contact[];
  selectedContactId: string | null;
  onSelectContact: (id: string) => void;
  onOpenFinancials: () => void;
  onOpenStatus: () => void;
  onOpenWallet: () => void;
  onOpenNotifications: () => void;
  onOpenHome?: () => void;
  onDeleteContact?: (id: string) => void;
  onLogout: () => void;
  onSearchUsers?: () => void;
  onEditProfile?: () => void;
  // Group props
  groups?: ChatGroup[];
  selectedGroupId?: string | null;
  onSelectGroup?: (groupId: string, subGroupId?: string) => void;
  onOpenGroupsManager?: () => void;
}

export const ChatList: React.FC<ChatListProps> = ({ contacts, selectedContactId, onSelectContact, onOpenFinancials, onOpenStatus, onOpenWallet, onOpenNotifications, onOpenHome, onDeleteContact, onLogout, onSearchUsers, onEditProfile, groups = [], selectedGroupId, onSelectGroup, onOpenGroupsManager }) => {
  const [filter, setFilter] = useState<string>('all');
  const [showMenu, setShowMenu] = useState(false);
  const [hoveredContactId, setHoveredContactId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'contacts' | 'groups'>('contacts');

  const filteredContacts = contacts.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'client') return c.status === UserStatus.Client;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-700/50 text-slate-200">
      {/* Header - Brand Area */}
      <div className="h-16 px-4 flex justify-between items-center flex-shrink-0 border-b border-slate-700/50 relative z-20" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)' }}>
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 p-0.5 cursor-pointer relative group shadow-lg shadow-blue-500/20">
                <div className="bg-white rounded-lg w-full h-full flex items-center justify-center">
                  <img src="/worky-logo.png" alt="Worky" className="w-8 h-8 object-contain" />
                </div>
            </div>
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400 tracking-tight text-lg">Worky</span>
        </div>
        
        <div className="flex gap-1 text-slate-400">
          {onOpenHome && (
            <button 
              onClick={onOpenHome}
              title="Inicio" 
              className="hover:text-white hover:bg-slate-700/50 w-9 h-9 rounded-lg flex items-center justify-center transition"
            >
              <i className="fa-solid fa-house"></i>
            </button>
          )}
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenNotifications();
            }}
            title="Notificaciones" 
            className="hover:text-white hover:bg-slate-700/50 w-9 h-9 rounded-lg flex items-center justify-center transition relative cursor-pointer z-10"
          >
            <i className="fa-solid fa-bell"></i>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full border border-slate-900 animate-pulse"></span>
          </button>

          <button 
            onClick={onOpenWallet}
            title="Billetera & Llaves" 
            className="hidden md:flex hover:text-white hover:bg-slate-700/50 w-9 h-9 rounded-lg items-center justify-center transition"
          >
            <i className="fa-solid fa-wallet"></i>
          </button>

          <button 
            onClick={onOpenFinancials}
            title="Estados Financieros" 
            className="hidden md:flex hover:text-white hover:bg-slate-700/50 w-9 h-9 rounded-lg items-center justify-center transition"
          >
            <i className="fa-solid fa-chart-pie"></i>
          </button>

          <button 
            onClick={onOpenStatus}
            title="Estados" 
            className="hidden md:flex hover:text-white hover:bg-slate-700/50 w-9 h-9 rounded-lg items-center justify-center transition relative"
          >
            <i className="fa-solid fa-circle-notch"></i>
            <span className="absolute top-2 right-2 w-2 h-2 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full border border-slate-900"></span>
          </button>
          
          <div className="relative">
            <button 
              title="Menú" 
              className={`hover:text-white transition w-9 h-9 rounded-lg flex items-center justify-center ${showMenu ? 'bg-slate-700 text-white' : ''}`}
              onClick={() => setShowMenu(!showMenu)}
            >
              <i className="fa-solid fa-ellipsis-vertical"></i>
            </button>
            
            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 top-10 bg-slate-800 shadow-xl py-2 w-48 rounded-xl z-50 border border-slate-700/50 animate-scale-in origin-top-right backdrop-blur-xl">
                 {onOpenHome && (
                   <button 
                      onClick={() => { onOpenHome(); setShowMenu(false); }} 
                      className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-700/50 hover:text-white text-sm transition"
                   >
                      <i className="fa-solid fa-house mr-2 text-blue-400"></i> Inicio
                   </button>
                 )}
                 <button 
                    onClick={() => { onOpenNotifications(); setShowMenu(false); }} 
                    className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-700/50 hover:text-white text-sm md:hidden transition"
                 >
                    <i className="fa-solid fa-bell mr-2 text-amber-400"></i> Notificaciones
                 </button>
                 <button 
                    onClick={() => { onOpenWallet(); setShowMenu(false); }} 
                    className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-700/50 hover:text-white text-sm transition"
                 >
                    <i className="fa-solid fa-wallet mr-2 text-emerald-400"></i> Billetera
                 </button>
                 <button 
                    onClick={() => { onOpenFinancials(); setShowMenu(false); }} 
                    className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-700/50 hover:text-white text-sm transition"
                 >
                    <i className="fa-solid fa-chart-line mr-2 text-violet-400"></i> Financiero
                 </button>
                 <button 
                    onClick={() => { onOpenStatus(); setShowMenu(false); }} 
                    className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-700/50 hover:text-white text-sm md:hidden transition"
                 >
                    <i className="fa-solid fa-circle-notch mr-2 text-pink-400"></i> Estados
                 </button>
                 <div className="h-px bg-slate-700/50 my-1"></div>
                 {onEditProfile && (
                   <button 
                      onClick={() => { onEditProfile(); setShowMenu(false); }}
                      className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-700/50 hover:text-white text-sm transition"
                   >
                      <i className="fa-solid fa-user-pen mr-2 text-cyan-400"></i> Editar Perfil
                   </button>
                 )}
                 <button 
                    onClick={() => { onLogout(); setShowMenu(false); }}
                    className="w-full text-left px-4 py-2 text-rose-400 hover:bg-rose-500/10 text-sm font-medium transition"
                 >
                    <i className="fa-solid fa-right-from-bracket mr-2"></i> Cerrar sesión
                 </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col border-b border-slate-700/50 bg-slate-900">
        <div className="p-3 flex gap-2">
          <div className="bg-slate-800/50 rounded-xl px-3 py-2 flex items-center flex-1 transition border border-slate-700/50 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20">
            <button className="text-slate-500 px-2 mr-1">
                 <i className="fa-solid fa-search text-sm"></i>
            </button>
            <input 
              type="text" 
              placeholder="Buscar contactos..." 
              className="bg-transparent border-none outline-none text-slate-200 w-full text-sm placeholder-slate-500"
            />
          </div>
          {onSearchUsers && (
            <button
              onClick={onSearchUsers}
              title="Buscar usuarios nuevos"
              className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition shadow-lg shadow-blue-500/20"
            >
              <i className="fa-solid fa-user-plus text-sm"></i>
              <span className="text-sm font-medium hidden sm:inline">Buscar</span>
            </button>
          )}
        </div>
        
        {/* Simple Filter Chips */}
        <div className="flex gap-2 px-3 pb-3 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${filter === 'all' ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 border border-slate-700/50'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilter('client')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${filter === 'client' ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 border border-slate-700/50'}`}
            >
              Proyectos
            </button>
        </div>
        
        {/* View Mode Toggle - Contacts/Groups */}
        {groups && groups.length > 0 && (
          <div className="px-3 pb-3 flex gap-1 bg-slate-800/30 border-t border-slate-700/30 pt-2">
            <button
              onClick={() => setViewMode('contacts')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
                viewMode === 'contacts' 
                  ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg' 
                  : 'bg-slate-700/30 text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <i className="fa-solid fa-user"></i>
              Contactos ({contacts.length})
            </button>
            <button
              onClick={() => setViewMode('groups')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
                viewMode === 'groups' 
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg' 
                  : 'bg-slate-700/30 text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <i className="fa-solid fa-users-rectangle"></i>
              Grupos ({groups.length})
            </button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 md:pb-0 bg-slate-900">
        
        {/* Contacts View */}
        {viewMode === 'contacts' && filteredContacts.map(contact => (
          <div 
            key={contact.id}
            onMouseEnter={() => setHoveredContactId(contact.id)}
            onMouseLeave={() => setHoveredContactId(null)}
            className={`flex px-3 py-3 cursor-pointer hover:bg-slate-800/50 transition relative group border-l-4 ${selectedContactId === contact.id ? 'bg-slate-800/70 border-blue-500' : 'border-transparent'}`}
          >
            {/* Botón de eliminar - visible en hover */}
            {hoveredContactId === contact.id && onDeleteContact && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`¿Estás seguro de que quieres eliminar el chat con ${contact.clientName}?`)) {
                    onDeleteContact(contact.id);
                  }
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 w-8 h-8 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-lg flex items-center justify-center transition opacity-90 hover:opacity-100 shadow-lg"
                title="Eliminar chat"
              >
                <i className="fa-solid fa-trash text-xs"></i>
              </button>
            )}
            
            <div 
              onClick={() => onSelectContact(contact.id)}
              className="flex flex-1"
            >
              <div className="relative">
                  <img src={contact.avatar} alt={contact.clientName} className="w-12 h-12 rounded-full mr-3 object-cover flex-shrink-0 border-2 border-slate-700" />
                  {contact.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full border-2 border-slate-900"></div>
                  )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center border-b border-slate-800/50 pb-3 group-hover:border-transparent">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className={`text-[15px] font-medium truncate ${selectedContactId === contact.id ? 'text-white' : 'text-slate-200'}`}>{contact.clientName}</h3>
                  <span className={`text-[11px] ${contact.unreadCount > 0 ? 'text-blue-400 font-bold' : 'text-slate-500'}`}>
                    {contact.lastMessageTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex-1 min-w-0 pr-2">
                      {/* Project Tag */}
                      {(() => {
                          // Count only approved projects (those created from approved quotes)
                          const approvedProjects = contact.projects.filter((p: any) => p.metadata?.quoteCode);
                          // Remove duplicates by name (keep first occurrence)
                          const uniqueApprovedProjects = approvedProjects.filter((project: any, index: number, self: any[]) => 
                            index === self.findIndex((p: any) => p.name === project.name)
                          );
                          const approvedCount = uniqueApprovedProjects.length;
                          
                          if (approvedCount > 0) {
                              return (
                                  <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5 truncate text-blue-400 flex items-center gap-1">
                                       <i className="fa-solid fa-folder"></i> 
                                       {approvedCount > 1 ? `${approvedCount} Proyectos Activos` : uniqueApprovedProjects[0].name}
                                  </div>
                              );
                          } else {
                              return (
                                  <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5 truncate text-slate-500 flex items-center gap-1">
                                       <i className="fa-solid fa-user-tag"></i> Sin Proyecto
                                  </div>
                              );
                          }
                      })()}
                      <p className="text-sm text-slate-400 truncate flex items-center font-light">
                          {contact.lastMessage.includes('Gasto') && <i className="fa-solid fa-money-bill-wave text-rose-400 mr-1"></i>}
                          {contact.lastMessage.includes('Documento') && <i className="fa-solid fa-file-lines text-blue-400 mr-1"></i>}
                          {contact.lastMessage}
                      </p>
                  </div>
                  <div className="flex gap-2 items-center flex-shrink-0">
                    {contact.unreadCount > 0 && (
                      <span className="bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[11px] font-bold rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1 shadow-lg shadow-blue-500/20">
                        {contact.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Groups View */}
        {viewMode === 'groups' && (
          <div className="space-y-1">
            {/* Add Group Button */}
            {onOpenGroupsManager && (
              <button
                onClick={onOpenGroupsManager}
                className="w-full px-4 py-3 flex items-center gap-3 text-slate-400 hover:text-white hover:bg-slate-800/50 transition border-b border-slate-700/30"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 flex items-center justify-center text-white">
                  <i className="fa-solid fa-plus"></i>
                </div>
                <span className="font-medium text-sm">Crear o administrar grupos</span>
              </button>
            )}
            
            {/* Groups List */}
            {groups.map(group => (
              <div
                key={group.id}
                onClick={() => onSelectGroup && onSelectGroup(group.id)}
                className={`px-3 py-3 cursor-pointer hover:bg-slate-800/50 transition border-l-4 ${
                  selectedGroupId === group.id ? 'bg-slate-800/70 border-teal-500' : 'border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg ${
                    group.type === 'project' 
                      ? 'bg-gradient-to-br from-emerald-500 to-green-600' 
                      : 'bg-gradient-to-br from-teal-500 to-cyan-600'
                  }`}>
                    <i className={`fa-solid ${group.type === 'project' ? 'fa-folder-tree' : 'fa-users'} text-lg`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className="text-[15px] font-medium text-white truncate">{group.name}</h3>
                      {group.lastMessage && (
                        <span className="text-[11px] text-slate-500">
                          {new Date(group.lastMessage.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-teal-400">
                        <i className="fa-solid fa-users mr-1"></i>
                        {group.members.length} miembros
                        {group.subGroups && group.subGroups.length > 0 && (
                          <span className="ml-2 text-cyan-400">
                            • {group.subGroups.length} subgrupos
                          </span>
                        )}
                      </span>
                    </div>
                    {group.lastMessage && (
                      <p className="text-sm text-slate-400 truncate font-light mt-0.5">
                        {group.lastMessage.text}
                      </p>
                    )}
                  </div>
                  {group.unreadCount > 0 && (
                    <span className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-[11px] font-bold rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1 shadow-lg">
                      {group.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            {groups.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                <i className="fa-solid fa-users-slash text-3xl mb-3"></i>
                <p className="font-medium">No tienes grupos</p>
                <p className="text-xs mt-1">Crea uno para colaborar con tu equipo</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
