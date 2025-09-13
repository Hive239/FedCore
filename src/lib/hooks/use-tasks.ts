import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCallback, useRef, useState } from 'react'
import type { 
  Task
} from '@/lib/types'

// Define missing types locally
type TaskWithRelations = Task & {
  project?: any
  assignees?: any[]
  [key: string]: any
}

interface TaskFilters {
  status?: string
  priority?: string
  project_id?: string
  assignee_id?: string
  search?: string
  [key: string]: any
}

interface TaskFormData {
  title: string
  description?: string
  status?: string
  priority?: string
  due_date?: string
  project_id?: string
  assignee_id?: string
  [key: string]: any
}

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages?: number
}

interface DeletedTask {
  task: TaskWithRelations
  deletedAt: number
  timeoutId: NodeJS.Timeout
}

// Query keys
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: TaskFilters) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
}

// Fetch tasks with filters
async function fetchTasks(
  filters: TaskFilters & { page?: number; limit?: number }
): Promise<PaginatedResponse<TaskWithRelations>> {
  const supabase = createClient()
  
  // CRITICAL: Get current user's tenant for security
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()
  
  if (!userTenant) throw new Error('No tenant found for user')
  
  const { page = 1, limit = 50, ...otherFilters } = filters
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('tasks')
    .select(`
      *,
      project:projects(*),
      category:categories(*)
    `, { count: 'exact' })
    .eq('tenant_id', userTenant.tenant_id) // CRITICAL: Filter by tenant
    .range(from, to)
    .order('position', { ascending: true })

  if (otherFilters.status) {
    query = query.eq('status', otherFilters.status)
  }

  if (otherFilters.priority) {
    query = query.eq('priority', otherFilters.priority)
  }

  if (otherFilters.project_id) {
    query = query.eq('project_id', otherFilters.project_id)
  }

  if (otherFilters.assignee_id) {
    query = query.eq('assignee_id', otherFilters.assignee_id)
  }

  if (otherFilters.category_id) {
    query = query.eq('category_id', otherFilters.category_id)
  }

  if (otherFilters.search) {
    query = query.ilike('title', `%${otherFilters.search}%`)
  }

  if (otherFilters.due_date_from) {
    query = query.gte('due_date', otherFilters.due_date_from)
  }

  if (otherFilters.due_date_to) {
    query = query.lte('due_date', otherFilters.due_date_to)
  }

  const { data, error, count } = await query

  if (error) throw error

  return {
    data: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit)
  }
}

// Fetch single task
async function fetchTask(id: string): Promise<TaskWithRelations> {
  const supabase = createClient()
  
  // CRITICAL: Get current user's tenant for security
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()
  
  if (!userTenant) throw new Error('No tenant found for user')
  
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      project:projects(*),
      category:categories(*)
    `)
    .eq('id', id)
    .eq('tenant_id', userTenant.tenant_id) // CRITICAL: Filter by tenant
    .single()

  if (error) throw error
  return data
}

// Create task
async function createTask(data: TaskFormData): Promise<Task> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get user's tenant from user_tenants table
  let { data: userTenant } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()

  // If user doesn't have a tenant, create a default one
  if (!userTenant) {
    // Check if default tenant exists
    let { data: defaultTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('name', 'Default Organization')
      .single()

    // Create default tenant if it doesn't exist
    if (!defaultTenant) {
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: 'Default Organization',
          slug: 'default-org-' + Math.random().toString(36).substr(2, 9)
        })
        .select()
        .single()
      
      if (tenantError) {
        console.error('Tenant creation error:', tenantError)
        throw new Error(`Failed to create default tenant: ${tenantError.message}`)
      }
      defaultTenant = newTenant
    }

    // Assign user to the default tenant
    const { data: newUserTenant, error: assignError } = await supabase
      .from('user_tenants')
      .insert({
        user_id: user.id,
        tenant_id: defaultTenant.id,
        role: 'admin'
      })
      .select('tenant_id')
      .single()

    if (assignError) {
      console.error('User assignment error:', assignError)
      throw new Error(`Failed to assign user to tenant: ${assignError.message}`)
    }
    userTenant = newUserTenant
  }

  // Get the highest position for the status column
  const { data: existingTasks } = await supabase
    .from('tasks')
    .select('position')
    .eq('status', data.status || 'pending')
    .eq('tenant_id', userTenant.tenant_id)
    .order('position', { ascending: false })
    .limit(1)

  const position = existingTasks?.[0]?.position ? existingTasks[0].position + 1 : 0

  // Exclude fields that don't exist in the database table
  const { dependencies, ...taskData } = data

  // Convert empty string assignee_id to null for proper UUID handling
  const insertData = {
    ...taskData,
    assignee_id: taskData.assignee_id === '' ? null : taskData.assignee_id,
    position,
    created_by: user.id,
    tenant_id: userTenant.tenant_id
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Task creation error:', error)
    throw new Error(`Failed to create task: ${error.message}`)
  }

  // Handle task dependencies if provided
  if (dependencies && Array.isArray(dependencies) && dependencies.length > 0) {
    const dependencyInserts = dependencies.map(dep => ({
      tenant_id: userTenant.tenant_id,
      task_id: task.id,
      depends_on_task_id: dep.depends_on_task_id,
      dependency_type: dep.dependency_type || 'finish_to_start',
      lag_days: dep.lag_days || 0,
      created_by: user.id
    }))

    const { error: depError } = await supabase
      .from('task_dependencies')
      .insert(dependencyInserts)

    if (depError) {
      console.error('Failed to create task dependencies:', depError)
      // Don't throw here - task was created successfully, just log the dependency error
    }
  }

  return task
}

// Update task
async function updateTask({ id, data }: { id: string; data: Partial<TaskFormData> }): Promise<Task> {
  const supabase = createClient()
  
  // Convert empty string assignee_id to null for proper UUID handling
  const updateData = {
    ...data,
    assignee_id: data.assignee_id === '' ? null : data.assignee_id
  }
  
  const { data: task, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return task
}

// Update task position (for drag and drop)
async function updateTaskPosition({ 
  id, 
  newStatus, 
  newPosition 
}: { 
  id: string
  newStatus: Task['status']
  newPosition: number 
}): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ 
      status: newStatus, 
      position: newPosition 
    })
    .eq('id', id)

  if (error) throw error
}

// Delete task
async function deleteTask(id: string): Promise<void> {
  const supabase = createClient()
  
  // CRITICAL: Get current user's tenant for security
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()
  
  if (!userTenant) throw new Error('No tenant found for user')
  
  // First verify the task belongs to the user's tenant
  const { data: taskCheck } = await supabase
    .from('tasks')
    .select('id, tenant_id')
    .eq('id', id)
    .eq('tenant_id', userTenant.tenant_id)
    .single()
    
  if (!taskCheck) {
    throw new Error('Task not found or access denied')
  }
  
  // Now delete the task - RLS policies will also enforce tenant access
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Fetch assignee info separately with tenant validation
async function fetchTaskAssignee(assigneeId: string | null): Promise<any> {
  if (!assigneeId) return null
  
  const supabase = createClient()
  
  // Get current user's tenant
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()
  
  if (!userTenant) return null
  
  // Only fetch assignee if they're in the same tenant
  const { data: assigneeTenant } = await supabase
    .from('user_tenants')
    .select('user_id')
    .eq('user_id', assigneeId)
    .eq('tenant_id', userTenant.tenant_id)
    .single()
  
  if (!assigneeTenant) return null // Assignee not in same tenant
  
  // Safe to fetch profile - they're in same tenant
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url')
    .eq('id', assigneeId)
    .single()
  
  return profile
}

// Undo functionality hook
export function useTaskUndo() {
  const [deletedTasks, setDeletedTasks] = useState<Map<string, DeletedTask>>(new Map())
  const queryClient = useQueryClient()
  const supabase = createClient()
  const undoTimeoutRef = useRef<number>(10000) // 10 seconds to undo
  
  const addDeletedTask = useCallback((task: TaskWithRelations) => {
    const timeoutId = setTimeout(() => {
      // Permanently delete from temporary storage after timeout
      setDeletedTasks(prev => {
        const newMap = new Map(prev)
        newMap.delete(task.id)
        return newMap
      })
    }, undoTimeoutRef.current)
    
    const deletedTask: DeletedTask = {
      task,
      deletedAt: Date.now(),
      timeoutId
    }
    
    setDeletedTasks(prev => new Map(prev).set(task.id, deletedTask))
    return deletedTask
  }, [])
  
  const restoreTask = useCallback(async (taskId: string) => {
    const deletedTaskData = deletedTasks.get(taskId)
    if (!deletedTaskData) return false
    
    const { task, timeoutId } = deletedTaskData
    
    try {
      // Clear the timeout
      clearTimeout(timeoutId)
      
      // Remove from temporary storage
      setDeletedTasks(prev => {
        const newMap = new Map(prev)
        newMap.delete(taskId)
        return newMap
      })
      
      // Get user's tenant for security
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()
      
      if (!userTenant) throw new Error('No tenant found for user')
      
      // Recreate the task with a new ID to avoid conflicts
      const { dependencies, project, category, ...taskData } = task
      const restoreData = {
        ...taskData,
        id: undefined, // Let the database generate a new ID
        tenant_id: userTenant.tenant_id,
        created_by: user.id,
        assignee_id: taskData.assignee_id === '' ? null : taskData.assignee_id
      }
      
      const { data: restoredTask, error } = await supabase
        .from('tasks')
        .insert(restoreData)
        .select()
        .single()
      
      if (error) throw error
      
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
      
      return true
    } catch (error) {
      console.error('Failed to restore task:', error)
      
      // Add back to deleted tasks on error
      const newTimeoutId = setTimeout(() => {
        setDeletedTasks(prev => {
          const newMap = new Map(prev)
          newMap.delete(taskId)
          return newMap
        })
      }, undoTimeoutRef.current)
      
      setDeletedTasks(prev => new Map(prev).set(taskId, {
        ...deletedTaskData,
        timeoutId: newTimeoutId
      }))
      
      return false
    }
  }, [deletedTasks, queryClient, supabase])
  
  const clearDeletedTask = useCallback((taskId: string) => {
    const deletedTaskData = deletedTasks.get(taskId)
    if (deletedTaskData) {
      clearTimeout(deletedTaskData.timeoutId)
      setDeletedTasks(prev => {
        const newMap = new Map(prev)
        newMap.delete(taskId)
        return newMap
      })
    }
  }, [deletedTasks])
  
  const getDeletedTasks = useCallback(() => {
    return Array.from(deletedTasks.values())
      .sort((a, b) => b.deletedAt - a.deletedAt) // Most recently deleted first
  }, [deletedTasks])
  
  return {
    addDeletedTask,
    restoreTask,
    clearDeletedTask,
    getDeletedTasks,
    deletedTasks: Array.from(deletedTasks.values())
  }
}

// Hooks
export function useTasks(filters: TaskFilters & { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => fetchTasks(filters),
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    refetchOnMount: true, // Refetch when component mounts if data is stale
    refetchOnWindowFocus: false, // Don't refetch on window focus to prevent excessive calls
  })
}

// Hook to fetch assignee for a task
export function useTaskAssignee(assigneeId: string | null) {
  return useQuery({
    queryKey: ['task-assignee', assigneeId],
    queryFn: () => fetchTaskAssignee(assigneeId),
    enabled: !!assigneeId,
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => fetchTask(id),
    enabled: !!id,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTask,
    onSuccess: async (data) => {
      // Only invalidate queries, don't force refetch to prevent infinite loops
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
      
      console.log('Task created and queries invalidated:', data.id)
    },
    onError: (error) => {
      console.error('Task creation failed:', error)
    }
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateTask,
    onSuccess: async (data, { id }) => {
      // Only invalidate queries, don't force refetch to prevent infinite loops
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) })
      
      console.log('Task updated and queries invalidated:', id)
    },
  })
}

export function useUpdateTaskPosition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateTaskPosition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTask,
    onSuccess: async () => {
      // Only invalidate queries, don't force refetch to prevent infinite loops
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
      
      console.log('Task deleted and queries invalidated')
    },
    onError: (error) => {
      console.error('Task deletion failed:', error)
    }
  })
}

// Enhanced delete with undo support
export function useDeleteTaskWithUndo() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ taskId, skipUndo = false }: { taskId: string; skipUndo?: boolean }) => {
      const supabase = createClient()
      
      // If not skipping undo, first fetch the task data for temporary storage
      let taskData: TaskWithRelations | null = null
      if (!skipUndo) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')
        
        const { data: userTenant } = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single()
        
        if (!userTenant) throw new Error('No tenant found for user')
        
        const { data, error } = await supabase
          .from('tasks')
          .select(`
            *,
            project:projects(*),
            category:categories(*)
          `)
          .eq('id', taskId)
          .eq('tenant_id', userTenant.tenant_id)
          .single()
        
        if (error) throw error
        taskData = data
      }
      
      // Perform the actual deletion
      await deleteTask(taskId)
      
      return { taskData, taskId }
    },
    onSuccess: async ({ taskData, taskId }) => {
      // Invalidate queries to update UI immediately
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
      
      console.log('Task deleted with undo support:', taskId)
      
      // Return task data for undo functionality
      return taskData
    },
    onError: (error) => {
      console.error('Task deletion failed:', error)
    }
  })
}