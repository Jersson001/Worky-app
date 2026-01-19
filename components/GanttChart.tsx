import React, { useState, useMemo } from 'react';
import { Project, ProjectPhase, ProjectPhaseType, Contact, PhaseReminder } from '../types';

interface GanttChartProps {
  contacts: Contact[];
  onClose: () => void;
  selectedProjectId?: string;
  onUpdateProject?: (contactId: string, project: Project) => void;
}

// Colores por tipo de fase
const PHASE_COLORS: Record<ProjectPhaseType, { bg: string; border: string; text: string }> = {
  [ProjectPhaseType.Planning]: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700' },
  [ProjectPhaseType.Design]: { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-700' },
  [ProjectPhaseType.MaterialPurchase]: { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-700' },
  [ProjectPhaseType.Manufacturing]: { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-700' },
  [ProjectPhaseType.QualityControl]: { bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-700' },
  [ProjectPhaseType.Delivery]: { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-700' },
  [ProjectPhaseType.Installation]: { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-700' },
  [ProjectPhaseType.FinalReview]: { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-700' },
  [ProjectPhaseType.Warranty]: { bg: 'bg-slate-100', border: 'border-slate-400', text: 'text-slate-700' },
};

const STATUS_ICONS: Record<string, { icon: string; color: string }> = {
  'pending': { icon: 'fa-clock', color: 'text-slate-400' },
  'in-progress': { icon: 'fa-spinner fa-spin', color: 'text-blue-500' },
  'completed': { icon: 'fa-check-circle', color: 'text-emerald-500' },
  'delayed': { icon: 'fa-exclamation-triangle', color: 'text-rose-500' },
};

// Tipo para plantilla de fase con duración por defecto
interface PhaseTemplate {
  type: ProjectPhaseType;
  name: string;
  defaultDays: number;
}

// Plantillas de fases predefinidas
const PHASE_TEMPLATES: { name: string; phases: PhaseTemplate[] }[] = [
  {
    name: 'Proyecto de Mobiliario',
    phases: [
      { type: ProjectPhaseType.Planning, name: 'Planificación y Presupuesto', defaultDays: 3 },
      { type: ProjectPhaseType.Design, name: 'Diseño y Aprobación', defaultDays: 5 },
      { type: ProjectPhaseType.MaterialPurchase, name: 'Compra de Materiales', defaultDays: 7 },
      { type: ProjectPhaseType.Manufacturing, name: 'Fabricación', defaultDays: 14 },
      { type: ProjectPhaseType.QualityControl, name: 'Control de Calidad', defaultDays: 2 },
      { type: ProjectPhaseType.Delivery, name: 'Entrega e Instalación', defaultDays: 3 },
      { type: ProjectPhaseType.FinalReview, name: 'Revisión con Cliente', defaultDays: 1 },
    ]
  },
  {
    name: 'Proyecto de Construcción',
    phases: [
      { type: ProjectPhaseType.Planning, name: 'Permisos y Planificación', defaultDays: 14 },
      { type: ProjectPhaseType.Design, name: 'Diseño Arquitectónico', defaultDays: 21 },
      { type: ProjectPhaseType.MaterialPurchase, name: 'Compra de Materiales', defaultDays: 10 },
      { type: ProjectPhaseType.Manufacturing, name: 'Construcción', defaultDays: 60 },
      { type: ProjectPhaseType.Installation, name: 'Acabados e Instalaciones', defaultDays: 21 },
      { type: ProjectPhaseType.QualityControl, name: 'Inspección', defaultDays: 3 },
      { type: ProjectPhaseType.Delivery, name: 'Entrega', defaultDays: 2 },
      { type: ProjectPhaseType.Warranty, name: 'Período de Garantía', defaultDays: 30 },
    ]
  },
  {
    name: 'Proyecto de Servicio',
    phases: [
      { type: ProjectPhaseType.Planning, name: 'Diagnóstico', defaultDays: 1 },
      { type: ProjectPhaseType.MaterialPurchase, name: 'Insumos', defaultDays: 2 },
      { type: ProjectPhaseType.Manufacturing, name: 'Ejecución', defaultDays: 5 },
      { type: ProjectPhaseType.QualityControl, name: 'Verificación', defaultDays: 1 },
      { type: ProjectPhaseType.Delivery, name: 'Entrega', defaultDays: 1 },
    ]
  },
];

export const GanttChart: React.FC<GanttChartProps> = ({ 
  contacts, 
  onClose, 
  selectedProjectId,
  onUpdateProject 
}) => {
  // Obtener todos los proyectos con info del contacto (sin duplicados)
  const allProjects = useMemo(() => {
    const projects = contacts.flatMap(contact =>
      contact.projects.map(project => ({
        ...project,
        contactId: contact.id,
        contactName: contact.clientName,
        avatar: contact.avatar
      }))
    );
    // Eliminar duplicados por ID de proyecto
    const uniqueProjects = projects.filter((project, index, self) =>
      index === self.findIndex(p => p.id === project.id)
    );
    return uniqueProjects;
  }, [contacts]);

  const [selectedProject, setSelectedProject] = useState<string | null>(selectedProjectId || (allProjects[0]?.id || null));
  const [viewMode, setViewMode] = useState<'days' | 'weeks' | 'months'>('weeks');
  const [showPhaseEditor, setShowPhaseEditor] = useState(false);
  const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Proyecto seleccionado actual
  const currentProject = useMemo(() => {
    return allProjects.find(p => p.id === selectedProject);
  }, [allProjects, selectedProject]);

  // Calcular rango de fechas para el Gantt
  const dateRange = useMemo(() => {
    if (!currentProject?.phases?.length) {
      const today = new Date();
      const start = new Date(today);
      start.setMonth(start.getMonth() - 1);
      const end = new Date(today);
      end.setMonth(end.getMonth() + 2);
      return { start, end, days: 90 };
    }

    const dates = currentProject.phases.flatMap(p => [new Date(p.startDate), new Date(p.endDate)]);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Agregar padding
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 14);
    
    const days = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    return { start: minDate, end: maxDate, days };
  }, [currentProject]);

  // Generar columnas de tiempo
  const timeColumns = useMemo(() => {
    const columns: { date: Date; label: string; isToday: boolean; isWeekend: boolean }[] = [];
    const current = new Date(dateRange.start);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (current <= dateRange.end) {
      const isToday = current.toDateString() === today.toDateString();
      const isWeekend = current.getDay() === 0 || current.getDay() === 6;
      
      let label = '';
      if (viewMode === 'days') {
        label = current.getDate().toString();
      } else if (viewMode === 'weeks') {
        if (current.getDay() === 1 || columns.length === 0) {
          label = `${current.getDate()}/${current.getMonth() + 1}`;
        }
      } else {
        if (current.getDate() === 1 || columns.length === 0) {
          label = current.toLocaleDateString('es-ES', { month: 'short' });
        }
      }

      columns.push({
        date: new Date(current),
        label,
        isToday,
        isWeekend
      });
      current.setDate(current.getDate() + 1);
    }
    return columns;
  }, [dateRange, viewMode]);

  // Calcular posición y ancho de una fase
  const getPhasePosition = (phase: ProjectPhase) => {
    const startDate = new Date(phase.startDate);
    const endDate = new Date(phase.endDate);
    
    const startDiff = Math.max(0, (startDate.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const columnWidth = viewMode === 'days' ? 40 : viewMode === 'weeks' ? 25 : 15;
    
    return {
      left: startDiff * columnWidth,
      width: duration * columnWidth
    };
  };

  // Calcular progreso general del proyecto
  const projectProgress = useMemo(() => {
    if (!currentProject?.phases?.length) return 0;
    const total = currentProject.phases.reduce((sum, p) => sum + p.progress, 0);
    return Math.round(total / currentProject.phases.length);
  }, [currentProject]);

  // Calcular alertas activas (recordatorios próximos)
  const activeAlerts = useMemo(() => {
    if (!currentProject?.phases?.length) return [];
    
    const now = new Date();
    const alerts: { phase: ProjectPhase; reminder: PhaseReminder; triggerDate: Date; daysUntil: number; hoursUntil: number }[] = [];
    
    currentProject.phases.forEach(phase => {
      if (phase.status === 'completed' || !phase.reminders) return;
      
      phase.reminders.forEach(reminder => {
        if (!reminder.enabled || reminder.notified) return;
        
        const referenceDate = reminder.type === 'before-end' 
          ? new Date(phase.endDate) 
          : new Date(phase.startDate);
        
        // Calcular cuándo debe dispararse el recordatorio
        const triggerDate = new Date(referenceDate);
        if (reminder.unit === 'days') {
          triggerDate.setDate(triggerDate.getDate() - reminder.amount);
        } else {
          triggerDate.setHours(triggerDate.getHours() - reminder.amount);
        }
        
        // Si la fecha de trigger ya pasó o es hoy, mostrar la alerta
        const diffMs = referenceDate.getTime() - now.getTime();
        const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const hoursUntil = Math.ceil(diffMs / (1000 * 60 * 60));
        
        if (now >= triggerDate && now <= referenceDate) {
          alerts.push({ phase, reminder, triggerDate, daysUntil, hoursUntil });
        }
      });
    });
    
    // Ordenar por urgencia (menor tiempo restante primero)
    return alerts.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [currentProject]);

  const [showAlertsPanel, setShowAlertsPanel] = useState(false);

  // Aplicar plantilla
  const applyTemplate = (templateIndex: number) => {
    if (!currentProject) return;
    
    const template = PHASE_TEMPLATES[templateIndex];
    let currentDate = new Date();
    
    const phases: ProjectPhase[] = template.phases.map((p, index) => {
      const phaseStart = new Date(currentDate);
      const duration = p.defaultDays; // Usar duración por defecto
      const phaseEnd = new Date(phaseStart);
      phaseEnd.setDate(phaseEnd.getDate() + duration - 1);
      
      // La siguiente fase comienza al día siguiente de que termine esta
      currentDate = new Date(phaseEnd);
      currentDate.setDate(currentDate.getDate() + 1);

      return {
        id: `phase-${Date.now()}-${index}`,
        type: p.type,
        name: p.name,
        startDate: phaseStart,
        endDate: phaseEnd,
        progress: 0,
        status: 'pending' as const,
        notes: '',
        reminders: [{ // Agregar recordatorio por defecto: 2 días antes del fin
          id: `reminder-default-${Date.now()}-${index}`,
          enabled: true,
          type: 'before-end' as const,
          amount: 2,
          unit: 'days' as const
        }]
      };
    });

    const updatedProject: Project = {
      ...currentProject,
      phases,
      endDate: phases[phases.length - 1]?.endDate
    };

    if (onUpdateProject) {
      onUpdateProject(currentProject.contactId, updatedProject);
    }
    setShowTemplateSelector(false);
  };

  // Agregar nueva fase
  const addPhase = () => {
    const newPhase: ProjectPhase = {
      id: `phase-${Date.now()}`,
      type: ProjectPhaseType.Planning,
      name: 'Nueva Fase',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      progress: 0,
      status: 'pending',
    };
    setEditingPhase(newPhase);
    setShowPhaseEditor(true);
  };

  // Guardar fase
  const savePhase = (phase: ProjectPhase) => {
    if (!currentProject) return;

    const existingPhases = currentProject.phases || [];
    const phaseIndex = existingPhases.findIndex(p => p.id === phase.id);
    
    let updatedPhases: ProjectPhase[];
    if (phaseIndex >= 0) {
      updatedPhases = [...existingPhases];
      updatedPhases[phaseIndex] = phase;
    } else {
      updatedPhases = [...existingPhases, phase];
    }

    // Ordenar por fecha de inicio
    updatedPhases.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    const updatedProject: Project = {
      ...currentProject,
      phases: updatedPhases,
      endDate: updatedPhases[updatedPhases.length - 1]?.endDate
    };

    if (onUpdateProject) {
      onUpdateProject(currentProject.contactId, updatedProject);
    }
    setShowPhaseEditor(false);
    setEditingPhase(null);
  };

  // Eliminar fase
  const deletePhase = (phaseId: string) => {
    if (!currentProject) return;

    const updatedPhases = (currentProject.phases || []).filter(p => p.id !== phaseId);
    const updatedProject: Project = {
      ...currentProject,
      phases: updatedPhases,
      endDate: updatedPhases[updatedPhases.length - 1]?.endDate
    };

    if (onUpdateProject) {
      onUpdateProject(currentProject.contactId, updatedProject);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-700/50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-violet-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <i className="fa-solid fa-chart-gantt text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold">Diagrama de Gantt</h2>
              <p className="text-white/70 text-sm">Gestión visual de cronograma de proyectos</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition"
          >
            <i className="fa-solid fa-times text-xl"></i>
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-slate-800 border-b border-slate-700 p-3 flex flex-wrap gap-3 items-center justify-between">
          {/* Selector de proyecto */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-400">Proyecto:</label>
            <select
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[250px]"
            >
              {allProjects.map((project, index) => (
                <option key={`${project.contactId}-${project.id}-${index}`} value={project.id}>
                  {project.name} - {project.contactName}
                </option>
              ))}
            </select>
          </div>

          {/* Controles de vista */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Vista:</span>
            <div className="bg-slate-700 border border-slate-600 rounded-lg p-1 flex">
              {(['days', 'weeks', 'months'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 rounded text-sm font-medium transition ${
                    viewMode === mode 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {mode === 'days' ? 'Días' : mode === 'weeks' ? 'Semanas' : 'Meses'}
                </button>
              ))}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            {/* Botón de alertas */}
            <button
              onClick={() => setShowAlertsPanel(!showAlertsPanel)}
              className={`relative px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                activeAlerts.length > 0 
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white animate-pulse shadow-lg shadow-rose-500/30' 
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              <i className="fa-solid fa-bell"></i>
              Alertas
              {activeAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-rose-600 text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow">
                  {activeAlerts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowTemplateSelector(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-lg shadow-amber-500/30"
            >
              <i className="fa-solid fa-wand-magic-sparkles"></i>
              Usar Plantilla
            </button>
            <button
              onClick={addPhase}
              className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-lg shadow-blue-500/30"
            >
              <i className="fa-solid fa-plus"></i>
              Agregar Fase
            </button>
          </div>
        </div>

        {/* Alerts Panel */}
        {showAlertsPanel && (
          <div className="bg-gradient-to-r from-slate-800 to-slate-800 border-b border-rose-500/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="fa-solid fa-bell text-rose-500"></i>
                Recordatorios Activos
              </h4>
              <button
                onClick={() => setShowAlertsPanel(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            {activeAlerts.length === 0 ? (
              <p className="text-sm text-slate-500 italic">
                <i className="fa-solid fa-check-circle text-emerald-500 mr-2"></i>
                No hay recordatorios pendientes en este momento
              </p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {activeAlerts.map((alert, idx) => (
                  <div 
                    key={`${alert.phase.id}-${alert.reminder.id}`}
                    className={`p-3 rounded-lg border ${
                      alert.daysUntil <= 1 
                        ? 'bg-rose-100 border-rose-300' 
                        : alert.daysUntil <= 3 
                          ? 'bg-amber-100 border-amber-300'
                          : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        alert.daysUntil <= 1 ? 'bg-rose-500' : alert.daysUntil <= 3 ? 'bg-amber-500' : 'bg-indigo-500'
                      } text-white`}>
                        <i className="fa-solid fa-clock text-sm"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 text-sm truncate">{alert.phase.name}</p>
                        <p className="text-xs text-slate-500">
                          {alert.reminder.type === 'before-end' ? 'Finaliza' : 'Inicia'} en{' '}
                          <span className="font-bold">
                            {alert.daysUntil > 0 
                              ? `${alert.daysUntil} día${alert.daysUntil > 1 ? 's' : ''}`
                              : alert.hoursUntil > 0 
                                ? `${alert.hoursUntil} hora${alert.hoursUntil > 1 ? 's' : ''}`
                                : 'Hoy'}
                          </span>
                        </p>
                        {alert.phase.responsible && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            <i className="fa-solid fa-user mr-1"></i>
                            {alert.phase.responsible}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setEditingPhase(alert.phase);
                          setShowPhaseEditor(true);
                        }}
                        className="text-slate-400 hover:text-indigo-500 p-1"
                        title="Editar fase"
                      >
                        <i className="fa-solid fa-pen text-xs"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Project Summary */}
        {currentProject && (
          <div className="bg-white border-b border-slate-200 p-4">
            <div className="flex items-center gap-4">
              <img 
                src={currentProject.avatar} 
                alt={currentProject.contactName}
                className="w-12 h-12 rounded-full border-2 border-slate-200"
              />
              <div className="flex-1">
                <h3 className="font-bold text-slate-800">{currentProject.name}</h3>
                <p className="text-sm text-slate-500">Cliente: {currentProject.contactName}</p>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <span className="block text-slate-400 text-xs">Valor</span>
                  <span className="font-bold text-slate-700">{formatCurrency(currentProject.value)}</span>
                </div>
                <div className="text-center">
                  <span className="block text-slate-400 text-xs">Inicio</span>
                  <span className="font-medium text-slate-700">{formatDate(currentProject.startDate)}</span>
                </div>
                {currentProject.endDate && (
                  <div className="text-center">
                    <span className="block text-slate-400 text-xs">Fin Est.</span>
                    <span className="font-medium text-slate-700">{formatDate(currentProject.endDate)}</span>
                  </div>
                )}
                <div className="text-center">
                  <span className="block text-slate-400 text-xs">Progreso</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                        style={{ width: `${projectProgress}%` }}
                      ></div>
                    </div>
                    <span className="font-bold text-indigo-600">{projectProgress}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gantt Content */}
        <div className="flex-1 overflow-auto">
          {!currentProject ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <div className="text-center">
                <i className="fa-solid fa-folder-open text-6xl mb-4"></i>
                <p className="text-lg">Selecciona un proyecto para ver su cronograma</p>
              </div>
            </div>
          ) : !currentProject.phases?.length ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <div className="text-center">
                <i className="fa-solid fa-chart-gantt text-6xl mb-4"></i>
                <p className="text-lg mb-4">Este proyecto no tiene fases definidas</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowTemplateSelector(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium transition"
                  >
                    <i className="fa-solid fa-wand-magic-sparkles mr-2"></i>
                    Usar Plantilla
                  </button>
                  <button
                    onClick={addPhase}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition"
                  >
                    <i className="fa-solid fa-plus mr-2"></i>
                    Crear Fase Manual
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full">
              {/* Left Panel - Phases List */}
              <div className="w-80 border-r border-slate-200 flex-shrink-0 bg-slate-50">
                <div className="p-3 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                  Fases del Proyecto
                </div>
                <div className="divide-y divide-slate-200">
                  {currentProject.phases.map((phase, index) => {
                    const colors = PHASE_COLORS[phase.type];
                    const statusInfo = STATUS_ICONS[phase.status];
                    
                    return (
                      <div 
                        key={phase.id}
                        className="p-3 hover:bg-white transition cursor-pointer group"
                        onClick={() => {
                          setEditingPhase(phase);
                          setShowPhaseEditor(true);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg ${colors.bg} ${colors.border} border flex items-center justify-center text-sm font-bold ${colors.text}`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-800 text-sm truncate">{phase.name}</span>
                              <i className={`fa-solid ${statusInfo.icon} ${statusInfo.color} text-xs`}></i>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {formatDate(phase.startDate)} - {formatDate(phase.endDate)}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${
                                    phase.status === 'completed' ? 'bg-emerald-500' :
                                    phase.status === 'delayed' ? 'bg-rose-500' :
                                    'bg-indigo-500'
                                  }`}
                                  style={{ width: `${phase.progress}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-medium text-slate-600">{phase.progress}%</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('¿Eliminar esta fase?')) {
                                deletePhase(phase.id);
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 p-1 transition"
                          >
                            <i className="fa-solid fa-trash-can text-xs"></i>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Panel - Gantt Timeline */}
              <div className="flex-1 overflow-x-auto">
                {/* Time Header */}
                <div className="sticky top-0 bg-slate-100 border-b border-slate-200 flex z-10">
                  {timeColumns.map((col, i) => (
                    <div
                      key={i}
                      className={`flex-shrink-0 text-center text-xs py-2 border-r border-slate-200 ${
                        col.isToday ? 'bg-indigo-100 font-bold text-indigo-700' :
                        col.isWeekend ? 'bg-slate-200 text-slate-400' : 'text-slate-500'
                      }`}
                      style={{ width: viewMode === 'days' ? 40 : viewMode === 'weeks' ? 25 : 15 }}
                    >
                      {col.label}
                    </div>
                  ))}
                </div>

                {/* Gantt Bars */}
                <div className="relative">
                  {/* Today Line */}
                  {timeColumns.some(c => c.isToday) && (
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 z-20"
                      style={{ 
                        left: timeColumns.findIndex(c => c.isToday) * (viewMode === 'days' ? 40 : viewMode === 'weeks' ? 25 : 15) + (viewMode === 'days' ? 20 : viewMode === 'weeks' ? 12 : 7)
                      }}
                    >
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[9px] px-1 rounded">
                        Hoy
                      </div>
                    </div>
                  )}

                  {currentProject.phases.map((phase, index) => {
                    const position = getPhasePosition(phase);
                    const colors = PHASE_COLORS[phase.type];
                    const hasActiveReminders = phase.reminders?.some(r => r.enabled && !r.notified) || false;
                    const isInAlert = activeAlerts.some(a => a.phase.id === phase.id);
                    
                    return (
                      <div 
                        key={phase.id}
                        className="h-14 border-b border-slate-100 relative flex items-center"
                        style={{ 
                          minWidth: timeColumns.length * (viewMode === 'days' ? 40 : viewMode === 'weeks' ? 25 : 15)
                        }}
                      >
                        {/* Background Grid */}
                        <div className="absolute inset-0 flex">
                          {timeColumns.map((col, i) => (
                            <div
                              key={i}
                              className={`flex-shrink-0 h-full border-r border-slate-100 ${
                                col.isWeekend ? 'bg-slate-50' : ''
                              }`}
                              style={{ width: viewMode === 'days' ? 40 : viewMode === 'weeks' ? 25 : 15 }}
                            ></div>
                          ))}
                        </div>

                        {/* Phase Bar */}
                        <div
                          className={`absolute h-8 ${colors.bg} ${colors.border} border-2 rounded-lg cursor-pointer hover:shadow-lg transition-shadow flex items-center overflow-hidden group z-10 ${isInAlert ? 'ring-2 ring-rose-400 ring-offset-1' : ''}`}
                          style={{
                            left: position.left,
                            width: Math.max(position.width, 50)
                          }}
                          onClick={() => {
                            setEditingPhase(phase);
                            setShowPhaseEditor(true);
                          }}
                        >
                          {/* Progress Fill */}
                          <div 
                            className={`absolute inset-0 opacity-30 ${
                              phase.status === 'completed' ? 'bg-emerald-500' :
                              phase.status === 'delayed' ? 'bg-rose-500' :
                              'bg-indigo-500'
                            }`}
                            style={{ width: `${phase.progress}%` }}
                          ></div>
                          
                          {/* Label */}
                          <span className={`relative z-10 px-2 text-xs font-medium ${colors.text} truncate`}>
                            {phase.name}
                          </span>
                          
                          {/* Reminder indicator */}
                          {hasActiveReminders && (
                            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] shadow ${isInAlert ? 'bg-rose-500 animate-bounce' : 'bg-amber-500'}`}>
                              <i className="fa-solid fa-bell"></i>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-slate-50 border-t border-slate-200 p-3">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="text-slate-500 font-medium">Leyenda:</span>
            {Object.entries(PHASE_COLORS).slice(0, 6).map(([type, colors]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded ${colors.bg} ${colors.border} border`}></div>
                <span className="text-slate-600">{type}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 ml-4">
              <div className="w-0.5 h-4 bg-indigo-500"></div>
              <span className="text-slate-600">Hoy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-wand-magic-sparkles text-amber-500"></i>
              Seleccionar Plantilla
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Elige una plantilla predefinida para crear las fases de tu proyecto automáticamente.
            </p>
            <div className="space-y-3">
              {PHASE_TEMPLATES.map((template, index) => {
                const totalDays = template.phases.reduce((sum, p) => sum + p.defaultDays, 0);
                const weeks = Math.floor(totalDays / 7);
                const days = totalDays % 7;
                const durationText = weeks > 0 
                  ? (days > 0 ? `${weeks} sem y ${days} días` : `${weeks} semanas`)
                  : `${days} días`;
                
                return (
                  <button
                    key={index}
                    onClick={() => applyTemplate(index)}
                    className="w-full text-left p-4 border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800 group-hover:text-indigo-700">{template.name}</h4>
                          <span className="bg-indigo-100 text-indigo-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            ~{durationText}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {template.phases.length} fases: {template.phases.map(p => p.name).join(' → ')}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.phases.map((p, i) => (
                            <span key={i} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                              {p.name}: {p.defaultDays}d
                            </span>
                          ))}
                        </div>
                      </div>
                      <i className="fa-solid fa-chevron-right text-slate-400 group-hover:text-indigo-500 ml-3"></i>
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowTemplateSelector(false)}
              className="w-full mt-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Phase Editor Modal */}
      {showPhaseEditor && editingPhase && (
        <PhaseEditorModal
          phase={editingPhase}
          onSave={savePhase}
          onClose={() => {
            setShowPhaseEditor(false);
            setEditingPhase(null);
          }}
        />
      )}
    </div>
  );
};

// Phase Editor Modal Component
interface PhaseEditorModalProps {
  phase: ProjectPhase;
  onSave: (phase: ProjectPhase) => void;
  onClose: () => void;
}

const PhaseEditorModal: React.FC<PhaseEditorModalProps> = ({ phase, onSave, onClose }) => {
  const [formData, setFormData] = useState<ProjectPhase>(phase);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const formatDateForInput = (date: Date) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <i className="fa-solid fa-edit text-indigo-500"></i>
          {phase.id.includes('phase-') && !phase.name.includes('Nueva') ? 'Editar Fase' : 'Nueva Fase'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de fase */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Fase</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as ProjectPhaseType })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {Object.values(ProjectPhaseType).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Personalizado</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ej: Compra de madera cedro"
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={formatDateForInput(formData.startDate)}
                onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Fin</label>
              <input
                type="date"
                value={formatDateForInput(formData.endDate)}
                onChange={(e) => setFormData({ ...formData, endDate: new Date(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Progreso */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Progreso: <span className="text-indigo-600 font-bold">{formData.progress}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.progress}
              onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'pending', label: 'Pendiente', icon: 'fa-clock', color: 'slate' },
                { value: 'in-progress', label: 'En Progreso', icon: 'fa-spinner', color: 'blue' },
                { value: 'completed', label: 'Completado', icon: 'fa-check-circle', color: 'emerald' },
                { value: 'delayed', label: 'Retrasado', icon: 'fa-exclamation-triangle', color: 'rose' },
              ].map(status => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, status: status.value as any })}
                  className={`p-2 rounded-lg border-2 text-center transition ${
                    formData.status === status.value 
                      ? `border-${status.color}-500 bg-${status.color}-50 text-${status.color}-700`
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <i className={`fa-solid ${status.icon} text-lg mb-1 block`}></i>
                  <span className="text-[10px] font-medium">{status.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Responsable */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Responsable (opcional)</label>
            <input
              type="text"
              value={formData.responsible || ''}
              onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ej: Juan Carpintero"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notas (opcional)</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              placeholder="Observaciones sobre esta fase..."
            />
          </div>

          {/* Recordatorios */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                <i className="fa-solid fa-bell text-amber-500"></i>
                Recordatorios
              </label>
              <button
                type="button"
                onClick={() => {
                  const newReminder: PhaseReminder = {
                    id: `reminder-${Date.now()}`,
                    enabled: true,
                    type: 'before-end',
                    amount: 2,
                    unit: 'days'
                  };
                  setFormData({
                    ...formData,
                    reminders: [...(formData.reminders || []), newReminder]
                  });
                }}
                className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 px-2 py-1 rounded-lg font-medium transition"
              >
                <i className="fa-solid fa-plus mr-1"></i>
                Agregar
              </button>
            </div>
            
            {(!formData.reminders || formData.reminders.length === 0) ? (
              <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-50 rounded-lg">
                Sin recordatorios configurados
              </p>
            ) : (
              <div className="space-y-2">
                {formData.reminders.map((reminder, idx) => (
                  <div key={reminder.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = formData.reminders!.map((r, i) => 
                          i === idx ? { ...r, enabled: !r.enabled } : r
                        );
                        setFormData({ ...formData, reminders: updated });
                      }}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                        reminder.enabled 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      <i className={`fa-solid ${reminder.enabled ? 'fa-bell' : 'fa-bell-slash'} text-sm`}></i>
                    </button>
                    
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={reminder.amount}
                      onChange={(e) => {
                        const updated = formData.reminders!.map((r, i) => 
                          i === idx ? { ...r, amount: parseInt(e.target.value) || 1 } : r
                        );
                        setFormData({ ...formData, reminders: updated });
                      }}
                      className="w-16 border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                    
                    <select
                      value={reminder.unit}
                      onChange={(e) => {
                        const updated = formData.reminders!.map((r, i) => 
                          i === idx ? { ...r, unit: e.target.value as 'hours' | 'days' } : r
                        );
                        setFormData({ ...formData, reminders: updated });
                      }}
                      className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="hours">horas</option>
                      <option value="days">días</option>
                    </select>
                    
                    <span className="text-xs text-slate-500">antes del</span>
                    
                    <select
                      value={reminder.type}
                      onChange={(e) => {
                        const updated = formData.reminders!.map((r, i) => 
                          i === idx ? { ...r, type: e.target.value as 'before-end' | 'before-start' } : r
                        );
                        setFormData({ ...formData, reminders: updated });
                      }}
                      className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="before-end">fin</option>
                      <option value="before-start">inicio</option>
                    </select>
                    
                    <button
                      type="button"
                      onClick={() => {
                        const updated = formData.reminders!.filter((_, i) => i !== idx);
                        setFormData({ ...formData, reminders: updated });
                      }}
                      className="ml-auto text-slate-400 hover:text-rose-500 p-1 transition"
                    >
                      <i className="fa-solid fa-trash-can text-xs"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
            >
              <i className="fa-solid fa-save mr-2"></i>
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GanttChart;
