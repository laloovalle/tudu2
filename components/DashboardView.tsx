import React from 'react';
import { User, Task, TaskStatus, TaskPriority } from '../types';
import { Recorder } from './Recorder';
import { Plus, ArrowRight, CheckCircle2, Clock, AlertTriangle, Calendar, Layers, ChevronRight, Activity, Star, Sparkles, SquareKanban, CalendarRange, LayoutGrid, List, Building2 } from 'lucide-react';

interface DashboardViewProps {
  user: User;
  tasks: Task[];
  onNavigateToTasks: () => void;
  onCreateTask: () => void;
  onVoiceTask: (audioBase64: string) => void;
  isProcessingVoice: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  user, 
  tasks, 
  onNavigateToTasks, 
  onCreateTask, 
  onVoiceTask,
  isProcessingVoice
}) => {
  
  // --- Stats Calculation ---
  const pendingTasks = tasks.filter(t => t.statusTime.status === TaskStatus.PENDING || t.statusTime.status === TaskStatus.TO_DO);
  const criticalTasks = tasks.filter(t => t.classification.priority === TaskPriority.CRITICAL && t.statusTime.status !== TaskStatus.COMPLETED && t.statusTime.status !== TaskStatus.CANCELED);
  
  const completedToday = tasks.filter(t => {
      if (t.statusTime.status !== TaskStatus.COMPLETED) return false;
      const updated = new Date(t.system.updatedAt);
      const today = new Date();
      return updated.getDate() === today.getDate() && updated.getMonth() === today.getMonth() && updated.getFullYear() === today.getFullYear();
  });

  // --- High Priority Focus List (Top 3 unfinished high priority tasks) ---
  const focusTasks = tasks
    .filter(t => 
        (t.classification.priority <= 2) && // Critical or High
        t.statusTime.status !== TaskStatus.COMPLETED && 
        t.statusTime.status !== TaskStatus.CANCELED
    )
    .sort((a, b) => a.classification.priority - b.classification.priority) // Highest priority first
    .slice(0, 3);

  // --- Recent Activity ---
  const recentActivity = [...tasks]
    .sort((a, b) => new Date(b.system.updatedAt).getTime() - new Date(a.system.updatedAt).getTime())
    .slice(0, 3) // Reduced to 3 to fit better
    .map(t => ({
        id: t.id,
        action: t.statusTime.status === TaskStatus.COMPLETED ? 'Completó' : 'Actualizó',
        taskTitle: t.title,
        time: new Date(t.system.updatedAt),
        status: t.statusTime.status
    }));

  const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Buenos días';
      if (hour < 19) return 'Buenas tardes';
      return 'Buenas noches';
  };

  const currentDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  
  const navigateToView = (viewName: string) => {
      // Find the button in the nav bar containing the text
      const buttons = document.querySelectorAll('nav button');
      buttons.forEach(btn => {
          if (btn.textContent?.includes(viewName)) {
              (btn as HTMLElement).click();
          }
      });
  };

  return (
    <div className="w-full h-full pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 mt-2 px-1">
        <div>
            <div className="text-lg md:text-sm font-bold text-slate-800 md:text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-2">
                <Calendar className="w-6 h-6 md:w-4 md:h-4" /> {currentDate}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
             {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 md:from-blue-600 to-indigo-600 md:to-indigo-500">{(user.name || '').split(' ')[0]}</span>
            </h1>
        </div>
      </div>

      {/* MAIN BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-min">
        
        {/* === ROW 1 === */}

        {/* WIDGET 1: Voice Assistant (Large Hero) */}
        <div className="md:col-span-2 xl:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-200 md:border-slate-100 dark:border-slate-800 relative overflow-hidden group min-h-[340px] flex flex-col justify-center items-center text-center">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20"></div>
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-400/20 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-400/20 rounded-full blur-[60px] -ml-20 -mb-20 pointer-events-none"></div>
            
            <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col items-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 md:px-4 md:py-1.5 rounded-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/20 shadow-sm text-blue-800 md:text-blue-700 dark:text-blue-300 text-base md:text-xs font-bold mb-6 tracking-wide uppercase">
                    <Sparkles className="w-5 h-5 md:w-3.5 md:h-3.5 fill-blue-600 md:fill-blue-500 text-blue-600 md:text-blue-500" />
                    <span>Asistente Inteligente</span>
                </div>

                <h3 className="text-3xl md:text-4xl font-bold text-slate-900 md:text-slate-800 dark:text-white mb-3 tracking-tight">
                    ¿Qué hay para hoy?
                </h3>
                <p className="text-slate-800 md:text-slate-500 dark:text-slate-400 mb-8 text-xl md:text-lg font-medium leading-relaxed max-w-sm">
                    Dicta una tarea y la organizaré automáticamente en tus tableros.
                </p>
                
                <div className="scale-125 mb-6 filter drop-shadow-xl hover:scale-135 transition-transform duration-300">
                    <Recorder onRecordingComplete={onVoiceTask} isProcessing={isProcessingVoice} />
                </div>
            </div>
        </div>

        {/* WIDGET 2: Quick Stats Stack (Vertical) */}
        <div className="md:col-span-1 xl:col-span-1 flex flex-col gap-5">
            {/* Critical */}
            <div className="flex-1 bg-red-50 dark:bg-red-900/10 rounded-[2rem] p-6 border border-red-200 md:border-red-100 dark:border-red-900/20 flex flex-col justify-center relative overflow-hidden group transition-transform hover:scale-[1.02]">
                <div className="absolute -right-6 -top-6 text-red-200 dark:text-red-900/20 opacity-50 group-hover:scale-110 transition-transform duration-500">
                    <AlertTriangle size={100} />
                </div>
                <div className="relative z-10">
                    <div className="text-5xl md:text-4xl font-black text-red-700 md:text-red-600 dark:text-red-400">{criticalTasks.length}</div>
                    <div className="text-lg md:text-xs font-bold text-red-900 md:text-red-800 dark:text-red-200 uppercase tracking-wide mt-1">Críticas</div>
                </div>
            </div>

            {/* Pending */}
            <div className="flex-1 bg-orange-50 dark:bg-orange-900/10 rounded-[2rem] p-6 border border-orange-200 md:border-orange-100 dark:border-orange-900/20 flex flex-col justify-center relative overflow-hidden group transition-transform hover:scale-[1.02]">
                 <div className="absolute -right-6 -top-6 text-orange-200 dark:text-orange-900/20 opacity-50 group-hover:scale-110 transition-transform duration-500">
                    <Clock size={100} />
                </div>
                <div className="relative z-10">
                    <div className="text-5xl md:text-4xl font-black text-orange-700 md:text-orange-600 dark:text-orange-400">{pendingTasks.length}</div>
                    <div className="text-lg md:text-xs font-bold text-orange-900 md:text-orange-800 dark:text-orange-200 uppercase tracking-wide mt-1">Pendientes</div>
                </div>
            </div>
        </div>

        {/* WIDGET 3: Create Manual (Tall) */}
        <div className="md:col-span-1 xl:col-span-1">
             <button 
                onClick={onCreateTask}
                className="w-full h-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-8 rounded-[2.5rem] shadow-2xl hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] hover:translate-y-[-4px] transition-all flex flex-col justify-between group min-h-[340px] relative overflow-hidden"
            >
                {/* Abstract Circle Decoration */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white/10 dark:border-slate-900/10 rounded-full scale-0 group-hover:scale-150 transition-transform duration-700 ease-out"></div>

                <div className="flex justify-between items-start w-full relative z-10">
                    <div className="p-4 bg-white/20 dark:bg-slate-200/50 backdrop-blur-md rounded-[1.2rem] group-hover:bg-white/30 dark:group-hover:bg-slate-300 transition-colors">
                        <Plus className="w-8 h-8 md:w-8 md:h-8" />
                    </div>
                    <div className="p-2 rounded-full bg-white/10 dark:bg-slate-100/10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="w-6 h-6 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                    </div>
                </div>
                <div className="text-left mt-8 relative z-10">
                    <span className="block text-4xl font-bold leading-none mb-3">Crear</span>
                    <span className="block text-xl opacity-80 md:opacity-60 font-medium text-slate-200 md:text-slate-400 dark:text-slate-600">Manualmente</span>
                </div>
            </button>
        </div>


        {/* === ROW 2: NAVIGATION & FOCUS === */}

        {/* WIDGET 4: Navigation Hub (Large) */}
        <div className="md:col-span-2 xl:col-span-2 grid grid-cols-2 gap-5">
            
            {/* Main "All Tasks" Card */}
            <div 
                onClick={onNavigateToTasks}
                className="col-span-2 bg-gradient-to-br from-indigo-600 to-blue-700 md:from-indigo-500 md:to-blue-600 rounded-[2rem] p-6 text-white shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all relative overflow-hidden group flex items-center"
            >
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
                <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-white/10 skew-x-12 translate-x-12 group-hover:translate-x-full transition-transform duration-700"></div>

                <div className="relative z-10 flex-1 pl-2">
                    <div className="flex items-center gap-3 mb-2">
                         <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Layers className="w-6 h-6 md:w-6 md:h-6 text-white" />
                         </div>
                         <span className="text-indigo-100 font-bold uppercase tracking-wider text-sm md:text-xs">Principal</span>
                    </div>
                    <h3 className="text-3xl font-bold">Ver Todas</h3>
                    <p className="text-indigo-100 opacity-90 md:opacity-80 text-lg md:text-sm mt-1 font-medium">Lista completa, filtros y búsqueda</p>
                </div>
                
                <div className="relative z-10 mr-4">
                    <div className="w-14 h-14 md:w-12 md:h-12 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <ArrowRight className="w-7 h-7 md:w-6 md:h-6" />
                    </div>
                </div>
            </div>

            {/* Quick Access: Kanban */}
            <div 
                onClick={() => navigateToView('Kanban')}
                className="col-span-1 bg-white dark:bg-slate-900 border border-slate-300 md:border-slate-100 dark:border-slate-800 rounded-[2rem] p-5 cursor-pointer hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group flex flex-col justify-between h-48 md:h-40 shadow-sm"
            >
                <div className="w-12 h-12 md:w-10 md:h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 md:text-slate-600 dark:text-slate-300 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <SquareKanban className="w-7 h-7 md:w-6 md:h-6" />
                </div>
                <div>
                    <span className="block font-bold text-xl md:text-lg text-slate-900 md:text-slate-800 dark:text-white">Tableros</span>
                    <span className="text-base md:text-xs text-slate-500 md:text-slate-400 font-medium">Kanban View</span>
                </div>
            </div>

            {/* Quick Access: Planning */}
            <div 
                onClick={() => navigateToView('Planificación')}
                className="col-span-1 bg-white dark:bg-slate-900 border border-slate-300 md:border-slate-100 dark:border-slate-800 rounded-[2rem] p-5 cursor-pointer hover:border-purple-200 dark:hover:border-purple-800 hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-all group flex flex-col justify-between h-48 md:h-40 shadow-sm"
            >
                <div className="w-12 h-12 md:w-10 md:h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 md:text-slate-600 dark:text-slate-300 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <CalendarRange className="w-7 h-7 md:w-6 md:h-6" />
                </div>
                <div>
                    <span className="block font-bold text-xl md:text-lg text-slate-900 md:text-slate-800 dark:text-white">Planning</span>
                    <span className="text-base md:text-xs text-slate-500 md:text-slate-400 font-medium">Timeline</span>
                </div>
            </div>
        </div>

        {/* WIDGET 5: Focus List (Wide) */}
        <div className="md:col-span-1 xl:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] p-7 shadow-sm border border-slate-200 md:border-slate-100 dark:border-slate-800 flex flex-col min-h-[250px]">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-2xl text-yellow-600 dark:text-yellow-400 shadow-sm">
                    <Star className="w-6 h-6 md:w-5 md:h-5 fill-current" />
                </div>
                <div>
                    <h3 className="font-bold text-2xl md:text-xl text-slate-900 md:text-slate-800 dark:text-white leading-none">Foco del Día</h3>
                    <p className="text-sm md:text-xs text-slate-500 md:text-slate-400 font-bold mt-1.5 uppercase tracking-wide">Prioridad Máxima</p>
                </div>
            </div>

            <div className="flex-grow space-y-4 md:space-y-3">
                {focusTasks.length > 0 ? (
                    focusTasks.map(task => (
                        <div 
                            key={task.id} 
                            onClick={onNavigateToTasks} // Or open edit modal if possible
                            className="group flex items-center justify-between p-5 md:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-[1.2rem] hover:bg-white hover:shadow-md dark:hover:bg-slate-800 transition-all border border-slate-200 md:border-slate-100 dark:border-slate-800/50 cursor-pointer"
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <div className={`w-4 h-4 md:w-3 md:h-3 rounded-full flex-shrink-0 ${task.classification.priority === 1 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-pulse' : 'bg-orange-500'}`}></div>
                                <div className="min-w-0">
                                    <div className="font-bold text-lg md:text-base text-slate-900 md:text-slate-700 dark:text-slate-200 truncate group-hover:text-blue-700 transition-colors">{task.title}</div>
                                    <div className="text-sm md:text-xs text-slate-500 md:text-slate-400 font-medium truncate flex items-center gap-2">
                                        <Building2 className="w-4 h-4 md:w-3 md:h-3" />
                                        {task.classification.client}
                                    </div>
                                </div>
                            </div>
                            <div className="p-2 text-slate-400 md:text-slate-300 group-hover:text-blue-500 transition-colors">
                                <ChevronRight className="w-6 h-6 md:w-5 md:h-5" />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-4 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                        <CheckCircle2 className="w-12 h-12 mb-3 opacity-20 text-emerald-500" />
                        <p className="text-base md:text-sm font-bold text-slate-500">¡Todo despejado!</p>
                        <p className="text-sm md:text-xs">No tienes tareas críticas pendientes.</p>
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};