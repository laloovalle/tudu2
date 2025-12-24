

export enum TaskPriority {
  CRITICAL = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
  NONE = 5
}

export enum TaskStatus {
  PENDING = '01 en Carpeta',
  IN_PROGRESS = '03 En Progreso',
  TO_DO = '02 En Radar',
  COMPLETED = 'Completada',
  CANCELED = 'Suspendida'
}

export enum BillingStatus {
  TBD = 'A definir',
  TO_BILL = 'A facturar',
  BILLED = 'Facturado',
  NO_BILL = 'No se factura'
}

export interface TaskNote {
  id: number;
  taskId: number;
  userId: number;
  userName?: string;
  userAvatar?: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface TaskAttachment {
  id: number;
  taskId: number;
  userId: number;
  userName?: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  createdAt: string;
}

export interface Task {
  id: number;
  // Core Info
  title: string;
  description: string;
  classification: {
    client: string;
    project?: string;
    projectId?: number | null; // ID for DB relation
    area: string; // Design, Programming, Admin
    priority: TaskPriority;
  };
  people: {
    responsible: string;
    collaborators: string[]; // List of names
    creator: string;
    creatorId?: number; // Added to resolve name client-side if needed
    modifier?: string;
    supervisor?: string;
    supervisorId?: number | null;
  };
  resources: {
    repositoryUrl?: string; // Link to Drive/Repo
    workUrl?: string; // Link to Instagram, YouTube, Prod
  };
  statusTime: {
    status: TaskStatus;
    dueDate?: string; // ISO Date string
    estimatedHours?: number;
    usedHours?: number;
    billingStatus: BillingStatus;
  };
  system: {
    orderIndex: number;
    parentId?: number | null; // For subtasks
    parentTitle?: string; // To display parent name
    createdAt: string;
    updatedAt: string;
  };
  notesCount?: number;
  attachments?: TaskAttachment[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string; // New field for password input
  role: string;
  phone?: string;
  avatar?: string;
  // New Fields
  companyId?: number | null;
  companyName?: string;
  dailyHours?: number;
  jobTitle?: string;
  visibleUserIds?: number[]; // List of user IDs this user can see
}

export interface Company {
  id: number;
  name: string;
  logoUrl?: string;
  notes?: string;
  active: boolean;
  driveUrl?: string;
  repositoryUrl?: string; // New field
  workUrl?: string;       // New field
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  clientId?: number | null;
  clientName?: string;
  status: 'activo' | 'completado' | 'archivado';
  startDate?: string;
  endDate?: string;
  repositoryUrl?: string; // Drive / Folder
  workUrl?: string; // External Link
}

export type SortOption = 'priority_desc' | 'date_asc' | 'created_desc' | 'status';