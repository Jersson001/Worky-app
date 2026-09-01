
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
  hasUnreadNotifications?: boolean;
  // Group props
  groups?: ChatGroup[];
  selectedGroupId?: string | null;
  onSelectGroup?: (groupId: string, subGroupId?: string) => void;
  onOpenGroupsManager?: () => void;
}

const STATUS_TAG_STYLE: Record<string, string> = {
  [UserStatus.Lead]: 'bg-violet-50 text-violet-600',
  [UserStatus.Client]: 'bg-blue-50 text-blue-600',
  [UserStatus.Completed]: 'bg-slate-100 text-slate-500',
  [UserStatus.Archived]: 'bg-slate-100 text-slate-500',
};

const FILTERS: { key: string; label: string; status?: UserStatus }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'lead', label: 'Leads', status: UserStatus.Lead },
  { key: 'client', label: 'Clientes activos', status: UserStatus.Client },
  { key: 'done', label: 'Finalizados', status: UserStatus.Completed },
];

export const ChatList: React.FC<ChatListProps> = ({ contacts, selectedContactId, onSelectContact, onOpenFinancials, onOpenStatus, onOpenWallet, onOpenNotifications, onOpenHome, onDeleteContact, onLogout, onSearchUsers, onEditProfile, hasUnreadNotifications = false, groups = [], selectedGroupId, onSelectGroup, onOpenGroupsManager }) => {
  const [filter, setFilter] = useState<string>('all');
  const [showMenu, setShowMenu] = useState(false);
  const [hoveredContactId, setHoveredContactId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'contacts' | 'groups'>('contacts');
  const [searchTerm, setSearchTerm] = useState('');

  const activeFilter = FILTERS.find(f => f.key === filter) ?? FILTERS[0];
  /** Milisegundos de la última conversación, tolerando lo que traiga el campo. */
  const cuando = (v: Contact['lastMessageTime']): number => {
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'number') return v;
    const t = v ? new Date(v as any).getTime() : NaN;
    return Number.isNaN(t) ? 0 : t;
  };

  // Se ordena aquí y no solo al cargar de la base: al mandar o recibir un
  // mensaje, App parchea `lastMessageTime` en su estado, y ordenar al pintar es
  // lo que hace que la conversación suba al momento, sin esperar una recarga.
  const filteredContacts = contacts
    .filter(c => !activeFilter.status || c.status === activeFilter.status)
    .filter(c => !searchTerm.trim() || c.clientName.toLowerCase().includes(searchTerm.trim().toLowerCase()))
    .slice()
    .sort((a, b) => cuando(b.lastMessageTime) - cuando(a.lastMessageTime));

  const initials = (name: string) => name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 text-slate-900">
      {/* Header - Brand Area */}
      <div className="px-4 pt-4 pb-2 flex justify-between items-start flex-shrink-0 relative z-20">
        <div>
          <div className="flex items-center gap-2.5">
            <img src="/worky-logo 2.png" alt="Worky" className="w-11 h-11 object-contain" />
            <span className="font-bold text-slate-900 text-lg tracking-tight">Worky</span>
          </div>
        </div>

        <div className="flex gap-1 text-slate-500 items-start pt-1">
          {onSearchUsers && (
            <button
              onClick={onSearchUsers}
              title="Buscar usuarios nuevos"
              className="hover:text-slate-900 hover:bg-slate-100 w-8 h-8 rounded-lg flex items-center justify-center transition"
            >
              <i className="fa-solid fa-user-plus text-sm"></i>
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
            className="hover:text-slate-900 hover:bg-slate-100 w-8 h-8 rounded-lg flex items-center justify-center transition relative cursor-pointer z-10"
          >
            <i className="fa-solid fa-bell text-sm"></i>
            {hasUnreadNotifications && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full border border-white"></span>
            )}
          </button>

          <div className="relative">
            <button
              title="Menú"
              className={`hover:text-slate-900 transition w-8 h-8 rounded-lg flex items-center justify-center ${showMenu ? 'bg-slate-100 text-slate-900' : ''}`}
              onClick={() => setShowMenu(!showMenu)}
            >
              <i className="fa-solid fa-ellipsis-vertical text-sm"></i>
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 top-10 bg-white shadow-lg py-2 w-52 rounded-xl z-50 border border-slate-200 animate-scale-in origin-top-right">
                {onOpenHome && (
                  <button
                    onClick={() => { onOpenHome(); setShowMenu(false); }}
                    className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 text-sm transition flex items-center gap-2"
                  >
                    <i className="fa-solid fa-house text-blue-600 w-4"></i> Inicio
                  </button>
                )}
                <button
                  onClick={() => { onOpenWallet(); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 text-sm transition flex items-center gap-2"
                >
                  <i className="fa-solid fa-wallet text-emerald-600 w-4"></i> Billetera
                </button>
                <button
                  onClick={() => { onOpenFinancials(); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 text-sm transition flex items-center gap-2"
                >
                  <i className="fa-solid fa-chart-line text-violet-600 w-4"></i> Financiero
                </button>
                <button
                  onClick={() => { onOpenStatus(); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 text-sm transition flex items-center gap-2"
                >
                  <i className="fa-solid fa-circle-notch text-pink-600 w-4"></i> Estados
                </button>
                <div className="h-px bg-slate-100 my-1"></div>
                {onEditProfile && (
                  <button
                    onClick={() => { onEditProfile(); setShowMenu(false); }}
                    className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 text-sm transition flex items-center gap-2"
                  >
                    <i className="fa-solid fa-user-pen text-cyan-600 w-4"></i> Editar Perfil
                  </button>
                )}
                <button
                  onClick={() => { onLogout(); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 text-sm font-medium transition flex items-center gap-2"
                >
                  <i className="fa-solid fa-right-from-bracket w-4"></i> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col border-b border-slate-200 bg-white">
        <div className="px-4 pb-3">
          <div className="bg-slate-100 rounded-lg px-3 py-2 flex items-center flex-1 transition">
            <i className="fa-solid fa-magnifying-glass text-slate-400 text-sm mr-2"></i>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar contactos..."
              className="bg-transparent border-none outline-none text-slate-900 w-full text-sm placeholder-slate-400"
            />
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap ${filter === f.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* View Mode Toggle - Contacts/Groups */}
        {groups && groups.length > 0 && (
          <div className="px-4 pb-3 flex gap-1 border-t border-slate-100 pt-2.5">
            <button
              onClick={() => setViewMode('contacts')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${viewMode === 'contacts'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
            >
              <i className="fa-solid fa-user"></i>
              Contactos ({contacts.length})
            </button>
            <button
              onClick={() => setViewMode('groups')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${viewMode === 'groups'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
            >
              <i className="fa-solid fa-users-rectangle"></i>
              Grupos ({groups.length})
            </button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 md:pb-0 bg-white">

        {/* Contacts View */}
        {viewMode === 'contacts' && filteredContacts.map(contact => (
          <div
            key={contact.id}
            onMouseEnter={() => setHoveredContactId(contact.id)}
            onMouseLeave={() => setHoveredContactId(null)}
            className={`flex px-4 py-3 cursor-pointer hover:bg-slate-50 transition relative group border-l-2 ${selectedContactId === contact.id ? 'bg-slate-50 border-blue-600' : 'border-transparent'}`}
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
                className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10 w-7 h-7 bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center justify-center transition"
                title="Eliminar chat"
              >
                <i className="fa-solid fa-trash text-xs"></i>
              </button>
            )}

            <div
              onClick={() => onSelectContact(contact.id)}
              className="flex flex-1 items-center gap-3 min-w-0"
            >
              <div className="relative flex-shrink-0">
                {contact.avatar ? (
                  <img src={contact.avatar} alt={contact.clientName} className="w-11 h-11 rounded-full object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-slate-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                    {initials(contact.clientName)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[14.5px] font-semibold truncate text-slate-900">{contact.clientName}</h3>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${STATUS_TAG_STYLE[contact.status] || 'bg-slate-100 text-slate-500'}`}>{contact.status}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <p className={`text-[13px] truncate flex items-center gap-1 ${contact.unreadCount > 0 ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                    {contact.lastMessage.includes('Gasto') && <i className="fa-solid fa-money-bill-wave text-rose-500"></i>}
                    {contact.lastMessage.includes('Documento') && <i className="fa-solid fa-file-lines text-blue-600"></i>}
                    {contact.lastMessage}
                  </p>
                  <span className="text-[11px] text-slate-400 flex-shrink-0">
                    {contact.lastMessageTime instanceof Date
                      ? contact.lastMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : typeof contact.lastMessageTime === 'number'
                        ? new Date(contact.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : ''}
                  </span>
                </div>
              </div>
              {contact.unreadCount > 0 && (
                <span className="bg-blue-600 text-white text-[11px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5 flex-shrink-0">
                  {contact.unreadCount}
                </span>
              )}
            </div>
          </div>
        ))}

        {filteredContacts.length === 0 && viewMode === 'contacts' && (
          <div className="p-8 text-center text-slate-400">
            <i className="fa-solid fa-comment-slash text-2xl mb-3"></i>
            <p className="text-sm font-medium text-slate-500">Sin conversaciones</p>
          </div>
        )}

        {/* Groups View */}
        {viewMode === 'groups' && (
          <div>
            {/* Add Group Button */}
            {onOpenGroupsManager && (
              <button
                onClick={onOpenGroupsManager}
                className="w-full px-4 py-3 flex items-center gap-3 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition border-b border-slate-100"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-500/30">
                  <i className="fa-solid fa-plus text-lg"></i>
                </div>
                <span className="font-medium text-sm">Crear o administrar grupos</span>
              </button>
            )}

            {/* Groups List */}
            {groups.map(group => (
              <div
                key={group.id}
                onClick={() => onSelectGroup && onSelectGroup(group.id)}
                className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition border-l-2 ${selectedGroupId === group.id ? 'bg-slate-50 border-teal-600' : 'border-transparent'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white flex-shrink-0 ${group.type === 'project'
                      ? 'bg-emerald-500'
                      : 'bg-teal-500'
                    }`}>
                    <i className={`fa-solid ${group.type === 'project' ? 'fa-folder-tree' : 'fa-users'} text-base`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <h3 className="text-[14.5px] font-semibold text-slate-900 truncate">{group.name}</h3>
                      {group.lastMessage && (
                        <span className="text-[11px] text-slate-400 flex-shrink-0">
                          {new Date(group.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-teal-600">
                        <i className="fa-solid fa-users mr-1"></i>
                        {group.members.length} miembros
                        {group.subGroups && group.subGroups.length > 0 && (
                          <span className="ml-2 text-cyan-600">
                            · {group.subGroups.length} subgrupos
                          </span>
                        )}
                      </span>
                    </div>
                    {group.lastMessage && (
                      <p className="text-[13px] text-slate-500 truncate mt-0.5">
                        {group.lastMessage.text}
                      </p>
                    )}
                  </div>
                  {group.unreadCount > 0 && (
                    <span className="bg-teal-600 text-white text-[11px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0">
                      {group.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {groups.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                <i className="fa-solid fa-users-slash text-2xl mb-3"></i>
                <p className="font-medium text-slate-500 text-sm">No tienes grupos</p>
                <p className="text-xs mt-1">Crea uno para colaborar con tu equipo</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
