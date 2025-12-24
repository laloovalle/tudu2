
import React, { useRef, useState, useEffect } from 'react';
import { User, Task, TaskPriority, TaskStatus } from '../types';
import { Mic, ArrowRight, ChevronRight, Square, X, Loader2, CheckCircle2, Pencil, ListTodo, Keyboard } from 'lucide-react';

interface DashboardViewAltProps {
  user: User;
  tasks: Task[];
  onNavigateTo: (view: 'tasks' | 'kanban' | 'planning' | 'dashboard') => void;
  onCreateTask: () => void;
  onOpenVoiceModal: () => void;
  onVoiceTask: (base64: string) => Promise<Task | undefined>; 
  onEditTask: (task: Task) => void;
  isProcessing: boolean;
}

type ViewState = 'idle' | 'recording' | 'processing' | 'success';

export const DashboardViewAlt: React.FC<DashboardViewAltProps> = ({ 
  user, 
  tasks, 
  onNavigateTo, 
  onCreateTask,
  onOpenVoiceModal,
  onVoiceTask,
  onEditTask,
  isProcessing
}) => {
  
  // Internal State
  const [viewState, setViewState] = useState<ViewState>('idle');
  const [createdTask, setCreatedTask] = useState<Task | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isCancelledRef = useRef(false);

  // Sync external processing state - Careful with transitions
  useEffect(() => {
    if (isProcessing) {
      setViewState('processing');
    } else if (viewState === 'processing' && !isProcessing) {
        // If we were processing but now App.tsx is done, 
        // if we don't have a createdTask, return to idle
        if (!createdTask) {
           setViewState('idle');
        }
    }
  }, [isProcessing, createdTask]);

  // Stats
  const criticalCount = tasks.filter(t => 
    t.classification.priority === TaskPriority.CRITICAL && 
    t.statusTime.status !== TaskStatus.COMPLETED && 
    t.statusTime.status !== TaskStatus.CANCELED
  ).length;

  const pendingCount = tasks.filter(t => 
    (t.statusTime.status === TaskStatus.PENDING || t.statusTime.status === TaskStatus.TO_DO)
  ).length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const currentDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  // Recording Logic
  const startRecording = async (e: React.MouseEvent) => {
    e.stopPropagation(); 
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      isCancelledRef.current = false;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());

        if (isCancelledRef.current) {
            setViewState('idle');
            return;
        }

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64String = reader.result as string;
          if (base64String) {
              const parts = base64String.split(',');
              if (parts.length > 1) {
                  setViewState('processing');
                  const task = await onVoiceTask(parts[1]);
                  if (task) {
                      setCreatedTask(task);
                      setViewState('success');
                  } else {
                      setViewState('idle'); // Error case fallback
                  }
              }
          }
        };
      };

      mediaRecorder.start();
      setViewState('recording');
    } catch (err) {
      console.error("Mic error", err);
      alert("Error al acceder al micrófono. Verifique permisos.");
    }
  };

  const stopRecording = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (mediaRecorderRef.current && viewState === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mediaRecorderRef.current && viewState === 'recording') {
        isCancelledRef.current = true;
        mediaRecorderRef.current.stop();
    }
  };

  const handleCloseSuccess = (e: React.MouseEvent) => {
      e.stopPropagation();
      setViewState('idle');
      setCreatedTask(null);
  };

  const handleEditTask = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (createdTask) {
          onEditTask(createdTask);
          setViewState('idle');
          setCreatedTask(null);
      }
  };

  return (
    <div className="w-full pb-12 animate-in fade-in duration-500 font-sans">
      
      {/* Header */}
      <div className="mb-6 mt-2 px-1">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 opacity-80">
           {currentDate.toUpperCase()}
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
          {getGreeting()}, <span className="text-blue-600">{(user.name || '').split(' ')[0]}</span>
        </h1>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        
        {/* Card 1: Recorder */}
        <div 
            className="relative group overflow-hidden rounded-[2rem] shadow-xl cursor-pointer col-span-2 md:col-span-1 xl:col-span-1 h-[260px] md:h-auto md:aspect-[9/16] transition-transform hover:scale-[1.01] isolate transform-gpu" 
            onClick={viewState === 'idle' ? startRecording : undefined}
        >
          {viewState !== 'idle' ? (
             <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-8 animate-in fade-in duration-300 ${viewState === 'recording' ? 'bg-[#CC0000]' : 'bg-white'}`}>
                
                {/* --- RECORDING STATE (RED) --- */}
                {viewState === 'recording' && (
                    <div className="flex-grow flex flex-col items-center justify-center w-full text-white">
                        <div className="relative mb-16">
                            <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-20 duration-1000"></div>
                            <div className="absolute -inset-8 bg-white rounded-full animate-pulse opacity-10"></div>
                            
                            <button 
                                onClick={stopRecording}
                                className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-[#CC0000] shadow-xl hover:scale-105 transition-all relative z-10"
                            >
                                <Square className="w-10 h-10 fill-current" />
                            </button>
                        </div>

                        <div className="text-center space-y-1 mb-10">
                            <h3 className="text-2xl font-bold tracking-tight">ESCUCHANDO...</h3>
                            <p className="text-white/80 font-medium text-sm">
                                Click para terminar
                            </p>
                        </div>
                        
                        <button 
                            onClick={cancelRecording}
                            className="flex items-center gap-2 px-6 py-3 rounded-full border border-white/30 text-white font-bold text-sm hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                            Cancelar
                        </button>
                    </div>
                )}

                {/* --- PROCESSING STATE (WHITE) --- */}
                {viewState === 'processing' && (
                     <div className="flex-grow flex flex-col items-center justify-center w-full text-center">
                         <div className="relative mb-8">
                             <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
                             <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center relative z-10">
                                 <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                             </div>
                         </div>
                         <h3 className="text-xl font-bold text-slate-800 mb-2">Procesando...</h3>
                         <p className="text-slate-500">Creando tu tarea con IA</p>
                     </div>
                )}

                {/* --- SUCCESS STATE (WHITE) --- */}
                {viewState === 'success' && (
                    <div className="flex-grow flex flex-col items-center justify-center w-full text-center p-4">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-300">
                             <CheckCircle2 className="w-10 h-10 text-green-600" />
                        </div>
                        
                        <h3 className="text-2xl font-bold text-slate-900 mb-2 leading-tight">
                            Tarea Agregada
                        </h3>
                        
                        <p className="text-slate-600 text-lg mb-6 leading-relaxed line-clamp-3 italic">
                            "{createdTask?.title}"
                        </p>

                        <div className="flex flex-col gap-3 w-full">
                            <button 
                                onClick={handleEditTask}
                                className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center gap-2"
                            >
                                <Pencil size={18} /> Editar Tarea
                            </button>
                            <button 
                                onClick={handleCloseSuccess}
                                className="w-full py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                )}

             </div>
          ) : (
             <>
              <div className="hidden md:block absolute inset-0 pointer-events-none z-0">
                 <img src="https://tareas.estudioovalle.com.ar/images/rec.jpg" alt="Recorder" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                 <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/30 opacity-90" />
              </div>

              <div className="block md:hidden absolute inset-0 bg-black pointer-events-none z-0"></div>
              
              <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between z-10 pointer-events-none">
                 
                 <div className="space-y-1 md:space-y-3 mt-0 md:mt-4 text-center md:text-left relative z-20">
                    <span className="text-[11px] md:text-[13px] font-bold text-slate-300 tracking-widest uppercase block mb-1">
                        ASISTENTE DE VOZ
                    </span>
                    <h2 className="hidden md:block text-4xl font-semibold text-white leading-[1.1] tracking-tight">
                        ¿Sin ganas <br/> de escribir?
                    </h2>
                    <h2 className="block md:hidden text-3xl font-semibold text-white leading-[1.1] tracking-tight">
                        ¿Sin ganas?
                    </h2>
                    
                    <p className="hidden md:block text-lg text-slate-200 font-medium leading-snug max-w-[90%]">
                       Tocá rec y graba tu tarea. Me encargo de transcribirla y organizarla.
                    </p>
                    <p className="block md:hidden text-base text-slate-300 font-medium leading-snug">
                       Tocá REC. Yo me encargo.
                    </p>
                 </div>
                 
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 md:static md:translate-x-0 md:translate-y-0 md:self-end md:mb-2 pointer-events-auto mt-6 md:mt-0">
                     <button 
                        onClick={startRecording}
                        className="w-20 h-20 md:w-16 md:h-16 rounded-full bg-transparent md:bg-white text-red-600 flex items-center justify-center shadow-none md:shadow-lg group-hover:scale-110 transition-all duration-300 animate-pulse md:animate-none border-2 border-red-600 md:border-none"
                     >
                        <Mic className="w-10 h-10 md:w-8 md:h-8 text-red-600" strokeWidth={1.5} />
                     </button>
                 </div>
              </div>
             </>
          )}
        </div>

        {/* Card 2: Manual Entry */}
        <div 
            className="relative group overflow-hidden rounded-[2rem] shadow-xl cursor-pointer col-span-1 h-[160px] md:h-auto md:aspect-[9/16] transition-transform hover:scale-[1.01] isolate transform-gpu" 
            onClick={onCreateTask}
        >
          <div className="hidden md:block absolute inset-0 z-0">
             <img src="https://tareas.estudioovalle.com.ar/images/maquina.jpg" alt="Typewriter" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
             <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10 opacity-60" />
          </div>

          <div className="block md:hidden absolute inset-0 bg-[#5D7F99] z-0"></div>

          <div className="absolute inset-0 p-4 md:p-8 flex flex-col justify-end md:justify-end z-10 pb-4 md:pb-10">
             
             <div className="md:hidden flex flex-col items-start justify-between h-full pt-2">
                 <div className="p-2.5 bg-white/20 rounded-full backdrop-blur-sm mb-auto">
                    <Pencil className="w-5 h-5 text-white" />
                 </div>
                 <div className="space-y-0.5">
                     <h2 className="text-xl font-bold text-white leading-tight">
                        Escribir <br/> mis tareas
                     </h2>
                 </div>
             </div>

             <div className="hidden md:block space-y-2 md:space-y-3 relative z-10">
                <span className="text-[10px] md:text-[13px] font-bold text-slate-200 tracking-widest uppercase shadow-black/50 drop-shadow-sm">
                    ENTRADA MANUAL
                </span>
                <h2 className="text-4xl font-semibold text-white leading-[1.1] tracking-tight drop-shadow-md">
                    ¿Estás hecho <br/> un Poeta?
                </h2>
                <p className="text-lg text-slate-100 font-medium leading-snug max-w-[85%] drop-shadow-md">
                   Escribí tu tarea brevemente en el formulario.
                </p>
             </div>

             <div className="hidden md:block absolute bottom-5 right-5 md:bottom-8 md:right-8">
                 <button className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/80 backdrop-blur-md text-white flex items-center justify-center group-hover:bg-black group-hover:scale-110 transition-all duration-300">
                    <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
                 </button>
             </div>
          </div>
        </div>

        {/* Card 3: Task List */}
        <div 
            className="relative group overflow-hidden rounded-[2rem] shadow-xl cursor-pointer col-span-1 h-[160px] md:h-auto md:aspect-[9/16] transition-transform hover:scale-[1.01] isolate transform-gpu" 
            onClick={() => onNavigateTo('tasks')}
        >
          <div className="hidden md:block absolute inset-0 z-0">
             <img src="https://tareas.estudioovalle.com.ar/images/tablero.jpg" alt="Corkboard" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
             <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/30 opacity-80" />
          </div>

          <div className="block md:hidden absolute inset-0 bg-[#5D7F99] z-0"></div>

          <div className="absolute inset-0 p-4 md:p-8 flex flex-col justify-between z-10">
             
             <div className="md:hidden flex flex-col items-start justify-between h-full pt-2 pb-2">
                 <div className="p-2.5 bg-white/20 rounded-full backdrop-blur-sm mb-auto">
                    <ListTodo className="w-5 h-5 text-white" />
                 </div>
                 <div className="space-y-0.5">
                     <h2 className="text-xl font-bold text-white leading-tight">
                        Ver todas <br/> las tareas
                     </h2>
                 </div>
             </div>

             <div className="hidden md:block space-y-2 md:space-y-3 mt-2 md:mt-4">
                <span className="text-[10px] md:text-[13px] font-bold text-slate-200 tracking-widest uppercase">
                    MIS TAREAS
                </span>
                <h2 className="text-4xl font-semibold text-white leading-[1.1] tracking-tight">
                    Mirá tus tareas <br/> ordenadas.
                </h2>
                <p className="text-lg text-slate-200 font-medium leading-snug">
                   Sí, como nunca.
                </p>
             </div>

             <div className="hidden md:block self-end mb-1 md:mb-2">
                 <button className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/80 backdrop-blur-md text-white flex items-center justify-center group-hover:bg-black group-hover:scale-110 transition-all duration-300">
                    <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
                 </button>
             </div>
          </div>
        </div>

        {/* Column 4: Stats & Nav Widgets */}
        <div className="flex flex-col gap-4 md:gap-6 h-full col-span-2 md:col-span-1 xl:col-span-1"> 
            
            <div className="flex gap-4 md:gap-6 flex-none h-[160px] md:h-[180px]"> 
                <div className="flex-1 bg-[#F05D52] md:bg-[#CC0000] rounded-[1.8rem] p-5 md:p-6 text-white flex flex-col justify-between shadow-lg relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform isolate transform-gpu">
                     <span className="text-[17px] md:text-[19px] font-medium tracking-tight">Críticas</span>
                     <span className="text-6xl md:text-7xl font-bold tracking-tighter leading-none mb-1">{criticalCount}</span>
                </div>
                <div className="flex-1 bg-[#CE5A2D] md:bg-[#F58D02] rounded-[1.8rem] p-5 md:p-6 text-white flex flex-col justify-between shadow-lg relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform isolate transform-gpu">
                     <span className="text-[17px] md:text-[19px] font-medium tracking-tight">Pendientes</span>
                     <span className="text-6xl md:text-7xl font-bold tracking-tighter leading-none mb-1">{pendingCount}</span>
                </div>
            </div>

            <div 
                className="flex-1 bg-[#F2F2F7] md:bg-[#5E5E5E] rounded-[1.8rem] p-6 md:p-8 flex flex-col justify-between cursor-pointer hover:bg-slate-200 md:hover:bg-[#4E4E4E] transition-colors shadow-lg group relative min-h-[160px] isolate transform-gpu"
                onClick={() => onNavigateTo('kanban')}
            >
                <div className="flex flex-col gap-2 relative z-10">
                    <span className="text-slate-900 md:text-white font-bold text-xl md:text-2xl leading-tight tracking-tight">Tableros</span>
                    <p className="text-slate-500 md:text-[#E5E5E5] text-[15px] md:text-[17px] font-normal leading-snug pr-8 mt-1 line-clamp-2 md:line-clamp-none">
                        Ordena y mirá las tareas en el corcho por prioridad
                    </p>
                </div>
                
                <div className="absolute bottom-6 right-6 md:bottom-7 md:right-7">
                     <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white md:bg-[#1C1C1E] flex items-center justify-center text-slate-900 md:text-white shadow-lg group-hover:scale-110 transition-transform">
                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5 stroke-[3]" />
                    </div>
                </div>
            </div>

            <div 
                className="flex-1 bg-[#F2F2F7] md:bg-[#5E5E5E] rounded-[1.8rem] p-6 md:p-8 flex flex-col justify-between cursor-pointer hover:bg-slate-200 md:hover:bg-[#4E4E4E] transition-colors shadow-lg group relative min-h-[160px] isolate transform-gpu"
                onClick={() => onNavigateTo('planning')}
            >
                <div className="flex flex-col gap-2 relative z-10">
                    <span className="text-slate-900 md:text-white font-bold text-xl md:text-2xl leading-tight tracking-tight">Planning</span>
                    <p className="text-slate-500 md:text-[#E5E5E5] text-[15px] md:text-[17px] font-normal leading-snug pr-8 mt-1 line-clamp-2 md:line-clamp-none">
                        Pones en fecha visualmente las tareas.
                    </p>
                </div>
                
                <div className="absolute bottom-6 right-6 md:bottom-7 md:right-7">
                     <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white md:bg-[#1C1C1E] flex items-center justify-center text-slate-900 md:text-white shadow-lg group-hover:scale-110 transition-transform">
                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5 stroke-[3]" />
                    </div>
                </div>
            </div>

        </div>

      </div>
    </div>
  );
};
