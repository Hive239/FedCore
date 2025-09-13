import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { 
  Project, 
  ProjectWithRelations, 
  ProjectFormData
} from '@/lib/types'

// Define missing types locally
interface ProjectFilters {
  status?: string
  search?: string
  association_id?: string
  start_date?: string
  end_date?: string
  [key: string]: any
}

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages?: number
}

// Query keys
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: ProjectFilters) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
}

// Fetch projects with filters
async function fetchProjects(
  filters: ProjectFilters & { page?: number; limit?: number }
): Promise<PaginatedResponse<ProjectWithRelations>> {
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
  
  const { page = 1, limit = 20, ...otherFilters } = filters
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('projects')
    .select(`
      *,
      association:associations(*),
      customer:customer_id(id, name, contact_email, contact_phone)
    `, { count: 'exact' })
    .eq('tenant_id', userTenant.tenant_id) // CRITICAL: Filter by tenant
    .range(from, to)
    .order('created_at', { ascending: false })

  if (otherFilters.status) {
    query = query.eq('status', otherFilters.status)
  }

  if (otherFilters.association_id) {
    query = query.eq('association_id', otherFilters.association_id)
  }

  if (otherFilters.search) {
    query = query.ilike('name', `%${otherFilters.search}%`)
  }

  if (otherFilters.start_date) {
    query = query.gte('start_date', otherFilters.start_date)
  }

  if (otherFilters.end_date) {
    query = query.lte('end_date', otherFilters.end_date)
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

// Fetch single project
async function fetchProject(id: string): Promise<ProjectWithRelations> {
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
    .from('projects')
    .select(`
      *,
      association:associations(*),
      customer:customer_id(id, name, contact_email, contact_phone),
      tasks:tasks(count),
      documents:documents(count)
    `)
    .eq('id', id)
    .eq('tenant_id', userTenant.tenant_id) // CRITICAL: Filter by tenant
    .single()

  if (error) throw error
  return data
}

// Create project
async function createProject(data: ProjectFormData): Promise<Project> {
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
          slug: 'default-organization'
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

    if (assignError) throw new Error('Failed to assign user to tenant')
    userTenant = newUserTenant
  }

  // Clean up the data - remove any fields that don't exist in the database
  const projectData: any = { ...data }
  
  // Map customer to customer_id
  if (projectData.customer) {
    projectData.customer_id = projectData.customer
    delete projectData.customer
  }
  
  // Remove fields that don't exist in the projects table
  delete projectData.projectedFinishDate
  delete projectData.street
  delete projectData.city
  delete projectData.state
  delete projectData.zip
  delete projectData.team
  
  // Convert budget to number if it's a string
  if (projectData.budget && typeof projectData.budget === 'string') {
    projectData.budget = parseFloat(projectData.budget) || null
  }

  const insertData = {
    name: projectData.name,
    description: projectData.description || null,
    customer_id: projectData.customer_id || null,
    budget: projectData.budget || null,
    start_date: projectData.start_date || null,
    end_date: projectData.end_date || null,
    status: projectData.status || 'new',
    address: projectData.address || null,
    full_address: projectData.formatted_address || projectData.address || null,
    formatted_address: projectData.formatted_address || null,
    coordinates: projectData.coordinates ? JSON.stringify(projectData.coordinates) : null,
    place_id: projectData.place_id || null,
    geocoded_at: projectData.coordinates ? new Date().toISOString() : null,
    created_by: user.id,
    tenant_id: userTenant.tenant_id
  }
  
  console.log('Inserting project with data:', insertData)
  
  const { data: project, error } = await supabase
    .from('projects')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Project creation error:', error)
    throw new Error(`Failed to create project: ${error.message}`)
  }
  
  if (!project) {
    throw new Error('Project was created but no data returned')
  }
  
  return project
}

// Update project
async function updateProject({ id, data }: { id: string; data: Partial<ProjectFormData> }): Promise<Project> {
  const supabase = createClient()
  const { data: project, error } = await supabase
    .from('projects')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return project
}

// Delete project
async function deleteProject(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Hooks
export function useProjects(filters: ProjectFilters & { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: () => fetchProjects(filters),
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => fetchProject(id),
    enabled: !!id,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProject,
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}