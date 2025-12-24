import React, { useEffect, useState } from 'react';
import { User, Company, Project, Task, TaskStatus } from '../types';
import { fetchUsers, fetchCompanies, fetchProjects, updateUser, updateCompany, updateProject, createUser, createCompany, createProject, deleteUser, deleteCompany, deleteProject, fetchTasks } from '../services/apiService';
import { Users, Building2, Mail, Phone, Loader2, AlertCircle, Pencil, X, Save, Plus, Trash2, Clock, Briefcase, FolderKanban, Calendar, ChevronDown, ChevronRight, CheckCircle2, CornerDownRight, ListTree, Grid, Link as LinkIcon, CheckSquare, FolderOpen, ExternalLink, Lock, Eye, Globe } from 'lucide-react';

interface DirectoryViewProps {
  user: User;
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({ user }) => {
  const isAdmin = user.role === 'admin';
  const [activeTab, setActiveTab] = useState<'users' | 'companies' | 'projects'>(isAdmin ? 'users' : 'companies');
  
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  // Needed for Tree View & Task Counts
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Project View Mode
  const [projectViewMode, setProjectViewMode] = useState<'cards' | 'tree'>('cards');
  const [expandedProjects, setExpandedProjects] = useState<Record<number, boolean>>({});

  // Editing/Creating State
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [editingCompany, setEditingCompany] = useState<Partial<Company> | null>(null);
  const [editingProject, setEditingProject] = useState<Partial<Project> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Visibility Logic State
  const [showVisibilitySelector, setShowVisibilitySelector] = useState(false);

  // Deletion State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'user' | 'company' | 'project', id: number, name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    // Load each resource independently to prevent a single failure from blocking everything
    try {
        const usersPromise = isAdmin ? fetchUsers().catch(e => { console.error("Users failed", e); return []; }) : Promise.resolve([]);
        const companiesPromise = fetchCompanies().catch(e => { console.error("Companies failed", e); return []; });
        const projectsPromise = fetchProjects().catch(e => { console.error("Projects failed", e); return []; });
        const tasksPromise = fetchTasks().catch(e => { console.error("Tasks failed", e); return []; });

        const [usersData, companiesData, projectsData, tasksData] = await Promise.all([
            usersPromise,
            companiesPromise,
            projectsPromise,
            tasksPromise
        ]);

        if (isAdmin) setUsers(usersData);
        setCompanies(companiesData);
        setProjects(projectsData);
        setTasks(tasksData);

        if (isAdmin && usersData.length === 0 && companiesData.length === 0 && projectsData.length === 0) {
            setError("No se pudo conectar con el servidor. Verifique su conexión.");
        } else if (!isAdmin && companiesData.length === 0 && projectsData.length === 0) {
            setError("No se pudieron cargar empresas o proyectos.");
        }
    } catch (err) {
        console.error(err);
        setError("Error crítico al cargar datos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleCreateUserClick = () => {
    setIsCreating(true);
    setEditingUser({ name: '', email: '', role: 'colaborador', phone: '', dailyHours: 8, jobTitle: '', avatar: '', password: '', visibleUserIds: [] });
    setShowVisibilitySelector(false);
  };

  const handleCreateCompanyClick = () => {
    setIsCreating(true);
    setEditingCompany({ name: '', logoUrl: '', notes: '', active: true, driveUrl: '', repositoryUrl: '', workUrl: '', website: '', email: '', phone: '' });
  };

  const handleCreateProjectClick = () => {
    setIsCreating(true);
    setEditingProject({ name: '', description: '', status: 'activo', clientId: null, repositoryUrl: '', workUrl: '' });
  };

  const handleEditUserClick = (user: User, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCreating(false);
    // When editing, password starts empty (we don't show the encrypted hash)
    setEditingUser({ ...user, password: '' });
    setShowVisibilitySelector(false);
  };

  const handleEditCompanyClick = (company: Company, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCreating(false);
    setEditingCompany(company);
  };

  const handleEditProjectClick = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCreating(false);
    setEditingProject(project);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.name) return;
    setIsSaving(true);
    try {
      if (isCreating) {
         // Create user with all details in one go
         await createUser(editingUser);
      } else {
        await updateUser(editingUser as User);
      }
      await loadData();
      setEditingUser(null);
    } catch (err: any) {
      alert(`Error al guardar usuario: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleVisibleUser = (targetId: number) => {
      if (!editingUser) return;
      const currentIds = editingUser.visibleUserIds || [];
      
      if (currentIds.includes(targetId)) {
          setEditingUser({ ...editingUser, visibleUserIds: currentIds.filter(id => id !== targetId) });
      } else {
          setEditingUser({ ...editingUser, visibleUserIds: [...currentIds, targetId] });
      }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany || !editingCompany.name) return;
    setIsSaving(true);
    try {
      if (isCreating) {
        // Updated API Service now handles full object creation in one go
        await createCompany(editingCompany);
      } else {
        await updateCompany(editingCompany as Company);
      }
      await loadData();
      setEditingCompany(null);
    } catch (err: any) {
      console.error(err);
      // Show exact server error if available
      alert(`Error al guardar empresa: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editingProject.name) return;
    setIsSaving(true);
    try {
      if (isCreating) {
        await createProject(editingProject);
      } else {
        await updateProject(editingProject as Project);
      }
      await loadData();
      setEditingProject(null);
    } catch (err: any) {
      alert(`Error al guardar proyecto: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (type: 'user' | 'company' | 'project', item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
    setDeleteConfirmation({ type, id: item.id, name: item.name });
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirmation) return;
    setIsDeleting(true);
    try {
        if (deleteConfirmation.type === 'user') {
            await deleteUser(deleteConfirmation.id);
        } else if (deleteConfirmation.type === 'company') {
            await deleteCompany(deleteConfirmation.id);
        } else {
            await deleteProject(deleteConfirmation.id);
        }
        await loadData();
        setDeleteConfirmation(null);
    } catch (e: any) {
        console.error("Delete error:", e);
        setDeleteConfirmation(null);
        setError(e.message || "Error al eliminar. Es posible que tenga registros asociados.");
    } finally {
        setIsDeleting(false);
    }
  };

  const toggleProjectExpand = (id: number) => {
    setExpandedProjects(prev => ({
        ...prev,
        [id]: !prev[id]
    }));
  };

  // Render Tree Node
  const renderProjectTree = (project: Project) => {
      const projectTasks = tasks.filter(t => t.classification.projectId === project.id && !t.system.parentId);
      const isExpanded = expandedProjects[project.id];

      return (
          <div key={project.id} className="mb-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div 
                className="flex items-center justify-between p-4 md:p-6 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => toggleProjectExpand(project.id)}
              >
                  <div className="flex items-center gap-2 md:gap-3 flex-grow min-w-0">
                      {isExpanded ? <ChevronDown className="w-5 h-5 md:w-6 md:h-6 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-slate-400 flex-shrink-0" />}
                      <FolderKanban className="w-6 h-6 md:w-8 md:h-8 text-blue-600 flex-shrink-0" />
                      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 min-w-0">
                          <span className="font-bold text-lg md:text-2xl text-slate-800 truncate">{project.name}</span>
                          <span className={`text-[10px] md:text-xs px-2 py-0.5 md:px-3 md:py-1 rounded-full uppercase font-bold w-fit ${project.status === 'activo' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                              {project.status}
                          </span>
                      </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                      <div className="flex gap-1 md:gap-2 hidden sm:flex" onClick={e => e.stopPropagation()}>
                        {project.repositoryUrl && (
                             <a 
                                href={project.repositoryUrl.startsWith('http') ? project.repositoryUrl : `https://${project.repositoryUrl}`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-blue-100 rounded text-slate-400 hover:text-blue-600 transition-colors"
                                title="Repositorio / Drive"
                             >
                                 <FolderOpen className="w-4 h-4 md:w-5 md:h-5" />
                             </a>
                        )}
                        {project.workUrl && (
                             <a 
                                href={project.workUrl.startsWith('http') ? project.workUrl : `https://${project.workUrl}`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-pink-100 rounded text-slate-400 hover:text-pink-600 transition-colors"
                                title="Link Trabajo"
                             >
                                 <ExternalLink className="w-4 h-4 md:w-5 md:h-5" />
                             </a>
                        )}
                      </div>
                      <span className="text-sm md:text-base text-slate-500 font-medium border-l border-slate-200 pl-2 md:pl-4">{projectTasks.length}</span>
                      <button onClick={(e) => handleEditProjectClick(project, e)} className="p-1 md:p-2 hover:bg-white rounded"><Pencil className="w-4 h-4 md:w-5 md:h-5 text-slate-400" /></button>
                  </div>
              </div>

              {isExpanded && (
                  <div className="p-4 md:p-6 border-t border-slate-100 bg-white">
                      {projectTasks.length === 0 ? (
                          <div className="pl-8 md:pl-11 text-base text-slate-400 italic py-2">Sin tareas asignadas</div>
                      ) : (
                          <div className="space-y-4">
                              {projectTasks.map(task => {
                                  // Find Subtasks
                                  const subtasks = tasks.filter(st => st.system.parentId === task.id);
                                  return (
                                      <div key={task.id} className="pl-2 md:pl-11">
                                          <div className="flex items-center gap-3 text-base md:text-lg text-slate-700 py-1">
                                              {task.statusTime.status === TaskStatus.COMPLETED ? (
                                                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                              ) : (
                                                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0" />
                                              )}
                                              <span className={`font-medium truncate ${task.statusTime.status === TaskStatus.COMPLETED ? 'line-through text-slate-400' : ''}`}>
                                                  {task.title}
                                              </span>
                                          </div>
                                          {/* Subtasks */}
                                          {subtasks.length > 0 && (
                                              <div className="pl-6 md:pl-8 border-l border-slate-100 ml-2.5 mt-2 space-y-2">
                                                  {subtasks.map(st => (
                                                      <div key={st.id} className="flex items-center gap-2 text-sm md:text-base text-slate-500 py-0.5">
                                                          <CornerDownRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                                                          <span className="truncate">{st.title}</span>
                                                      </div>
                                                  ))}
                                              </div>
                                          )}
                                      </div>
                                  );
                              })}
                          </div>
                      )}
                  </div>
              )}
          </div>
      );
  };

  if (isLoading && !users.length && !companies.length && !projects.length) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 relative min-h-[500px]">
      {/* Toast Error Notification */}
      {error && (
        <div className="fixed top-24 right-4 z-[60] max-w-md w-full animate-in slide-in-from-right fade-in duration-300 px-4">
           <div className="bg-red-50 border border-red-200 rounded-xl p-5 shadow-lg flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-grow">
                <h4 className="text-base font-bold text-red-800 mb-1">Estado de conexión</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                <X className="w-5 h-5" />
              </button>
           </div>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col gap-4">
        {/* Tabs - Horizontal Scroll on Mobile */}
        <div className="flex space-x-2 bg-white p-1.5 rounded-xl border border-slate-200 w-full overflow-x-auto shadow-sm no-scrollbar">
            {isAdmin && (
                <button
                onClick={() => setActiveTab('users')}
                className={`flex-1 min-w-fit px-4 md:px-6 py-3 text-sm md:text-base font-bold rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                    activeTab === 'users' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
                >
                <Users className="w-4 h-4 md:w-5 md:h-5" />
                Usuarios
                </button>
            )}
            <button
            onClick={() => setActiveTab('companies')}
            className={`flex-1 min-w-fit px-4 md:px-6 py-3 text-sm md:text-base font-bold rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'companies' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
            >
            <Building2 className="w-4 h-4 md:w-5 md:h-5" />
            Empresas
            </button>
            <button
            onClick={() => setActiveTab('projects')}
            className={`flex-1 min-w-fit px-4 md:px-6 py-3 text-sm md:text-base font-bold rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'projects' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
            >
            <FolderKanban className="w-4 h-4 md:w-5 md:h-5" />
            Proyectos
            </button>
        </div>

        {/* Create Button */}
        <button 
            onClick={() => {
                if (activeTab === 'users') handleCreateUserClick();
                else if (activeTab === 'companies') handleCreateCompanyClick();
                else handleCreateProjectClick();
            }}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-base font-bold transition-colors shadow-sm"
        >
            <Plus className="w-6 h-6" />
            {activeTab === 'users' ? 'Nuevo Usuario' : activeTab === 'companies' ? 'Nueva Empresa' : 'Nuevo Proyecto'}
        </button>
      </div>

      {/* Projects View Toggle */}
      {activeTab === 'projects' && (
          <div className="flex justify-end border-b border-slate-100 pb-3">
              <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button 
                      onClick={() => setProjectViewMode('cards')} 
                      className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${projectViewMode === 'cards' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                  >
                      <Grid className="w-4 h-4" /> Tarjetas
                  </button>
                  <button 
                      onClick={() => setProjectViewMode('tree')} 
                      className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${projectViewMode === 'tree' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                  >
                      <ListTree className="w-4 h-4" /> Jerárquica
                  </button>
              </div>
          </div>
      )}

      {/* Content Grid - Responsive grid cols */}
      <div className={`grid gap-6 md:gap-8 pb-24 ${activeTab === 'projects' && projectViewMode === 'tree' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]'}`}>
        {activeTab === 'users' && isAdmin && (
          users.map(user => {
            // Calculate assigned tasks (active)
            const activeTaskCount = tasks.filter(t => 
                t.people.responsible === user.name && 
                t.statusTime.status !== TaskStatus.COMPLETED &&
                t.statusTime.status !== TaskStatus.CANCELED
            ).length;

            return (
            <div key={user.id} className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm hover:shadow-md transition-all flex flex-col gap-6 relative group">
              <div className="absolute top-4 right-4 flex gap-1 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={(e) => handleEditUserClick(user, e)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                >
                    <Pencil className="w-5 h-5" />
                </button>
                <button 
                    onClick={(e) => confirmDelete('user', user, e)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-center gap-5">
                <img 
                  src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} 
                  alt={user.name} 
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-4 border-slate-50 shadow-sm"
                />
                <div>
                  <h3 className="font-bold text-xl md:text-2xl text-slate-800 leading-tight">{user.name}</h3>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="inline-block bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide">
                        {user.role}
                    </span>
                  </div>
                </div>
              </div>

               <div className="grid grid-cols-2 gap-4 text-sm border-t border-slate-100 pt-5 mt-2">
                 <div className="col-span-2 flex items-center gap-3 text-slate-700">
                    <Building2 className="w-5 h-5 text-slate-400" />
                    <span className="font-semibold text-base md:text-lg truncate">{user.companyName || 'Sin Empresa'}</span>
                 </div>
                 
                 {user.jobTitle && (
                    <div className="col-span-2 flex items-center gap-3 text-slate-500">
                        <Briefcase className="w-5 h-5 text-slate-400" />
                        <span className="text-base truncate">{user.jobTitle}</span>
                    </div>
                 )}

                 <div className="flex items-center gap-3 text-slate-500">
                    <Clock className="w-5 h-5 text-slate-400" />
                    <span className="text-base">{user.dailyHours || 8}h / día</span>
                 </div>
               </div>

              {/* Active Tasks Count */}
               <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3 text-slate-600 font-bold text-base">
                        <CheckSquare className="w-5 h-5 text-slate-400" />
                        <span>Tareas Activas</span>
                    </div>
                    <span className={`font-bold px-4 py-1 rounded-full text-sm ${activeTaskCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                        {activeTaskCount}
                    </span>
               </div>

              <div className="space-y-2 text-sm text-slate-400 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-3 overflow-hidden">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <a href={`mailto:${user.email}`} className="hover:text-blue-600 transition-colors truncate text-sm md:text-base">{user.email}</a>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4" />
                    <span className="text-base">{user.phone}</span>
                  </div>
                )}
              </div>
            </div>
            );
          })
        )}

        {activeTab === 'companies' && (
          companies.map(company => {
            const companyProjects = projects.filter(p => p.clientId === company.id);
            const activeProjectsCount = companyProjects.filter(p => p.status === 'activo').length;

            const companyTasks = tasks.filter(t => 
                t.classification.client?.toLowerCase() === company.name.toLowerCase() && 
                t.statusTime.status !== TaskStatus.COMPLETED &&
                t.statusTime.status !== TaskStatus.CANCELED
            );

            return (
            <div key={company.id} className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm hover:shadow-md transition-all relative group flex flex-col">
               <div className="absolute top-4 right-4 flex gap-1 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={(e) => handleEditCompanyClick(company, e)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                >
                    <Pencil className="w-5 h-5" />
                </button>
                <button 
                    onClick={(e) => confirmDelete('company', company, e)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 shadow-sm flex-shrink-0">
                    {company.logoUrl && company.logoUrl !== 'NULL' ? (
                      <img src={company.logoUrl} alt={company.name} className="w-8 h-8 md:w-10 md:h-10 object-contain" />
                    ) : (
                      <Building2 className="w-6 h-6 md:w-8 md:h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 text-xl md:text-2xl leading-tight truncate">{company.name}</h3>
                     <div className="flex items-center gap-1.5 mt-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${company.active ? 'bg-emerald-500' : 'bg-red-400'}`} />
                        <span className="text-sm text-slate-500 font-semibold">{company.active ? 'Activa' : 'Inactiva'}</span>
                      </div>
                  </div>
              </div>

              {/* Website Link (Soft Style) */}
              {company.website && (
                  <a 
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-blue-600 transition-colors mb-4 pl-1"
                  >
                      <Globe className="w-4 h-4" />
                      <span className="truncate">{company.website.replace(/^https?:\/\//, '').replace(/^www\./, '')}</span>
                  </a>
              )}

              {company.notes && (
                <p className="text-base md:text-lg text-slate-600 mb-6 line-clamp-3">
                  {company.notes}
                </p>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 mt-auto">
                 <div className="flex flex-col">
                    <span className="text-xs uppercase text-slate-400 font-bold mb-1">Proyectos</span>
                    <div className="flex items-center gap-2 text-slate-700">
                        <FolderKanban className="w-6 h-6 text-blue-500" />
                        <span className="font-bold text-xl">{activeProjectsCount}</span>
                        <span className="text-base text-slate-400 font-medium">/ {companyProjects.length}</span>
                    </div>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-xs uppercase text-slate-400 font-bold mb-1">Tareas Activas</span>
                     <div className="flex items-center gap-2 text-slate-700">
                        <CheckSquare className="w-6 h-6 text-emerald-500" />
                        <span className="font-bold text-xl">{companyTasks.length}</span>
                    </div>
                 </div>
              </div>
              
              <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-slate-50">
                   {company.repositoryUrl && (
                      <a 
                        href={company.repositoryUrl.startsWith('http') ? company.repositoryUrl : `https://${company.repositoryUrl}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 text-sm font-bold rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors flex-grow md:flex-grow-0 justify-center"
                        title="Repositorio"
                      >
                          <FolderOpen className="w-5 h-5" />
                          <span className="inline">Repo</span>
                      </a>
                   )}
                   {company.workUrl && (
                      <a 
                        href={company.workUrl.startsWith('http') ? company.workUrl : `https://${company.workUrl}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-700 text-sm font-bold rounded-lg border border-pink-100 hover:bg-pink-100 transition-colors flex-grow md:flex-grow-0 justify-center"
                        title="Work / Link"
                      >
                          <ExternalLink className="w-5 h-5" />
                          <span className="inline">Work</span>
                      </a>
                   )}
              </div>
            </div>
            );
          })
        )}

        {activeTab === 'projects' && (
           projectViewMode === 'tree' ? (
               projects.map(project => renderProjectTree(project))
           ) : (
               projects.map(project => (
                <div key={project.id} className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm hover:shadow-md transition-all relative group flex flex-col h-full">
                   <div className="absolute top-4 right-4 flex gap-1 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => handleEditProjectClick(project, e)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                    >
                        <Pencil className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={(e) => confirmDelete('project', project, e)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mb-6">
                     <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-bold text-slate-800 text-xl md:text-2xl">{project.name}</h3>
                        <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${
                            project.status === 'activo' ? 'bg-green-100 text-green-700' :
                            project.status === 'completado' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-500'
                        }`}>
                            {project.status}
                        </span>
                     </div>
                     {project.clientName && (
                         <div className="flex items-center gap-2 text-base text-slate-500 font-medium">
                            <Building2 className="w-5 h-5" />
                            {project.clientName}
                         </div>
                     )}
                  </div>
                  
                  <div className="flex-grow">
                    <p className="text-base md:text-lg text-slate-600 line-clamp-4 mb-6 leading-relaxed font-normal">
                      {project.description || <span className="italic text-slate-400">Sin descripción</span>}
                    </p>
                  </div>

                  {/* Resource Links in Card */}
                  <div className="flex gap-3 mb-6 flex-wrap">
                        {project.repositoryUrl && (
                             <a 
                                href={project.repositoryUrl.startsWith('http') ? project.repositoryUrl : `https://${project.repositoryUrl}`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-blue-50 hover:text-blue-600 transition-colors flex-grow justify-center"
                             >
                                 <FolderOpen className="w-5 h-5" /> Drive
                             </a>
                        )}
                        {project.workUrl && (
                             <a 
                                href={project.workUrl.startsWith('http') ? project.workUrl : `https://${project.workUrl}`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-pink-50 hover:text-pink-600 transition-colors flex-grow justify-center"
                             >
                                 <ExternalLink className="w-5 h-5" /> Link
                             </a>
                        )}
                  </div>

                  <div className="border-t border-slate-100 pt-5 mt-auto flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm text-slate-400 font-medium gap-2">
                      <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Sin inicio'}
                      </div>
                      {project.endDate && (
                          <span>Fin: {new Date(project.endDate).toLocaleDateString()}</span>
                      )}
                  </div>
                </div>
               ))
           )
        )}
      </div>

      {/* EDIT/CREATE USER MODAL */}
      {editingUser && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all my-auto">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0">
              <h3 className="font-bold text-xl text-slate-800">
                  {isCreating ? 'Nuevo Usuario' : 'Editar Usuario'}
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 md:p-8 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nombre</label>
                <input 
                  type="text" 
                  value={editingUser.name} 
                  onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-slate-900 text-base"
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-2">
                    <Lock className="w-3 h-3" /> Clave / Password
                </label>
                <input 
                  type="password" 
                  value={editingUser.password || ''} 
                  onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                  placeholder={isCreating ? "Ingrese clave" : "Dejar en blanco para mantener actual"}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-slate-900 text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-2">
                    <LinkIcon className="w-3 h-3" /> URL del Avatar
                </label>
                <input 
                  type="text" 
                  value={editingUser.avatar || ''} 
                  onChange={e => setEditingUser({...editingUser, avatar: e.target.value})}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-slate-900 text-sm"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Empresa Principal</label>
                    <select 
                        value={editingUser.companyId || ''} 
                        onChange={e => setEditingUser({...editingUser, companyId: e.target.value ? Number(e.target.value) : null})}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 text-sm"
                    >
                        <option value="">Sin Empresa</option>
                        {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Rol en Sistema</label>
                    <select 
                        value={editingUser.role} 
                        onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 text-sm"
                    >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="colaborador">Colaborador</option>
                        <option value="cliente">Cliente</option>
                    </select>
                  </div>
              </div>
              
               <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Email</label>
                <input 
                  type="email" 
                  value={editingUser.email} 
                  onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-slate-900 text-base"
                />
              </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Puesto / Cargo</label>
                    <input 
                        type="text" 
                        value={editingUser.jobTitle || ''} 
                        onChange={e => setEditingUser({...editingUser, jobTitle: e.target.value})}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-slate-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Horas Diarias</label>
                    <input 
                        type="number"
                        step="0.5" 
                        value={editingUser.dailyHours || 8} 
                        onChange={e => setEditingUser({...editingUser, dailyHours: parseFloat(e.target.value)})}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-slate-900 text-sm"
                    />
                  </div>
               </div>

              {/* VISIBILITY SELECTOR */}
              <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between mb-2">
                       <label className="block text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                           <Eye size={12} /> Visibilidad de Equipo
                       </label>
                       <button 
                         type="button" 
                         onClick={() => setShowVisibilitySelector(!showVisibilitySelector)}
                         className="text-blue-600 text-xs font-bold hover:underline"
                       >
                           {showVisibilitySelector ? 'Ocultar' : 'Gestionar'}
                       </button>
                  </div>
                  
                  {showVisibilitySelector && (
                      <div className="bg-slate-50 rounded-lg p-3 max-h-40 overflow-y-auto border border-slate-200 animate-in slide-in-from-top-1">
                          <p className="text-[10px] text-slate-400 mb-2">Selecciona los usuarios que {editingUser.name || 'este usuario'} puede ver y asignar tareas.</p>
                          {users.filter(u => u.id !== editingUser.id).map(u => (
                              <label key={u.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer transition-colors">
                                  <input 
                                    type="checkbox"
                                    checked={(editingUser.visibleUserIds || []).includes(u.id)}
                                    onChange={() => toggleVisibleUser(u.id)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                  />
                                  <span className="text-sm text-slate-700">{u.name}</span>
                              </label>
                          ))}
                          {users.length <= 1 && <div className="text-xs text-slate-400 italic">No hay otros usuarios disponibles.</div>}
                      </div>
                  )}
                  <div className="text-left text-[10px] text-slate-400 mt-1">
                      {(editingUser.visibleUserIds || []).length} usuarios visibles.
                  </div>
              </div>

              <div className="pt-6 flex flex-col sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setEditingUser(null)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-bold text-sm transition-colors text-center">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {isCreating ? 'Crear Usuario' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT/CREATE COMPANY MODAL */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all my-auto">
             <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0">
              <h3 className="font-bold text-xl text-slate-800">
                  {isCreating ? 'Nueva Empresa' : 'Editar Empresa'}
              </h3>
              <button onClick={() => setEditingCompany(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSaveCompany} className="p-6 md:p-8 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nombre Empresa</label>
                <input 
                  type="text" 
                  value={editingCompany.name} 
                  onChange={e => setEditingCompany({...editingCompany, name: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-slate-900 text-base"
                  required
                />
              </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-2"><Mail className="w-3 h-3"/> Email</label>
                    <input 
                        type="email" 
                        value={editingCompany.email || ''} 
                        onChange={e => setEditingCompany({...editingCompany, email: e.target.value})}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-slate-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-2"><Phone className="w-3 h-3"/> Teléfono</label>
                    <input 
                        type="text" 
                        value={editingCompany.phone || ''} 
                        onChange={e => setEditingCompany({...editingCompany, phone: e.target.value})}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-slate-900 text-sm"
                    />
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                   <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-2"><Globe className="w-3 h-3"/> Website</label>
                     <input 
                        type="text" 
                        value={editingCompany.website || ''} 
                        onChange={e => setEditingCompany({...editingCompany, website: e.target.value})}
                        placeholder="https://..."
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-slate-900 text-sm"
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-2"><ExternalLink className="w-3 h-3"/> Work / Link</label>
                     <input 
                        type="text" 
                        value={editingCompany.workUrl || ''} 
                        onChange={e => setEditingCompany({...editingCompany, workUrl: e.target.value})}
                        placeholder="External Link"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-slate-900 text-sm"
                     />
                   </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-2"><FolderOpen className="w-3 h-3"/> Repositorio General</label>
                    <input 
                        type="text" 
                        value={editingCompany.repositoryUrl || ''} 
                        onChange={e => setEditingCompany({...editingCompany, repositoryUrl: e.target.value})}
                        placeholder="Repo URL"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-slate-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-2"><FolderOpen className="w-3 h-3"/> Drive / Archivos</label>
                    <input 
                        type="text" 
                        value={editingCompany.driveUrl || ''} 
                        onChange={e => setEditingCompany({...editingCompany, driveUrl: e.target.value})}
                        placeholder="Drive URL"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-slate-900 text-sm"
                    />
                  </div>
               </div>

               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-2"><LinkIcon className="w-3 h-3"/> Logo URL</label>
                 <input 
                    type="text" 
                    value={editingCompany.logoUrl || ''} 
                    onChange={e => setEditingCompany({...editingCompany, logoUrl: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-slate-900 text-sm"
                 />
               </div>
               
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Notas</label>
                  <textarea 
                    value={editingCompany.notes || ''} 
                    onChange={e => setEditingCompany({...editingCompany, notes: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-slate-900 text-sm resize-none h-20"
                  />
               </div>

               <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={editingCompany.active} 
                    onChange={e => setEditingCompany({...editingCompany, active: e.target.checked})}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                  />
                  <span className="text-sm font-bold text-slate-700">Empresa Activa</span>
               </label>

              <div className="pt-6 flex flex-col sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setEditingCompany(null)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-bold text-sm transition-colors text-center">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {isCreating ? 'Crear Empresa' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all my-auto">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0">
                    <h3 className="font-bold text-xl text-slate-800">
                        {isCreating ? 'Nuevo Proyecto' : 'Editar Proyecto'}
                    </h3>
                    <button onClick={() => setEditingProject(null)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSaveProject} className="p-6 md:p-8 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nombre del Proyecto</label>
                        <input 
                            type="text" 
                            value={editingProject.name} 
                            onChange={e => setEditingProject({...editingProject, name: e.target.value})}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-slate-900 text-base"
                            required
                        />
                    </div>
                    {/* ... (Other project fields) ... */}
                    <div className="pt-6 flex flex-col sm:flex-row justify-end gap-3">
                        <button type="button" onClick={() => setEditingProject(null)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-bold text-sm transition-colors text-center">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {isCreating ? 'Crear Proyecto' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-8 transform scale-100 transition-all">
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-5 mx-auto">
                    <AlertCircle className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-center text-slate-900 mb-3">
                    ¿Eliminar {deleteConfirmation.type === 'user' ? 'Usuario' : deleteConfirmation.type === 'company' ? 'Empresa' : 'Proyecto'}?
                </h3>
                <p className="text-base text-slate-500 text-center mb-8">
                    Estás a punto de eliminar a <span className="font-bold text-slate-800">{deleteConfirmation.name}</span>. 
                    <br/>
                    Si tiene elementos asociados, no se podrá eliminar.
                </p>
                <div className="flex gap-4">
                    <button 
                        onClick={() => setDeleteConfirmation(null)}
                        disabled={isDeleting}
                        className="flex-1 px-5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleExecuteDelete}
                        disabled={isDeleting}
                        className="flex-1 px-5 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors shadow-sm shadow-red-200 flex items-center justify-center gap-2"
                    >
                         {isDeleting && <Loader2 className="w-5 h-5 animate-spin" />}
                        {isDeleting ? 'Eliminando...' : 'Eliminar'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};