import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// Types
export interface ProjectTeamMember {
  id: string
  project_id: string
  user_id: string
  role: string
  can_receive_notifications: boolean
  user?: {
    id: string
    email: string
    full_name: string
    avatar_url?: string
    mobile_phone?: string
  }
}

export interface ProjectVendor {
  id: string
  project_id: string
  vendor_id: string
  vendor_type?: string
  scope_of_work?: string
  can_receive_notifications: boolean
  vendor?: {
    id: string
    name: string
    contact_email?: string
    contact_phone?: string
    category?: string
    notification_email?: string
    notification_phone?: string
  }
}

// Query keys
export const projectAssignmentKeys = {
  all: ['project-assignments'] as const,
  teamMembers: (projectId: string) => [...projectAssignmentKeys.all, 'team', projectId] as const,
  vendors: (projectId: string) => [...projectAssignmentKeys.all, 'vendors', projectId] as const,
}

// Fetch project team members
async function fetchProjectTeamMembers(projectId: string): Promise<ProjectTeamMember[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('project_team_members')
    .select(`
      *,
      user:profiles(
        id,
        email,
        full_name,
        avatar_url,
        mobile_phone
      )
    `)
    .eq('project_id', projectId)
    .order('assigned_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

// Fetch project vendors
async function fetchProjectVendors(projectId: string): Promise<ProjectVendor[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('project_vendors')
    .select(`
      *,
      vendor:vendors(
        id,
        name,
        contact_email,
        contact_phone,
        notification_email,
        notification_phone,
        category:categories(name)
      )
    `)
    .eq('project_id', projectId)
    .order('assigned_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

// Assign team members to project
async function assignProjectTeamMembers(
  projectId: string,
  assignments: Array<{ user_id: string; role?: string }>
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  // First remove existing assignments
  await supabase
    .from('project_team_members')
    .delete()
    .eq('project_id', projectId)
  
  // Then add new assignments
  if (assignments.length > 0) {
    const records = assignments.map(a => ({
      project_id: projectId,
      user_id: a.user_id,
      role: a.role || 'member',
      assigned_by: user.id,
      can_receive_notifications: true
    }))
    
    const { error } = await supabase
      .from('project_team_members')
      .insert(records)
    
    if (error) throw error
  }
}

// Assign vendors to project
async function assignProjectVendors(
  projectId: string,
  assignments: Array<{ 
    vendor_id: string
    vendor_type?: string
    scope_of_work?: string 
  }>
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  // First remove existing assignments
  await supabase
    .from('project_vendors')
    .delete()
    .eq('project_id', projectId)
  
  // Then add new assignments
  if (assignments.length > 0) {
    const records = assignments.map(a => ({
      project_id: projectId,
      vendor_id: a.vendor_id,
      vendor_type: a.vendor_type,
      scope_of_work: a.scope_of_work,
      assigned_by: user.id,
      can_receive_notifications: true
    }))
    
    const { error } = await supabase
      .from('project_vendors')
      .insert(records)
    
    if (error) throw error
  }
}

// Toggle notification settings for team member
async function toggleTeamMemberNotifications(
  projectId: string,
  userId: string,
  enabled: boolean
): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('project_team_members')
    .update({ can_receive_notifications: enabled })
    .eq('project_id', projectId)
    .eq('user_id', userId)
  
  if (error) throw error
}

// Toggle notification settings for vendor
async function toggleVendorNotifications(
  projectId: string,
  vendorId: string,
  enabled: boolean
): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('project_vendors')
    .update({ can_receive_notifications: enabled })
    .eq('project_id', projectId)
    .eq('vendor_id', vendorId)
  
  if (error) throw error
}

// Hooks
export function useProjectTeamMembers(projectId: string) {
  return useQuery({
    queryKey: projectAssignmentKeys.teamMembers(projectId),
    queryFn: () => fetchProjectTeamMembers(projectId),
    enabled: !!projectId,
  })
}

export function useProjectVendors(projectId: string) {
  return useQuery({
    queryKey: projectAssignmentKeys.vendors(projectId),
    queryFn: () => fetchProjectVendors(projectId),
    enabled: !!projectId,
  })
}

export function useAssignProjectTeamMembers() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ projectId, assignments }: {
      projectId: string
      assignments: Array<{ user_id: string; role?: string }>
    }) => assignProjectTeamMembers(projectId, assignments),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ 
        queryKey: projectAssignmentKeys.teamMembers(projectId) 
      })
    },
  })
}

export function useAssignProjectVendors() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ projectId, assignments }: {
      projectId: string
      assignments: Array<{ vendor_id: string; vendor_type?: string; scope_of_work?: string }>
    }) => assignProjectVendors(projectId, assignments),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ 
        queryKey: projectAssignmentKeys.vendors(projectId) 
      })
    },
  })
}

export function useToggleTeamMemberNotifications() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ projectId, userId, enabled }: {
      projectId: string
      userId: string
      enabled: boolean
    }) => toggleTeamMemberNotifications(projectId, userId, enabled),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ 
        queryKey: projectAssignmentKeys.teamMembers(projectId) 
      })
    },
  })
}

export function useToggleVendorNotifications() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ projectId, vendorId, enabled }: {
      projectId: string
      vendorId: string
      enabled: boolean
    }) => toggleVendorNotifications(projectId, vendorId, enabled),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ 
        queryKey: projectAssignmentKeys.vendors(projectId) 
      })
    },
  })
}