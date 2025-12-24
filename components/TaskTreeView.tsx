import React, { useMemo, useState } from 'react';
import { Task, TaskStatus } from '../types';
import { ChevronDown, ChevronRight, CornerDownRight, Clock, User, Building2, Pencil, Trash2, GripVertical } from 'lucide-react';

interface TaskTreeViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onMove?: (taskId: number, newParentId: number | null) => void;
}

interface TreeNode {
  task: Task;
  children: TreeNode[];
  depth: number;
}

export const TaskTreeView: React.FC<TaskTreeViewProps> = ({ tasks, onEdit, onDelete, onMove }) => {
  const [collapsedNodes, setCollapsedNodes] = useState<Set<number>>(new Set());
  
  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [targetTaskId, setTargetTaskId] = useState<number | null>(null);

  // Build the tree structure from the flat task list
  const treeData = useMemo(() => {
    const taskMap = new Map<number, TreeNode>();
    const roots: TreeNode[] = [];

    // 1. Create nodes for all tasks in the current list
    tasks.forEach(task => {
      taskMap.set(task.id, { task, children: [], depth: 0 });
    });

    // 2. Assemble the tree
    tasks.forEach(task => {
      const node = taskMap.get(task.id)!;
      // If parent exists in the CURRENT list, add as child
      if (task.system.parentId && taskMap.has(task.system.parentId)) {
        const parent = taskMap.get(task.system.parentId)!;
        parent.children.push(node);
      } else {
        // Otherwise treat as root (either true root, or parent is filtered out)
        roots.push(node);
      }
    });

    // 3. Helper to set depth recursively (BFS or DFS)
    const setDepth = (nodes: TreeNode[], depth: number) => {
        nodes.forEach(node => {
            node.depth = depth;
            setDepth(node.children, depth + 1);
        });
    };
    setDepth(roots, 0);

    // 4. Sort function: Priority first, then OrderIndex, then ID
    const sortNodes = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => {
             // System Order Index takes precedence if set
             if (a.task.system.orderIndex !== b.task.system.orderIndex) {
                 return a.task.system.orderIndex - b.task.system.orderIndex;
             }
             return b.task.id - a.task.id; // Newest first fallback
        });
        nodes.forEach(node => sortNodes(node.children));
    };

    sortNodes(roots);
    return roots;

  }, [tasks]);

  const toggleCollapse = (taskId: number) => {
    const newSet = new Set(collapsedNodes);
    if (newSet.has(taskId)) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
    }
    setCollapsedNodes(newSet);
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
      return <span className={`px-2 py-0.5 rounded text-xs font-bold tracking-wide uppercase ${colorClass}`}>{s}</span>;
  };

  // Helper to check if potential parent is actually a child of dragged node (Circular dependency)
  const isDescendant = (draggedId: number, targetId: number, nodes: TreeNode[]): boolean => {
      for (const node of nodes) {
          if (node.task.id === draggedId) {
              // Found the dragged node, check if target is in its children recursively
              const checkChildren = (children: TreeNode[]): boolean => {
                  for (const child of children) {
                      if (child.task.id === targetId) return true;
                      if (checkChildren(child.children)) return true;
                  }
                  return false;
              };
              return checkChildren(node.children);
          }
          if (isDescendant(draggedId, targetId, node.children)) return true;
      }
      return false;
  };

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, taskId: number) => {
      setDraggedTaskId(taskId);
      e.dataTransfer.effectAllowed = 'move';
      // Optional: Set drag image if needed
  };

  const handleDragOver = (e: React.DragEvent, targetId: number | null) => {
      e.preventDefault(); // Necessary to allow dropping
      e.dataTransfer.dropEffect = 'move';
      
      // Don't highlight if hovering over self
      if (draggedTaskId === targetId) return;
      
      setTargetTaskId(targetId);
  };

  const handleDrop = (e: React.DragEvent, targetId: number | null) => {
      e.preventDefault();
      
      if (draggedTaskId === null) return;
      if (draggedTaskId === targetId) {
          setDraggedTaskId(null);
          setTargetTaskId(null);
          return;
      }

      // Check Circular Dependency
      if (targetId !== null) {
          if (isDescendant(draggedTaskId, targetId, treeData)) {
              alert("No puedes mover una tarea dentro de su propia subtarea.");
              setDraggedTaskId(null);
              setTargetTaskId(null);
              return;
          }
      }

      if (onMove) {
          onMove(draggedTaskId, targetId);
      }
      
      setDraggedTaskId(null);
      setTargetTaskId(null);
  };

  const handleDragEnd = () => {
      setDraggedTaskId(null);
      setTargetTaskId(null);
  };

  // Flatten tree for rendering (handling collapse state)
  const renderRows = (nodes: TreeNode[]): React.ReactNode[] => {
      let rows: React.ReactNode[] = [];
      
      nodes.forEach(node => {
          const isParent = node.children.length > 0;
          const isCollapsed = collapsedNodes.has(node.task.id);
          const isBold = isParent; 
          
          // Drag Styling
          const isDragging = draggedTaskId === node.task.id;
          const isTarget = targetTaskId === node.task.id && !isDragging;
          const isInactive = node.task.statusTime.status === TaskStatus.COMPLETED || node.task.statusTime.status === TaskStatus.CANCELED;

          rows.push(
              <tr 
                key={node.task.id} 
                className={`transition-colors group border-b border-slate-50 last:border-none
                    ${isDragging ? 'opacity-50 bg-slate-100' : 'hover:bg-blue-50/50'}
                    ${isTarget ? 'bg-blue-100 ring-2 ring-inset ring-blue-300' : ''}
                `}
                draggable
                onDragStart={(e) => handleDragStart(e, node.task.id)}
                onDragOver={(e) => handleDragOver(e, node.task.id)}
                onDrop={(e) => handleDrop(e, node.task.id)}
                onDragEnd={handleDragEnd}
              >
                  {/* Title with Indentation */}
                  <td className="px-6 py-3">
                      <div 
                        className="flex items-center" 
                        style={{ paddingLeft: `${node.depth * 28}px` }}
                      >
                          {/* Drag Handle */}
                          <div className="flex-shrink-0 w-8 flex justify-center text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-500">
                             <GripVertical size={16} />
                          </div>

                          {/* Tree Lines / Expander */}
                          <div className="flex-shrink-0 w-8 flex justify-center">
                              {isParent ? (
                                  <button 
                                    onClick={() => toggleCollapse(node.task.id)}
                                    className="p-1 hover:bg-slate-200 rounded text-slate-400"
                                  >
                                      {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                                  </button>
                              ) : (
                                node.depth > 0 && <CornerDownRight size={14} className="text-slate-300" />
                              )}
                          </div>

                          <div 
                            className={`flex-grow cursor-pointer flex items-center gap-2 text-base
                                ${isBold ? 'font-bold' : ''}
                                ${isInactive ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700'}
                            `}
                            onClick={() => onEdit(node.task)}
                          >
                              <span className="truncate">{node.task.title}</span>
                              {node.task.notesCount && node.task.notesCount > 0 ? (
                                  <span className="w-2 h-2 bg-blue-500 rounded-full" title="Tiene notas"></span>
                              ) : null}
                          </div>
                      </div>
                  </td>

                  {/* Responsible */}
                  <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                          <User size={14} className="text-slate-400" />
                          <span className="truncate max-w-[140px] font-medium">{node.task.people.responsible}</span>
                      </div>
                  </td>

                  {/* Company */}
                  <td className="px-6 py-3 whitespace-nowrap">
                       <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Building2 size={14} className="text-slate-400" />
                          <span className="truncate max-w-[140px] font-medium">{node.task.classification.client}</span>
                      </div>
                  </td>

                   {/* Hours */}
                   <td className="px-6 py-3 whitespace-nowrap text-center">
                       <div className="flex items-center justify-center gap-1 text-sm text-slate-500">
                          <Clock size={14} className="text-slate-400" />
                          <span className={node.task.statusTime.estimatedHours > 0 ? 'font-bold' : 'text-slate-300'}>
                              {node.task.statusTime.estimatedHours > 0 ? node.task.statusTime.estimatedHours : '-'}
                          </span>
                      </div>
                  </td>
                  
                  {/* Status */}
                  <td className="px-6 py-3 whitespace-nowrap text-center">
                      {getStatusBadge(node.task.statusTime.status)}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-3 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                            onClick={() => onEdit(node.task)} 
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                         >
                             <Pencil size={16} />
                         </button>
                         <button 
                            onClick={() => {
                                if(window.confirm('¿Eliminar tarea?')) onDelete(node.task.id);
                            }} 
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                         >
                             <Trash2 size={16} />
                         </button>
                      </div>
                  </td>
              </tr>
          );

          // Recurse if not collapsed
          if (isParent && !isCollapsed) {
              rows = rows.concat(renderRows(node.children));
          }
      });

      return rows;
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden font-sans mb-20 select-none">
      <div className="bg-slate-50/80 p-3 text-sm text-center text-slate-500 border-b border-slate-100 italic">
        Arrastra una tarea sobre otra para hacerla subtarea. Arrastra al encabezado para hacerla raíz.
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead 
            className={`bg-slate-50/80 transition-colors ${targetTaskId === null && draggedTaskId !== null ? 'bg-blue-100/50 ring-2 ring-inset ring-blue-300' : ''}`}
            onDragOver={(e) => handleDragOver(e, null)} // Drop zone for Root
            onDrop={(e) => handleDrop(e, null)}
          >
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider pl-14">
                Tarea (Jerarquía) {targetTaskId === null && draggedTaskId !== null && <span className="text-blue-600 ml-2">(Soltar aquí para raíz)</span>}
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-44">Responsable</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-44">Empresa</th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-24">Hs Est.</th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-28">Estado</th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider w-24"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-50">
             {renderRows(treeData)}
             {treeData.length === 0 && (
                 <tr>
                     <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-base">
                         No hay tareas para mostrar en esta vista.
                     </td>
                 </tr>
             )}
          </tbody>
        </table>
      </div>
    </div>
  );
};