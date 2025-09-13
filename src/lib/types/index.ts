// Import database types first
import type { Project, Task, Document, Vendor, Event, Association, Category } from './database.types'

// Re-export database types
export * from './database.types'
export type { Project, Task, Document, Vendor, Event, Association, Category } from './database.types'

// Additional app-specific types

export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  company?: string
  created_at: string
}

export interface ProjectWithRelations extends Project {
  association?: Association
  customer?: { id: string; name: string; contact_email?: string; contact_phone?: string }
  tasks_count?: number
  documents_count?: number
  folders?: { [key: string]: any[] }
}

export interface TaskWithRelations extends Task {
  project?: Project
  assignee?: User
  category?: Category
}

export interface DocumentWithRelations extends Document {
  project?: Project
  vendor?: Vendor
  category?: Category
  created_by_user?: User
}

export interface VendorWithRelations extends Vendor {
  category?: Category
  documents?: Document[]
  rating_count?: number
}

export interface EventWithRelations extends Event {
  project?: Project
  category?: Category
  created_by_user?: User
}

// Filter types
export interface ProjectFilters {
  status?: Project['status']
  association_id?: string
  search?: string
  start_date?: string
  end_date?: string
}

export interface TaskFilters {
  status?: Task['status']
  priority?: Task['priority']
  project_id?: string
  assignee_id?: string
  category_id?: string
  search?: string
  due_date_from?: string
  due_date_to?: string
}

export interface DocumentFilters {
  category_id?: string
  project_id?: string
  vendor_id?: string
  search?: string
  expiring_soon?: boolean
  expired?: boolean
}

export interface VendorFilters {
  category_id?: string
  status?: Vendor['status']
  search?: string
  min_rating?: number
}

// Form types
export interface ProjectFormData {
  name: string
  description?: string
  status: Project['status']
  budget?: number
  start_date?: string
  end_date?: string
  association_id?: string
}

export interface TaskFormData {
  title: string
  description?: string
  status: Task['status']
  priority: Task['priority']
  due_date?: string
  assignee_id?: string
  project_id?: string
  category_id?: string
}

export interface VendorFormData {
  name: string
  description?: string
  category_id?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  address?: string
  status: Vendor['status']
}

// Dashboard types
export interface DashboardStats {
  projects: {
    total: number
    by_status: Record<Project['status'], number>
  }
  tasks: {
    total: number
    overdue: number
    due_this_week: number
    by_status: Record<Task['status'], number>
    by_priority: Record<Task['priority'], number>
  }
  documents: {
    total: number
    expiring_soon: number
    expired: number
  }
  vendors: {
    total: number
    active: number
  }
}

// Pagination
export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface ApiError {
  message: string
  code?: string
  details?: any
}