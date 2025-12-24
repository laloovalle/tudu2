
import React, { useState, useMemo } from 'react';
import { Task, User, Company, TaskStatus, TaskPriority } from '../types';
import { Filter, User as UserIcon, Briefcase, Pencil, Calendar, Building2, Shield, Users, PenTool, CheckSquare } from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  users: User[];
  companies: Company[];
  currentUser?: User | null; 
  initialUserFilter?: string; 
  onStatusChange: (taskId: number, newStatus: TaskStatus) => void;
  onEdit: (task: Task) => void;
}

// Configuration for columns
const COLUMNS: { id: TaskStatus; label: string; description: string; bgColor: string; headerColor: string; borderColor: string }[] = [
  { 
    id: TaskStatus.PENDING, 
    label: '01 EN CARPETA', 
    description: 'Sin prioridad, para más adelante',
    bgColor: 'bg-slate-50 dark:bg-slate-900', 
    headerColor: 'text-slate-800 md:text-slate-700 dark:text-slate-300',
    borderColor: 'border-slate-300 md:border-slate-200 dark:border-slate-800' 
  },
  { 
    id: TaskStatus.TO_DO, 
    label: '02 EN RADAR', 
    description: 'Tareas Priorizadas, lo que se viene',
    bgColor: 'bg-cyan-50/50 dark:bg-cyan-900/10', 
    headerColor: 'text-cyan-900 md:text-cyan-800 dark:text-cyan-400',
    borderColor: 'border-cyan-200 md:border-cyan-100 dark:border-cyan-900' 
  },
  { 
    id: TaskStatus.IN_PROGRESS, 
    label: '03 EN PROGRESO', 
    description: 'En ejecución, Laburando en esto.',
    bgColor: 'bg-blue-50/50 dark:bg-blue-900/10', 
    headerColor: 'text-blue-900 md:text-blue-800 dark:text-blue-400',
    borderColor: 'border-blue-200 md:border-blue-100 dark:border-blue-900' 
  },
  { 
    id: TaskStatus.COMPLETED, 
    label: '04 COMPLETADAS', 
    description: 'Finalizadas, bye bye tareas',
    bgColor: 'bg-emerald-50/50 dark:bg-emerald-900/10', 
    headerColor: 'text-emerald-900 md:text-emerald-800 dark:text-emerald-400',
    borderColor: 'border-emerald-200 md:border-emerald-100 dark:border-emerald-900' 
  },
];

const getPriorityBadgeStyle = (p: TaskPriority) => {
    switch (p) {
        case TaskPriority.CRITICAL: return 'bg-red-100 text-red-800 md:text-red-700 dark:bg-red-900 dark:text-red-200';
        case TaskPriority.HIGH: return 'bg-orange-100 text-orange-800 md:text-orange-700 dark:bg-orange-900 dark:text-orange-200';
        case TaskPriority.NORMAL: return 'bg-blue-100 text-blue-800 md:text-blue-700 dark:bg-blue-900 dark:text-blue-200';
        case TaskPriority.LOW: return 'bg-green-100 text-green-800 md:text-green-700 dark:bg-green-900 dark:text-green-200'; 
        default: return 'bg-slate-100 text-slate-700 md:text-slate-500 dark:bg-slate-800 dark:text-slate-400';
    }
};

const getPriorityLabel = (p: TaskPriority) => {
    switch (p) {
        case TaskPriority.CRITICAL: return 'Crítica';
        case TaskPriority.HIGH: return 'Alta';
        case TaskPriority.NORMAL: return 'Normal';
        case TaskPriority.LOW: return 'Baja';
        case TaskPriority.NONE: return 'Nula';
        default: return 'Normal';
    }
};

const getPriorityBorderColor = (p: TaskPriority) => {
  switch (p) {
    case TaskPriority.CRITICAL: return 'border-l-[6px] border-l-red-600';
    case TaskPriority.HIGH: return 'border-l-[6px] border-l-orange-500';
    case TaskPriority.NORMAL: return 'border-l-[6px] border-l-blue-600';
    case TaskPriority.LOW: return 'border-l-[6px] border-l-green-500';
    case TaskPriority.NONE: return 'border-l-[6px] border-l-slate-400 dark:border-l-slate-600';
    default: return 'border-l-[6px] border-l-slate-300 dark:border-l-slate-700';
  }
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, users, companies, currentUser, initialUserFilter, onStatusChange, onEdit }) => {
  const [filterUser, setFilterUser] = useState<string>(initialUserFilter || 'ALL');
  const [filterCompany, setFilterCompany] = useState<string>('ALL');
  
  // New Filters: 2. My Tasks (Default ON), 3. My Assistance (Default OFF)
  const [showMyTasks, setShowMyTasks] = useState<boolean>(true);
  const [showAssistance, setShowAssistance] = useState<boolean>(false);
  
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      // Logic for User Filter
      let matchUser = false;
      
      if (filterUser === 'ALL') {
          matchUser = true;
      } else {
          const isResponsible = t.people.responsible === filterUser;
          const isSupervisor = t.people.supervisor === filterUser;
          const isCollaborator = t.people.collaborators && t.people.collaborators.includes(filterUser);
          
          if (showMyTasks && isResponsible) {
              matchUser = true;
          }
          
          if (showAssistance && (isSupervisor || isCollaborator)) {
              matchUser = true;
          }
      }

      const matchCompany = filterCompany === 'ALL' || t.classification.client === filterCompany;
      const notCanceled = t.statusTime.status !== TaskStatus.CANCELED;
      
      return matchUser && matchCompany && notCanceled;
    });
  }, [tasks, filterUser, filterCompany, showMyTasks, showAssistance]);

  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (draggedTaskId) {
      onStatusChange(draggedTaskId, status);
      setDraggedTaskId(null);
    }
  };

  const getUserAvatar = (userName: string) => {
      const user = users.find(u => u.name === userName);
      return user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`;
  };

  return (
    <div className="flex flex-col w-full">
      {/* Filters Header */}
      <div className="bg-white dark:bg-slate-800 p-6 md:p-6 rounded-2xl border border-slate-300 md:border-slate-200 dark:border-slate-700 shadow-sm mb-8 flex flex-col md:flex-row flex-wrap gap-5 md:gap-6 items-start md:items-center">
         <div className="flex items-center gap-2 text-slate-800 md:text-slate-600 dark:text-slate-300 font-bold mr-2 text-2xl md:text-xl w-full md:w-auto">
            <Filter className="w-8 h-8 md:w-6 md:h-6" />
            <span>Filtros</span>
         </div>

         {/* 1. USUARIO */}
         <div className="relative w-full md:w-auto">
            <UserIcon className="w-6 h-6 md:w-5 md:h-5 text-slate-500 md:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select 
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="w-full md:w-auto pl-12 md:pl-10 pr-8 py-4 md:py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 md:border-slate-200 dark:border-slate-700 rounded-lg text-lg md:text-base font-medium focus:ring-2 focus:ring-blue-500 outline-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-w-0 md:min-w-[240px] text-slate-900 dark:text-white"
            >
                <option value="ALL">Todos los Responsables</option>
                {users.filter(u => u.role !== 'cliente').map(u => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                ))}
            </select>
         </div>

         {/* 2 & 3. TOGGLES GROUP */}
         <div className={`flex flex-wrap items-center gap-2 h-full transition-opacity ${filterUser === 'ALL' ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
             
             {/* 2. Mis Tareas (Default ON) */}
             <label 
                className={`flex items-center gap-2 cursor-pointer select-none px-4 py-3 md:py-2 rounded-lg border transition-all h-[50px] md:h-auto
                ${showMyTasks 
                    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' 
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'
                }`}
                title="Mostrar tareas donde es Responsable"
             >
                <div className="relative flex items-center justify-center">
                    <input 
                        type="checkbox" 
                        checked={showMyTasks}
                        onChange={(e) => setShowMyTasks(e.target.checked)}
                        className="peer appearance-none w-5 h-5 border-2 border-current rounded checked:bg-current transition-colors"
                        disabled={filterUser === 'ALL'}
                    />
                    <CheckSquare className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                </div>
                <span className="text-sm font-bold whitespace-nowrap">Mis Tareas</span>
             </label>

             {/* 3. Mis Asistencias (Default OFF) */}
             <label 
                className={`flex items-center gap-2 cursor-pointer select-none px-4 py-3 md:py-2 rounded-lg border transition-all h-[50px] md:h-auto
                ${showAssistance 
                    ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-300' 
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'
                }`}
                title="Mostrar tareas donde es Supervisor o Colaborador"
             >
                <div className="relative flex items-center justify-center">
                    <input 
                        type="checkbox" 
                        checked={showAssistance}
                        onChange={(e) => setShowAssistance(e.target.checked)}
                        className="peer appearance-none w-5 h-5 border-2 border-current rounded checked:bg-current transition-colors"
                        disabled={filterUser === 'ALL'}
                    />
                    <CheckSquare className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                </div>
                <span className="text-sm font-bold whitespace-nowrap">Mis Asistencias</span>
             </label>
         </div>

         {/* 4. EMPRESAS */}
         <div className="relative w-full md:w-auto">
            <Briefcase className="w-6 h-6 md:w-5 md:h-5 text-slate-500 md:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select 
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="w-full md:w-auto pl-12 md:pl-10 pr-8 py-4 md:py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 md:border-slate-200 dark:border-slate-700 rounded-lg text-lg md:text-base font-medium focus:ring-2 focus:ring-blue-500 outline-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-w-0 md:min-w-[240px] text-slate-900 dark:text-white"
            >
                <option value="ALL">Todas las Empresas</option>
                {companies.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                ))}
            </select>
         </div>
         
         <div className="ml-auto text-xl md:text-lg text-slate-500 md:text-slate-400 font-bold w-full md:w-auto text-right">
            {filteredTasks.length} tareas visibles
         </div>
      </div>

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8 items-start pb-10">
            {COLUMNS.map(col => {
                const colTasks = filteredTasks
                    .filter(t => t.statusTime.status === col.id)
                    .sort((a, b) => {
                        // 1. Priority (Ascending: 1-Critical to 5-None)
                        if (a.classification.priority !== b.classification.priority) {
                            return a.classification.priority - b.classification.priority;
                        }
                        // 2. ID (Descending: Newer first)
                        return b.id - a.id;
                    });
                
                return (
                    <div 
                        key={col.id} 
                        className={`flex flex-col ${col.bgColor} rounded-3xl border ${col.borderColor} h-full min-h-[400px]`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                    >
                        {/* Column Header */}
                        <div className="p-6 md:p-6 flex flex-col gap-1 sticky top-0 z-10 rounded-t-3xl">
                            <div className="flex items-center justify-between">
                                <h3 className={`font-black text-2xl md:text-xl uppercase tracking-tight ${col.headerColor}`}>{col.label}</h3>
                                <span className="bg-white/80 dark:bg-slate-800/80 text-slate-800 md:text-slate-700 dark:text-slate-300 text-sm md:text-xs font-bold px-3 py-1 md:px-2.5 md:py-1 rounded-full border border-black/5 shadow-sm">
                                    {colTasks.length}
                                </span>
                            </div>
                            <p className={`text-base md:text-sm font-medium opacity-80 ${col.headerColor}`}>
                                {col.description}
                            </p>
                        </div>

                        {/* Task List */}
                        <div className="p-4 md:p-4 space-y-5 md:space-y-3 flex-grow">
                            {colTasks.length === 0 ? (
                                <div className="h-28 md:h-32 flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-300/30 text-slate-500 md:text-slate-400 text-lg md:text-lg italic font-medium">
                                    Sin tareas
                                </div>
                            ) : (
                                colTasks.map(task => {
                                    // DETERMINE DISPLAY MODE
                                    const isFilterActive = filterUser !== 'ALL';
                                    const subjectUser = filterUser;
                                    const isResponsible = task.people.responsible === subjectUser;
                                    const isSupervisor = task.people.supervisor === subjectUser;
                                    // const isCollaborator = task.people.collaborators?.includes(subjectUser);

                                    return (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, task.id)}
                                            onClick={() => onEdit(task)}
                                            className={`bg-white dark:bg-slate-800 p-6 md:p-3 rounded-2xl shadow-sm border border-slate-300 dark:border-slate-700 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-blue-300 transition-all group relative flex flex-col items-start gap-1 ${getPriorityBorderColor(task.classification.priority)}`}
                                        >
                                            <div className="flex justify-between items-start w-full mb-1">
                                                {/* Priority Badge */}
                                                <span className={`text-base md:text-[10px] font-bold px-4 py-2 md:px-2 md:py-0.5 rounded-full ${getPriorityBadgeStyle(task.classification.priority)}`}>
                                                    {getPriorityLabel(task.classification.priority)}
                                                </span>
                                            </div>

                                            {/* Title */}
                                            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-2xl md:text-base leading-tight mt-2 md:mt-1">
                                                {task.title}
                                            </h4>

                                            {/* Client */}
                                            <div className="flex flex-col gap-2 md:gap-1 mt-2 md:mt-1 mb-4 md:mb-2 w-full">
                                                <div className="flex items-center gap-2 text-lg md:text-xs text-slate-800 md:text-slate-500 dark:text-slate-400 font-medium">
                                                    <Building2 className="w-5 h-5 md:w-3 md:h-3 text-slate-600 md:text-slate-400 dark:text-slate-500 stroke-2 md:stroke-1" />
                                                    <span className="truncate w-full">{task.classification.client || 'Sin Cliente'}</span>
                                                </div>
                                            </div>

                                            {/* RICH FOOTER: Logic depends on filter state */}
                                            <div className="flex items-center justify-between w-full mt-auto pt-4 md:pt-2 border-t border-slate-100 dark:border-slate-700">
                                                
                                                {!isFilterActive || isResponsible ? (
                                                     /* CASE A: Filter is ALL or User is Responsible (Standard View / Left Aligned) */
                                                     <div className="flex items-center gap-2.5">
                                                        <img 
                                                            src={getUserAvatar(task.people.responsible)} 
                                                            alt={task.people.responsible}
                                                            className="w-10 h-10 md:w-8 md:h-8 rounded-full object-cover border-2 border-slate-100 dark:border-slate-800 shadow-sm"
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="text-sm md:text-xs font-bold text-slate-900 md:text-slate-700 dark:text-slate-200 leading-tight">
                                                                {task.people.responsible}
                                                            </span>
                                                        </div>
                                                     </div>
                                                ) : (
                                                    /* CASE B: User is Supervisor or Collaborator (Context View / Right Aligned) */
                                                    <div className="flex items-center justify-end gap-2.5 w-full text-right">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                                                <span className="font-bold text-slate-800 dark:text-slate-200">{subjectUser}</span> {isSupervisor ? 'SUPERVISA' : 'COLABORA'} a <span className="font-bold text-slate-800 dark:text-slate-200">{task.people.responsible.split(' ')[0]}</span>
                                                            </span>
                                                        </div>
                                                        <img 
                                                            src={getUserAvatar(task.people.responsible)} 
                                                            alt={task.people.responsible}
                                                            className="w-10 h-10 md:w-8 md:h-8 rounded-full object-cover border-2 border-slate-100 dark:border-slate-800 shadow-sm"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <button className="absolute top-3 right-3 text-slate-300 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100">
                                                <Pencil className="w-6 h-6 md:w-4 md:h-4 stroke-2 md:stroke-1" />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                );
            })}
      </div>
    </div>
  );
};
