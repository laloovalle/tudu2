import React from 'react';
import { Task } from '../types';
import { Pencil } from 'lucide-react';

interface TaskNotebookViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
}

export const TaskNotebookView: React.FC<TaskNotebookViewProps> = ({ tasks, onEdit }) => {
  return (
    <div className="w-full max-w-4xl mx-auto my-6 perspective-1000">
      {/* Paper Container - Removed rotation/hover effects for static view */}
      <div 
        className="relative bg-[#fefce8] shadow-lg rounded-sm overflow-hidden min-h-[600px]"
        style={{
          boxShadow: '5px 5px 15px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)'
        }}
      >
        {/* Top Binding/Holes simulation */}
        <div className="h-14 w-full bg-[#fefce8] border-b border-red-300/50 flex items-center px-8">
           <div className="w-full h-px bg-blue-200"></div>
        </div>

        {/* Vertical Margin Line */}
        <div className="absolute top-0 bottom-0 left-16 w-px bg-red-400/40 z-10 h-full"></div>

        {/* Content Area */}
        <div className="pb-12 pt-4">
          {tasks.map((task) => (
            <div 
              key={task.id} 
              onClick={() => onEdit(task)}
              className="group relative flex items-baseline px-8 py-2 cursor-pointer hover:bg-yellow-100/50 transition-colors"
            >
              {/* Line styling */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-blue-300/30 w-full pointer-events-none"></div>

              {/* Bullet/Action */}
              <div className="w-16 flex-shrink-0 flex justify-center items-center z-20 pr-2">
                 <button 
                    className="text-slate-400 group-hover:text-blue-600 transition-colors transform group-hover:scale-110"
                    title="Editar Tarea"
                 >
                   {/* Handwritten-style check box or circle */}
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                     <circle cx="12" cy="12" r="10" className="opacity-60" />
                     <path d="M16 8L8 16M8 8l8 8" className="opacity-0 group-hover:opacity-100 transition-opacity" /> 
                   </svg>
                 </button>
              </div>

              {/* Handwritten Text */}
              <div className="flex-grow pl-5 font-hand text-4xl text-slate-800 leading-relaxed pt-1 flex flex-wrap items-baseline gap-3">
                 <span className={`group-hover:text-blue-800 transition-colors decoration-slate-400/50 ${task.statusTime.status === 'Completada' ? 'line-through text-slate-400' : ''}`}>
                    {task.title}
                 </span>
                 
                 {task.classification.client && task.classification.client !== 'Sin Cliente' && (
                     <span className="text-3xl text-slate-500 inline-block font-hand">
                       ({task.classification.client})
                     </span>
                 )}

                 {/* Estimated Time */}
                 {task.statusTime.estimatedHours > 0 && (
                     <span className="text-3xl text-red-400/80 inline-block font-hand font-bold">
                        - {task.statusTime.estimatedHours}h
                     </span>
                 )}
              </div>
            </div>
          ))}

          {/* Empty Lines Filler (to make it look like a full page) */}
          {Array.from({ length: Math.max(0, 15 - tasks.length) }).map((_, i) => (
             <div key={`empty-${i}`} className="relative h-14 w-full">
                <div className="absolute bottom-0 left-0 right-0 h-px bg-blue-300/30 w-full"></div>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
};