// Common types used across the application
export type ProjectStatus = 'planning' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled' | 'new'

export interface Project {
  id: string
  name: string
  description?: string
  status: ProjectStatus
  client?: string
  address?: string
  budget?: number
  progress?: number
  dateAdded: Date
  projectedFinishDate?: Date
  start_date?: string
  end_date?: string
  team?: string[]
  // ... other project fields
}

export interface ProjectFormData {
  name: string
  description: string
  customer?: string
  street?: string
  city?: string
  state?: string
  zip?: string
  budget?: string | undefined
  start_date?: string
  end_date?: string
  projectedFinishDate?: Date | null
  team?: string
  status: ProjectStatus
  association_id?: string
}

export interface Contact {
  id: string
  name: string
  type: 'design_professional' | 'contractor' | 'vendor' | 'customer'
  email: string
  phone: string
  dateAdded: Date
  company?: string
  address?: string
  status: 'active' | 'inactive'
}

export interface ErrorLog {
  id: string
  error_type: string
  error_message: string
  error_stack?: string
  page_url: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  frequency_count: number
  resolved: boolean
  created_at: string
}

export interface PerformanceMetric {
  id: string
  page_url: string
  page_load_time: number
  created_at: string
}

export interface ProjectWithRelations extends Project {
  customer?: { id: string; name: string; contact_email?: string; contact_phone?: string }
  team_members?: any[]
  vendors?: any[]
  files?: any[]
  tasks?: any[]
  folders?: { [key: string]: any[] }
}

export interface Task {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in-progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  due_date?: Date
  assigned_to?: string[]
  project_id?: string
  created_at: Date
  tags?: string[]
  contact_tags?: ContactTag[]
  dependencies?: TaskDependency[]
}

export interface ContactTag {
  contact_id: string
  contact_type: 'vendor' | 'design_professional' | 'contractor' | 'customer'
  contact_name: string
}

export interface TaskDependency {
  id: string
  depends_on_task_id: string
  dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'
  lag_days?: number
  task_title?: string
}

export interface TaskSuggestion {
  id: string
  suggested_title: string
  suggested_description?: string
  suggested_priority?: 'low' | 'medium' | 'high'
  suggested_duration_days?: number
  suggested_tags?: string[]
  suggested_contact_tags?: ContactTag[]
  confidence_score: number
  suggestion_reason?: string
  construction_phase?: string
}