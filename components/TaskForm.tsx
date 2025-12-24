
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Task, TaskPriority, TaskStatus, BillingStatus, Company, User, TaskNote, Project, TaskAttachment } from '../types';
import { fetchCompanies, fetchProjects, fetchTasks, createCompany, createUser, fetchTaskNotes, createTaskNote, fetchTaskAttachments, uploadTaskAttachment, deleteTaskAttachment, createTask, deleteTaskNote } from '../services/apiService';
import { sendEmailNotification } from '../services/emailService';
import { getGoogleCalendarUrl, downloadIcsFile } from '../services/calendarService';
import { X, Save, Loader2, Plus, Send, Trash2, ChevronDown, ChevronUp, Paperclip, File, CloudUpload, Eye, Download, ArrowLeft, MoreVertical, CheckCircle2, Clock, Calendar, Building2, User as UserIcon, LayoutGrid, CornerUpLeft, MessageSquare, ChevronRight, AlertCircle, ShieldCheck, CalendarPlus } from 'lucide-react';

interface TaskFormProps {
  initialTask?: Task | null;
  initialView?: 'details' | 'notes';
  currentUser?: User | null;
  availableUsers: User[];
  onSave: (task: Partial<Task>, companyId: number | null, ownerId: number | null, collaboratorIds: number[], supervisorId: number | null) => Promise<void>;
  onClose: () => void;
  onDelete: (id: number) => Promise<boolean>;
}

export const TaskForm: React.FC<TaskFormProps> = ({ initialTask, initialView = 'details', currentUser, availableUsers, onSave, onClose, onDelete }) => {
  // Internal State to handle navigation (switching from Subtask to Parent)
  const [currentTask, setCurrentTask] = useState<Task | null | undefined>(initialTask);
  const lastInitializedId = useRef<number | null>(null);

  // View State Management
  const [activeView, setActiveView] = useState<'details' | 'files' | 'subtasks' | 'notes'>(initialView === 'notes' ? 'notes' : 'details');
  const [showCreateSubtaskModal, setShowCreateSubtaskModal] = useState(false);

  // Accordion States (Details View)
  const [isAttachmentsExpanded, setIsAttachmentsExpanded] = useState(true);
  const [isSubtasksExpanded, setIsSubtasksExpanded] = useState(true);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);
  
  // Task Core State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.NORMAL);
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.PENDING);
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(0);
  const [usedHours, setUsedHours] = useState(0);
  const [billingStatus, setBillingStatus] = useState<BillingStatus>(BillingStatus.TBD);
  const [clientName, setClientName] = useState('');
  const [area, setArea] = useState('');
  const [orderIndex, setOrderIndex] = useState(0);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [parentId, setParentId] = useState<number | null>(null);
  const [parentTitle, setParentTitle] = useState<string | undefined>(undefined);
  
  // Resources
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [workUrl, setWorkUrl] = useState('');
  
  // People
  const [responsibleName, setResponsibleName] = useState('');
  const [supervisorName, setSupervisorName] = useState(''); 
  const [collaboratorsList, setCollaboratorsList] = useState<string[]>([]);
  const [newCollabInput, setNewCollabInput] = useState('');

  // Notes State
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);

  // Attachments State
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subtask Creation State
  const [stTitle, setStTitle] = useState('');
  const [stDescription, setStDescription] = useState('');
  const [stResponsible, setStResponsible] = useState('');
  const [stHours, setStHours] = useState(0);
  
  // Data Sources
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [existingTasks, setExistingTasks] = useState<Task[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Status Labels Mapping
  const statusOptions = [
    { value: TaskStatus.PENDING, label: '01 - En Carpeta' },
    { value: TaskStatus.TO_DO, label: '02 - En Radar' },
    { value: TaskStatus.IN_PROGRESS, label: '03 - En Proceso' },
    { value: TaskStatus.COMPLETED, label: '04 - Terminado' },
    { value: TaskStatus.CANCELED, label: '05 - Suspendido' }
  ];

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  // Update internal state when prop changes (e.g. opening a different task from App)
  useEffect(() => {
      if (initialTask?.id !== currentTask?.id) {
          setCurrentTask(initialTask);
      }
  }, [initialTask]);

  const loadAttachments = async () => {
    if(!currentTask) return;
    try {
        const fetched = await fetchTaskAttachments(currentTask.id);
        setAttachments(fetched);
    } catch(e) { console.error("Attachments error", e); }
  };

  const loadTasks = async () => {
       try { fetchTasks().then(setExistingTasks).catch(e => console.warn("Tasks error", e)); } catch(e) {}
  };

  // Load Data and Hydrate
  useEffect(() => {
    const loadData = async () => {
      try { fetchCompanies().then(setCompanies).catch(e => console.warn("Companies error", e)); } catch(e) {}
      try { fetchProjects().then(setProjects).catch(e => console.warn("Projects error", e)); } catch(e) {}
      loadTasks();
    };
    loadData();

    // Only hydrate if it's a different task or the first time
    if (currentTask && currentTask.id !== lastInitializedId.current) {
      lastInitializedId.current = currentTask.id;
      
      // Hydrate Form
      setTitle(currentTask.title || '');
      setDescription(currentTask.description || '');
      setPriority(currentTask.classification.priority || TaskPriority.NORMAL);
      setStatus(currentTask.statusTime.status || TaskStatus.PENDING);
      setDueDate(currentTask.statusTime.dueDate ? String(currentTask.statusTime.dueDate).split('T')[0] : '');
      setEstimatedHours(currentTask.statusTime.estimatedHours || 0);
      setUsedHours(currentTask.statusTime.usedHours || 0);
      setBillingStatus(currentTask.statusTime.billingStatus || BillingStatus.TBD);
      setClientName(currentTask.classification.client || '');
      setArea(currentTask.classification.area || '');
      setOrderIndex(currentTask.system.orderIndex || 0);
      setProjectId(currentTask.classification.projectId || null);
      setParentId(currentTask.system.parentId || null);
      setParentTitle(currentTask.system.parentTitle);
      setRepositoryUrl(currentTask.resources?.repositoryUrl || '');
      setWorkUrl(currentTask.resources?.workUrl || '');
      setResponsibleName(currentTask.people.responsible || '');
      setSupervisorName(currentTask.people.supervisor || ''); 
      setCollaboratorsList(currentTask.people.collaborators || []);
      
      setShowDeleteConfirm(false);
      setNoteToDelete(null);

      // Load Notes
      const loadNotes = async () => {
        try {
            const fetchedNotes = await fetchTaskNotes(currentTask.id);
            fetchedNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setNotes(fetchedNotes);
        } catch (error) { console.error(error); }
      };
      loadNotes();
      loadAttachments();
      setStResponsible(currentTask.people.responsible || '');
    } else if (!currentTask && lastInitializedId.current !== -1) {
        // New task initialization
        lastInitializedId.current = -1; // Flag for new task
        setTitle('');
        setDescription('');
        setPriority(TaskPriority.NORMAL);
        setStatus(TaskStatus.PENDING);
        setDueDate('');
        setEstimatedHours(0);
        setUsedHours(0);
        setBillingStatus(BillingStatus.TBD);
        setClientName('');
        setArea('');
        setResponsibleName(currentUser?.name || '');
        setSupervisorName('');
        setCollaboratorsList([]);
        setRepositoryUrl('');
        setWorkUrl('');
        setProjectId(null);
        setParentId(null);
        setParentTitle(undefined);
        setShowDeleteConfirm(false);
        setNoteToDelete(null);
        setStResponsible(currentUser?.name || '');
    }
  }, [currentTask, currentUser]);

  const subtasks = useMemo(() => {
      if (!currentTask) return [];
      return existingTasks.filter(t => t.system.parentId === currentTask.id);
  }, [existingTasks, currentTask]);
  
  const filteredCollaborators = useMemo(() => {
    if (!newCollabInput.trim()) return [];
    return availableUsers.filter(u => 
        u.name.toLowerCase().includes(newCollabInput.toLowerCase()) && 
        !collaboratorsList.includes(u.name)
    );
  }, [newCollabInput, availableUsers, collaboratorsList]);

  const handleGoToParent = () => {
      if (!parentId) return;
      const parent = existingTasks.find(t => t.id === parentId);
      if (parent) {
          setCurrentTask(parent);
          setActiveView('details');
      }
  };

  const addCollaborator = (nameToAdd?: string) => {
    const val = nameToAdd || newCollabInput.trim();
    if (val && !collaboratorsList.includes(val)) {
      setCollaboratorsList([...collaboratorsList, val]);
      setNewCollabInput('');
    }
  };

  const removeCollaborator = (name: string) => {
    setCollaboratorsList(collaboratorsList.filter(c => c !== name));
  };

  const getRecipientsForNote = (): User[] => {
      const recipientList: User[] = [];
      const findUserByName = (name: string) => {
          if (!name) return undefined;
          const cleanName = name.trim().toLowerCase();
          return availableUsers.find(u => u.name.trim().toLowerCase() === cleanName);
      };

      const resp = findUserByName(responsibleName);
      if (resp) recipientList.push(resp);
      
      collaboratorsList.forEach(colName => {
          const u = findUserByName(colName);
          if (u) recipientList.push(u);
      });
      return recipientList;
  };

  const handleAddNote = async () => {
    if(!newNote.trim() || !currentTask) return;
    setIsSavingNote(true);
    try { 
        await createTaskNote(currentTask.id, newNote, currentUser?.id || 1); 
        const freshNotes = await fetchTaskNotes(currentTask.id);
        freshNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotes(freshNotes);
        setNewNote(''); 
        
        if (currentUser) {
             const taskSnapshot: Partial<Task> = { ...currentTask, title, description, people: { responsible: responsibleName, collaborators: collaboratorsList, creator: currentTask.people.creator } as any };
             const adminUser = availableUsers.find(u => u.role === 'admin');
             const recipients = getRecipientsForNote();
             
             sendEmailNotification(
                 taskSnapshot, 
                 recipients, 
                 'note_added', 
                 adminUser?.email, 
                 { noteContent: newNote, authorName: currentUser.name },
                 currentUser.email
             );
        }
    } catch(e) { console.error("Error adding note", e); } finally { setIsSavingNote(false); }
  };

  const confirmDeleteNote = async () => {
    if(!currentTask || noteToDelete === null) return;
    try {
        await deleteTaskNote(noteToDelete);
        const freshNotes = await fetchTaskNotes(currentTask.id);
        freshNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotes(freshNotes);
        setNoteToDelete(null);
    } catch (e) {
        console.error("Error removing note", e);
        alert("Error al eliminar la nota.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      if (!currentTask) {
          alert("Debes guardar la tarea antes de subir archivos.");
          return;
      }
      if (!currentUser) return;

      setIsUploading(true);
      try {
          const success = await uploadTaskAttachment(currentTask.id, e.target.files[0], currentUser.id);
          if (success) {
              await loadAttachments();
          }
      } catch(err: any) { 
          alert(`Error al subir archivo: ${err.message}`); 
      } finally { 
          setIsUploading(false); 
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsSubmitting(true);
    try {
      let companyId: number | null = null;
      if (clientName && clientName !== 'General') {
         const existing = companies.find(c => c.name.toLowerCase() === clientName.toLowerCase());
         if (existing) companyId = existing.id;
         else { try { const newC = await createCompany(clientName); companyId = newC.id; } catch(e){} }
      }

      let ownerId: number | null = null;
      if (responsibleName) {
         const existing = availableUsers.find(u => u.name.toLowerCase() === responsibleName.toLowerCase());
         if (existing) ownerId = existing.id;
         else if (currentUser?.role === 'admin') { try { const newU = await createUser(responsibleName); ownerId = newU.id; } catch(e){} }
         else ownerId = currentUser?.id || null;
      }

      let supervisorId: number | null = null;
      if (supervisorName) {
         const existing = availableUsers.find(u => u.name.toLowerCase() === supervisorName.toLowerCase());
         if (existing) {
             supervisorId = existing.id;
         } else if (currentUser?.role === 'admin' || currentUser?.role === 'editor') {
             try {
                 const newSupervisor = await createUser(supervisorName);
                 supervisorId = newSupervisor.id;
             } catch (e) { console.error("Failed auto-supervisor", e); }
         }
      }

      const collabIds: number[] = [];
      for (const colName of collaboratorsList) {
        const existing = availableUsers.find(u => u.name.toLowerCase() === colName.toLowerCase());
        if (existing) collabIds.push(existing.id);
      }

      const taskData: Partial<Task> = {
        ...(currentTask && { id: currentTask.id }),
        title, 
        description,
        classification: { priority, client: clientName, area, projectId },
        statusTime: { status, dueDate: dueDate || undefined, estimatedHours, billingStatus, usedHours },
        people: { 
            responsible: responsibleName, 
            collaborators: collaboratorsList, 
            creator: currentTask?.people.creator || currentUser?.name || 'Sistema', 
            supervisor: supervisorName,
            supervisorId: supervisorId
        },
        resources: { repositoryUrl, workUrl },
        system: { orderIndex, parentId, createdAt: currentTask?.system.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() }
      };

      await onSave(taskData, companyId, ownerId, collabIds, supervisorId);
      onClose();
    } catch (error) { console.error(error); alert("Error al guardar."); } finally { setIsSubmitting(false); }
  };

  const handleCreateSubtask = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentTask) return;
      setIsSubmitting(true);
      
      try {
          let ownerId = null;
          if (stResponsible) {
              const existing = availableUsers.find(u => u.name.toLowerCase() === stResponsible.toLowerCase());
              if (existing) ownerId = existing.id;
          }

          const subtaskData: Partial<Task> = {
              title: stTitle,
              description: stDescription,
              classification: { 
                  priority: TaskPriority.NORMAL, 
                  client: currentTask.classification.client, 
                  projectId: currentTask.classification.projectId 
              } as any,
              statusTime: { status: TaskStatus.PENDING, estimatedHours: stHours } as any,
              people: { responsible: stResponsible } as any,
              system: { parentId: currentTask.id } as any
          };

          await onSave(subtaskData, null, ownerId, [], null);
          setShowCreateSubtaskModal(false);
          setStTitle('');
          setStDescription('');
          setStHours(0);
          await loadTasks();
      } catch (e) { console.error(e); alert("Error al crear subtarea."); } finally { setIsSubmitting(false); }
  };

  const getAvatarUrl = (name: string) => {
      const u = availableUsers.find(user => user.name === name);
      return u?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
  };

  const getStatusLabel = (s: TaskStatus) => {
      const opt = statusOptions.find(o => o.value === s);
      return opt ? opt.label : s;
  };

  const getStatusBadgeColor = (s: TaskStatus) => {
    switch (s) {
      case TaskStatus.COMPLETED: return 'bg-emerald-100 text-emerald-700';
      case TaskStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-700';
      case TaskStatus.TO_DO: return 'bg-cyan-100 text-cyan-700';
      case TaskStatus.CANCELED: return 'bg-slate-100 text-slate-500';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const renderCreateSubtaskModal = () => (
      <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">Nueva Subtarea</h3>
                  <button onClick={() => setShowCreateSubtaskModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
              </div>
              <form onSubmit={handleCreateSubtask} className="p-6 space-y-5">
                   <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Título</label>
                       <input 
                           className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white text-base"
                           placeholder="Título de la subtarea"
                           value={stTitle}
                           onChange={e => setStTitle(e.target.value)}
                           required
                           autoFocus
                       />
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Descripción</label>
                       <textarea 
                           className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white text-base resize-none"
                           placeholder="Detalles adicionales..."
                           rows={3}
                           value={stDescription}
                           onChange={e => setStDescription(e.target.value)}
                       />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Responsable</label>
                           <input 
                               list="users-list-st"
                               className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white text-base"
                               value={stResponsible}
                               onChange={e => setStResponsible(e.target.value)}
                           />
                           <datalist id="users-list-st">{availableUsers.map(u => <option key={u.id} value={u.name} />)}</datalist>
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Estimado (hs)</label>
                           <input 
                               type="number" step="0.5"
                               className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white text-base"
                               value={stHours}
                               onChange={e => setStHours(parseFloat(e.target.value))}
                           />
                       </div>
                   </div>
                   <div className="pt-4 flex justify-end gap-3">
                       <button type="button" onClick={() => setShowCreateSubtaskModal(false)} className="px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                       <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-colors flex items-center gap-2">
                           {isSubmitting && <Loader2 className="animate-spin w-4 h-4"/>} Crear
                       </button>
                   </div>
              </form>
          </div>
      </div>
  );

  const renderAttachmentsView = () => (
      <div className="flex flex-col h-full bg-[#F9FAFB] dark:bg-slate-950">
          <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
              <div className="flex items-center gap-4">
                  <button onClick={() => setActiveView('details')} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                      <ArrowLeft size={24} />
                  </button>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <Paperclip size={20} /> Gestión de Archivos ({attachments.length})
                  </h2>
              </div>
              <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-lg shadow-blue-200 dark:shadow-none"
              >
                  {isUploading ? <Loader2 className="animate-spin w-4 h-4"/> : <CloudUpload size={18}/>}
                  Subir Archivo
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          </div>
          
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
              {attachments.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                      <File size={64} className="mb-4 opacity-20" />
                      <p className="text-lg font-medium">No hay archivos adjuntos</p>
                      <p className="text-sm">Sube documentos o imágenes relacionados a esta tarea.</p>
                  </div>
              ) : (
                  attachments.map(file => (
                      <div key={file.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4 group">
                          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                               {file.fileType.startsWith('image/') ? (
                                   <img src={file.filePath} className="w-full h-full object-cover" alt="preview" />
                               ) : (
                                   <File size={32} className="text-slate-400" />
                               )}
                          </div>
                          <div className="flex-grow min-w-0">
                              <h4 className="font-bold text-slate-800 dark:text-white truncate text-base mb-1" title={file.fileName}>{file.fileName}</h4>
                              <p className="text-xs text-slate-500 mb-1">{Math.round(file.fileSize/1024)} KB • {new Date(file.createdAt).toLocaleDateString()}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Subido por: {file.userName}</p>
                          </div>
                          <div className="flex gap-1">
                               <a href={file.filePath} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Ver">
                                   <Eye size={18} />
                               </a>
                               <a href={file.filePath} download className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Descargar">
                                   <Download size={18} />
                               </a>
                               <button onClick={() => deleteTaskAttachment(file.id).then(loadAttachments)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar">
                                   <Trash2 size={18} />
                               </button>
                          </div>
                      </div>
                  ))
              )}
          </div>
      </div>
  );

  const renderSubtasksView = () => (
      <div className="flex flex-col h-full bg-[#F9FAFB] dark:bg-slate-950">
          <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
              <div className="flex items-center gap-4">
                  <button onClick={() => setActiveView('details')} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                      <ArrowLeft size={24} />
                  </button>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <ChevronDown size={20} className="rotate-[-90deg]"/> Subtareas ({subtasks.length})
                  </h2>
              </div>
              <button 
                  onClick={() => setShowCreateSubtaskModal(true)}
                  className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-lg"
              >
                  <Plus size={18}/> Crear Subtarea
              </button>
          </div>

          <div className="p-6 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-bold text-slate-700">Total Árbol: <span className="text-slate-900 font-black">{(estimatedHours + subtasks.reduce((acc, t) => acc + t.statusTime.estimatedHours, 0)).toFixed(1)}h</span></span>
              </div>

              {subtasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                      <ChevronDown size={64} className="mb-4 opacity-20" />
                      <p className="text-lg font-medium">No hay subtareas</p>
                      <p className="text-sm">Divide esta tarea en pasos más pequeños.</p>
                  </div>
              ) : (
                  <div className="space-y-3">
                      {subtasks.map(st => (
                          <div key={st.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${st.statusTime.status === TaskStatus.COMPLETED ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                              
                              <div className="flex-grow min-w-0">
                                  <h4 className="font-bold text-slate-800 dark:text-white text-lg truncate mb-1">{st.title}</h4>
                                  <div className="flex items-center gap-3 text-xs text-slate-500">
                                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                          {st.people.responsible}
                                      </span>
                                      <span className="flex items-center gap-1">
                                          <Clock size={12} /> {st.statusTime.estimatedHours}h
                                      </span>
                                      <span className="flex items-center gap-1">
                                          <Building2 size={12} /> {st.classification.client}
                                      </span>
                                  </div>
                              </div>
                              
                              <div className="flex-shrink-0">
                                  <span className={`text-[10px] font-bold px-3 py-1.5 rounded uppercase tracking-wider ${getStatusBadgeColor(st.statusTime.status)}`}>
                                      {getStatusLabel(st.statusTime.status)}
                                  </span>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </div>
  );

  const renderNotesView = () => (
    <div className="flex flex-col h-full bg-[#F9FAFB] dark:bg-slate-950">
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
            <div className="flex items-center gap-4">
                <button onClick={() => setActiveView('details')} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                    <ArrowLeft size={24} />
                </button>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <MessageSquare size={20} /> Notas y Comentarios ({notes.length})
                </h2>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <MessageSquare size={64} className="mb-4 opacity-20" />
                    <p className="text-lg font-medium">No hay notas</p>
                    <p className="text-sm">Escribe la primera nota para este tarea.</p>
                </div>
            ) : (
                notes.map(note => (
                    <div key={note.id} className="flex gap-4 group">
                         <img src={note.userAvatar || getAvatarUrl(note.userName || '')} className="w-10 h-10 rounded-full border border-slate-200 shadow-sm flex-shrink-0" alt="Avatar"/>
                         <div className="flex-1 space-y-1">
                             <div className="flex items-baseline justify-between">
                                 <span className="font-bold text-slate-900 dark:text-white">{note.userName}</span>
                                 <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">{new Date(note.createdAt).toLocaleString()}</span>
                                    
                                    {noteToDelete === note.id ? (
                                        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-lg animate-in fade-in slide-in-from-right-2">
                                            <span className="text-xs text-red-600 dark:text-red-400 font-bold hidden sm:inline">¿Borrar?</span>
                                            <button 
                                                onClick={confirmDeleteNote} 
                                                className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                            >
                                                <CheckCircle2 size={14} />
                                            </button>
                                            <button 
                                                onClick={() => setNoteToDelete(null)} 
                                                className="p-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-300 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => setNoteToDelete(note.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                 </div>
                             </div>
                             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl rounded-tl-none border border-slate-200 dark:border-slate-800 shadow-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                 {note.content}
                             </div>
                         </div>
                    </div>
                ))
            )}
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <div className="relative">
                <textarea 
                    className="w-full p-4 pr-14 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors dark:text-white text-slate-800 resize-none"
                    placeholder="Escribir una nota..."
                    rows={3}
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddNote();
                        }
                    }}
                />
                <button 
                    type="button"
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || isSavingNote}
                    className="absolute right-3 bottom-3 h-10 w-10 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                >
                    {isSavingNote ? <Loader2 className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />}
                </button>
            </div>
        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200">
      <div className="bg-[#F9FAFB] dark:bg-[#1C1C1E] w-full max-w-7xl h-[100dvh] md:h-[95vh] md:rounded-xl shadow-2xl flex flex-col overflow-hidden border-none md:border border-slate-200 dark:border-slate-800 relative">
        
        <div className="flex-1 overflow-hidden relative">
            {activeView === 'details' && (
                <div className="h-full overflow-y-auto custom-scrollbar">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4 md:p-8 bg-white dark:bg-slate-900 min-h-full">
                        
                        <div className="lg:col-span-2 space-y-8">
                            <div className="space-y-6">
                                {parentId && (
                                    <div 
                                        onClick={handleGoToParent}
                                        className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-bold -mb-4 cursor-pointer hover:underline w-fit animate-in fade-in slide-in-from-left-2"
                                    >
                                        <CornerUpLeft size={16} />
                                        <span>Subtarea de: {parentTitle || 'Tarea Padre'}</span>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-base md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 md:mb-1">Título de la Tarea</label>
                                    <input 
                                        className="w-full text-2xl md:text-3xl font-bold p-3 bg-transparent border-none focus:ring-0 focus:outline-none placeholder-slate-300 dark:placeholder-slate-600 dark:text-white -mx-3 rounded-xl text-slate-900"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="Escribe el título aquí..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-base md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 md:mb-1">Descripción</label>
                                    <textarea 
                                        className="w-full text-lg md:text-base p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-200 resize-none placeholder-slate-400 dark:text-white text-slate-800"
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        rows={5}
                                        placeholder="Detalles de la tarea..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-base md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Cliente</label>
                                    <input 
                                        list="companies-list"
                                        className="w-full text-lg md:text-base p-4 md:p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white font-medium text-slate-800"
                                        value={clientName}
                                        onChange={e => setClientName(e.target.value)}
                                        placeholder="Buscar cliente..."
                                    />
                                    <datalist id="companies-list">{companies.map(c => <option key={c.id} value={c.name} />)}</datalist>
                                </div>
                                <div>
                                    <label className="block text-base md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Horas Estimadas</label>
                                    <input 
                                        type="number" step="0.5"
                                        className="w-full text-lg md:text-base p-4 md:p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white font-medium text-slate-800"
                                        value={estimatedHours}
                                        onChange={e => setEstimatedHours(parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-base md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Prioridad (1-5)</label>
                                <div className="grid grid-cols-5 gap-3">
                                    {[1, 2, 3, 4, 5].map(p => (
                                        <button 
                                            key={p} 
                                            type="button"
                                            onClick={() => setPriority(p as TaskPriority)}
                                            className={`py-3 md:py-3 px-4 text-xl md:text-base font-bold rounded-xl md:rounded-lg border transition-all ${
                                                priority === p 
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' 
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                                <div>
                                    <label className="block text-base md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Responsable</label>
                                    <div className="relative">
                                        <input 
                                            list="users-list"
                                            className="w-full text-lg md:text-base p-4 pl-14 md:p-3 md:pl-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white font-bold text-slate-800"
                                            value={responsibleName}
                                            onChange={e => setResponsibleName(e.target.value)}
                                            placeholder="Asignar..."
                                        />
                                        <img 
                                            src={getAvatarUrl(responsibleName)} 
                                            alt="Avatar" 
                                            className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 md:h-7 md:w-7 rounded-full border border-slate-300" 
                                        />
                                        <datalist id="users-list">{availableUsers.map(u => <option key={u.id} value={u.name} />)}</datalist>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-base md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                                        Supervisor <ShieldCheck size={14} />
                                    </label>
                                    <div className="relative">
                                        <input 
                                            list="supervisor-list"
                                            className="w-full text-lg md:text-base p-4 pl-14 md:p-3 md:pl-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white font-medium text-slate-800"
                                            value={supervisorName}
                                            onChange={e => setSupervisorName(e.target.value)}
                                            placeholder="Supervisado por..."
                                        />
                                        <img 
                                            src={getAvatarUrl(supervisorName)} 
                                            alt="Avatar" 
                                            className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 md:h-7 md:w-7 rounded-full border border-slate-300" 
                                        />
                                        <datalist id="supervisor-list">{availableUsers.map(u => <option key={u.id} value={u.name} />)}</datalist>
                                    </div>
                                </div>
                                
                                <div className="sm:col-span-2 flex flex-col gap-2 relative z-20">
                                    <label className="block text-base md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Agregar Colaborador</label>
                                    <div className="relative">
                                        <input 
                                            className="w-full text-lg md:text-base p-4 md:p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white text-slate-800"
                                            value={newCollabInput}
                                            onChange={e => setNewCollabInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCollaborator())}
                                            placeholder="Escribe para buscar..."
                                        />
                                        {filteredCollaborators.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                                                {filteredCollaborators.map(u => (
                                                    <button
                                                        key={u.id}
                                                        type="button"
                                                        onClick={() => addCollaborator(u.name)}
                                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 text-slate-700 dark:text-slate-200 flex items-center gap-3 transition-colors border-b border-slate-100 last:border-0"
                                                    >
                                                        <img 
                                                            src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`} 
                                                            alt={u.name}
                                                            className="w-8 h-8 rounded-full border border-slate-200"
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-sm">{u.name}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {collaboratorsList.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {collaboratorsList.map(c => (
                                                <span key={c} className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 border border-indigo-100 dark:border-indigo-800">
                                                    {c}
                                                    <button type="button" onClick={() => removeCollaborator(c)}><X size={16} /></button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-base md:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                        NOTAS RECIENTES ({notes.length})
                                    </h3>
                                    <button 
                                        type="button"
                                        onClick={() => setActiveView('notes')}
                                        className="text-blue-600 hover:text-blue-700 font-bold text-sm bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1"
                                    >
                                        GESTIONAR <ChevronRight size={14} />
                                    </button>
                                </div>
                                
                                <div className="space-y-4 mb-4">
                                    {notes.slice(0, 3).map(note => (
                                        <div key={note.id} className="flex items-start space-x-3">
                                            <img src={note.userAvatar || getAvatarUrl(note.userName || '')} className="h-10 w-10 md:h-8 md:w-8 rounded-full mt-1 border border-slate-200" alt="Avatar"/>
                                            <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <p className="font-bold text-slate-900 dark:text-white text-base md:text-sm">{note.userName}</p>
                                                    <p className="text-xs text-slate-500">{new Date(note.createdAt).toLocaleDateString()}</p>
                                                </div>
                                                <p className="text-slate-700 dark:text-slate-300 text-lg md:text-sm font-medium leading-relaxed whitespace-pre-wrap">{note.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {notes.length === 0 && <p className="text-sm text-slate-400 italic">No hay notas registradas.</p>}
                                </div>

                                <div className="relative">
                                    <input 
                                        className="w-full text-lg md:text-base py-4 md:py-3 pl-4 pr-14 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white text-slate-800"
                                        placeholder="Escribir nota rápida..."
                                        value={newNote}
                                        onChange={e => setNewNote(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddNote())}
                                    />
                                    <button 
                                        type="button"
                                        onClick={handleAddNote}
                                        disabled={!newNote.trim() || isSavingNote}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 md:h-8 md:w-8 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        {isSavingNote ? <Loader2 className="animate-spin w-5 h-5 md:w-4 md:h-4" /> : <Send className="w-5 h-5 md:w-4 md:h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                                <div>
                                    <label className="block text-base md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Estado</label>
                                    <select 
                                        className="w-full text-lg md:text-base p-4 md:p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold cursor-pointer appearance-none text-slate-800"
                                        value={status}
                                        onChange={e => setStatus(e.target.value as TaskStatus)}
                                    >
                                        {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-base md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Vencimiento</label>
                                    <input 
                                        type="date"
                                        className="w-full text-lg md:text-base p-4 md:p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white font-bold text-slate-800"
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-base md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Horas Reales</label>
                                    <input 
                                        type="number" step="0.5"
                                        className="w-full text-lg md:text-base p-4 md:p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white font-bold text-slate-800"
                                        value={usedHours}
                                        onChange={e => setUsedHours(parseFloat(e.target.value))}
                                    />
                                </div>

                                <div>
                                    <label className="block text-base md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Proyecto</label>
                                    <select 
                                        className="w-full text-lg md:text-base p-4 md:p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white font-bold cursor-pointer text-slate-800"
                                        value={projectId || ''}
                                        onChange={e => setProjectId(Number(e.target.value) || null)}
                                    >
                                        <option value="">Sin Proyecto</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            {currentTask && (
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <button type="button" onClick={() => setIsCalendarExpanded(!isCalendarExpanded)} className="w-full flex justify-between items-center text-left py-2">
                                        <span className="text-base md:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><CalendarPlus size={18}/> SINCRONIZAR AGENDA</span>
                                        {isCalendarExpanded ? <ChevronUp className="text-slate-400"/> : <ChevronDown className="text-slate-400"/>}
                                    </button>
                                    {isCalendarExpanded && (
                                        <div className="mt-4 space-y-3">
                                            <a 
                                                href={getGoogleCalendarUrl(currentTask)} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-white transition-all flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200"
                                            >
                                                <img src="https://www.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_31_2x.png" className="w-5 h-5" alt=""/>
                                                Google Calendar
                                            </a>
                                            <button 
                                                type="button"
                                                onClick={() => downloadIcsFile(currentTask)}
                                                className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-white transition-all flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200"
                                            >
                                                <Calendar className="w-5 h-5 text-blue-500" />
                                                Apple / Outlook
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <button type="button" onClick={() => setIsAttachmentsExpanded(!isAttachmentsExpanded)} className="w-full flex justify-between items-center text-left py-2">
                                    <span className="text-base md:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><Paperclip size={18}/> ARCHIVOS ({attachments.length})</span>
                                    {isAttachmentsExpanded ? <ChevronUp className="text-slate-400"/> : <ChevronDown className="text-slate-400"/>}
                                </button>
                                {isAttachmentsExpanded && (
                                    <div className="mt-4">
                                        <div className="space-y-3 mb-4">
                                            {attachments.slice(0, 3).map(file => (
                                                <div key={file.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100">
                                                    <File className="text-slate-400 w-5 h-5" />
                                                    <span className="text-sm font-medium flex-1 truncate dark:text-white text-slate-800">{file.fileName}</span>
                                                </div>
                                            ))}
                                            {attachments.length === 0 && <p className="text-sm text-slate-400 mb-4 italic text-center">Sin adjuntos</p>}
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => setActiveView('files')}
                                            className="w-full py-3 text-base font-bold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                                        >
                                             GESTIONAR
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <button type="button" onClick={() => setIsSubtasksExpanded(!isSubtasksExpanded)} className="w-full flex justify-between items-center text-left py-2">
                                    <span className="text-base md:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><ChevronDown size={18} className="rotate-[-90deg]"/> SUBTAREAS ({subtasks.length})</span>
                                    {isSubtasksExpanded ? <ChevronUp className="text-slate-400"/> : <ChevronDown className="text-slate-400"/>}
                                </button>
                                {isSubtasksExpanded && (
                                    <div className="mt-4">
                                        <div className="space-y-2 mb-4">
                                            {subtasks.slice(0, 3).map(st => (
                                                <div key={st.id} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                                                    <div className={`w-2 h-2 rounded-full ${st.statusTime.status === TaskStatus.COMPLETED ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                                    <span className="truncate">{st.title}</span>
                                                </div>
                                            ))}
                                            {subtasks.length === 0 && <p className="text-sm text-slate-400 mb-4 italic text-center">Sin subtareas</p>}
                                        </div>
                                        <div className="flex gap-3">
                                            <button 
                                                type="button"
                                                onClick={() => setShowCreateSubtaskModal(true)}
                                                className="flex-1 py-3 text-base font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                                            >
                                                <Plus className="w-4 h-4 inline mr-1" /> Crear
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setActiveView('subtasks')} 
                                                className="flex-1 py-3 text-base font-bold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                                            >
                                                VER TODAS
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </form>
                    
                    <footer className="sticky bottom-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-4 md:px-8 z-20">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 max-w-7xl mx-auto">
                             {currentTask && (
                                showDeleteConfirm ? (
                                    <div className="flex items-center gap-2 w-full md:w-auto animate-in fade-in slide-in-from-left-2 duration-200">
                                        <button 
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="flex-1 md:flex-none px-4 py-3 text-base md:text-sm font-bold rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            onClick={async () => {
                                                 setIsSubmitting(true);
                                                 const success = await onDelete(currentTask.id);
                                                 if (success) onClose();
                                                 else { setIsSubmitting(false); setShowDeleteConfirm(false); }
                                            }}
                                            disabled={isSubmitting}
                                            className="flex-1 md:flex-none px-4 py-3 text-base md:text-sm font-bold rounded-xl text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? <Loader2 className="animate-spin w-4 h-4"/> : <Trash2 className="w-4 h-4" />}
                                            Confirmar
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        type="button" 
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="w-full md:w-auto px-4 py-3 text-base md:text-sm font-bold rounded-xl text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                        <span>Eliminar Tarea</span>
                                    </button>
                                )
                             )}
                             
                             <div className="flex items-center gap-3 w-full md:w-auto ml-auto">
                                <button 
                                    onClick={onClose}
                                    className="flex-1 md:flex-none px-6 py-4 md:py-3 text-lg md:text-base font-bold rounded-xl text-slate-700 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="flex-1 md:flex-none px-8 py-4 md:py-3 text-lg md:text-base font-bold rounded-xl bg-blue-600 text-white flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5" />}
                                    Guardar
                                </button>
                             </div>
                        </div>
                    </footer>
                </div>
            )}
            
            {activeView === 'files' && renderAttachmentsView()}
            {activeView === 'subtasks' && renderSubtasksView()}
            {activeView === 'notes' && renderNotesView()}
        </div>
      </div>
      {showCreateSubtaskModal && renderCreateSubtaskModal()}
    </div>
  );
};
