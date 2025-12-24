
import React, { useState, useMemo } from 'react';
import { Task, TaskPriority, TaskStatus, User } from '../types';
import { Trash2, MessageSquare, FolderOpen, ExternalLink, ArrowUp, ArrowDown, ArrowUpDown, ShieldCheck, User as UserIcon, Shield, Users, PenTool } from 'lucide-react';

interface TaskListViewProps {
  tasks: Task[];
  currentUser?: User | null; // Added prop
  onEdit: (task: Task, initialView?: 'details' | 'notes') => void;
  onDelete: (id: number) => void;
}

type SortKey = 'priority' | 'title' | 'responsible' | 'supervisor' | 'client' | 'hours' | 'status';

const getPriorityConfig = (p: TaskPriority) => {
  switch (p) {
    case TaskPriority.CRITICAL: return { label: 'Crítica', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' };
    case TaskPriority.HIGH: return { label: 'Alta', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100' };
    case TaskPriority.NORMAL: return { label: 'Normal', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' };
    case TaskPriority.LOW: return { label: 'Baja', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100' };
    case TaskPriority.NONE: return { label: 'Nula', bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-100' };
    default: return { label: 'Normal', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100' };
  }
};

const getStatusBadge = (s: TaskStatus) => {
    let colorClass = 'bg-slate-100 text-slate-600';
    switch (s) {
      case TaskStatus.COMPLETED: colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-100 border'; break;
      case TaskStatus.IN_PROGRESS: colorClass = 'bg-blue-50 text-blue-700 border-blue-100 border'; break;
      case TaskStatus.CANCELED: colorClass = 'bg-slate-50 text-slate-400 border-slate-100 border'; break;
      case TaskStatus.TO_DO: colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-100 border'; break;
      default: colorClass = 'bg-amber-50 text-amber-700 border-amber-100 border'; // Pending
    }
    return <span className={`px-3 py-1 rounded text-sm font-bold tracking-wide uppercase ${colorClass}`}>{s}</span>;
  };

export const TaskListView: React.FC<TaskListViewProps> = ({ tasks, currentUser, onEdit, onDelete }) => {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedTasks = useMemo(() => {
    if (!sortConfig) return tasks;

    return [...tasks].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case 'priority':
          // Priority 1 is high, 5 is low. 
          aValue = a.classification.priority;
          bValue = b.classification.priority;
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'responsible':
          aValue = a.people.responsible.toLowerCase();
          bValue = b.people.responsible.toLowerCase();
          break;
        case 'supervisor':
          aValue = (a.people.supervisor || '').toLowerCase();
          bValue = (b.people.supervisor || '').toLowerCase();
          break;
        case 'client':
          aValue = a.classification.client.toLowerCase();
          bValue = b.classification.client.toLowerCase();
          break;
        case 'hours':
          aValue = a.statusTime.estimatedHours;
          bValue = b.statusTime.estimatedHours;
          break;
        case 'status':
          aValue = a.statusTime.status;
          bValue = b.statusTime.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tasks, sortConfig]);

  const renderSortIcon = (columnKey: SortKey) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown size={14} className="text-slate-300 opacity-50 group-hover:opacity-100" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />;
  };

  const HeaderCell = ({ label, sortKey, width }: { label: string | React.ReactNode; sortKey?: SortKey; width?: string }) => (
    <th 
      scope="col" 
      className={`px-6 py-5 text-left text-sm font-bold text-slate-600 uppercase tracking-wider ${width || ''} ${sortKey ? 'cursor-pointer group select-none hover:bg-slate-100/50 transition-colors' : ''}`}
      onClick={() => sortKey && handleSort(sortKey)}
    >
      <div className={`flex items-center gap-2 ${label === 'Estado' || label === 'Recursos' || label === 'Hrs' ? 'justify-center' : ''}`}>
        {label}
        {sortKey && renderSortIcon(sortKey)}
      </div>
    </th>
  );

  const getUserRoleBadge = (task: Task) => {
    if (!currentUser) return null;
    
    // Only show badge if Supervisor or Collaborator
    if (task.people.supervisor === currentUser.name) {
        return { tooltip: 'Eres Supervisor', icon: <Shield size={14} className="text-indigo-600" />, bg: 'bg-indigo-100' };
    }
    if (task.people.collaborators && task.people.collaborators.includes(currentUser.name)) {
        return { tooltip: 'Colaborador', icon: <Users size={14} className="text-amber-600" />, bg: 'bg-amber-100' };
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden font-sans">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/50">
            <tr>
              <th className="w-12 px-2"></th> 
              <HeaderCell label="Prio" sortKey="priority" width="w-28" />
              <HeaderCell label="Descripción Tarea" sortKey="title" />
              <HeaderCell label="Resp." sortKey="responsible" width="w-40" />
              <HeaderCell label={<ShieldCheck size={16} />} sortKey="supervisor" width="w-16" />
              <th scope="col" className="px-6 py-5 text-left text-sm font-bold text-slate-600 uppercase tracking-wider w-36">Colab.</th>
              <HeaderCell label="Cliente" sortKey="client" width="w-48" />
              <th scope="col" className="px-6 py-5 text-center text-sm font-bold text-slate-600 uppercase tracking-wider w-28">Recursos</th>
              <HeaderCell label="Hrs" sortKey="hours" width="w-24" />
              <HeaderCell label="Estado" sortKey="status" width="w-36" />
              <th scope="col" className="px-4 py-5 text-center text-sm font-bold text-slate-600 uppercase tracking-wider w-20">
                 <MessageSquare size={18} className="mx-auto" />
              </th>
              <th scope="col" className="px-6 py-5 text-right text-sm font-bold text-slate-600 uppercase tracking-wider w-24"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-50">
            {sortedTasks.map((task) => {
              const priority = getPriorityConfig(task.classification.priority);
              const isInactive = task.statusTime.status === TaskStatus.COMPLETED || task.statusTime.status === TaskStatus.CANCELED;
              const roleBadge = getUserRoleBadge(task);

              return (
                <tr key={task.id} className="hover:bg-blue-50/30 transition-colors group">
                  {/* Role Indicator */}
                  <td className="px-2 py-5 text-center">
                    {roleBadge && (
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${roleBadge.bg}`} title={roleBadge.tooltip}>
                             {roleBadge.icon}
                         </div>
                    )}
                  </td>

                  {/* Priority */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold border ${priority.bg} ${priority.text} ${priority.border}`}>
                      {priority.label}
                    </span>
                  </td>

                  {/* Task Title (Clickable) */}
                  <td className="px-6 py-5">
                    <div 
                        onClick={() => onEdit(task)}
                        className="cursor-pointer group/title"
                    >
                        <div className={`text-xl font-bold transition-colors flex items-center gap-2 ${isInactive ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700 group-hover/title:text-blue-600'}`}>
                            {task.title}
                        </div>
                        <div className="text-base text-slate-600 md:text-slate-500 line-clamp-1 mt-1 font-normal">{task.description}</div>
                    </div>
                  </td>

                  {/* Responsible (Text Only) */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    {task.people.responsible !== 'Sin asignar' ? (
                        <span className="text-base font-semibold text-slate-600 md:text-slate-600 truncate block max-w-[140px]" title={task.people.responsible}>
                            {task.people.responsible}
                        </span>
                    ) : (
                        <span className="text-slate-300 text-sm">-</span>
                    )}
                  </td>

                  {/* Supervisor (Small Avatar or Icon) */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    {task.people.supervisor ? (
                        <img 
                            className="inline-block h-8 w-8 rounded-full ring-2 ring-white border border-slate-200" 
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(task.people.supervisor)}&background=random`} 
                            alt={task.people.supervisor} 
                            title={`Supervisor: ${task.people.supervisor}`}
                        />
                    ) : (
                        <span className="text-slate-200 text-sm">-</span>
                    )}
                  </td>

                   {/* Collaborators (Avatars) */}
                   <td className="px-6 py-5 whitespace-nowrap">
                    {task.people.collaborators && task.people.collaborators.length > 0 ? (
                        <div className="flex -space-x-3 overflow-hidden">
                             {task.people.collaborators.slice(0, 3).map((col, idx) => (
                                 <img 
                                    key={idx}
                                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white" 
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(col)}&background=random`} 
                                    alt={col} 
                                    title={col}
                                 />
                             ))}
                             {task.people.collaborators.length > 3 && (
                                 <span className="flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-white bg-slate-100 text-xs font-bold text-slate-600 md:text-slate-500">
                                     +{task.people.collaborators.length - 3}
                                 </span>
                             )}
                        </div>
                    ) : (
                        <span className="text-slate-300 text-sm">-</span>
                    )}
                  </td>

                  {/* Company */}
                  <td className="px-6 py-5 whitespace-nowrap text-base font-medium text-slate-600 md:text-slate-500">
                    <span className="truncate max-w-[160px] block" title={task.classification.client}>
                        {task.classification.client}
                    </span>
                  </td>

                  {/* Links / Resources */}
                  <td className="px-6 py-5 whitespace-nowrap text-center">
                    <div className="flex justify-center items-center gap-3">
                        {task.resources?.repositoryUrl && (
                            <a 
                                href={task.resources.repositoryUrl.startsWith('http') ? task.resources.repositoryUrl : `https://${task.resources.repositoryUrl}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Abrir Repositorio / Drive"
                            >
                                <FolderOpen size={20} />
                            </a>
                        )}
                        {task.resources?.workUrl && (
                             <a 
                                href={task.resources.workUrl.startsWith('http') ? task.resources.workUrl : `https://${task.resources.workUrl}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2 text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded transition-colors"
                                title="Ir al Trabajo / Publicación"
                            >
                                <ExternalLink size={20} />
                            </a>
                        )}
                        {(!task.resources?.repositoryUrl && !task.resources?.workUrl) && (
                            <span className="text-slate-300 text-sm">-</span>
                        )}
                    </div>
                  </td>

                  {/* Hours */}
                  <td className="px-6 py-5 whitespace-nowrap text-base text-slate-600 md:text-slate-600 text-center font-bold">
                    {task.statusTime.estimatedHours > 0 ? (
                        <span className="tracking-tight">{task.statusTime.estimatedHours}h</span>
                    ) : <span className="text-slate-300">-</span>}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-5 whitespace-nowrap text-center">
                    {getStatusBadge(task.statusTime.status)}
                  </td>

                  {/* Notes (Minimal) */}
                  <td className="px-4 py-5 whitespace-nowrap text-center">
                     {(task.notesCount || 0) > 0 && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(task, 'notes'); }}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-600 text-xs font-bold hover:bg-blue-200 transition-colors"
                        >
                            {task.notesCount}
                        </button>
                     )}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-5 whitespace-nowrap text-right">
                    <button 
                        onClick={() => {
                            if(window.confirm('¿Seguro que deseas eliminar esta tarea?')) onDelete(task.id);
                        }} 
                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded transition-colors"
                        title="Eliminar"
                    >
                        <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
