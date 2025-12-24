import React, { useMemo } from 'react';
import { Task, User, TaskStatus } from '../types';
import { Clock, Briefcase, CheckCircle2, Circle, Pencil } from 'lucide-react';

interface ReportsViewProps {
  tasks: Task[];
  users: User[];
  onEdit: (task: Task) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ tasks, users, onEdit }) => {

  // Calculate aggregations
  const reportData = useMemo(() => {
    // 1. Map users to their tasks and calculate totals
    const userReports = users.map(user => {
      const userTasks = tasks.filter(t => 
        t.people.responsible.toLowerCase() === user.name.toLowerCase()
      );
      
      const totalEstimated = userTasks.reduce((acc, t) => acc + (t.statusTime.estimatedHours || 0), 0);
      const totalUsed = userTasks.reduce((acc, t) => acc + (t.statusTime.usedHours || 0), 0);
      const completedCount = userTasks.filter(t => t.statusTime.status === TaskStatus.COMPLETED).length;

      return {
        user,
        tasks: userTasks,
        stats: {
          totalEstimated,
          totalUsed,
          taskCount: userTasks.length,
          completedCount
        }
      };
    });

    // Sort by busiest users (most estimated hours)
    return userReports.sort((a, b) => b.stats.totalEstimated - a.stats.totalEstimated);
  }, [tasks, users]);

  const globalStats = useMemo(() => {
    return {
      totalHours: reportData.reduce((acc, r) => acc + r.stats.totalEstimated, 0),
      totalTasks: tasks.length,
      avgHoursPerTask: tasks.length ? (reportData.reduce((acc, r) => acc + r.stats.totalEstimated, 0) / tasks.length).toFixed(1) : 0
    };
  }, [reportData, tasks]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* General Summary Card */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-8">
        <div>
        <h2 className="text-3xl font-bold flex items-center gap-4">
            <Clock className="text-blue-400 w-8 h-8" />
            Reporte de Horas
        </h2>
        <p className="text-slate-400 mt-2 text-xl">Desglose de carga de trabajo por usuario y tarea</p>
        </div>
        
        <div className="flex gap-10 text-center">
            <div>
                <div className="text-5xl font-black text-blue-400">{globalStats.totalHours}h</div>
                <div className="text-sm uppercase tracking-wider text-slate-500 font-bold mt-1">Total Horas Est.</div>
            </div>
            <div className="w-px bg-slate-700 h-16 self-center"></div>
            <div>
                <div className="text-5xl font-black text-white">{globalStats.totalTasks}</div>
                <div className="text-sm uppercase tracking-wider text-slate-500 font-bold mt-1">Tareas Totales</div>
            </div>
            <div className="w-px bg-slate-700 h-16 self-center hidden sm:block"></div>
            <div className="hidden sm:block">
                <div className="text-5xl font-black text-emerald-400">{globalStats.avgHoursPerTask}h</div>
                <div className="text-sm uppercase tracking-wider text-slate-500 font-bold mt-1">Promedio / Tarea</div>
            </div>
        </div>
      </div>

      {/* User Grids */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {reportData.map(({ user, tasks, stats }) => (
        <div key={user.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
            <div className="flex items-center gap-5">
                <div className="relative">
                    <img 
                        src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} 
                        alt={user.name} 
                        className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-sm"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                        <div className="bg-emerald-500 w-3.5 h-3.5 rounded-full border-2 border-white"></div>
                    </div>
                </div>
                <div>
                    <h3 className="font-bold text-2xl text-slate-800 leading-tight">{user.name}</h3>
                    <span className="text-base font-bold text-slate-500 capitalize">{user.role}</span>
                </div>
            </div>

            <div className="text-right">
                <span className="block text-4xl font-black text-slate-700">{stats.totalEstimated}h</span>
                <span className="text-xs uppercase text-slate-400 font-bold tracking-wider">Asignadas</span>
            </div>
            </div>

            {/* Task List */}
            <div className="flex-grow p-0">
            {tasks.length === 0 ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center">
                    <Briefcase className="w-10 h-10 mb-3 opacity-20" />
                    <span className="text-lg font-medium">Sin tareas asignadas</span>
                </div>
            ) : (
                <table className="w-full text-left">
                    <thead className="text-sm text-slate-400 uppercase bg-slate-50 font-bold">
                        <tr>
                            <th className="px-6 py-4">Tarea</th>
                            <th className="px-3 py-4 text-center">Estado</th>
                            <th className="px-6 py-4 text-right">Horas</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-base">
                        {tasks.map(task => (
                            <tr 
                            key={task.id} 
                            className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                            onClick={() => onEdit(task)}
                            title="Haz clic para editar"
                            >
                                <td className="px-6 py-5 relative">
                                    <div className="font-semibold text-lg text-slate-700 line-clamp-1 group-hover:text-blue-700 transition-colors" title={task.title}>{task.title}</div>
                                    <div className="text-base text-slate-400 flex items-center gap-2 mt-1 font-medium">
                                        <span className={`w-2.5 h-2.5 rounded-full ${
                                            task.classification.priority === 1 ? 'bg-red-500' : 
                                            task.classification.priority === 2 ? 'bg-orange-400' : 'bg-blue-300'
                                        }`}></span>
                                        {task.classification.client}
                                    </div>
                                    {/* Edit Hint Icon */}
                                    <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Pencil size={16} className="text-blue-400" />
                                    </div>
                                </td>
                                <td className="px-3 py-5 text-center">
                                    {task.statusTime.status === TaskStatus.COMPLETED ? (
                                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                                    ) : task.statusTime.status === TaskStatus.IN_PROGRESS ? (
                                        <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto" />
                                    ) : (
                                        <Circle className="w-6 h-6 text-slate-300 mx-auto" />
                                    )}
                                </td>
                                <td className="px-6 py-5 text-right font-mono text-lg text-slate-600 font-bold group-hover:text-blue-700 transition-all">
                                    {task.statusTime.estimatedHours > 0 ? (
                                        <span>{task.statusTime.estimatedHours}h</span>
                                    ) : (
                                        <span className="text-slate-300">-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-100">
                        <tr>
                            <td className="px-6 py-4 text-base font-bold text-slate-500">Total</td>
                            <td></td>
                            <td className="px-6 py-4 text-right text-base font-bold text-slate-700">{stats.totalEstimated}h</td>
                        </tr>
                    </tfoot>
                </table>
            )}
            </div>
            
            {/* Footer Metrics */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-between items-center text-sm text-slate-500 font-medium">
                <div className="flex gap-6">
                    <span><strong>{stats.completedCount}</strong> Completadas</span>
                    <span><strong>{stats.taskCount - stats.completedCount}</strong> Pendientes</span>
                </div>
                {stats.totalEstimated > 0 && (
                    <div className="w-32 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${Math.min(100, (stats.completedCount / stats.taskCount) * 100)}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
        ))}
      </div>
    </div>
  );
};