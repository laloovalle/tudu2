
import React, { useState, useEffect, useMemo } from 'react';
import { Recorder } from './components/Recorder';
import { TaskCard } from './components/TaskCard';
import { TaskListView } from './components/TaskListView';
import { TaskNotebookView } from './components/TaskNotebookView';
import { TaskTreeView } from './components/TaskTreeView';
import { DirectoryView } from './components/DirectoryView';
import { ReportsView } from './components/ReportsView';
import { WorkloadView } from './components/WorkloadView';
import { KanbanBoard } from './components/KanbanBoard';
import { TaskForm } from './components/TaskForm';
import { LoginView } from './components/LoginView';
import { DashboardViewAlt } from './components/DashboardViewAlt';
import { ProfileModal } from './components/ProfileModal';
import { Task, TaskStatus, SortOption, User, Company } from './types';
import { parseAudioToTask } from './services/geminiService';
import { fetchTasks, createTask, updateTask, deleteTask, fetchCompanies, createCompany, fetchUsers, createUser, updateUser } from './services/apiService';
import { sendEmailNotification } from './services/emailService';
import { Power, ListFilter, ArrowUpDown, Plus, RefreshCw, AlertCircle, Users, Building2, User as UserIcon, LayoutGrid, List as ListIcon, BookOpen, PieChart, Network, Search, X, CalendarRange, BarChart3, Mic, Layout, Sun, Moon, Monitor, SquareKanban, Menu, LogOut, Home, Settings, LayoutTemplate, ShieldCheck, CheckCircle2, Pencil, Clock, Check, Loader2 } from 'lucide-react';

type Theme = 'light' | 'dark';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
  });

  // Default view is now the new dashboard
  const [currentView, setCurrentView] = useState<'dashboard' | 'tasks' | 'directory' | 'metrics' | 'planning' | 'kanban'>('dashboard');
  const [taskViewMode, setTaskViewMode] = useState<'grid' | 'list' | 'notebook' | 'tree'>('grid');
  const [theme, setTheme] = useState<Theme>('light');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters & Sort State
  const [sortOption, setSortOption] = useState<SortOption>('priority_desc');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterResponsible, setFilterResponsible] = useState<string>('ALL');
  const [filterSupervisor, setFilterSupervisor] = useState<string>('ALL'); 
  const [filterCompany, setFilterCompany] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // New State for Hiding Completed/Canceled
  const [hideCompletedCanceled, setHideCompletedCanceled] = useState<boolean>(true);

  // Modal State
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskFormInitialView, setTaskFormInitialView] = useState<'details' | 'notes'>('details');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [lastVoiceTask, setLastVoiceTask] = useState<Task | null>(null); 

  // Mandatory Hours Modal State
  const [taskPendingCompletion, setTaskPendingCompletion] = useState<{ task: Task; newStatus: TaskStatus } | null>(null);
  const [usedHoursEntry, setUsedHoursEntry] = useState<string>('');
  const [noComputeHours, setNoComputeHours] = useState<boolean>(false);

  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Theme Effect
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    root.classList.remove('theme-apple');
    if (theme === 'dark') {
        root.classList.add('dark');
    }
  }, [theme]);

  // Auth Handling
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setTasks([]);
    setUsers([]);
    setCompanies([]);
  };

  const handleProfileUpdate = async (updatedUser: User) => {
      try {
          await updateUser(updatedUser);
          setCurrentUser(updatedUser);
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      } catch (e) {
          console.error("Profile update error", e);
          throw e; 
      }
  };

  // Permission Logic
  useEffect(() => {
    if (currentUser) {
       if (currentView === 'directory' && currentUser.role !== 'admin' && currentUser.role !== 'editor') {
           setCurrentView('dashboard');
       }
       if (currentView === 'metrics') {
           setCurrentView('dashboard');
       }
    }
  }, [currentUser, currentView]);

  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [tasksData, usersData, companiesData] = await Promise.all([
        fetchTasks(),
        fetchUsers(),
        fetchCompanies()
      ]);
      
      const resolvedTasks = tasksData.map(t => {
          if ((t.people.creator === 'Sistema' || !t.people.creator) && t.people.creatorId) {
             const creatorUser = usersData.find(u => u.id === t.people.creatorId);
             if (creatorUser) {
                 return {
                     ...t,
                     people: {
                         ...t.people,
                         creator: creatorUser.name
                     }
                 };
             }
          }
          return t;
      });

      setTasks(resolvedTasks);
      setUsers(usersData);
      setCompanies(companiesData);

      if (currentUser) {
          const freshUser = usersData.find(u => u.id === currentUser.id);
          if (freshUser) {
              const prevIds = JSON.stringify(currentUser.visibleUserIds?.sort() || []);
              const newIds = JSON.stringify(freshUser.visibleUserIds?.sort() || []);
              
              if (prevIds !== newIds || currentUser.role !== freshUser.role) {
                  const updated = { ...currentUser, ...freshUser };
                  if(currentUser.password) updated.password = currentUser.password;
                  setCurrentUser(updated);
                  localStorage.setItem('currentUser', JSON.stringify(updated));
              }
          }
      }

    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los datos. Es posible que el servidor tenga problemas de conexión.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
        loadAllData();
    }
  }, [currentUser]); 
  
  useEffect(() => {
      if (currentUser && (currentView === 'dashboard' || currentView === 'tasks' || currentView === 'kanban')) {
          loadAllData();
      }
  }, [currentView]);

  const getVisibleTasks = () => {
     if (!currentUser) return [];
     if (currentUser.role === 'admin') return tasks;

     const allowedIds = new Set(currentUser.visibleUserIds || []);
     const findUserByName = (name?: string) => {
         if (!name) return null;
         const normalized = name.trim().toLowerCase();
         return users.find(u => u.name.trim().toLowerCase() === normalized) || null;
     };

     return tasks.filter(t => {
        const isResponsible = t.people.responsible === currentUser.name;
        const isCollaborator = t.people.collaborators && t.people.collaborators.includes(currentUser.name);
        const isCreator = t.people.creator === currentUser.name;
        const isSupervisor = t.people.supervisor === currentUser.name; 

        if (isResponsible || isCollaborator || isCreator || isSupervisor) {
            return true;
        }

        if (allowedIds.size === 0) return false;

        const responsibleUser = findUserByName(t.people.responsible);
        const supervisorUser = findUserByName(t.people.supervisor);
        const creatorUser = findUserByName(t.people.creator);
        const collaboratorUsers = (t.people.collaborators || [])
            .map(col => findUserByName(col))
            .filter((u): u is User => !!u);

        return [responsibleUser, supervisorUser, creatorUser, ...collaboratorUsers].some(u => u && allowedIds.has(u.id));
     });
  };

  const visibleTasks = getVisibleTasks();

  const selectableUsers = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return users;
    const allowedIds = currentUser.visibleUserIds || [];
    return users.filter(u => u.id === currentUser.id || allowedIds.includes(u.id));
  }, [currentUser, users]);

  const getRecipientsForTask = (taskData: Partial<Task>): User[] => {
      const recipientList: User[] = [];
      const findUserByName = (name: string) => {
          if (!name) return undefined;
          const cleanName = name.trim().toLowerCase();
          return users.find(u => u.name.trim().toLowerCase() === cleanName);
      };

      if (taskData.people?.responsible) {
          const resp = findUserByName(taskData.people.responsible);
          if (resp) recipientList.push(resp);
      }
      if (taskData.people?.collaborators) {
          taskData.people.collaborators.forEach(colName => {
              const colUser = findUserByName(colName);
              if (colUser) recipientList.push(colUser);
          });
      }
      if (taskData.people?.supervisor) {
          const sup = findUserByName(taskData.people.supervisor);
          if (sup) recipientList.push(sup);
      }
      return recipientList;
  };

  const handleRecordingComplete = async (audioBase64: string): Promise<Task | undefined> => {
    setIsProcessing(true);
    setError(null);
    try {
      const companyNames = companies.map(c => c.name);
      const userNames = selectableUsers.map(u => u.name);
      // PASAMOS EL NOMBRE DEL USUARIO ACTUAL PARA QUE SEA EL DEFAULT
      const partialTask = await parseAudioToTask(audioBase64, companyNames, userNames, currentUser?.name);
      
      if (partialTask.people && currentUser) {
          partialTask.people.creator = currentUser.name;
      }
      
      let companyId: number | null = null;
      let ownerId: number | null = currentUser?.id || 1; 
      const collaboratorIds: number[] = [];

      // Resolve Company
      const clientName = partialTask.classification?.client;
      if (clientName && clientName !== 'General' && clientName !== 'Sin Cliente') {
         const existing = companies.find(c => c.name.toLowerCase() === clientName.toLowerCase());
         if (existing) {
           companyId = existing.id;
         } else {
           try {
             const newComp = await createCompany(clientName);
             companyId = newComp.id;
           } catch (e) { console.error("Could not auto-create company from voice", e); }
         }
      }

      // Resolve Responsible & Collaborators
      const respName = partialTask.people?.responsible;
      if (respName && respName !== 'Sin asignar') {
         const existing = selectableUsers.find(u => u.name.toLowerCase() === respName.toLowerCase());
         if (existing) ownerId = existing.id;
         else if (currentUser?.role === 'admin') {
            try { const newUser = await createUser(respName); ownerId = newUser.id; } catch (e) {}
         }
      } else {
          // Force current user if Gemini returned null or "Sin asignar"
          ownerId = currentUser?.id || 1;
          if (partialTask.people) partialTask.people.responsible = currentUser?.name || 'Usuario';
      }

      if (partialTask.people?.collaborators) {
          for (const colName of partialTask.people.collaborators) {
              const existing = selectableUsers.find(u => u.name.toLowerCase() === colName.toLowerCase());
              if (existing) collaboratorIds.push(existing.id);
          }
      }

      const createdTask = await createTask(partialTask, companyId, ownerId, collaboratorIds, currentUser?.id || 1, null);
      const recipients = getRecipientsForTask(partialTask);
      const adminUser = users.find(u => u.role === 'admin');
      sendEmailNotification(partialTask, recipients, 'create', adminUser?.email, undefined, currentUser?.email);

      await loadAllData();
      if (showVoiceModal) {
          setLastVoiceTask(createdTask || null);
      }
      return createdTask || undefined;

    } catch (error) {
      console.error(error);
      setError("Hubo un error al procesar o guardar la tarea. Intenta de nuevo.");
      return undefined;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveTask = async (taskData: Partial<Task>, companyId: number | null, ownerId: number | null, collaboratorIds: number[], supervisorId: number | null) => {
    if (taskData.statusTime?.status === TaskStatus.COMPLETED && (!taskData.statusTime.usedHours || taskData.statusTime.usedHours <= 0)) {
        const taskToFinalize = editingTask || (taskData as Task);
        setUsedHoursEntry(taskToFinalize.statusTime?.usedHours?.toString() || '');
        setNoComputeHours(false);
        setTaskPendingCompletion({ task: taskToFinalize, newStatus: TaskStatus.COMPLETED });
        return;
    }

    try {
      if (currentUser) {
          // REFUERZO: Asegurar que siempre haya un responsable y creador
          if (!taskData.people) {
             taskData.people = { responsible: currentUser.name, collaborators: [], creator: currentUser.name };
          } else {
             if (!taskData.people.responsible || taskData.people.responsible === 'Sin asignar') {
                 taskData.people.responsible = currentUser.name;
             }
             if (!taskData.people.creator) {
                 taskData.people.creator = currentUser.name;
             }
          }
          // Asegurar que ownerId no sea nulo si no se especificó otro
          if (ownerId === null) ownerId = currentUser.id;
      }

      const adminUser = users.find(u => u.role === 'admin');

      if (editingTask) {
        const oldStatus = editingTask.statusTime.status;
        const newStatus = taskData.statusTime?.status;
        
        await updateTask(taskData as Task, companyId, ownerId, collaboratorIds, currentUser?.id || 1, supervisorId);
        
        const oldResponsible = editingTask.people.responsible;
        const newResponsible = taskData.people?.responsible;
        const oldPriority = editingTask.classification.priority;
        const newPriority = taskData.classification?.priority;

        if (newResponsible && newResponsible !== oldResponsible) {
            const recipients = getRecipientsForTask(taskData);
            sendEmailNotification({ ...editingTask, ...taskData }, recipients, 'assigned', adminUser?.email, undefined, currentUser?.email);
        }

        if (newPriority && newPriority !== oldPriority) {
            const recipients = getRecipientsForTask(taskData);
            sendEmailNotification(
                { ...editingTask, ...taskData }, 
                recipients, 
                'priority_change', 
                adminUser?.email,
                { oldPriority, newPriority },
                currentUser?.email
            );
        }

        // Status change notification inside manual edit form
        if (newStatus && newStatus !== oldStatus) {
            const isOwnTask = currentUser && editingTask.people.responsible === currentUser.name;
            if (!isOwnTask) {
                const recipients = getRecipientsForTask(taskData);
                sendEmailNotification({ ...editingTask, ...taskData }, recipients, 'status_change', adminUser?.email, undefined, currentUser?.email);
            }
        }

      } else {
        await createTask(taskData, companyId, ownerId, collaboratorIds, currentUser?.id || 1, supervisorId);
        const recipients = getRecipientsForTask(taskData);
        sendEmailNotification(taskData, recipients, 'create', adminUser?.email, undefined, currentUser?.email);
      }
      
      await loadAllData();
      setIsTaskFormOpen(false);
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: TaskStatus) => {
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (!taskToUpdate) return;

      if (newStatus === TaskStatus.COMPLETED && (!taskToUpdate.statusTime.usedHours || taskToUpdate.statusTime.usedHours <= 0)) {
          setUsedHoursEntry('');
          setNoComputeHours(false);
          setTaskPendingCompletion({ task: taskToUpdate, newStatus });
          return;
      }

      try {
          const oldStatus = taskToUpdate.statusTime.status;
          if (oldStatus === newStatus) return;

          const updatedTasks = tasks.map(t => 
              t.id === taskId 
              ? { ...t, statusTime: { ...t.statusTime, status: newStatus } }
              : t
          );
          setTasks(updatedTasks);

          const company = companies.find(c => c.name === taskToUpdate.classification.client);
          const owner = users.find(u => u.name === taskToUpdate.people.responsible);
          const collabIds = taskToUpdate.people.collaborators?.map(name => users.find(u => u.name === name)?.id).filter((id): id is number => !!id) || [];
          const supervisorId = taskToUpdate.people.supervisorId || null;

          const updatedTaskObject = {
              ...taskToUpdate,
              statusTime: { ...taskToUpdate.statusTime, status: newStatus }
          };

          await updateTask(updatedTaskObject, company?.id || null, owner?.id || null, collabIds, currentUser?.id || 1, supervisorId);
          
          // REQUERIMIENTO: No notificar si el usuario cambia el estado de su propia tarea asignada.
          const isOwnTask = currentUser && taskToUpdate.people.responsible === currentUser.name;
          if (!isOwnTask) {
              const recipients = getRecipientsForTask(updatedTaskObject);
              const adminUser = users.find(u => u.role === 'admin');
              sendEmailNotification(updatedTaskObject, recipients, 'status_change', adminUser?.email, undefined, currentUser?.email);
          }

      } catch (e) {
          console.error("Status update failed", e);
          await loadAllData();
          alert("Error al actualizar el estado de la tarea.");
      }
  };

  const handleConfirmCompletionWithHours = async () => {
      if (!taskPendingCompletion) return;
      const hours = noComputeHours ? 0 : parseFloat(usedHoursEntry);
      if (!noComputeHours && (!usedHoursEntry || isNaN(hours) || hours < 0)) {
          alert("Debes ingresar un tiempo real válido o marcar que no computa horas.");
          return;
      }
      const { task, newStatus } = taskPendingCompletion;
      try {
          setIsProcessing(true);
          const company = companies.find(c => c.name === task.classification.client);
          const owner = users.find(u => u.name === task.people.responsible);
          const collabIds = task.people.collaborators?.map(name => users.find(u => u.name === name)?.id).filter((id): id is number => !!id) || [];
          const supervisorId = task.people.supervisorId || null;

          const updatedTaskObject: Task = {
              ...task,
              statusTime: { ...task.statusTime, status: newStatus, usedHours: hours }
          };

          await updateTask(updatedTaskObject, company?.id || null, owner?.id || null, collabIds, currentUser?.id || 1, supervisorId);
          
          // REQUERIMIENTO: No notificar si el usuario cambia el estado de su propia tarea asignada.
          const isOwnTask = currentUser && task.people.responsible === currentUser.name;
          if (!isOwnTask) {
              const recipients = getRecipientsForTask(updatedTaskObject);
              const adminUser = users.find(u => u.role === 'admin');
              sendEmailNotification(updatedTaskObject, recipients, 'status_change', adminUser?.email, undefined, currentUser?.email);
          }

          setTaskPendingCompletion(null);
          setUsedHoursEntry('');
          setNoComputeHours(false);
          setIsTaskFormOpen(false); 
          await loadAllData();
      } catch (e) {
          console.error("Completion update failed", e);
          alert("Error al completar la tarea.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleTaskMove = async (taskId: number, newParentId: number | null) => {
    try {
        const taskToUpdate = tasks.find(t => t.id === taskId);
        if (!taskToUpdate) return;
        const company = companies.find(c => c.name === taskToUpdate.classification.client);
        const owner = users.find(u => u.name === taskToUpdate.people.responsible);
        const collabIds = taskToUpdate.people.collaborators?.map(name => users.find(u => u.name === name)?.id).filter((id): id is number => !!id) || [];
        const supervisorId = taskToUpdate.people.supervisorId || null;
        const updatedTask: Task = {
            ...taskToUpdate,
            system: { ...taskToUpdate.system, parentId: newParentId }
        };
        await updateTask(updatedTask, company?.id || null, owner?.id || null, collabIds, currentUser?.id || 1, supervisorId);
        await loadAllData();
    } catch (error) {
        console.error("Failed to move task", error);
        alert("Error al mover la tarea.");
    }
  };

  const handleTaskReschedule = async (taskId: number, newDate: string | null) => {
    try {
        const taskToUpdate = tasks.find(t => t.id === taskId);
        if (!taskToUpdate) return;
        const company = companies.find(c => c.name === taskToUpdate.classification.client);
        const owner = users.find(u => u.name === taskToUpdate.people.responsible);
        const collabIds = taskToUpdate.people.collaborators?.map(name => users.find(u => u.name === name)?.id).filter((id): id is number => !!id) || [];
        const supervisorId = taskToUpdate.people.supervisorId || null;
        const updatedTask = {
            ...taskToUpdate,
            statusTime: { ...taskToUpdate.statusTime, dueDate: newDate || undefined }
        };
        await updateTask(updatedTask, company?.id || null, owner?.id || null, collabIds, currentUser?.id || 1, supervisorId);
        await loadAllData();
    } catch (error) {
        console.error("Reschedule failed", error);
        alert("Error al reagendar tarea.");
    }
  };

  const handleDeleteTask = async (id: number): Promise<boolean> => {
    try {
      await deleteTask(id);
      await loadAllData();
      return true;
    } catch (error: any) {
      console.error(error);
      if (error.message && (error.message.includes('subtareas') || error.message.includes('constraint'))) {
          alert("No se puede eliminar la tarea porque tiene subtareas o registros asociados. Elimina las subtareas primero.");
      } else {
          alert("Error al eliminar la tarea.");
      }
      return false;
    }
  };

  const openNewTaskModal = () => {
    setEditingTask(null);
    setTaskFormInitialView('details');
    setIsTaskFormOpen(true);
  };

  const openEditTaskModal = (task: Task, initialView: 'details' | 'notes' = 'details') => {
    setEditingTask(task);
    setTaskFormInitialView(initialView);
    setIsTaskFormOpen(true);
  };

  const handleOpenVoiceModal = () => {
      setLastVoiceTask(null);
      setShowVoiceModal(true);
  };

  const handleCloseVoiceModal = () => {
      setLastVoiceTask(null);
      setShowVoiceModal(false);
  };

  const handleEditLastVoiceTask = () => {
      if (lastVoiceTask) {
          openEditTaskModal(lastVoiceTask);
          handleCloseVoiceModal();
      }
  };

  const getSortedTasks = () => {
    let filtered = visibleTasks;
    if (hideCompletedCanceled) {
      filtered = filtered.filter(t => 
        t.statusTime.status !== TaskStatus.COMPLETED && 
        t.statusTime.status !== TaskStatus.CANCELED
      );
    }
    if (filterStatus !== 'ALL') filtered = filtered.filter(t => t.statusTime.status === filterStatus);
    if (filterResponsible !== 'ALL') filtered = filtered.filter(t => t.people.responsible === filterResponsible);
    if (filterSupervisor !== 'ALL') filtered = filtered.filter(t => t.people.supervisor === filterSupervisor);
    if (filterCompany !== 'ALL') filtered = filtered.filter(t => t.classification.client === filterCompany);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.description.toLowerCase().includes(q) ||
        t.classification.client.toLowerCase().includes(q) ||
        (t.classification.project && t.classification.project.toLowerCase().includes(q)) ||
        t.people.responsible.toLowerCase().includes(q) ||
        (t.people.supervisor && t.people.supervisor.toLowerCase().includes(q)) ||
        (t.people.collaborators && t.people.collaborators.some(c => c.toLowerCase().includes(q)))
      );
    }
    return filtered.sort((a, b) => {
      switch (sortOption) {
        case 'priority_desc':
          if (a.classification.priority !== b.classification.priority) return a.classification.priority - b.classification.priority;
          return a.system.orderIndex - b.system.orderIndex;
        case 'date_asc':
          if (!a.statusTime.dueDate) return 1;
          if (!b.statusTime.dueDate) return -1;
          return new Date(a.statusTime.dueDate).getTime() - new Date(a.statusTime.dueDate).getTime();
        case 'status': return a.statusTime.status.localeCompare(b.statusTime.status);
        case 'created_desc':
        default: return new Date(b.system.createdAt).getTime() - new Date(a.system.createdAt).getTime();
      }
    });
  };

  const sortedTasks = getSortedTasks();

  const renderContent = () => {
    if (currentView === 'dashboard') {
        return (
            <DashboardViewAlt
                user={currentUser!}
                tasks={visibleTasks}
                onNavigateTo={(view) => setCurrentView(view)}
                onCreateTask={openNewTaskModal}
                onOpenVoiceModal={handleOpenVoiceModal}
                onVoiceTask={handleRecordingComplete}
                onEditTask={openEditTaskModal}
                isProcessing={isProcessing}
            />
        );
    }
    if (currentView === 'directory') return <DirectoryView user={currentUser!} />;
    if (currentView === 'metrics') return <ReportsView tasks={visibleTasks} users={selectableUsers} onEdit={openEditTaskModal} />;
    if (currentView === 'planning') return <WorkloadView tasks={visibleTasks} users={selectableUsers} initialUserId={currentUser!.id} onReschedule={handleTaskReschedule} onEdit={openEditTaskModal} />;
    if (currentView === 'kanban') return <KanbanBoard tasks={visibleTasks} users={selectableUsers} companies={companies} currentUser={currentUser} onStatusChange={handleStatusChange} onEdit={openEditTaskModal} />;
    return (
      <div className="animate-in fade-in duration-300">
        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-300 md:border-slate-200 dark:border-slate-700 mb-8 flex flex-col gap-5 task-card">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 dark:border-slate-700 pb-4 mb-2 lg:mb-0 lg:border-none lg:pb-0 w-full">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
                <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                    <span className="text-xl md:text-lg font-bold text-slate-800 md:text-slate-700 dark:text-slate-200">Vistas</span>
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg nav-pill">
                        <button onClick={() => setTaskViewMode('grid')} className={`p-3 md:p-2 rounded-md transition-all nav-pill ${taskViewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm nav-pill-active' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><LayoutGrid className="w-6 h-6 md:w-5 md:h-5" /></button>
                        <button onClick={() => setTaskViewMode('list')} className={`p-3 md:p-2 rounded-md transition-all nav-pill ${taskViewMode === 'list' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm nav-pill-active' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><ListIcon className="w-6 h-6 md:w-5 md:h-5" /></button>
                        <button onClick={() => setTaskViewMode('tree')} className={`p-3 md:p-2 rounded-md transition-all nav-pill ${taskViewMode === 'tree' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm nav-pill-active' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><Network className="w-6 h-6 md:w-5 md:h-5" /></button>
                        <button onClick={() => setTaskViewMode('notebook')} className={`p-3 md:p-2 rounded-md transition-all nav-pill ${taskViewMode === 'notebook' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm nav-pill-active' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><BookOpen className="w-6 h-6 md:w-5 md:h-5" /></button>
                    </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-50 dark:bg-slate-900 px-5 md:px-4 py-3 md:py-2 rounded-lg border border-slate-200 md:border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-full sm:w-auto justify-center sm:justify-start nav-pill">
                  <input type="checkbox" checked={hideCompletedCanceled} onChange={(e) => setHideCompletedCanceled(e.target.checked)} className="w-6 h-6 md:w-5 md:h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                  <span className="text-lg md:text-sm font-bold text-slate-800 md:text-slate-600 dark:text-slate-300">Ocultar fin.</span>
                </label>
              </div>
              <div className="relative w-full lg:max-w-md">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6 md:w-5 md:h-5" />
                 <input type="text" placeholder="Buscar tarea, cliente, responsable..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-10 py-4 md:py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 md:border-slate-200 dark:border-slate-700 rounded-lg text-lg md:text-base font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white nav-pill" />
                 {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-2 md:p-1"><X className="w-6 h-6 md:w-5 md:h-5" /></button>}
              </div>
            </div>
            <div className="flex flex-col lg:flex-row lg:flex-nowrap gap-4 items-center w-full">
              <div className="w-full lg:flex-1 flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-4 py-3 md:py-2.5 rounded-lg border border-slate-300 md:border-slate-200 dark:border-slate-700 lg:border-transparent lg:bg-transparent nav-pill">
                <ListFilter className="w-6 h-6 md:w-5 md:h-5 text-slate-500 md:text-slate-400 flex-shrink-0" />
                <select className="bg-transparent border-none text-lg md:text-base font-bold md:font-medium text-slate-800 md:text-slate-600 dark:text-slate-300 focus:ring-0 w-full cursor-pointer" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="ALL">Todos los Estados</option>
                  {Object.values(TaskStatus).map(s => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
              <div className="w-full lg:flex-1 flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-4 py-3 md:py-2.5 rounded-lg border border-slate-300 md:border-slate-200 dark:border-slate-700 lg:border-transparent lg:bg-transparent nav-pill">
                <UserIcon className="w-6 h-6 md:w-5 md:h-5 text-slate-500 md:text-slate-400 flex-shrink-0" />
                <select className="bg-transparent border-none text-lg md:text-base font-bold md:font-medium text-slate-800 md:text-slate-600 dark:text-slate-300 focus:ring-0 w-full cursor-pointer" value={filterResponsible} onChange={(e) => setFilterResponsible(e.target.value)}>
                  <option value="ALL">Todos los Responsables</option>
                  {selectableUsers.filter(u => u.role !== 'cliente').map(u => (<option key={u.id} value={u.name}>{u.name}</option>))}
                </select>
              </div>
              <div className="w-full lg:flex-1 flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-4 py-3 md:py-2.5 rounded-lg border border-slate-300 md:border-slate-200 dark:border-slate-700 lg:border-transparent lg:bg-transparent nav-pill">
                <ShieldCheck className="w-6 h-6 md:w-5 md:h-5 text-slate-500 md:text-slate-400 flex-shrink-0" />
                <select className="bg-transparent border-none text-lg md:text-base font-bold md:font-medium text-slate-800 md:text-slate-600 dark:text-slate-300 focus:ring-0 w-full cursor-pointer" value={filterSupervisor} onChange={(e) => setFilterSupervisor(e.target.value)}>
                  <option value="ALL">Todos los Supervisores</option>
                  {selectableUsers.filter(u => u.role !== 'cliente').map(u => (<option key={u.id} value={u.name}>{u.name}</option>))}
                </select>
              </div>
              <div className="w-full lg:flex-1 flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-4 py-3 md:py-2.5 rounded-lg border border-slate-300 md:border-slate-200 dark:border-slate-700 lg:border-transparent lg:bg-transparent nav-pill">
                <Building2 className="w-6 h-6 md:w-5 md:h-5 text-slate-500 md:text-slate-400 flex-shrink-0" />
                <select className="bg-transparent border-none text-lg md:text-base font-bold md:font-medium text-slate-800 md:text-slate-600 dark:text-slate-300 focus:ring-0 w-full cursor-pointer" value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}>
                  <option value="ALL">Todas las Empresas</option>
                  {companies.map(c => (<option key={c.id} value={c.name}>{c.name}</option>))}
                </select>
              </div>
              <div className="w-full lg:flex-1 flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-4 py-3 md:py-2.5 rounded-lg border border-slate-300 md:border-slate-200 dark:border-slate-700 lg:border-transparent lg:bg-transparent nav-pill">
                <ArrowUpDown className="w-6 h-6 md:w-5 md:h-5 text-slate-500 md:text-slate-400 flex-shrink-0" />
                <select className="bg-transparent border-none text-lg md:text-base font-bold md:font-medium text-slate-800 md:text-slate-600 dark:text-slate-300 focus:ring-0 w-full cursor-pointer" value={sortOption} onChange={(e) => setSortOption(e.target.value as SortOption)}>
                  <option value="priority_desc">Mayor Prioridad</option>
                  <option value="created_desc">Recientes primero</option>
                  <option value="date_asc">Fecha Vencimiento</option>
                  <option value="status">Por Estado</option>
                </select>
              </div>
            </div>
        </div>
        {isLoading && visibleTasks.length === 0 ? (
          <div className="text-center py-20"><RefreshCw className="w-12 h-12 mx-auto text-blue-500 animate-spin mb-6" /><p className="text-slate-500 text-xl font-medium">Cargando tareas...</p></div>
        ) : visibleTasks.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 shadow-sm task-card"><div className="mx-auto w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6"><Plus className="w-12 h-12 text-slate-300 dark:text-slate-600" /></div><h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No tienes tareas asignadas</h3><p className="text-slate-500 dark:text-slate-400 mb-8 text-lg max-w-md mx-auto">Crea una nueva tarea para comenzar.</p><button onClick={openNewTaskModal} className="px-8 py-3 bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold rounded-lg hover:bg-blue-100 dark:hover:bg-slate-600 transition-colors text-lg">Crear tarea</button></div>
        ) : sortedTasks.length === 0 ? (
            <div className="col-span-full text-center py-16 text-slate-400 italic text-xl">No hay tareas que coincidan con los filtros o la búsqueda seleccionada.</div>
        ) : (
          <>
            {taskViewMode === 'grid' && (<div className="grid gap-6 pb-24 grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">{sortedTasks.map(task => (<TaskCard key={task.id} task={task} userAvatar={users.find(u => u.name === task.people.responsible)?.avatar} subtasksCount={tasks.filter(t => t.system.parentId === task.id).length} currentUser={currentUser} onEdit={openEditTaskModal} onDelete={handleDeleteTask} />))}</div>)}
            {taskViewMode === 'list' && (<div className="pb-24"><TaskListView tasks={sortedTasks} currentUser={currentUser} onEdit={openEditTaskModal} onDelete={handleDeleteTask} /></div>)}
            {taskViewMode === 'tree' && (<div className="pb-24"><TaskTreeView tasks={sortedTasks} onEdit={openEditTaskModal} onDelete={handleDeleteTask} onMove={handleTaskMove} /></div>)}
            {taskViewMode === 'notebook' && (<div className="pb-24"><TaskNotebookView tasks={sortedTasks} onEdit={openEditTaskModal} onDelete={handleDeleteTask} /></div>)}
          </>
        )}
      </div>
    );
  };

  if (!currentUser) return <LoginView onLoginSuccess={handleLogin} />;

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300`}>
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm glass-header">
        <div className="w-full max-w-[1920px] mx-auto px-4 md:px-8 xl:px-12 h-20 md:h-24 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
            <div className="bg-red-600 p-3 md:p-3 rounded-xl shadow-md"><Power className="w-6 h-6 md:w-7 md:h-7 text-white stroke-2" /></div>
            <div className="flex flex-col"><h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">TuDú EO</h1></div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1.5 rounded-lg mr-4 border border-slate-200 dark:border-slate-800 nav-pill">
               <button onClick={() => setTheme('light')} className={`p-2 rounded-md transition-all nav-pill ${theme === 'light' ? 'bg-white shadow text-yellow-600 nav-pill-active' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`} title="Light Mode"><Sun size={18} /></button>
               <button onClick={() => setTheme('dark')} className={`p-2 rounded-md transition-all nav-pill ${theme === 'dark' ? 'bg-slate-700 shadow text-indigo-400 nav-pill-active' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`} title="Dark Mode"><Moon size={18} /></button>
            </div>
            <nav className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-1.5 mr-6 overflow-x-auto border border-slate-200 dark:border-slate-800 nav-pill">
              <button onClick={() => setCurrentView('dashboard')} className={`px-6 py-2.5 text-base font-bold rounded-lg transition-colors flex items-center gap-2 nav-pill ${currentView === 'dashboard' ? 'bg-white dark:bg-slate-800 text-red-600 shadow-sm nav-pill-active' : 'text-slate-600 md:text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}><Home className="w-5 h-5" /><span className="hidden lg:inline">Inicio</span></button>
              <button onClick={() => setCurrentView('tasks')} className={`px-6 py-2.5 text-base font-bold rounded-lg transition-colors nav-pill ${currentView === 'tasks' ? 'bg-white dark:bg-slate-800 text-red-600 shadow-sm nav-pill-active' : 'text-slate-600 md:text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Tareas</button>
              {(currentUser.role === 'admin' || currentUser.role === 'editor') && (<button onClick={() => setCurrentView('directory')} className={`px-6 py-2.5 text-base font-bold rounded-lg transition-colors flex items-center gap-2 nav-pill ${currentView === 'directory' ? 'bg-white dark:bg-slate-800 text-red-600 shadow-sm nav-pill-active' : 'text-slate-600 md:text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}><Users className="w-5 h-5" /><span className="hidden lg:inline">Directorio</span></button>)}
               <button onClick={() => setCurrentView('planning')} className={`px-6 py-2.5 text-base font-bold rounded-lg transition-colors flex items-center gap-2 nav-pill ${currentView === 'planning' ? 'bg-white dark:bg-slate-800 text-red-600 shadow-sm nav-pill-active' : 'text-slate-600 md:text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}><CalendarRange className="w-5 h-5" /><span className="hidden lg:inline">Planificación</span></button>
              <button onClick={() => setCurrentView('kanban')} className={`px-6 py-2.5 text-base font-bold rounded-lg transition-colors flex items-center gap-2 nav-pill ${currentView === 'kanban' ? 'bg-white dark:bg-slate-800 text-red-600 shadow-sm nav-pill-active' : 'text-slate-600 md:text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}><SquareKanban className="w-5 h-5" /><span className="hidden lg:inline">Kanban</span></button>
            </nav>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200 dark:border-slate-800">
                <button onClick={openNewTaskModal} className="p-3 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-blue-600 hover:text-white rounded-xl transition-colors border border-slate-200 dark:border-slate-700 nav-pill" title="Nueva Tarea Manual"><Plus className="w-6 h-6" /></button>
                <button onClick={handleOpenVoiceModal} className="p-3 text-red-500 bg-red-50 dark:bg-slate-800 dark:border-red-900 hover:bg-red-600 hover:text-white rounded-xl transition-colors border border-red-100 nav-pill" title="Dictar Tarea"><Mic className="w-6 h-6" /></button>
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800 ml-2">
                <div className="flex items-center gap-3 cursor-pointer group p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" onClick={() => setIsProfileModalOpen(true)} title="Editar Perfil">
                    <div className="flex flex-col items-end"><span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 transition-colors">{(currentUser.name || '').split(' ')[0]}</span><span className="text-[10px] uppercase font-bold text-slate-400">{currentUser.role}</span></div>
                    <img src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=random`} alt={currentUser.name} className="w-10 h-10 rounded-full border border-slate-200 shadow-sm group-hover:ring-2 group-hover:ring-blue-100 transition-all" />
                </div>
                 <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Cerrar Sesión"><LogOut className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex md:hidden items-center gap-3">
             <button onClick={openNewTaskModal} className="p-3 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700"><Plus className="w-6 h-6 stroke-2" /></button>
             <button onClick={handleOpenVoiceModal} className="p-3 text-red-600 bg-red-100 dark:bg-slate-800 border border-red-200 rounded-xl"><Mic className="w-6 h-6 stroke-2" /></button>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-3 ml-2 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl">{isMobileMenuOpen ? <X className="w-7 h-7 stroke-2" /> : <Menu className="w-7 h-7 stroke-2" />}</button>
          </div>
        </div>
        {isMobileMenuOpen && (
            <div className="md:hidden absolute top-20 left-0 right-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 z-40 shadow-xl animate-in slide-in-from-top-2">
                <div className="p-6 flex flex-col gap-6">
                    <div className="flex items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                        <img src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=random`} alt={currentUser.name} className="w-14 h-14 rounded-full border-2 border-slate-100 shadow-sm" />
                        <div className="flex-grow"><div className="text-xl font-bold text-slate-900 dark:text-white">{currentUser.name}</div><div className="text-sm text-slate-500 uppercase font-bold">{currentUser.role}</div><button onClick={() => { setIsProfileModalOpen(true); setIsMobileMenuOpen(false); }} className="text-base text-blue-700 font-bold mt-2 flex items-center gap-2"><Settings size={16} /> Editar Perfil</button></div>
                        <button onClick={handleLogout} className="ml-auto p-3 text-slate-500 hover:text-red-600 bg-slate-100 rounded-xl"><LogOut className="w-6 h-6 stroke-2" /></button>
                    </div>
                    <div className="flex flex-col gap-3">
                        <button onClick={() => { setCurrentView('dashboard'); setIsMobileMenuOpen(false); }} className={`p-4 rounded-xl flex items-center gap-4 font-bold text-xl ${currentView === 'dashboard' ? 'bg-red-50 text-red-700 dark:bg-slate-800' : 'text-slate-700 dark:text-slate-300'}`}><Home className="w-6 h-6 stroke-2" /> Inicio</button>
                        <button onClick={() => { setCurrentView('tasks'); setIsMobileMenuOpen(false); }} className={`p-4 rounded-xl flex items-center gap-4 font-bold text-xl ${currentView === 'tasks' ? 'bg-red-50 text-red-700 dark:bg-slate-800' : 'text-slate-700 dark:text-slate-300'}`}><Power className="w-6 h-6 stroke-2" /> Tareas</button>
                        {(currentUser.role === 'admin' || currentUser.role === 'editor') && (<button onClick={() => { setCurrentView('directory'); setIsMobileMenuOpen(false); }} className={`p-4 rounded-xl flex items-center gap-4 font-bold text-xl ${currentView === 'directory' ? 'bg-red-50 text-red-700 dark:bg-slate-800' : 'text-slate-700 dark:text-slate-300'}`}><Users className="w-6 h-6 stroke-2" /> Directorio</button>)}
                        <button onClick={() => { setCurrentView('planning'); setIsMobileMenuOpen(false); }} className={`p-4 rounded-xl flex items-center gap-4 font-bold text-xl ${currentView === 'planning' ? 'bg-red-50 text-red-700 dark:bg-slate-800' : 'text-slate-700 dark:text-slate-300'}`}><CalendarRange className="w-6 h-6 stroke-2" /> Planificación</button>
                        <button onClick={() => { setCurrentView('kanban'); setIsMobileMenuOpen(false); }} className={`p-4 rounded-xl flex items-center gap-4 font-bold text-xl ${currentView === 'kanban' ? 'bg-red-50 text-red-700 dark:bg-slate-800' : 'text-slate-700 dark:text-slate-300'}`}><SquareKanban className="w-6 h-6 stroke-2" /> Kanban</button>
                    </div>
                    <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>
                    <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900 p-3 rounded-2xl"><span className="text-lg font-bold text-slate-600 pl-2">Tema</span><div className="flex gap-2"><button onClick={() => setTheme('light')} className={`p-3 rounded-xl ${theme === 'light' ? 'bg-white shadow text-yellow-600' : 'text-slate-400'}`}><Sun size={24} /></button><button onClick={() => setTheme('dark')} className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-700 shadow text-indigo-400' : 'text-slate-400'}`}><Moon size={24} /></button></div></div>
                </div>
            </div>
        )}
      </header>
      <main className="flex-grow w-full max-w-[1920px] mx-auto px-4 md:px-8 xl:px-12 py-6 md:py-10 transition-all">
        {error && (<div className="mb-10 p-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-4 text-red-700 dark:text-red-400 shadow-sm"><AlertCircle className="w-6 h-6 flex-shrink-0" /><p className="text-lg font-medium">{error}</p></div>)}
        {renderContent()}
      </main>
      {isTaskFormOpen && (<TaskForm initialTask={editingTask} initialView={taskFormInitialView} currentUser={currentUser} availableUsers={selectableUsers} onSave={handleSaveTask} onClose={() => setIsTaskFormOpen(false)} onDelete={handleDeleteTask} />)}
      {isProfileModalOpen && (<ProfileModal currentUser={currentUser} onSave={handleProfileUpdate} onClose={() => setIsProfileModalOpen(false)} />)}
      {(showVoiceModal) && (<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"><div className="bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden p-8 md:p-10 flex flex-col items-center transition-colors task-card relative">{!lastVoiceTask ? (<><h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-3 text-center">Dictar Nueva Tarea</h3><p className="text-lg text-slate-500 dark:text-slate-400 text-center mb-8">Habla claro y fuerte. La IA procesará tu solicitud.</p><Recorder onRecordingComplete={(base64) => handleRecordingComplete(base64)} isProcessing={isProcessing} /><button onClick={handleCloseVoiceModal} disabled={isProcessing} className="mt-10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-lg font-medium">Cancelar</button></>) : (<div className="w-full animate-in zoom-in duration-300 flex flex-col items-center"><div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6"><CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" /></div><h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 text-center">¡Tarea Creada!</h3><p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">RESUMEN</p><div className="w-full bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 mb-8"><p className="text-xl text-slate-800 dark:text-slate-200 font-bold leading-relaxed italic text-center">"{lastVoiceTask.title}"</p><div className="flex items-center justify-center gap-4 mt-4 text-sm font-bold text-slate-500"><div className="flex items-center gap-1.5"><Building2 size={14} /> {lastVoiceTask.classification.client}</div><div className="flex items-center gap-1.5"><UserIcon size={14} /> {lastVoiceTask.people.responsible}</div></div></div><div className="flex flex-col gap-3 w-full"><button onClick={handleEditLastVoiceTask} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl hover:bg-black dark:hover:bg-slate-100 transition-all shadow-xl flex items-center justify-center gap-2 transform active:scale-95"><Pencil size={20} /> Editar Tarea</button><button onClick={handleCloseVoiceModal} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cerrar</button></div></div>)}</div></div>)}
      {taskPendingCompletion && (<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300"><div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 transform-gpu animate-in zoom-in-95 duration-200"><div className="p-8 md:p-10 flex flex-col items-center text-center"><div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400"><Clock size={40} className="stroke-[1.5]" /></div><h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">¿Cuánto tiempo te llevó?</h3><p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">Para completar "<span className="text-slate-800 dark:text-slate-200 font-bold">{taskPendingCompletion.task.title}</span>" es obligatorio ingresar el tiempo real invertido.</p><div className="w-full mb-4"><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-left pl-1">HORAS REALES INVERTIDAS</label><div className="relative group"><input type="number" step="0.5" autoFocus disabled={noComputeHours} value={usedHoursEntry} onChange={(e) => setUsedHoursEntry(e.target.value)} placeholder="0.0" className={`w-full text-4xl font-black text-center py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:border-blue-500 dark:focus:border-blue-400 focus:ring-0 outline-none transition-all dark:text-white ${noComputeHours ? 'opacity-30 cursor-not-allowed' : ''}`} onKeyDown={(e) => {if (e.key === 'Enter') handleConfirmCompletionWithHours(); if (e.key === 'Escape') setTaskPendingCompletion(null);}} /><div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 font-black text-2xl pointer-events-none">hs</div></div></div><div className="w-full mb-8 flex items-center gap-3 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800"><input type="checkbox" id="no-compute" checked={noComputeHours} onChange={(e) => {setNoComputeHours(e.target.checked); if(e.target.checked) setUsedHoursEntry('0');}} className="w-6 h-6 text-blue-600 rounded border-slate-300 focus:ring-blue-500" /><label htmlFor="no-compute" className="text-sm font-bold text-slate-600 dark:text-slate-400 cursor-pointer select-none">Esta tarea no computa horas</label></div><div className="flex flex-col gap-3 w-full"><button onClick={handleConfirmCompletionWithHours} disabled={isProcessing || (!noComputeHours && (!usedHoursEntry || parseFloat(usedHoursEntry) <= 0))} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl hover:bg-black dark:hover:bg-slate-100 transition-all shadow-xl flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50 disabled:scale-100">{isProcessing ? <Loader2 className="animate-spin" /> : <Check size={20} />}Confirmar y Finalizar</button><button onClick={() => setTaskPendingCompletion(null)} disabled={isProcessing} className="w-full py-4 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-bold transition-colors">Cancelar</button></div></div></div></div>)}
    </div>
  );
};

export default App;
