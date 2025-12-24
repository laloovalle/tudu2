
import { Task, TaskPriority, TaskStatus, BillingStatus, User, Company, TaskNote, Project, TaskAttachment } from '../types';

const API_BASE_URL = 'https://tareas.estudioovalle.com.ar/api.php';
const UPLOADS_BASE_URL = 'https://tareas.estudioovalle.com.ar/uploads/';
const API_KEY = 'Laluscura2025_SecretKey_v1';

// Helper to construct URL with Auth Key and specific Resource
const getUrl = (params: Record<string, string | number> = {}) => {
  const url = new URL(API_BASE_URL);
  
  // Cache busting
  url.searchParams.append('_', new Date().getTime().toString());
  
  url.searchParams.append('key', API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });
  return url.toString();
};

interface ApiTask {
  id: number;
  title: string;
  description: string;
  priority: number; // 1-5
  status: string; // "pendiente", "en_curso", etc.
  due_date: string | null; // YYYY-MM-DD
  hours_estimated: number;
  hours_used: number;
  billing_status: string; // "a_facturar", etc.
  company_id?: number | null;
  company_name_resolved?: string;
  project_id?: number | null;
  project_name_resolved?: string;
  task_type_name_resolved?: string; // Mapped to area
  owner_name_resolved?: string;
  owner_id?: number;
  // Creator info resolved by backend join
  creator_name_resolved?: string; 
  created_by?: number; // Added to map raw ID
  supervisor_name_resolved?: string;
  supervisor_id?: number | null;
  collaborators_names?: string; // "Juan||Maria"
  collaborators_ids?: string; // "2,5"
  notes_count?: number;
  order_index?: number;
  parent_id?: number | null;
  parent_title_resolved?: string;
  repository_url?: string;
  work_url?: string;
  created_at?: string;
  updated_at?: string;
}

interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string;
  avatar: string;
  company_id?: string | number | null;
  company_name?: string;
  daily_hours?: string | number;
  job_title?: string;
  visible_user_ids?: string | null; // Can be string, null or undefined
}

interface ApiCompany {
  id: number;
  name: string;
  logo_url: string;
  notes: string;
  active: number;
  drive_url?: string;
  repository_url?: string;
  work_url?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
}

interface ApiProject {
  id: number;
  name: string;
  description: string;
  client_id: number | null;
  client_name_resolved?: string;
  status: 'activo' | 'completado' | 'archivado';
  start_date: string | null;
  end_date: string | null;
  repository_url?: string;
  work_url?: string;
}

interface ApiNote {
  id: number;
  task_id: number;
  user_id: number;
  user_name: string;
  user_avatar: string;
  content: string;
  is_read: number;
  created_at: string;
}

interface ApiAttachment {
  id: number;
  task_id: number;
  user_id: number;
  uploader_name?: string;
  filename_original: string;
  filename_server: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  count?: number;
  id?: number; // For create responses
  details?: any; // For error details (e.g. Mandrill response)
}

// Helpers to map Status strings
const mapApiStatusToEnum = (status: string): TaskStatus => {
  const map: Record<string, TaskStatus> = {
    'pendiente': TaskStatus.PENDING,
    'en_curso': TaskStatus.IN_PROGRESS,
    'por_hacer': TaskStatus.TO_DO,
    'completada': TaskStatus.COMPLETED,
    'cancelada': TaskStatus.CANCELED
  };
  return map[status.toLowerCase()] || TaskStatus.PENDING;
};

const mapEnumStatusToApi = (status: TaskStatus): string => {
  const map: Record<string, string> = {
    [TaskStatus.PENDING]: 'pendiente',
    [TaskStatus.IN_PROGRESS]: 'en_curso',
    [TaskStatus.TO_DO]: 'por_hacer',
    [TaskStatus.COMPLETED]: 'completada',
    [TaskStatus.CANCELED]: 'cancelada'
  };
  return map[status] || 'pendiente';
};

// Helpers to map Billing strings
const mapApiBillingToEnum = (status: string): BillingStatus => {
  const map: Record<string, BillingStatus> = {
    'a_definir': BillingStatus.TBD,
    'a_facturar': BillingStatus.TO_BILL,
    'facturado': BillingStatus.BILLED,
    'no_se_factura': BillingStatus.NO_BILL
  };
  return map[status.toLowerCase()] || BillingStatus.TBD;
};

const mapEnumBillingToApi = (status: BillingStatus): string => {
  const map: Record<string, string> = {
    [BillingStatus.TBD]: 'a_definir',
    [BillingStatus.TO_BILL]: 'a_facturar',
    [BillingStatus.BILLED]: 'facturado',
    [BillingStatus.NO_BILL]: 'no_se_factura'
  };
  return map[status] || 'a_definir';
};

// Helper to parse visibility IDs safely
const parseVisibleUserIds = (raw: any): number[] => {
    if (!raw) return [];
    
    // If it comes as a string, clean it
    if (typeof raw === 'string') {
        const cleaned = raw.trim();
        if (cleaned === 'Array' || cleaned === '') return [];
        
        try {
            // Try JSON parse first (legacy support if stored as json)
            if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
                const parsed = JSON.parse(cleaned);
                if(Array.isArray(parsed)) return parsed.map(Number);
            }
            // Try comma separated (standard)
            return cleaned.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
        } catch (e) {
            console.warn("Error parsing visible_user_ids:", e);
            return [];
        }
    }
    
    // If it comes as an array already (some JSON parsers might do this)
    if (Array.isArray(raw)) {
        return raw.map(Number).filter(n => !isNaN(n) && n > 0);
    }

    return [];
};

// Map API Response -> Frontend Task
const mapApiToTask = (apiTask: ApiTask): Task => {
  const collaborators = apiTask.collaborators_names 
    ? String(apiTask.collaborators_names).split('||') 
    : [];

  return {
    id: Number(apiTask.id),
    title: apiTask.title,
    description: apiTask.description || '',
    classification: {
      client: apiTask.company_name_resolved || 'Sin Cliente',
      project: apiTask.project_name_resolved,
      projectId: apiTask.project_id ? Number(apiTask.project_id) : null,
      area: apiTask.task_type_name_resolved || 'General',
      priority: (Number(apiTask.priority) >= 1 && Number(apiTask.priority) <= 5) ? Number(apiTask.priority) as TaskPriority : TaskPriority.NORMAL,
    },
    people: {
      responsible: apiTask.owner_name_resolved || 'Sin asignar',
      collaborators: collaborators, 
      creator: apiTask.creator_name_resolved || 'Sistema',
      creatorId: apiTask.created_by ? Number(apiTask.created_by) : undefined,
      supervisor: apiTask.supervisor_name_resolved || undefined,
      supervisorId: apiTask.supervisor_id ? Number(apiTask.supervisor_id) : undefined,
    },
    resources: {
      repositoryUrl: apiTask.repository_url || undefined,
      workUrl: apiTask.work_url || undefined,
    },
    statusTime: {
      status: mapApiStatusToEnum(apiTask.status || 'pendiente'),
      dueDate: apiTask.due_date || undefined,
      estimatedHours: Number(apiTask.hours_estimated) || 0,
      usedHours: Number(apiTask.hours_used) || 0,
      billingStatus: mapApiBillingToEnum(apiTask.billing_status || 'a_definir'),
    },
    system: {
      orderIndex: Number(apiTask.order_index) || 0,
      parentId: apiTask.parent_id ? Number(apiTask.parent_id) : null,
      parentTitle: apiTask.parent_title_resolved,
      createdAt: apiTask.created_at || new Date().toISOString(),
      updatedAt: apiTask.updated_at || new Date().toISOString(),
    },
    notesCount: Number(apiTask.notes_count) || 0
  };
};

// Helper function to safely parse JSON response
const parseResponse = async <T>(response: Response, context: string): Promise<T> => {
    const text = await response.text();
    if (!text) {
        if (response.ok) return {} as T;
        throw new Error(`Empty response from server during ${context} (Status: ${response.status})`);
    }
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error(`Invalid JSON in ${context}:`, text);
        // Sometimes PHP fatal errors are returned as text
        if (response.status === 500) {
            throw new Error(`Server Error (500): ${text.substring(0, 150)}...`);
        }
        throw new Error(`Invalid JSON response from server during ${context}: ${text.substring(0, 50)}...`);
    }
};

export const login = async (email: string, password: string): Promise<User> => {
  try {
    const response = await fetch(getUrl({ resource: 'login' }), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") === -1) {
         const text = await response.text();
         throw new Error("Server returned non-JSON response: " + text.substring(0, 50));
    }

    const result = await parseResponse<ApiResponse<any>>(response, 'login');

    if (result.status === 'success' && result.data) {
       const u = result.data;
       return {
            id: Number(u.id),
            name: u.name,
            email: u.email,
            role: u.role,
            phone: u.phone,
            avatar: u.avatar,
            companyId: u.company_id ? Number(u.company_id) : null,
            companyName: u.company_name,
            dailyHours: u.daily_hours ? Number(u.daily_hours) : 8,
            jobTitle: u.job_title,
            visibleUserIds: parseVisibleUserIds(u.visible_user_ids)
       };
    }
    
    throw new Error(result.message || 'Credenciales inválidas');

  } catch (error: any) {
    console.warn("Login API failed:", error.message);
    
    const isResourceError = error.message && (
        error.message.includes('Invalid resource') || 
        error.message.includes('non-JSON') ||
        error.message.includes('404')
    );

    if (isResourceError) {
        console.log("Attempting client-side login fallback...");
        try {
            const users = await fetchUsers();
            const normalizedEmail = email.toLowerCase().trim();
            const user = users.find(u => u.email.toLowerCase() === normalizedEmail);
            
            if (user) {
                return user;
            } else {
                throw new Error("Usuario no encontrado");
            }
        } catch (fallbackErr: any) {
            console.error("Fallback failed", fallbackErr);
            if (fallbackErr.message === "Usuario no encontrado") {
                throw fallbackErr;
            }
        }
    }

    throw error;
  }
};

export const fetchTasks = async (): Promise<Task[]> => {
  try {
    const response = await fetch(getUrl({ resource: 'tasks' }), {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const result = await parseResponse<ApiResponse<ApiTask[]>>(response, 'fetchTasks');
    
    if (result.status === 'success' && Array.isArray(result.data)) {
      return result.data.map(mapApiToTask);
    } 
    return [];
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    throw error;
  }
};

export const fetchUsers = async (): Promise<User[]> => {
  try {
    const response = await fetch(getUrl({ resource: 'users' }), { method: 'GET', cache: 'no-store' });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    
    const result = await parseResponse<ApiResponse<ApiUser[]>>(response, 'fetchUsers');
    if (result.status === 'success' && Array.isArray(result.data)) {
      return result.data.map(u => ({
        id: Number(u.id),
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone,
        avatar: u.avatar,
        companyId: u.company_id ? Number(u.company_id) : null,
        companyName: u.company_name,
        dailyHours: u.daily_hours ? Number(u.daily_hours) : 8,
        jobTitle: u.job_title,
        visibleUserIds: parseVisibleUserIds(u.visible_user_ids)
      }));
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch users:", error);
    throw error;
  }
};

export const fetchCompanies = async (): Promise<Company[]> => {
  try {
    const response = await fetch(getUrl({ resource: 'companies' }), { method: 'GET', cache: 'no-store' });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const result = await parseResponse<ApiResponse<ApiCompany[]>>(response, 'fetchCompanies');
    if (result.status === 'success' && Array.isArray(result.data)) {
      return result.data.map(c => ({
        id: Number(c.id),
        name: c.name,
        logoUrl: c.logo_url === 'NULL' ? undefined : c.logo_url,
        notes: c.notes,
        active: Boolean(c.active),
        driveUrl: c.drive_url === 'NULL' ? undefined : c.drive_url,
        repositoryUrl: c.repository_url === 'NULL' ? undefined : c.repository_url,
        workUrl: c.work_url === 'NULL' ? undefined : c.work_url,
        email: c.email || undefined,
        phone: c.phone || undefined,
        website: c.website || undefined,
        address: c.address || undefined
      }));
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch companies:", error);
    throw error;
  }
};

export const fetchProjects = async (): Promise<Project[]> => {
  try {
    const response = await fetch(getUrl({ resource: 'projects' }), { method: 'GET', cache: 'no-store' });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const result = await parseResponse<ApiResponse<ApiProject[]>>(response, 'fetchProjects');
    if (result.status === 'success' && Array.isArray(result.data)) {
      return result.data.map(p => ({
        id: Number(p.id),
        name: p.name,
        description: p.description,
        clientId: p.client_id ? Number(p.client_id) : null,
        clientName: p.client_name_resolved,
        status: p.status,
        startDate: p.start_date || undefined,
        endDate: p.end_date || undefined,
        repositoryUrl: p.repository_url || undefined,
        workUrl: p.work_url || undefined
      }));
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    throw error;
  }
};

export const createCompany = async (company: Partial<Company> | string): Promise<Company> => {
  try {
    let payload: any;
    
    // Support legacy call with string name, or full object
    if (typeof company === 'string') {
        payload = {
            name: company,
            active: 1,
            notes: 'Creada automáticamente por el asistente.',
            drive_url: '',
            repository_url: '',
            work_url: ''
        };
    } else {
        payload = {
            name: company.name,
            notes: company.notes || '',
            active: company.active ? 1 : 0,
            logo_url: company.logoUrl || '',
            drive_url: company.driveUrl || '',
            repository_url: company.repositoryUrl || '',
            work_url: company.workUrl || '',
            email: company.email || '',
            phone: company.phone || '',
            website: company.website || '',
            address: company.address || ''
        };
    }

    const response = await fetch(getUrl({ resource: 'companies' }), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await parseResponse<ApiResponse<null>>(response, 'createCompany');

    if (!response.ok || result.status === 'error') {
        throw new Error(`API Create Company Error: ${result.message}`);
    }

    return {
      id: Number(result.id),
      name: typeof company === 'string' ? company : company.name!,
      active: true
    };
  } catch (error) {
    console.error("Failed to create company:", error);
    throw error;
  }
};

export const updateCompany = async (company: Company): Promise<boolean> => {
  try {
    const payload = {
      id: company.id,
      name: company.name,
      notes: company.notes || '',
      active: company.active ? 1 : 0,
      logo_url: company.logoUrl || '',
      drive_url: company.driveUrl || '',
      repository_url: company.repositoryUrl || '',
      work_url: company.workUrl || '',
      email: company.email || '',
      phone: company.phone || '',
      website: company.website || '',
      address: company.address || ''
    };

    const response = await fetch(getUrl({ resource: 'companies' }), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await parseResponse<ApiResponse<null>>(response, 'updateCompany');

    if (!response.ok || result.status === 'error') {
      throw new Error(`API Update Error: ${result.message}`);
    }
    return true;
  } catch (error) {
    console.error("Failed to update company:", error);
    throw error;
  }
};

export const createUser = async (userOrName: string | Partial<User>): Promise<User> => {
  try {
    const isString = typeof userOrName === 'string';
    const name = isString ? userOrName : (userOrName.name || 'Sin Nombre');
    
    // Default email generation to avoid 500 if DB requires unique email
    const email = isString 
        ? `${name.toLowerCase().replace(/\s+/g, '.')}@temp.local` 
        : (userOrName.email || `${name.toLowerCase().replace(/\s+/g, '.')}@temp.local`);
        
    const role = isString ? 'colaborador' : (userOrName.role || 'colaborador');
    const password = isString ? '123456' : (userOrName.password || '123456');

    const payload = {
      name,
      email,
      role,
      password,
      visible_user_ids: (!isString && userOrName.visibleUserIds) ? userOrName.visibleUserIds.join(',') : '',
      phone: (!isString && userOrName.phone) || '',
      avatar: (!isString && userOrName.avatar) || '',
      daily_hours: (!isString && userOrName.dailyHours) || 8,
      job_title: (!isString && userOrName.jobTitle) || '',
      company_id: (!isString && userOrName.companyId) || null
    };

    const response = await fetch(getUrl({ resource: 'users' }), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await parseResponse<ApiResponse<null>>(response, 'createUser');

    if (!response.ok || result.status === 'error') {
        throw new Error(`API Create User Error: ${result.message}`);
    }

    return {
      id: Number(result.id),
      name,
      email,
      role,
      visibleUserIds: (!isString && userOrName.visibleUserIds) || []
    };
  } catch (error) {
    console.error("Failed to create user:", error);
    throw error;
  }
};

export const updateUser = async (user: User): Promise<boolean> => {
  try {
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      avatar: user.avatar || '',
      company_id: user.companyId || null,
      // Fixed: Property 'daily_hours' does not exist on type 'User'. Correct property is 'dailyHours'.
      daily_hours: user.dailyHours || 8,
      job_title: user.jobTitle || '',
      password: user.password, // Include password (if set)
      visible_user_ids: (user.visibleUserIds || []).join(',') // Send the visibility list as string "1,2,3"
    };

    const response = await fetch(getUrl({ resource: 'users' }), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await parseResponse<ApiResponse<null>>(response, 'updateUser');

    if (!response.ok || result.status === 'error') {
      throw new Error(`API Update Error: ${result.message}`);
    }
    return true;
  } catch (error) {
    console.error("Failed to update user:", error);
    throw error;
  }
};

export const updateProject = async (project: Project): Promise<boolean> => {
  try {
    const payload = {
      id: project.id,
      name: project.name,
      description: project.description || '',
      client_id: project.clientId || null,
      status: project.status,
      start_date: project.startDate || null,
      end_date: project.endDate || null,
      repository_url: project.repositoryUrl || null,
      work_url: project.workUrl || null
    };

    const response = await fetch(getUrl({ resource: 'projects' }), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await parseResponse<ApiResponse<null>>(response, 'updateProject');

    if (!response.ok || result.status === 'error') {
      throw new Error(`API Update Error: ${result.message}`);
    }
    return true;
  } catch (error) {
    console.error("Failed to update project:", error);
    throw error;
  }
};

export const createProject = async (project: Partial<Project>): Promise<boolean> => {
  try {
    const payload = {
      name: project.name,
      description: project.description || '',
      client_id: project.clientId || null,
      status: project.status || 'activo',
      start_date: project.startDate || null,
      end_date: project.endDate || null,
      repository_url: project.repositoryUrl || null,
      work_url: project.workUrl || null
    };

    const response = await fetch(getUrl({ resource: 'projects' }), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await parseResponse<ApiResponse<null>>(response, 'createProject');

    if (!response.ok || result.status === 'error') {
      throw new Error(`API Create Project Error: ${result.message}`);
    }
    return true;
  } catch (error) {
    console.error("Failed to create project:", error);
    throw error;
  }
};

export const deleteUser = async (id: number): Promise<boolean> => {
  try {
    const response = await fetch(getUrl({ resource: 'users', id }), { method: 'DELETE' });
    const result = await parseResponse<ApiResponse<null>>(response, 'deleteUser');
    if (!response.ok || result.status === 'error') throw new Error(result.message);
    return true;
  } catch (error) {
    console.error("Failed to delete user", error);
    throw error;
  }
};

export const deleteCompany = async (id: number): Promise<boolean> => {
  try {
    const response = await fetch(getUrl({ resource: 'companies', id }), { method: 'DELETE' });
    const result = await parseResponse<ApiResponse<null>>(response, 'deleteCompany');
    if (!response.ok || result.status === 'error') throw new Error(result.message);
    return true;
  } catch (error) {
    console.error("Failed to delete company", error);
    throw error;
  }
};

export const deleteProject = async (id: number): Promise<boolean> => {
  try {
    const response = await fetch(getUrl({ resource: 'projects', id }), { method: 'DELETE' });
    const result = await parseResponse<ApiResponse<null>>(response, 'deleteProject');
    if (!response.ok || result.status === 'error') throw new Error(result.message);
    return true;
  } catch (error) {
    console.error("Failed to delete project", error);
    throw error;
  }
};

export const fetchTaskNotes = async (taskId: number): Promise<TaskNote[]> => {
  try {
    const response = await fetch(getUrl({ resource: 'notes', task_id: taskId }), {
      method: 'GET',
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    
    const result = await parseResponse<ApiResponse<ApiNote[]>>(response, 'fetchTaskNotes');
    
    if (result.status === 'success' && Array.isArray(result.data)) {
      return result.data.map((n: ApiNote) => ({
        id: Number(n.id),
        taskId: Number(n.task_id),
        userId: Number(n.user_id),
        userName: n.user_name,
        userAvatar: n.user_avatar,
        content: n.content,
        isRead: Boolean(n.is_read),
        createdAt: n.created_at
      }));
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch notes:", error);
    return [];
  }
};

export const createTaskNote = async (taskId: number, content: string, userId: number = 1): Promise<boolean> => {
  try {
    const payload = { task_id: taskId, content, user_id: userId };
    const response = await fetch(getUrl({ resource: 'notes' }), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await parseResponse<ApiResponse<null>>(response, 'createTaskNote');

    if (!response.ok || result.status === 'error') throw new Error(result.message);
    
    return true; 
  } catch (error) {
    console.error("Failed to create note:", error);
    throw error;
  }
};

export const updateTaskNote = async (id: number, content: string): Promise<boolean> => {
  try {
    const payload = { id, content };
    const response = await fetch(getUrl({ resource: 'notes' }), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await parseResponse<ApiResponse<null>>(response, 'updateTaskNote');

    if (!response.ok || result.status === 'error') throw new Error(result.message);
    return true;
  } catch (error) {
    console.error("Failed to update note:", error);
    throw error;
  }
};

export const deleteTaskNote = async (id: number): Promise<boolean> => {
  try {
    const response = await fetch(getUrl({ resource: 'notes', id }), { method: 'DELETE' });
    const result = await parseResponse<ApiResponse<null>>(response, 'deleteTaskNote');
    if (!response.ok || result.status === 'error') throw new Error(result.message);
    return true;
  } catch (error) {
    console.error("Failed to delete note:", error);
    throw error;
  }
};

// --- FILE UPLOAD METHODS ---

export const fetchTaskAttachments = async (taskId: number): Promise<TaskAttachment[]> => {
  try {
    const response = await fetch(getUrl({ resource: 'files', task_id: taskId }), { // Changed from 'attachments' to 'files'
      method: 'GET',
      cache: 'no-store'
    });
    
    if (!response.ok) return [];

    const result = await parseResponse<ApiResponse<ApiAttachment[]>>(response, 'fetchTaskAttachments');
    
    if (result.status === 'success' && Array.isArray(result.data)) {
        return result.data.map(a => ({
            id: Number(a.id),
            taskId: Number(a.task_id),
            userId: Number(a.user_id),
            userName: a.uploader_name || 'Desconocido', // Map from uploader_name
            fileName: a.filename_original, // Map from filename_original
            filePath: UPLOADS_BASE_URL + a.filename_server, // Construct full URL
            fileSize: Number(a.file_size),
            fileType: a.file_type,
            createdAt: a.created_at
        }));
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch attachments:", error);
    return [];
  }
};

export const uploadTaskAttachment = async (taskId: number, file: File, userId: number): Promise<boolean> => {
  try {
    const formData = new FormData();
    // Use getUrl to construct the correct URL with resource, key, and cache buster
    const url = getUrl({ resource: 'files' });
    
    formData.append('task_id', String(taskId));
    formData.append('user_id', String(userId));
    formData.append('file', file);

    const response = await fetch(url, {
        method: 'POST',
        body: formData 
    });

    const result = await parseResponse<ApiResponse<null>>(response, 'uploadTaskAttachment');
    
    if (!response.ok || result.status === 'error') {
        throw new Error(result.message || "Upload failed");
    }

    return true; 

  } catch (error) {
      console.error("Upload error:", error);
      throw error;
  }
};

export const deleteTaskAttachment = async (attachmentId: number): Promise<boolean> => {
    try {
        const response = await fetch(getUrl({ resource: 'files', id: attachmentId }), { // Changed to 'files'
            method: 'DELETE'
        });
        const result = await parseResponse<ApiResponse<null>>(response, 'deleteTaskAttachment');
        if (!response.ok || result.status === 'error') throw new Error(result.message);
        return true;
    } catch (error) {
        console.error("Delete attachment error:", error);
        throw error;
    }
};

// Updated signature to return the created task object
export const createTask = async (task: Partial<Task>, companyId: number | null = null, ownerId: number | null = 1, collaboratorIds: number[] = [], creatorId: number = 1, supervisorId: number | null = null): Promise<Task | null> => {
  try {
    const payload = {
      title: task.title,
      description: task.description,
      priority: task.classification?.priority || 3,
      status: mapEnumStatusToApi(task.statusTime?.status || TaskStatus.PENDING),
      due_date: task.statusTime?.dueDate ? String(task.statusTime.dueDate).split('T')[0] : null,
      hours_estimated: task.statusTime?.estimatedHours || 0,
      hours_used: task.statusTime?.usedHours || 0,
      billing_status: mapEnumBillingToApi(task.statusTime?.billingStatus || BillingStatus.TBD),
      
      owner_id: ownerId, 
      created_by: creatorId, 
      supervisor_id: supervisorId,
      company_id: companyId,
      project_id: task.classification?.projectId || null,
      task_type_id: 1,
      collaborators_ids: collaboratorIds,
      order_index: task.system?.orderIndex || 0,
      parent_id: task.system?.parentId || null,
      repository_url: task.resources?.repositoryUrl || null,
      work_url: task.resources?.workUrl || null
    };

    const response = await fetch(getUrl({ resource: 'tasks' }), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await parseResponse<ApiResponse<ApiTask>>(response, 'createTask');

    if (!response.ok || result.status === 'error') {
        throw new Error(`API Create Error: ${result.message}`);
    }

    // Attempt to map the returned data or at least the ID
    if (result.data) {
        return mapApiToTask(result.data);
    } else if (result.id) {
        // Construct basic task with returned ID
        return {
            ...task,
            id: Number(result.id),
            system: { ...task.system, createdAt: new Date().toISOString() }
        } as Task;
    }

    return null;
  } catch (error) {
    console.error("Failed to create task:", error);
    throw error;
  }
};

// Updated signature to include modifierId and supervisorId
export const updateTask = async (task: Task, companyId: number | null = null, ownerId: number | null = null, collaboratorIds: number[] = [], modifierId: number = 1, supervisorId: number | null = null): Promise<boolean> => {
  try {
    const payload = {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.classification.priority,
      status: mapEnumStatusToApi(task.statusTime.status),
      due_date: task.statusTime.dueDate ? String(task.statusTime.dueDate).split('T')[0] : null,
      hours_estimated: task.statusTime.estimatedHours,
      hours_used: task.statusTime.usedHours,
      billing_status: mapEnumBillingToApi(task.statusTime.billingStatus),
      company_id: companyId,
      owner_id: ownerId,
      collaborators_ids: collaboratorIds,
      supervisor_id: supervisorId, // <--- Added supervisor_id
      order_index: task.system.orderIndex,
      project_id: task.classification.projectId || null,
      parent_id: task.system.parentId || null,
      repository_url: task.resources?.repositoryUrl || null,
      work_url: task.resources?.workUrl || null,
      modified_by: modifierId 
    };

    console.log("Update Task Payload:", JSON.stringify(payload, null, 2));

    const response = await fetch(getUrl({ resource: 'tasks' }), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await parseResponse<ApiResponse<null>>(response, 'updateTask');

    if (!response.ok || result.status === 'error') {
      throw new Error(`API Update Error: ${result.message}`);
    }
    return true;
  } catch (error) {
    console.error("Failed to update task:", error);
    throw error;
  }
};

export const deleteTask = async (id: number): Promise<boolean> => {
  try {
      const response = await fetch(getUrl({ resource: 'tasks', id }), {
          method: 'DELETE',
      });
      const result = await parseResponse<ApiResponse<null>>(response, 'deleteTask');
      if (!response.ok || result.status === 'error') {
          throw new Error(`API Delete Error: ${result.message}`);
      }
      return true;
  } catch (error) {
      console.error("Failed to delete task:", error);
      throw error;
  }
};

// NEW FUNCTION: Send generic email via Backend (Mandrill)
export const sendRawEmail = async (toEmail: string, subject: string, htmlContent: string): Promise<boolean> => {
  try {
    const payload = {
      to: toEmail,
      subject: subject,
      html: htmlContent
    };
    
    // Calls api.php?resource=send_email
    const response = await fetch(getUrl({ resource: 'send_email' }), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await parseResponse<ApiResponse<null>>(response, 'sendRawEmail');
    if (!response.ok || result.status === 'error') {
        // Detailed logging of backend error (e.g. Mandrill specific error)
        if (result.details) {
            console.error("Backend Email Error Details:", result.details);
        }
        console.warn("Backend email send failed:", result.message);
        return false;
    }
    return true;
  } catch (error) {
    console.error("Failed to send backend email:", error);
    return false;
  }
};
