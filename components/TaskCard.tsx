
import React, { useState, useEffect } from 'react';
import { Task, TaskPriority, TaskStatus, User } from '../types';
import { fetchTaskAttachments } from '../services/apiService';
import { getGoogleCalendarUrl, downloadIcsFile } from '../services/calendarService';
import { Pencil, Trash2, Check, X, FolderOpen, ExternalLink, Clock, MessageSquare, Building2, Calendar, Paperclip, CornerDownRight, CalendarPlus } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  userAvatar?: string;
  subtasksCount?: number;
  currentUser?: User | null;
  onEdit: (task: Task, initialView?: 'details' | 'notes') => void;
  onDelete: (id: number) => void;
}

const getPriorityColor = (p: TaskPriority) => {
  switch (p) {
    case TaskPriority.CRITICAL: return 'bg-red-100 text-red-900 md:text-red-700 dark:bg-red-900 dark:text-red-200';
    case TaskPriority.HIGH: return 'bg-orange-100 text-orange-900 md:text-orange-700 dark:bg-orange-900 dark:text-orange-200';
    case TaskPriority.NORMAL: return 'bg-blue-100 text-blue-900 md:text-blue-700 dark:bg-blue-900 dark:text-blue-200';
    case TaskPriority.LOW: return 'bg-green-100 text-green-900 md:text-green-700 dark:bg-green-900 dark:text-green-200';
    case TaskPriority.NONE: return 'bg-slate-100 text-slate-800 md:text-slate-500 dark:bg-slate-800 dark:text-slate-400';
    default: return 'bg-slate-100 text-slate-900 md:text-slate-700 dark:bg-slate-800 dark:text-slate-300';
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

export const TaskCard: React.FC<TaskCardProps> = ({ task, userAvatar, subtasksCount = 0, currentUser, onEdit, onDelete }) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [attachmentsCount, setAttachmentsCount] = useState(0);
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);

  const isCompleted = task.statusTime.status === TaskStatus.COMPLETED;
  const isCanceled = task.statusTime.status === TaskStatus.CANCELED;
  const isInactive = isCompleted || isCanceled;

  useEffect(() => {
    let isMounted = true;
    fetchTaskAttachments(task.id).then(files => {
        if (isMounted) setAttachmentsCount(files.length);
    }).catch(err => console.error("Error loading attachments count", err));
    return () => { isMounted = false; };
  }, [task.id]);

  const isMyResponsibility = currentUser && task.people.responsible === currentUser.name;

  return (
    <div className={`task-card group bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 p-6 md:p-5 flex flex-col ${isInactive ? 'opacity-75' : ''} ${getPriorityBorderColor(task.classification.priority)} relative`}>
      
      <div className="flex flex-col items-start gap-2 md:gap-1">
          {/* Priority Pill */}
          <span className={`inline-flex items-center px-4 py-2 md:px-3 md:py-1.5 rounded-full text-base md:text-xs font-bold ${getPriorityColor(task.classification.priority)}`}>
            {getPriorityLabel(task.classification.priority)}
          </span>

          {/* Title */}
          <h3 className={`text-2xl md:text-xl font-bold leading-tight mt-2 md:mt-3 ${isInactive ? 'text-slate-500 dark:text-slate-500 line-through decoration-slate-400' : 'text-slate-900 dark:text-white'} pr-2`}>
            {task.title}
          </h3>

          {/* Client & Date Info */}
          <div className="flex flex-col gap-2 md:gap-1.5 mt-2 mb-2 w-full">
            <div className="flex items-center gap-3 md:gap-2 text-lg md:text-base text-slate-900 md:text-slate-500 dark:text-slate-400 font-medium">
                <Building2 className="w-6 h-6 md:w-4 md:h-4 stroke-2 md:stroke-1 text-slate-700 md:text-slate-400 dark:text-slate-500" />
                <span className="truncate">{task.classification.client || 'Sin Cliente'}</span>
            </div>
            {task.statusTime.dueDate && (
                <div className="flex items-center gap-3 md:gap-2 text-lg md:text-sm text-slate-900 md:text-slate-500 dark:text-slate-400 font-medium">
                    <Calendar className="w-6 h-6 md:w-4 md:h-4 stroke-2 md:stroke-1 text-slate-700 md:text-slate-400 dark:text-slate-500" />
                    <span>{new Date(task.statusTime.dueDate + 'T12:00:00').toLocaleDateString()}</span>
                </div>
            )}
          </div>
      </div>

      <div className="flex-grow mt-3 md:mt-2">
          {/* Description Snippet */}
          <p className="text-slate-800 md:text-slate-600 dark:text-slate-400 text-lg md:text-base line-clamp-3 md:line-clamp-2 leading-relaxed font-medium md:font-normal">
            {task.description}
          </p>
      </div>

      {/* Resource Links & Calendar Export */}
      <div className="mt-6 md:mt-5 flex flex-wrap gap-4 md:gap-3 items-center">
            {(task.resources?.repositoryUrl || task.resources?.workUrl) && (
                <>
                    {task.resources.repositoryUrl && (
                        <a 
                            href={task.resources.repositoryUrl.startsWith('http') ? task.resources.repositoryUrl : `https://${task.resources.repositoryUrl}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-lg md:text-sm font-bold md:font-semibold text-slate-800 md:text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900 hover:text-blue-700 md:hover:text-blue-600 px-5 py-3 md:px-4 md:py-2 rounded-xl md:rounded-lg transition-colors border border-slate-300 md:border-slate-200 dark:border-slate-700 nav-pill"
                            title="Repositorio"
                        >
                            <FolderOpen className="w-6 h-6 md:w-[18px] md:h-[18px] stroke-2 md:stroke-1" />
                            <span>Repo</span>
                        </a>
                    )}
                    {task.resources.workUrl && (
                        <a 
                            href={task.resources.workUrl.startsWith('http') ? task.resources.workUrl : `https://${task.resources.workUrl}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-lg md:text-sm font-bold md:font-semibold text-slate-800 md:text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-pink-50 dark:hover:bg-pink-900 hover:text-pink-700 md:hover:text-pink-600 px-5 py-3 md:px-4 md:py-2 rounded-xl md:rounded-lg transition-colors border border-slate-300 md:border-slate-200 dark:border-slate-700 nav-pill"
                            title="Enlace Trabajo"
                        >
                            <ExternalLink className="w-6 h-6 md:w-[18px] md:h-[18px] stroke-2 md:stroke-1" />
                            <span>Link</span>
                        </a>
                    )}
                </>
            )}
            
            {/* Calendar Export Toggle */}
            <div className="relative">
                <button 
                    onClick={() => setShowCalendarMenu(!showCalendarMenu)}
                    className={`flex items-center gap-2 text-lg md:text-sm font-bold md:font-semibold px-5 py-3 md:px-4 md:py-2 rounded-xl md:rounded-lg transition-colors border ${showCalendarMenu ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'text-slate-800 md:text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-300 md:border-slate-200 dark:border-slate-700 hover:bg-slate-200'}`}
                    title="Exportar a Agenda"
                >
                    <CalendarPlus className="w-6 h-6 md:w-[18px] md:h-[18px]" />
                    <span>Agenda</span>
                </button>
                
                {showCalendarMenu && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-[50] animate-in fade-in slide-in-from-bottom-2">
                         <a 
                            href={getGoogleCalendarUrl(task)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={() => setShowCalendarMenu(false)}
                            className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors border-b border-slate-100 dark:border-slate-700"
                         >
                            <img src="https://www.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_31_2x.png" className="w-5 h-5" alt=""/>
                            Google Calendar
                         </a>
                         <button 
                            onClick={() => { downloadIcsFile(task); setShowCalendarMenu(false); }}
                            className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                         >
                            <Calendar className="w-5 h-5 text-blue-500" />
                            iPhone / Outlook
                         </button>
                    </div>
                )}
            </div>
      </div>

      {/* Collaborator & Supervisor Info */}
      {( (task.people.collaborators && task.people.collaborators.length > 0) || task.people.supervisor ) && (
          <div className="mt-5 flex flex-col gap-1 text-sm md:text-xs text-slate-600 dark:text-slate-400">
              {task.people.collaborators && task.people.collaborators.length > 0 && (
                  <div className="truncate leading-relaxed">
                      <span className="italic font-medium text-slate-500">Colaborador{task.people.collaborators.length > 1 ? 'es' : ''}:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{task.people.collaborators.join(', ')}</span>
                  </div>
              )}
              {task.people.supervisor && (
                  <div className="truncate leading-relaxed">
                      <span className="italic font-medium text-slate-500">Supervisor:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{task.people.supervisor}</span>
                  </div>
              )}
          </div>
      )}

      {/* Footer Section */}
      <div className="mt-5 pt-4 border-t border-slate-200 md:border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-3">
             <div className="flex items-center relative">
                 {/* User Avatar */}
                 {task.people.responsible !== 'Sin asignar' && (
                    <img 
                        src={userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(task.people.responsible)}&background=random`} 
                        alt={task.people.responsible}
                        className="w-14 h-14 md:w-12 md:h-12 rounded-full object-cover border-2 border-slate-100 dark:border-slate-800 shadow-sm relative z-0"
                    />
                 )}
             </div>

             <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                    <span className="text-lg md:text-sm font-bold text-slate-900 md:text-slate-700 dark:text-slate-200">
                        {task.people.responsible !== 'Sin asignar' ? task.people.responsible : 'Sin asignar'}
                    </span>
                    {/* Self Responsibility Indicator */}
                    {isMyResponsibility && (
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded uppercase tracking-wide">
                            (Tú)
                        </span>
                    )}
                </div>
                
                {/* Indicators Row */}
                <div className="flex items-center gap-4 md:gap-3 text-slate-800 md:text-slate-500 dark:text-slate-400 text-base md:text-xs font-bold mt-1 md:mt-0.5">
                    {/* Time */}
                    <div className="flex items-center gap-1.5 md:gap-1">
                        <Clock className="w-5 h-5 md:w-3 md:h-3 stroke-2 md:stroke-1" />
                        <span>{task.statusTime.estimatedHours}h</span>
                    </div>

                    {/* Attachments */}
                    {attachmentsCount > 0 && (
                        <div className="flex items-center gap-1.5 md:gap-1 text-slate-800 md:text-slate-500 dark:text-slate-400" title={`${attachmentsCount} Adjuntos`}>
                            <Paperclip className="w-5 h-5 md:w-3 md:h-3 stroke-2 md:stroke-1" />
                            <span>{attachmentsCount}</span>
                        </div>
                    )}

                    {/* Subtasks */}
                    {subtasksCount > 0 && (
                        <div className="flex items-center gap-1.5 md:gap-1 text-slate-800 md:text-slate-500 dark:text-slate-400" title={`${subtasksCount} Subtareas`}>
                            <CornerDownRight className="w-5 h-5 md:w-3 md:h-3 stroke-2 md:stroke-1" />
                            <span>{subtasksCount}</span>
                        </div>
                    )}

                    {/* Notes */}
                    {(task.notesCount || 0) > 0 && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(task, 'notes'); }}
                            className="flex items-center gap-1.5 md:gap-1 text-blue-700 md:text-blue-600 hover:text-blue-800 md:hover:text-blue-700 transition-colors p-2 -m-2 md:p-0 md:m-0"
                            title={`${task.notesCount} Notas`}
                        >
                            <MessageSquare className="w-5 h-5 md:w-3 md:h-3 stroke-2 md:stroke-1" />
                            <span>{task.notesCount}</span>
                        </button>
                    )}
                </div>
             </div>
          </div>

          {/* Actions */}
          {showConfirmDelete ? (
           <div className="flex items-center gap-3 md:gap-1 bg-red-50 dark:bg-red-900/30 p-2 md:p-1 rounded-xl md:rounded-lg border border-red-200 md:border-red-100 dark:border-red-900 animate-in fade-in zoom-in duration-200">
             <button 
                onClick={() => onDelete(task.id)}
                className="p-3 md:p-1.5 bg-red-600 md:bg-red-500 text-white rounded-lg md:rounded hover:bg-red-700 md:hover:bg-red-600 transition-colors"
                title="Confirmar Borrado"
             >
               <Check className="w-6 h-6 md:w-5 md:h-5 stroke-2" />
             </button>
             <button 
                onClick={() => setShowConfirmDelete(false)}
                className="p-3 md:p-1.5 bg-white dark:bg-slate-700 text-slate-600 md:text-slate-500 dark:text-slate-300 border border-slate-300 md:border-slate-200 dark:border-slate-600 rounded-lg md:rounded hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                title="Cancelar"
             >
               <X className="w-6 h-6 md:w-5 md:h-5 stroke-2" />
             </button>
           </div>
        ) : (
          <div className="flex items-center gap-3 md:gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => onEdit(task)}
              className="p-3 md:p-2 text-slate-600 md:text-slate-400 md:text-slate-300 hover:text-blue-700 md:hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-xl md:rounded-lg transition-colors border border-slate-200 md:border-transparent"
              title="Editar"
            >
              <Pencil className="w-6 h-6 md:w-5 md:h-5 stroke-2 md:stroke-1" />
            </button>
            <button 
              onClick={() => setShowConfirmDelete(true)}
              className="p-3 md:p-2 text-slate-600 md:text-slate-400 md:text-slate-300 hover:text-red-700 md:hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-xl md:rounded-lg transition-colors border border-slate-200 md:border-transparent"
              title="Borrar"
            >
              <Trash2 className="w-6 h-6 md:w-5 md:h-5 stroke-2 md:stroke-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
