import React, { useState, useMemo } from 'react';
import { ChatGroup, SubGroup, GroupMember, Contact, Project, GroupType, GroupMemberRole, GroupMessage } from '../types';

interface GroupsManagerProps {
  groups: ChatGroup[];
  contacts: Contact[];
  onClose: () => void;
  onCreateGroup: (group: ChatGroup) => void;
  onUpdateGroup: (group: ChatGroup) => void;
  onDeleteGroup: (groupId: string) => void;
  onSelectGroup: (groupId: string, subGroupId?: string) => void;
}

// Iconos predefinidos para subgrupos
const SUBGROUP_ICONS = [
  { icon: 'fa-hammer', name: 'Carpintería', color: '#f59e0b' },
  { icon: 'fa-wrench', name: 'Plomería', color: '#3b82f6' },
  { icon: 'fa-bolt', name: 'Electricidad', color: '#eab308' },
  { icon: 'fa-paint-roller', name: 'Pintura', color: '#ec4899' },
  { icon: 'fa-hard-hat', name: 'Obra', color: '#f97316' },
  { icon: 'fa-ruler-combined', name: 'Diseño', color: '#8b5cf6' },
  { icon: 'fa-truck', name: 'Logística', color: '#14b8a6' },
  { icon: 'fa-handshake', name: 'Ventas', color: '#22c55e' },
  { icon: 'fa-calculator', name: 'Contabilidad', color: '#6366f1' },
  { icon: 'fa-users', name: 'Equipo', color: '#06b6d4' },
  { icon: 'fa-building', name: 'Arquitectura', color: '#64748b' },
  { icon: 'fa-leaf', name: 'Jardinería', color: '#22c55e' },
];

export const GroupsManager: React.FC<GroupsManagerProps> = ({
  groups,
  contacts,
  onClose,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onSelectGroup,
}) => {
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'members' | 'subgroups'>('list');
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  
  // Form states
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupType, setNewGroupType] = useState<GroupType>('general');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
  // Subgroup form states
  const [showSubgroupModal, setShowSubgroupModal] = useState(false);
  const [newSubgroupName, setNewSubgroupName] = useState('');
  const [newSubgroupIcon, setNewSubgroupIcon] = useState(SUBGROUP_ICONS[0]);
  const [selectedSubgroupMembers, setSelectedSubgroupMembers] = useState<string[]>([]);
  const [editingSubgroup, setEditingSubgroup] = useState<SubGroup | null>(null);

  // Get all projects from contacts (only from clients, not collaborators/suppliers)
  const allProjects = useMemo(() => {
    const projects: { project: Project; contact: Contact }[] = [];
    contacts.forEach(contact => {
      // Only include projects from clients (not suppliers or collaborators)
      if (contact.role === 'client' && contact.projects && contact.projects.length > 0) {
        contact.projects.forEach(project => {
          // Only include projects with valid names (not empty or default)
          if (project.name && project.name.trim() !== '') {
            projects.push({ project, contact });
          }
        });
      }
    });
    return projects;
  }, [contacts]);

  const resetForm = () => {
    setNewGroupName('');
    setNewGroupDescription('');
    setNewGroupType('general');
    setSelectedProjectId('');
    setSelectedMembers([]);
    setSelectedGroup(null);
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;

    const newGroup: ChatGroup = {
      id: `group-${Date.now()}`,
      name: newGroupName,
      description: newGroupDescription,
      type: newGroupType,
      projectId: newGroupType === 'project' ? selectedProjectId : undefined,
      members: selectedMembers.map(contactId => ({
        id: `member-${Date.now()}-${contactId}`,
        contactId,
        role: 'member' as GroupMemberRole,
        joinedAt: new Date(),
      })),
      subGroups: [],
      createdAt: new Date(),
      createdBy: 'me',
      unreadCount: 0,
    };

    // Add creator as admin
    newGroup.members.unshift({
      id: `member-${Date.now()}-me`,
      contactId: 'me',
      role: 'admin',
      joinedAt: new Date(),
    });

    onCreateGroup(newGroup);
    resetForm();
    setView('list');
  };

  const handleUpdateGroup = () => {
    if (!selectedGroup || !newGroupName.trim()) return;

    const updatedGroup: ChatGroup = {
      ...selectedGroup,
      name: newGroupName,
      description: newGroupDescription,
      members: selectedMembers.map(contactId => {
        const existingMember = selectedGroup.members.find(m => m.contactId === contactId);
        return existingMember || {
          id: `member-${Date.now()}-${contactId}`,
          contactId,
          role: 'member' as GroupMemberRole,
          joinedAt: new Date(),
        };
      }),
    };

    // Ensure admin is always present
    if (!updatedGroup.members.find(m => m.contactId === 'me')) {
      updatedGroup.members.unshift({
        id: `member-${Date.now()}-me`,
        contactId: 'me',
        role: 'admin',
        joinedAt: new Date(),
      });
    }

    onUpdateGroup(updatedGroup);
    resetForm();
    setView('list');
  };

  const handleCreateSubgroup = () => {
    if (!selectedGroup || !newSubgroupName.trim()) return;

    const newSubgroup: SubGroup = {
      id: `subgroup-${Date.now()}`,
      name: newSubgroupName,
      icon: newSubgroupIcon.icon,
      color: newSubgroupIcon.color,
      members: selectedSubgroupMembers.map(contactId => ({
        id: `member-${Date.now()}-${contactId}`,
        contactId,
        role: 'member' as GroupMemberRole,
        joinedAt: new Date(),
      })),
      createdAt: new Date(),
      parentGroupId: selectedGroup.id,
    };

    const updatedGroup: ChatGroup = {
      ...selectedGroup,
      subGroups: [...(selectedGroup.subGroups || []), newSubgroup],
    };

    onUpdateGroup(updatedGroup);
    setSelectedGroup(updatedGroup);
    setShowSubgroupModal(false);
    setNewSubgroupName('');
    setSelectedSubgroupMembers([]);
    setNewSubgroupIcon(SUBGROUP_ICONS[0]);
  };

  const handleDeleteSubgroup = (subgroupId: string) => {
    if (!selectedGroup) return;

    const updatedGroup: ChatGroup = {
      ...selectedGroup,
      subGroups: selectedGroup.subGroups?.filter(sg => sg.id !== subgroupId) || [],
    };

    onUpdateGroup(updatedGroup);
    setSelectedGroup(updatedGroup);
  };

  const openEditGroup = (group: ChatGroup) => {
    setSelectedGroup(group);
    setNewGroupName(group.name);
    setNewGroupDescription(group.description || '');
    setNewGroupType(group.type);
    setSelectedProjectId(group.projectId || '');
    setSelectedMembers(group.members.filter(m => m.contactId !== 'me').map(m => m.contactId));
    setView('edit');
  };

  const openSubgroupsView = (group: ChatGroup) => {
    setSelectedGroup(group);
    setView('subgroups');
  };

  const getContactById = (contactId: string): Contact | undefined => {
    return contacts.find(c => c.id === contactId);
  };

  const getMemberCount = (group: ChatGroup): number => {
    return group.members.length;
  };

  const getSubgroupCount = (group: ChatGroup): number => {
    return group.subGroups?.length || 0;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
              <i className="fa-solid fa-users-rectangle text-lg"></i>
            </div>
            <div>
              <h3 className="text-slate-900 font-bold text-lg">
                {view === 'list' && 'Grupos de Chat'}
                {view === 'create' && 'Crear Grupo'}
                {view === 'edit' && 'Editar Grupo'}
                {view === 'subgroups' && selectedGroup?.name}
              </h3>
              <p className="text-slate-500 text-[13px]">
                {view === 'list' && `${groups.length} grupos activos`}
                {view === 'create' && 'Crea un grupo para tu equipo'}
                {view === 'edit' && 'Modifica la configuración del grupo'}
                {view === 'subgroups' && 'Administra los subgrupos'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {view !== 'list' && (
              <button
                onClick={() => { resetForm(); setView('list'); }}
                className="text-slate-500 hover:text-slate-700 transition bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
              >
                <i className="fa-solid fa-arrow-left"></i> Volver
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition bg-slate-100 hover:bg-slate-200 w-9 h-9 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-white">

          {/* LIST VIEW */}
          {view === 'list' && (
            <div className="space-y-4">
              {/* Create button */}
              <button
                onClick={() => setView('create')}
                className="w-full bg-gradient-to-br from-blue-600 to-blue-700 text-white py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-3 shadow-md shadow-blue-500/30 hover:shadow-lg transition"
              >
                <i className="fa-solid fa-plus"></i>
                Crear Nuevo Grupo
              </button>

              {/* Groups list */}
              {groups.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <i className="fa-solid fa-users-slash text-4xl mb-4"></i>
                  <p className="font-medium">No tienes grupos aún</p>
                  <p className="text-sm mt-1">Crea tu primer grupo para colaborar con tu equipo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groups.map(group => (
                    <div key={group.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden">
                      {/* Group header */}
                      <div
                        className="p-4 flex items-center justify-between cursor-pointer transition"
                        onClick={() => setExpandedGroupId(expandedGroupId === group.id ? null : group.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md ${
                            group.type === 'project' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30' : 'bg-gradient-to-br from-blue-600 to-blue-700 shadow-blue-500/30'
                          }`}>
                            <i className={`fa-solid ${group.type === 'project' ? 'fa-folder-tree' : 'fa-users'} text-xl`}></i>
                          </div>
                          <div>
                            <h4 className="text-slate-900 font-bold">{group.name}</h4>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              <span><i className="fa-solid fa-user mr-1"></i>{getMemberCount(group)} miembros</span>
                              {getSubgroupCount(group) > 0 && (
                                <span><i className="fa-solid fa-layer-group mr-1"></i>{getSubgroupCount(group)} subgrupos</span>
                              )}
                              {group.type === 'project' && (
                                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                  <i className="fa-solid fa-briefcase mr-1"></i>Proyecto
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); onSelectGroup(group.id); onClose(); }}
                            className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:shadow-md transition"
                          >
                            <i className="fa-solid fa-comment mr-1"></i> Chat
                          </button>
                          <i className={`fa-solid fa-chevron-down text-slate-400 transition-transform ${expandedGroupId === group.id ? 'rotate-180' : ''}`}></i>
                        </div>
                      </div>

                      {/* Expanded content */}
                      {expandedGroupId === group.id && (
                        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3 animate-fade-in">
                          {/* Description */}
                          {group.description && (
                            <p className="text-slate-500 text-sm">{group.description}</p>
                          )}

                          {/* Subgroups preview */}
                          {group.subGroups && group.subGroups.length > 0 && (
                            <div>
                              <p className="text-xs text-slate-400 uppercase font-bold mb-2">Subgrupos</p>
                              <div className="flex flex-wrap gap-2">
                                {group.subGroups.map(sg => (
                                  <button
                                    key={sg.id}
                                    onClick={() => { onSelectGroup(group.id, sg.id); onClose(); }}
                                    className="bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-2 transition"
                                    style={{ borderLeft: `3px solid ${sg.color}` }}
                                  >
                                    <i className={`fa-solid ${sg.icon}`} style={{ color: sg.color }}></i>
                                    {sg.name}
                                    <span className="text-slate-400">({sg.members.length})</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Members preview */}
                          <div>
                            <p className="text-xs text-slate-400 uppercase font-bold mb-2">Miembros</p>
                            <div className="flex -space-x-2">
                              {group.members.slice(0, 6).map((member, idx) => {
                                const contact = getContactById(member.contactId);
                                return contact ? (
                                  <img
                                    key={member.id}
                                    src={contact.avatar}
                                    alt={contact.clientName}
                                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                                    title={contact.clientName}
                                  />
                                ) : member.contactId === 'me' ? (
                                  <div key={member.id} className="w-8 h-8 rounded-full border-2 border-white shadow-sm bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-xs font-bold">
                                    Yo
                                  </div>
                                ) : null;
                              })}
                              {group.members.length > 6 && (
                                <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
                                  +{group.members.length - 6}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => openSubgroupsView(group)}
                              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                            >
                              <i className="fa-solid fa-layer-group"></i> Subgrupos
                            </button>
                            <button
                              onClick={() => openEditGroup(group)}
                              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                            >
                              <i className="fa-solid fa-pen"></i> Editar
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('¿Estás seguro de eliminar este grupo?')) {
                                  onDeleteGroup(group.id);
                                }
                              }}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2 rounded-lg text-xs font-bold transition"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CREATE/EDIT VIEW */}
          {(view === 'create' || view === 'edit') && (
            <div className="space-y-5">
              {/* Group Type */}
              {view === 'create' && (
                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Tipo de Grupo</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setNewGroupType('general')}
                      className={`p-4 rounded-xl transition flex flex-col items-center gap-2 ${
                        newGroupType === 'general'
                          ? 'bg-blue-50 text-blue-600 shadow-sm'
                          : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <i className="fa-solid fa-users text-2xl"></i>
                      <span className="font-bold text-sm">Grupo General</span>
                      <span className="text-xs opacity-70">Para cualquier equipo</span>
                    </button>
                    <button
                      onClick={() => setNewGroupType('project')}
                      className={`p-4 rounded-xl transition flex flex-col items-center gap-2 ${
                        newGroupType === 'project'
                          ? 'bg-emerald-50 text-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <i className="fa-solid fa-folder-tree text-2xl"></i>
                      <span className="font-bold text-sm">Grupo de Proyecto</span>
                      <span className="text-xs opacity-70">Vinculado a un proyecto</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Project selector */}
              {newGroupType === 'project' && (
                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Proyecto Asociado</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-3 rounded-xl outline-none focus:border-blue-500 transition"
                  >
                    <option value="">-- Seleccionar proyecto --</option>
                    {allProjects.map(({ project, contact }) => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({contact.clientName})
                      </option>
                    ))}
                  </select>
                  {allProjects.length === 0 && (
                    <p className="text-xs text-amber-600 mt-2">
                      <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                      No hay proyectos disponibles. Crea un proyecto con un cliente primero.
                    </p>
                  )}
                </div>
              )}

              {/* Group Name */}
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Nombre del Grupo *</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Ej: Equipo Edificio Central"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-3 rounded-xl outline-none focus:border-blue-500 transition placeholder-slate-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Descripción (opcional)</label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Descripción breve del grupo..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-3 rounded-xl outline-none focus:border-blue-500 transition placeholder-slate-400 resize-none"
                />
              </div>

              {/* Members */}
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold block mb-2">
                  Miembros ({selectedMembers.length} seleccionados)
                </label>
                <div className="bg-slate-50 rounded-xl max-h-48 overflow-y-auto">
                  {contacts.map(contact => (
                    <label
                      key={contact.id}
                      className="flex items-center gap-3 p-3 hover:bg-slate-100 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(contact.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers([...selectedMembers, contact.id]);
                          } else {
                            setSelectedMembers(selectedMembers.filter(id => id !== contact.id));
                          }
                        }}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <img src={contact.avatar} alt="" className="w-8 h-8 rounded-full" />
                      <div className="flex-1">
                        <p className="text-slate-900 text-sm font-medium">{contact.clientName}</p>
                        <p className="text-slate-500 text-xs">{contact.role === 'client' ? 'Cliente' : contact.role === 'supplier' ? 'Proveedor' : 'Colaborador'}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={view === 'create' ? handleCreateGroup : handleUpdateGroup}
                disabled={!newGroupName.trim()}
                className="w-full bg-gradient-to-br from-blue-600 to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/30 hover:shadow-lg transition"
              >
                <i className={`fa-solid ${view === 'create' ? 'fa-plus' : 'fa-check'}`}></i>
                {view === 'create' ? 'Crear Grupo' : 'Guardar Cambios'}
              </button>
            </div>
          )}

          {/* SUBGROUPS VIEW */}
          {view === 'subgroups' && selectedGroup && (
            <div className="space-y-4">
              {/* Create subgroup button */}
              <button
                onClick={() => setShowSubgroupModal(true)}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 hover:border-blue-400 text-slate-500 hover:text-slate-700 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition"
              >
                <i className="fa-solid fa-plus"></i>
                Crear Subgrupo
              </button>

              {/* Subgroups list */}
              {(!selectedGroup.subGroups || selectedGroup.subGroups.length === 0) ? (
                <div className="text-center py-12 text-slate-400">
                  <i className="fa-solid fa-layer-group text-4xl mb-4"></i>
                  <p className="font-medium">No hay subgrupos</p>
                  <p className="text-sm mt-1">Crea subgrupos para organizar equipos específicos</p>
                  <p className="text-xs mt-3 text-slate-400">Ej: Carpinteros, Plomeros, Electricistas...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedGroup.subGroups.map(subgroup => (
                    <div
                      key={subgroup.id}
                      className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-4"
                      style={{ borderLeftWidth: '4px', borderLeftColor: subgroup.color }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: subgroup.color + '20' }}
                          >
                            <i className={`fa-solid ${subgroup.icon}`} style={{ color: subgroup.color }}></i>
                          </div>
                          <div>
                            <h4 className="text-slate-900 font-bold">{subgroup.name}</h4>
                            <p className="text-slate-500 text-xs">{subgroup.members.length} miembros</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { onSelectGroup(selectedGroup.id, subgroup.id); onClose(); }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                          >
                            <i className="fa-solid fa-comment mr-1"></i> Chat
                          </button>
                          <button
                            onClick={() => handleDeleteSubgroup(subgroup.id)}
                            className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition"
                          >
                            <i className="fa-solid fa-trash text-sm"></i>
                          </button>
                        </div>
                      </div>

                      {/* Members */}
                      {subgroup.members.length > 0 && (
                        <div className="mt-3 flex -space-x-2">
                          {subgroup.members.slice(0, 5).map(member => {
                            const contact = getContactById(member.contactId);
                            return contact ? (
                              <img
                                key={member.id}
                                src={contact.avatar}
                                alt={contact.clientName}
                                className="w-7 h-7 rounded-full border-2 border-white shadow-sm"
                                title={contact.clientName}
                              />
                            ) : null;
                          })}
                          {subgroup.members.length > 5 && (
                            <div className="w-7 h-7 rounded-full border-2 border-white shadow-sm bg-slate-200 flex items-center justify-center text-slate-600 text-[10px] font-bold">
                              +{subgroup.members.length - 5}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Subgroup Creation Modal */}
        {showSubgroupModal && selectedGroup && (
          <div className="absolute inset-0 bg-slate-900/40 z-10 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">
              <h3 className="text-slate-900 font-bold text-lg mb-4 flex items-center gap-2">
                <i className="fa-solid fa-layer-group text-blue-600"></i>
                Crear Subgrupo
              </h3>

              <div className="space-y-4">
                {/* Subgroup Name */}
                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Nombre del Subgrupo</label>
                  <input
                    type="text"
                    value={newSubgroupName}
                    onChange={(e) => setNewSubgroupName(e.target.value)}
                    placeholder="Ej: Carpinteros"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-3 rounded-xl outline-none focus:border-blue-500 transition placeholder-slate-400"
                  />
                </div>

                {/* Icon selector */}
                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Icono y Color</label>
                  <div className="grid grid-cols-6 gap-2">
                    {SUBGROUP_ICONS.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => setNewSubgroupIcon(item)}
                        className={`p-3 rounded-lg transition flex items-center justify-center ${
                          newSubgroupIcon.icon === item.icon
                            ? 'ring-2 ring-blue-500 bg-blue-50'
                            : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                        title={item.name}
                      >
                        <i className={`fa-solid ${item.icon} text-lg`} style={{ color: item.color }}></i>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Members from parent group */}
                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold block mb-2">
                    Miembros (del grupo principal)
                  </label>
                  <div className="bg-slate-50 rounded-xl max-h-40 overflow-y-auto">
                    {selectedGroup.members.filter(m => m.contactId !== 'me').map(member => {
                      const contact = getContactById(member.contactId);
                      if (!contact) return null;
                      return (
                        <label
                          key={member.id}
                          className="flex items-center gap-3 p-3 hover:bg-slate-100 cursor-pointer transition"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSubgroupMembers.includes(member.contactId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSubgroupMembers([...selectedSubgroupMembers, member.contactId]);
                              } else {
                                setSelectedSubgroupMembers(selectedSubgroupMembers.filter(id => id !== member.contactId));
                              }
                            }}
                            className="w-4 h-4 accent-blue-600"
                          />
                          <img src={contact.avatar} alt="" className="w-7 h-7 rounded-full" />
                          <span className="text-slate-900 text-sm">{contact.clientName}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowSubgroupModal(false);
                      setNewSubgroupName('');
                      setSelectedSubgroupMembers([]);
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateSubgroup}
                    disabled={!newSubgroupName.trim()}
                    className="flex-1 bg-gradient-to-br from-blue-600 to-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold shadow-md shadow-blue-500/30 hover:shadow-lg transition"
                  >
                    <i className="fa-solid fa-plus mr-2"></i>
                    Crear
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
