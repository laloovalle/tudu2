
import React, { useState, useMemo } from 'react';
import { Task, User, TaskStatus, TaskPriority } from '../types';
import { Calendar, AlertCircle, GripVertical, Layers, Pencil, ArrowRight, Split, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface WorkloadViewProps {
  tasks: Task[];
  users: User[];
  initialUserId?: number; // New prop
  onEdit: (task: Task) => void;
  onReschedule: (taskId: number, newDate: string | null) => Promise<void>;
}

// Visual Constants - Updated for larger view
const PIXELS_PER_HOUR = 65; // Increased from 40 to 65 for taller segments
const MAX_DISPLAY_HOURS = 11; // Increased visual max height
const VISIBLE_DAYS = 15;

const getPriorityStyle = (priority: TaskPriority) => {
    switch (priority) {
        case TaskPriority.CRITICAL: return 'bg-red-500 border-red-600 text-white';
        case TaskPriority.HIGH: return 'bg-orange-500 border-orange-600 text-white';
        case TaskPriority.NORMAL: return 'bg-blue-500 border-blue-600 text-white';
        case TaskPriority.LOW: return 'bg-emerald-500 border-emerald-600 text-white';
        case TaskPriority.NONE: return 'bg-slate-400 border-slate-500 text-white';
        default: return 'bg-slate-500 border-slate-600 text-white';
    }
};

// Helper to safely get background color class
const getPriorityBgClass = (priority: TaskPriority) => {
    const style = getPriorityStyle(priority);
    return style ? style.split(' ')[0] : 'bg-slate-500';
};

// Helper to manipulate YYYY-MM-DD strings directly to avoid timezone mess
const addDays = (dateStr: string, days: number): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // Safety check: ensure dateStr is string before split
    const parts = String(dateStr).split('-');
    if (parts.length < 3) return new Date().toISOString().split('T')[0];

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; 
    const day = parseInt(parts[2], 10);
    
    const date = new Date(year, month, day);
    date.setDate(date.getDate() + days);
    
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const isWeekendStr = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const parts = String(dateStr).split('-');
    if (parts.length < 3) return false;

    const date = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
};

interface RenderItem {
    task: Task;
    displayHours: number;
    isSplit: boolean;
    splitIndex: number;
    totalSplits?: number;
}

export const WorkloadView: React.FC<WorkloadViewProps> = ({ tasks, users, initialUserId, onReschedule, onEdit }) => {
  // Use initialUserId if present, otherwise fallback to "Lalo" search logic
  const [selectedUserId, setSelectedUserId] = useState<number | null>(() => {
    if (initialUserId) return initialUserId;
    const lalo = users.find(u => u.name.toLowerCase().includes('lalo'));
    return lalo ? lalo.id : (users.length > 0 ? users[0].id : null);
  });
  
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Mobile state for toggling backlog
  const [isBacklogExpanded, setIsBacklogExpanded] = useState(true);

  const selectedUser = users.find(u => u.id === selectedUserId);
  const dailyCapacity = Number(selectedUser?.dailyHours) || 8;

  // 1. Generate 15 Days
  const calendarDays = useMemo(() => {
    const days = [];
    const d = new Date();
    for (let i = 0; i < VISIBLE_DAYS; i++) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayVal = String(d.getDate()).padStart(2, '0');
        days.push(`${y}-${m}-${dayVal}`);
        d.setDate(d.getDate() + 1);
    }
    return days;
  }, []);

  // 2. Process and Distribute Tasks (Cumulative / Water-Filling Logic)
  const { dayBuckets, backlogTasks, userStats } = useMemo(() => {
      if (!selectedUser) return { dayBuckets: {}, backlogTasks: [], userStats: { hours: 0, count: 0 } };

      const userTasks = tasks.filter(t => 
        t.people.responsible && 
        selectedUser.name && 
        t.people.responsible.toLowerCase() === selectedUser.name.toLowerCase() && 
        t.statusTime.status !== TaskStatus.COMPLETED &&
        t.statusTime.status !== TaskStatus.CANCELED
      );

      // Sort tasks: Date ASC, then Priority ASC (1 is higher), then ID DESC
      // This ensures we fill the calendar chronologically
      userTasks.sort((a, b) => {
          const dateA = a.statusTime.dueDate || '9999-99-99';
          const dateB = b.statusTime.dueDate || '9999-99-99';
          if (dateA !== dateB) return dateA.localeCompare(dateB);
          
          if (a.classification.priority !== b.classification.priority) {
              return a.classification.priority - b.classification.priority;
          }
          return b.id - a.id;
      });

      // Total Stats
      const totalEstimated = userTasks.reduce((acc, t) => acc + (t.statusTime.estimatedHours || 0), 0);
      const stats = { hours: totalEstimated, count: userTasks.length };

      // Initialize Buckets
      const buckets: Record<string, { items: RenderItem[], usedHours: number }> = {};
      const backlog: Task[] = [];
      const visibleStartStr = calendarDays[0]; 

      // Initialize buckets for visible range to track usage properly even if empty initially
      calendarDays.forEach(day => {
          buckets[day] = { items: [], usedHours: 0 };
      });

      // Distribute
      userTasks.forEach(task => {
          const rawHours = Number(task.statusTime.estimatedHours) || 0;
          const startDateStr = task.statusTime.dueDate ? String(task.statusTime.dueDate).split('T')[0] : null;

          // Backlog Conditions
          if (!startDateStr || startDateStr < visibleStartStr || rawHours === 0) {
             backlog.push(task);
             return;
          }

          let remaining = rawHours;
          let currentIsoDate = startDateStr;
          let splitCount = 1;
          const maxSplits = 30; // Safety break
          
          while (remaining > 0 && splitCount <= maxSplits) {
              const isWeekend = isWeekendStr(currentIsoDate);
              const isStartDate = currentIsoDate === startDateStr;

              // Logic: Start Date CAN be a weekend (user forced it). 
              // Continuation splits CANNOT be on weekend.
              if (isWeekend && !isStartDate) {
                   currentIsoDate = addDays(currentIsoDate, 1);
                   continue;
              }

              // Ensure bucket exists (for days outside visible range but still processing)
              if (!buckets[currentIsoDate]) {
                  buckets[currentIsoDate] = { items: [], usedHours: 0 };
              }

              const currentUsage = buckets[currentIsoDate].usedHours;
              const availableOnDay = Math.max(0, dailyCapacity - currentUsage);

              let hoursToAssign = 0;

              if (availableOnDay > 0) {
                  // We can fit some or all of the task here
                  hoursToAssign = Math.min(remaining, availableOnDay);
              } else {
                  // Day is full, we must push EVERYTHING to next day
                  hoursToAssign = 0;
              }

              // If we assigned hours, add to bucket
              if (hoursToAssign > 0) {
                  buckets[currentIsoDate].items.push({
                      task,
                      displayHours: hoursToAssign,
                      isSplit: rawHours > hoursToAssign, // It is a split if we aren't putting the whole task at once
                      splitIndex: splitCount
                  });
                  buckets[currentIsoDate].usedHours += hoursToAssign;
                  remaining -= hoursToAssign;
              }

              // Prepare for next loop iteration
              if (remaining > 0) {
                  // Move to next day
                  currentIsoDate = addDays(currentIsoDate, 1);
                  // Only increment visual split index if we actually placed something previously or if we skipped full days
                  if (hoursToAssign > 0) splitCount++;
              }
          }
      });

      // Sort Backlog
      backlog.sort((a, b) => {
          if (a.classification.priority !== b.classification.priority) {
              return a.classification.priority - b.classification.priority;
          }
          return a.title.localeCompare(b.title);
      });

      return { dayBuckets: buckets, backlogTasks: backlog, userStats: stats };

  }, [tasks, selectedUser, calendarDays, dailyCapacity]);


  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropToDate = async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const taskId = draggedTaskId;
    setDraggedTaskId(null);

    if (!taskId) return;
    
    setIsUpdating(true);
    await onReschedule(taskId, dateStr);
    setIsUpdating(false);
  };

  const handleDropToBacklog = async (e: React.DragEvent) => {
      e.preventDefault();
      const taskId = draggedTaskId;
      setDraggedTaskId(null);
      if (!taskId) return;

      setIsUpdating(true);
      await onReschedule(taskId, null);
      setIsUpdating(false);
  }

  if (!selectedUser) return <div className="p-10 text-center text-slate-400 text-lg">Selecciona un usuario.</div>;

  return (
    <div className="flex flex-col bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-visible font-sans transition-colors">
      
      {/* Header Controls - Lower z-index than App Header but sticky */}
      <div className="bg-white dark:bg-slate-800 p-4 md:p-5 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 md:gap-5 justify-between items-start md:items-center shadow-sm z-30 sticky top-20 md:top-24 rounded-t-xl transition-colors">
         <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="p-2.5 bg-slate-900 dark:bg-slate-700 rounded-lg text-white shadow-lg">
                 <Calendar className="w-6 h-6" />
             </div>
             <div className="flex-grow md:flex-grow-0">
                 <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Planificación de</label>
                 <select 
                    value={selectedUserId || ''} 
                    onChange={(e) => setSelectedUserId(Number(e.target.value))}
                    className="w-full md:w-auto bg-transparent border-none p-0 text-2xl md:text-3xl font-bold text-slate-800 dark:text-white focus:ring-0 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                 >
                     {users.filter(u => u.role !== 'cliente').map(u => (
                         <option key={u.id} value={u.id} className="text-slate-900">{u.name}</option>
                     ))}
                 </select>
             </div>
         </div>
         
         <div className="flex flex-wrap items-center justify-between gap-4 md:gap-8 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 md:px-8 md:py-3 rounded-xl md:rounded-full border border-slate-100 dark:border-slate-700 w-full md:w-auto">
             <div className="text-right flex-1 md:flex-none">
                 <div className="text-xl md:text-2xl font-black text-slate-700 dark:text-slate-200 leading-none">{userStats.count}</div>
                 <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Tareas</div>
             </div>
             <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
             <div className="text-right flex-1 md:flex-none">
                 <div className="text-xl md:text-2xl font-black text-blue-600 dark:text-blue-400 leading-none">{userStats.hours.toFixed(1)}h</div>
                 <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Total Hs</div>
             </div>
             <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
             <div className="text-right flex-1 md:flex-none">
                 <div className="text-xl md:text-2xl font-black text-slate-700 dark:text-slate-200 leading-none">{dailyCapacity}h</div>
                 <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Capacidad</div>
             </div>
         </div>

         {isUpdating && (
             <div className="flex items-center gap-2 text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-4 py-1.5 rounded-full text-sm font-bold animate-pulse border border-blue-200 dark:border-blue-800 w-full md:w-auto justify-center">
                 <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce"></div>
                 Actualizando...
             </div>
         )}
      </div>

      <div className="flex flex-col lg:flex-row flex-grow relative items-start">
        
        {/* SIDEBAR: Backlog */}
        <div 
            className={`w-full lg:w-72 flex-shrink-0 bg-slate-50 dark:bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col z-20 shadow-inner transition-colors ${draggedTaskId ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
            onDragOver={handleDragOver}
            onDrop={handleDropToBacklog}
        >
            <div 
                className="p-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center sticky top-0 cursor-pointer lg:cursor-default"
                onClick={() => setIsBacklogExpanded(!isBacklogExpanded)}
            >
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} /> Backlog
                    <span className="lg:hidden ml-2">{isBacklogExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</span>
                </span>
                <span className="bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">{backlogTasks.length}</span>
            </div>
            
            {/* Collapsible Content on Mobile */}
            <div className={`flex-grow p-4 space-y-3 ${isBacklogExpanded ? 'block' : 'hidden lg:block'}`}>
                {backlogTasks.map(task => (
                    <div 
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        className={`bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-4 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:border-blue-300 transition-all group relative ${draggedTaskId === task.id ? 'opacity-40' : ''}`}
                    >
                         <div className="flex justify-between items-start mb-2">
                             <div className={`w-2.5 h-2.5 rounded-full mt-1 ${getPriorityBgClass(task.classification.priority)}`} />
                             <button onClick={() => onEdit(task)} className="text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil size={14} /></button>
                         </div>
                         <div className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight mb-2 line-clamp-2">{task.title}</div>
                         <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
                             <span className="truncate max-w-[120px]">{task.classification.client}</span>
                             {Number(task.statusTime.estimatedHours) > 0 ? (
                                <span className="font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">{task.statusTime.estimatedHours}h</span>
                             ) : (
                                <span className="font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <AlertTriangle size={12} /> Hs
                                </span>
                             )}
                         </div>
                    </div>
                ))}
                {backlogTasks.length === 0 && (
                    <div className="text-center py-10 px-4 text-slate-400 text-sm italic">
                        {draggedTaskId ? 'Suelta aquí' : 'Backlog vacío'}
                    </div>
                )}
            </div>
        </div>

        {/* MAIN AREA: Calendar Days */}
        <div className="flex-grow p-3 md:p-6 w-full">
            <div className="flex flex-wrap gap-4 md:gap-6 items-start content-start">
                
                {calendarDays.map((dateKey, idx) => {
                    const bucket = dayBuckets[dateKey] || { items: [], usedHours: 0 };
                    // Because we strictly limit to capacity in the logic above, isOverCapacity shouldn't happen 
                    // unless a SINGLE task chunk (min split) was somehow > dailyCapacity, but we fixed that too.
                    const isOverCapacity = bucket.usedHours > dailyCapacity + 0.1; // epsilon for float
                    
                    const dateObj = new Date(parseInt(dateKey.split('-')[0]), parseInt(dateKey.split('-')[1])-1, parseInt(dateKey.split('-')[2]));
                    const dateLabel = dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' });
                    
                    const todayStr = new Date().toLocaleDateString('en-CA'); 
                    const isToday = dateKey === todayStr;
                    
                    const isWeekend = isWeekendStr(dateKey);
                    
                    // Fixed Height Calculation
                    const containerHeight = MAX_DISPLAY_HOURS * PIXELS_PER_HOUR; 

                    return (
                        <div 
                            key={dateKey}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropToDate(e, dateKey)}
                            className={`flex-shrink-0 flex flex-col rounded-xl border transition-all duration-200 w-full sm:w-[calc(50%-1.5rem)] md:w-[calc(33.33%-1.5rem)] lg:w-[calc(25%-1.5rem)] xl:w-[calc(20%-1.5rem)]
                                ${draggedTaskId ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-300 ring-2 ring-blue-100 dark:ring-blue-900' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm'}
                                ${isWeekend ? 'opacity-90' : ''}
                            `}
                        >
                            {/* Day Header */}
                            <div className={`px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center rounded-t-xl 
                                ${isToday ? 'bg-slate-800 text-white' : isWeekend ? 'bg-slate-100 dark:bg-slate-700 text-slate-400' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}>
                                <div className="text-base font-bold capitalize truncate flex items-center gap-2">
                                    {dateLabel}
                                    {isWeekend && <span className="text-[10px] uppercase border border-slate-200 dark:border-slate-600 px-1.5 rounded font-bold">Fin de Sem.</span>}
                                </div>
                                <div className={`text-xs font-bold px-2 py-0.5 rounded ${isToday ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                    {Number(bucket.usedHours.toFixed(1))}h
                                </div>
                            </div>

                            {/* Day Content Area */}
                            <div 
                                className={`relative overflow-hidden ${isWeekend ? 'bg-slate-50/50 dark:bg-slate-800/50' : 'bg-slate-50/30 dark:bg-slate-900/30'}`}
                                style={{ height: `${containerHeight}px` }}
                            >
                                {/* Grid Background */}
                                <div className="absolute inset-0 pointer-events-none opacity-5 dark:opacity-20" 
                                     style={{ 
                                         backgroundImage: 'linear-gradient(to bottom, #000 1px, transparent 1px)', 
                                         backgroundSize: `100% ${PIXELS_PER_HOUR}px` 
                                     }} 
                                />
                                
                                {/* Weekend Diagonal Stripes */}
                                {isWeekend && (
                                     <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-10" 
                                        style={{ 
                                            backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 10px)'
                                        }} 
                                     />
                                )}

                                {/* Capacity Line */}
                                <div 
                                    className="absolute left-0 right-0 border-b border-red-300 border-dashed pointer-events-none z-0"
                                    style={{ top: dailyCapacity * PIXELS_PER_HOUR }}
                                >
                                     {isOverCapacity && (
                                        <div className="absolute right-0 -top-5 bg-red-50 text-red-500 text-[10px] font-bold px-1.5 rounded border border-red-100 z-30">
                                            Sobrecarga
                                        </div>
                                     )}
                                </div>

                                {/* Tasks Flow */}
                                <div className="p-1.5 flex flex-col gap-1.5 relative z-10">
                                    {bucket.items.map((item, i) => {
                                        const h = item.displayHours;
                                        const heightPx = h * PIXELS_PER_HOUR;
                                        
                                        return (
                                            <div 
                                                key={`${item.task.id}-${dateKey}-${i}`}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, item.task.id)}
                                                className={`w-full rounded shadow-sm border p-3 cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-transform relative group overflow-hidden ${getPriorityStyle(item.task.classification.priority)} ${draggedTaskId === item.task.id ? 'opacity-40' : ''}`}
                                                style={{ height: `${heightPx}px`, minHeight: '34px' }}
                                            >
                                                <div className="flex justify-between items-start leading-none pointer-events-none">
                                                    <span className="font-bold text-sm line-clamp-2 pr-4 drop-shadow-md text-white leading-tight">
                                                        {item.isSplit && <Split size={12} className="inline mr-1 opacity-75" />}
                                                        {item.task.title}
                                                    </span>
                                                </div>
                                                
                                                {item.isSplit && (
                                                    <div className="absolute bottom-1 left-2 text-[10px] font-medium text-white/80 pointer-events-none">
                                                        Parte {item.splitIndex}
                                                    </div>
                                                )}

                                                <div className="absolute bottom-1.5 right-1.5 text-xs font-bold bg-black/20 px-2 py-0.5 rounded text-white backdrop-blur-sm pointer-events-none">
                                                    {h.toFixed(1).replace('.0','')}h
                                                </div>

                                                {/* Hover Actions */}
                                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); onEdit(item.task); }} 
                                                        className="p-1 bg-white/20 hover:bg-white/40 rounded text-white"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div className="text-center py-10 text-slate-400 text-sm font-medium">
                Fin de la planificación ({VISIBLE_DAYS} días)
            </div>
        </div>
      </div>
    </div>
  );
};
