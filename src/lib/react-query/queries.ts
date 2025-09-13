import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabase/singleton'

// Query keys for cache invalidation
export const queryKeys = {
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  tasks: ['tasks'] as const,
  task: (id: string) => ['tasks', id] as const,
  dashboard: ['dashboard'] as const,
  vendors: ['vendors'] as const,
  documents: ['documents'] as const,
  activities: ['activities'] as const,
}

/**
 * Fetch all projects with caching
 */
export function useProjects() {
  const supabase = getSupabaseClient()
  
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()
      
      if (!userTenant) throw new Error('No tenant found')
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('tenant_id', userTenant.tenant_id)
        .order('updated_at', { ascending: false })
      
      if (error) throw error
      return data
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Fetch single project with caching
 */
export function useProject(projectId: string) {
  const supabase = getSupabaseClient()
  
  return useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Create project mutation with optimistic updates
 */
export function useCreateProject() {
  const queryClient = useQueryClient()
  const supabase = getSupabaseClient()
  
  return useMutation({
    mutationFn: async (newProject: any) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()
      
      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...newProject,
          tenant_id: userTenant?.tenant_id,
          created_by: user.id,
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate and refetch projects list
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })
    },
    onError: (error) => {
      console.error('Failed to create project:', error)
    },
  })
}

/**
 * Fetch tasks with caching
 */
export function useTasks(projectId?: string) {
  const supabase = getSupabaseClient()
  
  return useQuery({
    queryKey: projectId ? ['tasks', projectId] : queryKeys.tasks,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()
      
      let query = supabase
        .from('tasks')
        .select('*, projects(name)')
        .eq('tenant_id', userTenant?.tenant_id)
      
      if (projectId) {
        query = query.eq('project_id', projectId)
      }
      
      const { data, error } = await query.order('due_date', { ascending: true })
      
      if (error) throw error
      return data
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

/**
 * Prefetch data for improved performance
 */
export async function prefetchDashboardData(queryClient: any) {
  const supabase = getSupabaseClient()
  
  // Prefetch all dashboard data in parallel
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.projects,
      queryFn: async () => {
        const { data } = await supabase.from('projects').select('*').limit(10)
        return data
      },
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.tasks,
      queryFn: async () => {
        const { data } = await supabase.from('tasks').select('*').limit(10)
        return data
      },
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.activities,
      queryFn: async () => {
        const { data } = await supabase.from('activity_logs').select('*').limit(10)
        return data
      },
    }),
  ])
}