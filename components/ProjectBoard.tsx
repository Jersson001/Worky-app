
import React from 'react';
import { Contact, ProjectStage } from '../types';

interface ProjectBoardProps {
  contacts: Contact[];
  onContactClick: (id: string) => void;
  onOpenGantt?: (projectId?: string) => void;
}

export const ProjectBoard: React.FC<ProjectBoardProps> = ({ contacts, onContactClick, onOpenGantt }) => {
  const stages = Object.values(ProjectStage);

  const getStageColor = (stage: ProjectStage) => {
    switch (stage) {
      case ProjectStage.Inquiry: return 'border-slate-400';
      case ProjectStage.Proposal: return 'border-blue-500';
      case ProjectStage.InProgress: return 'border-amber-500';
      case ProjectStage.Invoicing: return 'border-purple-500';
      case ProjectStage.Done: return 'border-emerald-500';
      default: return 'border-gray-400';
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  };

  // Flatten projects
  const allProjects = contacts.flatMap(contact => 
      contact.projects.map(project => ({
          ...project,
          contactId: contact.id,
          contactName: contact.clientName,
          avatar: contact.avatar
      }))
  );

  return (
    <div className="flex-1 h-full bg-[#f1f5f9] p-6 overflow-hidden flex flex-col">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tablero de Proyectos</h1>
          <p className="text-slate-500 text-sm">Flujo de trabajo comercial</p>
        </div>
        <div className="flex gap-2">
          {onOpenGantt && (
            <button 
              onClick={() => onOpenGantt()}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition shadow-md shadow-purple-200"
            >
              <i className="fa-solid fa-chart-gantt mr-2"></i>Ver Gantt
            </button>
          )}
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition shadow-md shadow-indigo-200">
            <i className="fa-solid fa-plus mr-2"></i>Nuevo Proyecto
          </button>
        </div>
      </div>

      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageProjects = allProjects.filter(p => p.stage === stage);
          return (
            <div key={stage} className="w-80 bg-slate-100 rounded-xl flex flex-col flex-shrink-0 border border-slate-200 h-full shadow-sm">
               {/* Header */}
               <div className={`p-3 border-t-4 ${getStageColor(stage)} bg-white rounded-t-xl flex justify-between items-center border-b border-slate-200`}>
                 <h3 className="font-bold text-slate-700 text-sm">{stage}</h3>
                 <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full font-bold">{stageProjects.length}</span>
               </div>

               {/* Cards */}
               <div className="p-3 overflow-y-auto flex-1 flex flex-col gap-3 custom-scrollbar">
                  {stageProjects.map(project => {
                    const totalExpenses = project.expenses.reduce((sum, e) => sum + e.amount, 0);
                    const profit = project.value - totalExpenses;
                    const phaseProgress = project.phases?.length 
                      ? Math.round(project.phases.reduce((sum, p) => sum + p.progress, 0) / project.phases.length)
                      : null;

                    return (
                      <div 
                        key={project.id}
                        onClick={() => onContactClick(project.contactId)}
                        className="bg-white p-4 rounded-xl cursor-pointer hover:shadow-md transition border border-slate-200 group relative"
                      >
                        {/* Gantt Quick Button */}
                        {onOpenGantt && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenGantt(project.id);
                            }}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 p-1.5 rounded-lg transition-all"
                            title="Ver cronograma Gantt"
                          >
                            <i className="fa-solid fa-chart-gantt text-xs"></i>
                          </button>
                        )}
                        
                        <div className="flex items-center gap-3 mb-3">
                          <img src={project.avatar} alt={project.contactName} className="w-10 h-10 rounded-full object-cover border border-slate-100" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-slate-800 text-sm font-bold truncate">{project.name}</h4>
                            <span className="text-xs text-slate-500 block truncate flex items-center gap-1">
                                <i className="fa-solid fa-user text-xs"></i> {project.contactName}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar if phases exist */}
                        {phaseProgress !== null && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-[10px] mb-1">
                              <span className="text-slate-400 uppercase font-bold">Progreso Fases</span>
                              <span className="text-indigo-600 font-bold">{phaseProgress}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                                style={{ width: `${phaseProgress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                        
                        {/* Mini Financial Summary */}
                        <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                           <div>
                              <span className="text-slate-400 block text-[9px] uppercase font-bold">Venta</span>
                              <span className="text-slate-700 font-medium">{formatCurrency(project.value)}</span>
                           </div>
                           <div className="text-right">
                              <span className="text-slate-400 block text-[9px] uppercase font-bold">Ganancia</span>
                              <span className={`font-bold ${profit > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {formatCurrency(profit)}
                              </span>
                           </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {stageProjects.length === 0 && (
                    <div className="text-center py-10 opacity-40">
                       <i className="fa-solid fa-box-open text-4xl text-slate-400 mb-2"></i>
                       <p className="text-xs text-slate-500 font-medium">Sin proyectos</p>
                    </div>
                  )}
               </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};
