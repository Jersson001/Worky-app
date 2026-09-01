/**
 * InfoPanel — contact info side panel with 3 tabs: Resumen, Balance, Documentos.
 */
import React, { useState, useMemo } from 'react';
import { Contact, Message, Project } from '../../types';
import { formatCurrency } from '../../utils/currency';

interface InfoPanelProps {
  show: boolean;
  onClose: () => void;
  contact: Contact;
  messages: Message[];
  showSystemMessages: boolean;
  onViewDocument: (type: any, data: any) => void;
  onUpdateProjectInfo: (value: number, name: string, projectId: string) => void;
  onAddProject: (name: string) => void;
  onDeleteProject: (projectId: string) => void;
}

/**
 * Los proyectos del contacto.
 *
 * Antes solo se enseñaban los que traían `quoteCode`, o sea los nacidos de una
 * cotización aceptada. Ahora también se pueden añadir a mano, y con aquel filtro
 * el añadido no aparecía por ninguna parte. Se quitan duplicados por id y no por
 * nombre: dos cocinas del mismo cliente son dos proyectos distintos.
 */
const getUniqueApprovedProjects = (contact: Contact): Project[] => {
  const todos = (contact.projects || []).filter(p => p && p.name);
  return todos.filter((project, index, self) => index === self.findIndex(p => p.id === project.id));
};

export const InfoPanel: React.FC<InfoPanelProps> = React.memo(({
  show, onClose, contact, messages, showSystemMessages, onViewDocument, onUpdateProjectInfo,
  onAddProject, onDeleteProject,
}) => {
  const [infoTab, setInfoTab] = useState<'overview' | 'costs' | 'documents'>('overview');
  const [selectedProjectForCosts, setSelectedProjectForCosts] = useState<string | null>(null);
  const [selectedProjectForDocuments, setSelectedProjectForDocuments] = useState<string>('all');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [tempProjectValue, setTempProjectValue] = useState('');
  const [tempProjectName, setTempProjectName] = useState('');

  const uniqueApprovedProjects = useMemo(() => getUniqueApprovedProjects(contact), [contact]);
  const approvedProjectsCount = uniqueApprovedProjects.length;

  const startEditingProject = (p: Project) => {
    setEditingProjectId(p.id);
    setTempProjectName(p.name);
    setTempProjectValue(p.value.toString());
  };

  const handleSaveInfo = () => {
    if (editingProjectId) {
      onUpdateProjectInfo(Number(tempProjectValue), tempProjectName, editingProjectId);
      setEditingProjectId(null);
    }
  };

  // Helper: get project income from paid messages
  const getProjectIncome = (projectName: string) => {
    return messages.filter(m =>
      ((m.type === 'invoice' && m.isPaid) || (m.type === 'collection_account' && m.isPaid)) &&
      m.metadata?.projectName === projectName
    ).reduce((sum, m) => sum + (m.metadata?.total || m.metadata?.amount || 0), 0);
  };

  if (!show) return null;

  return (
    <div className="w-[350px] bg-white border-l border-slate-200 flex flex-col h-full absolute right-0 z-30 shadow-2xl animate-slide-in">
      {/* Header */}
      <div className="h-16 bg-white px-4 flex items-center gap-4 border-b border-slate-200 flex-shrink-0">
        <button onClick={onClose} className="text-slate-400 hover:text-indigo-600"><i className="fa-solid fa-xmark text-lg"></i></button>
        <h3 className="text-slate-800 font-bold">Info. del contacto</h3>
      </div>

      {/* Profile */}
      <div className="p-8 flex flex-col items-center bg-slate-50 border-b border-slate-100 mb-2">
        <img src={contact.avatar} className="w-24 h-24 rounded-full object-cover mb-4 shadow-md border-4 border-white" />
        <h2 className="text-slate-800 text-xl font-bold">{contact.clientName}</h2>
        <p className="text-slate-500 text-sm mt-1">{contact.phone}</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-white px-4">
        {([
          { key: 'overview' as const, icon: 'fa-info-circle', label: 'Resumen' },
          { key: 'costs' as const, icon: 'fa-scale-balanced', label: 'Balance' },
          { key: 'documents' as const, icon: 'fa-file-invoice', label: 'Documentos' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setInfoTab(tab.key)}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition ${
              infoTab === tab.key ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <i className={`fa-solid ${tab.icon} mr-1`}></i> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white p-6">
        {/* ── OVERVIEW TAB ── */}
        {infoTab === 'overview' && (
          <>
            {/* Income Summary */}
            <div className="mb-6">
              <h4 className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-4">Ingresos Recibidos</h4>
              {(() => {
                const paidInvoices = messages.filter(m => m.type === 'invoice' && m.isPaid);
                const paidCollections = messages.filter(m => m.type === 'collection_account' && m.isPaid);
                const totalInvoices = paidInvoices.reduce((sum, m) => sum + (m.metadata?.total || 0), 0);
                const totalCollections = paidCollections.reduce((sum, m) => sum + (m.metadata?.amount || 0), 0);
                const totalIncome = totalInvoices + totalCollections;

                if (totalIncome === 0) return <div className="text-slate-400 text-sm italic">Sin pagos recibidos.</div>;

                return (
                  <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <span className="block text-emerald-600 font-bold uppercase text-[9px] mb-1">Facturas Pagadas</span>
                        <span className="font-bold text-slate-800 text-lg">{formatCurrency(totalInvoices)}</span>
                        <span className="block text-slate-400 text-[10px] mt-1">{paidInvoices.length} factura{paidInvoices.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-emerald-600 font-bold uppercase text-[9px] mb-1">Cuentas de Cobro</span>
                        <span className="font-bold text-slate-800 text-lg">{formatCurrency(totalCollections)}</span>
                        <span className="block text-slate-400 text-[10px] mt-1">{paidCollections.length} cuenta{paidCollections.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="border-t border-emerald-200 pt-3">
                      <span className="block text-emerald-600 font-bold uppercase text-[9px] mb-1">Total Ingresos</span>
                      <span className="font-bold text-emerald-600 text-2xl">{formatCurrency(totalIncome)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Projects List */}
            <div className="mb-6">
              <h4 className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-4 flex justify-between items-center">
                <span>Proyectos Activos ({approvedProjectsCount})</span>
                <button
                  onClick={() => {
                    const nombre = window.prompt('Nombre del proyecto');
                    if (nombre?.trim()) onAddProject(nombre.trim());
                  }}
                  className="text-indigo-600 hover:text-indigo-800 font-bold normal-case text-xs flex items-center gap-1"
                  title="Añadir un proyecto a mano"
                >
                  <i className="fa-solid fa-plus"></i> Añadir
                </button>
              </h4>
              {approvedProjectsCount === 0 ? (
                <div className="text-slate-400 text-sm italic">Sin proyectos asignados.</div>
              ) : (
                <div className="space-y-4">
                  {uniqueApprovedProjects.map(p => {
                    const pExpenses = p.expenses.reduce((s, e) => s + e.amount, 0);
                    const projectPayments = messages.filter(m =>
                      ((m.type === 'invoice' && m.isPaid) || (m.type === 'collection_account' && m.isPaid) || (m.type === 'receipt' && m.isPaid)) &&
                      m.metadata?.projectName === p.name
                    );
                    const totalPayments = projectPayments.reduce((sum, m) => sum + (m.metadata?.total || m.metadata?.amount || 0), 0);
                    const projectBalance = p.value - totalPayments;

                    return (
                      <div key={p.id} className="bg-slate-50 rounded-xl border border-slate-100 p-4 relative group">
                        {editingProjectId === p.id ? (
                          <div className="mb-2 space-y-2">
                            <input type="text" value={tempProjectName} onChange={e => setTempProjectName(e.target.value)} className="w-full bg-white text-slate-800 p-2 rounded border border-slate-300 text-sm" />
                            <input type="number" value={tempProjectValue} onChange={e => setTempProjectValue(e.target.value)} className="w-full bg-white text-slate-800 p-2 rounded border border-slate-300 text-sm" />
                            <button onClick={handleSaveInfo} className="w-full bg-indigo-600 text-white py-1 rounded text-xs font-bold">Guardar</button>
                          </div>
                        ) : (
                          <div className="flex justify-between items-start mb-2 gap-2">
                            <div className="font-bold text-slate-800 text-sm flex-1">{p.name}</div>
                            <button onClick={() => startEditingProject(p)} className="text-slate-300 hover:text-indigo-600" title="Cambiar nombre o valor"><i className="fa-solid fa-pen text-xs"></i></button>
                            <button
                              onClick={() => {
                                if (window.confirm(`¿Borrar el proyecto «${p.name}»? Se van con él sus gastos.`)) onDeleteProject(p.id);
                              }}
                              className="text-slate-300 hover:text-red-600"
                              title="Borrar proyecto"
                            >
                              <i className="fa-solid fa-trash text-xs"></i>
                            </button>
                          </div>
                        )}
                        {!editingProjectId && (
                          <div className="space-y-3">
                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                              <div className="text-[10px] font-bold uppercase text-indigo-600 mb-2">Saldo del Proyecto</div>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-slate-600">Costo del Proyecto:</span>
                                <span className="text-sm font-bold text-slate-800">{formatCurrency(p.value)}</span>
                              </div>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-slate-600">Abonos Recibidos:</span>
                                <span className="text-sm font-bold text-emerald-600">-{formatCurrency(totalPayments)}</span>
                              </div>
                              <div className="pt-2 border-t border-indigo-300 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-700">Saldo Pendiente:</span>
                                <span className={`text-base font-bold ${projectBalance > 0 ? 'text-rose-600' : projectBalance === 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                  {formatCurrency(projectBalance)}
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="block text-slate-400 font-bold uppercase text-[9px]">Venta</span>
                                <span className="font-bold text-slate-700">{formatCurrency(p.value)}</span>
                              </div>
                              <div className="text-right">
                                <span className="block text-slate-400 font-bold uppercase text-[9px]">Gastos</span>
                                <span className="font-bold text-rose-500">{formatCurrency(pExpenses)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── COSTS TAB ── */}
        {infoTab === 'costs' && (
          <div>
            <h4 className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-4">Balance por Proyecto</h4>
            {uniqueApprovedProjects.length === 0 ? (
              <div className="text-slate-400 text-sm italic text-center py-8">Sin proyectos asignados.</div>
            ) : (
              <>
                {uniqueApprovedProjects.length > 1 && (
                  <select
                    value={selectedProjectForCosts || uniqueApprovedProjects[0]?.id || ''}
                    onChange={(e) => setSelectedProjectForCosts(e.target.value)}
                    className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 mb-4 border border-slate-200 outline-none focus:border-indigo-500"
                  >
                    {uniqueApprovedProjects.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                )}
                {(() => {
                  const selectedProject = uniqueApprovedProjects.length === 1
                    ? uniqueApprovedProjects[0]
                    : uniqueApprovedProjects.find(p => p.id === (selectedProjectForCosts || uniqueApprovedProjects[0]?.id));
                  if (!selectedProject) return null;

                  const projectIncome = getProjectIncome(selectedProject.name);
                  const projectExpenses = selectedProject.expenses.reduce((s, e) => s + e.amount, 0);
                  const balance = projectIncome - projectExpenses;

                  const incomes = messages.filter(m =>
                    ((m.type === 'invoice' && m.isPaid) || (m.type === 'collection_account' && m.isPaid)) &&
                    m.metadata?.projectName === selectedProject.name
                  );

                  return (
                    <div>
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4">
                        {uniqueApprovedProjects.length === 1 && <div className="font-bold text-slate-800 text-sm mb-3">{selectedProject.name}</div>}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-slate-500">Ingresos: </span><span className="font-bold text-emerald-500">{formatCurrency(projectIncome)}</span></div>
                          <div><span className="text-slate-500">Gastos: </span><span className="font-bold text-rose-500">{formatCurrency(projectExpenses)}</span></div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-indigo-300">
                          <span className="text-slate-500 text-xs">Balance: </span>
                          <span className={`font-bold text-sm ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(balance)}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h5 className="text-emerald-600 text-xs font-bold uppercase mt-4 mb-2">Ingresos</h5>
                        {incomes.length > 0 ? incomes.map((msg, idx) => (
                          <div key={`income-${msg.id}-${idx}`} className="flex justify-between items-start text-sm border-b border-slate-100 pb-2">
                            <div className="flex flex-col">
                              <span className="text-slate-700 font-medium">{msg.type === 'invoice' ? `Factura ${msg.metadata?.number}` : `Cta. Cobro ${msg.metadata?.number}`}</span>
                              <span className="text-[10px] text-slate-400">{new Date(msg.paidDate || msg.timestamp).toLocaleDateString()}</span>
                            </div>
                            <span className="text-emerald-500 font-bold whitespace-nowrap">+{formatCurrency(msg.metadata?.total || msg.metadata?.amount || 0)}</span>
                          </div>
                        )) : <div className="text-center py-2 text-slate-400 text-xs italic">Sin ingresos registrados</div>}

                        <h5 className="text-rose-600 text-xs font-bold uppercase mt-4 mb-2">Gastos</h5>
                        {selectedProject.expenses.length > 0 ? selectedProject.expenses.map((exp, idx) => (
                          <div key={`${exp.id}-${idx}`} className="flex justify-between items-start text-sm border-b border-slate-100 pb-2">
                            <div className="flex flex-col">
                              <span className="text-slate-700 font-medium">{exp.description}</span>
                              <span className="text-[10px] text-slate-400">{new Date(exp.date).toLocaleDateString()}</span>
                            </div>
                            <span className="text-rose-500 font-bold whitespace-nowrap">-{formatCurrency(exp.amount)}</span>
                          </div>
                        )) : <div className="text-center py-2 text-slate-400 text-xs italic">Sin gastos registrados</div>}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* ── DOCUMENTS TAB ── */}
        {infoTab === 'documents' && (
          <div>
            <h4 className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-4">Documentos Enviados</h4>
            {contact.projects.length > 0 && (
              <select
                value={selectedProjectForDocuments}
                onChange={(e) => setSelectedProjectForDocuments(e.target.value)}
                className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 mb-4 border border-slate-200 outline-none focus:border-indigo-500 text-sm"
              >
                <option value="all">Todos los proyectos</option>
                {contact.projects.map(p => (<option key={p.id} value={p.name}>{p.name}</option>))}
              </select>
            )}
            <div className="space-y-3">
              {(() => {
                const docMessages = messages.filter(m => {
                  if (m.type === 'text' || m.type === 'product') return false;
                  if (m.type === 'expense' && !showSystemMessages) return false;
                  if (selectedProjectForDocuments === 'all') return true;
                  return m.metadata?.projectName === selectedProjectForDocuments;
                });

                const docConfig: Record<string, { icon: string; color: string; label: string }> = {
                  invoice: { icon: 'fa-file-invoice-dollar', color: 'text-indigo-600', label: 'Factura' },
                  quote: { icon: 'fa-file-contract', color: 'text-teal-600', label: 'Cotización' },
                  collection_account: { icon: 'fa-file-invoice', color: 'text-orange-600', label: 'Cuenta de Cobro' },
                  receipt: { icon: 'fa-money-bills', color: 'text-emerald-600', label: 'Recibo' },
                  expense: { icon: 'fa-circle-minus', color: 'text-rose-600', label: 'Gasto' },
                  expense_receipt: { icon: 'fa-receipt', color: 'text-rose-600', label: 'Recibo de Gasto' },
                };

                return docMessages.length > 0 ? docMessages.map((msg, idx) => {
                  const cfg = docConfig[msg.type] || { icon: 'fa-file', color: 'text-slate-500', label: 'Documento' };
                  return (
                    <div key={idx}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:shadow-md transition cursor-pointer"
                      onClick={() => {
                        if (!msg.metadata || msg.type === 'expense') return;
                        if (msg.type === 'expense_receipt') {
                          onViewDocument('expense_receipt', msg.metadata);
                        } else {
                          onViewDocument(msg.type as any, msg.metadata);
                        }
                      }}
                    >
                      <div className={`w-10 h-10 rounded-full bg-white border-2 flex items-center justify-center ${cfg.color}`}>
                        <i className={`fa-solid ${cfg.icon}`}></i>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-slate-800">{cfg.label}</div>
                        <div className="text-xs text-slate-400">{new Date(msg.timestamp).toLocaleDateString()}</div>
                        {(msg.type === 'expense' || msg.type === 'expense_receipt') && msg.metadata && (
                          <div className="text-xs text-slate-600 mt-1">{msg.metadata.concept || msg.metadata.description}</div>
                        )}
                      </div>
                      {(msg.type === 'expense' || msg.type === 'expense_receipt') && msg.metadata ? (
                        <div className="text-rose-600 font-bold text-sm">-{formatCurrency(msg.metadata.amount)}</div>
                      ) : (
                        <i className="fa-solid fa-chevron-right text-slate-300"></i>
                      )}
                    </div>
                  );
                }) : (
                  <div className="text-center py-8 text-slate-400 text-xs italic bg-slate-50 rounded border border-dashed border-slate-200">
                    {selectedProjectForDocuments === 'all' ? 'No hay documentos enviados' : 'No hay documentos para este proyecto'}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

InfoPanel.displayName = 'InfoPanel';
