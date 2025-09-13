import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export interface TeamMember {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  mobile_phone: string | null
  is_active: boolean
  role?: string
  department?: string
  status?: 'online' | 'away' | 'busy' | 'offline'
  notification_preferences?: any
}

export interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  mobile_phone: string | null
  company: string | null
  title: string | null
  is_active: boolean
  notification_preferences?: any
}

// Query keys
export const teamKeys = {
  all: ['team-members'] as const,
  list: () => [...teamKeys.all, 'list'] as const,
  contacts: ['contacts'] as const,
  contactsList: () => [...teamKeys.contacts, 'list'] as const,
}

// Fetch team members in the same tenant
async function fetchTeamMembers(): Promise<TeamMember[]> {
  const supabase = createClient()
  
  // First get the current user's tenant
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()
  
  if (!userTenant) throw new Error('No tenant found')
  
  // Get all users in the same tenant
  const { data, error } = await supabase
    .from('user_tenants')
    .select(`
      user_id,
      role,
      profiles!inner(
        id,
        email,
        full_name,
        avatar_url,
        phone,
        mobile_phone,
        is_active,
        notification_preferences
      )
    `)
    .eq('tenant_id', userTenant.tenant_id)
    .eq('profiles.is_active', true)
  
  if (error) throw error
  
  return (data || []).map((item: any) => ({
    id: item.profiles.id,
    email: item.profiles.email,
    full_name: item.profiles.full_name,
    avatar_url: item.profiles.avatar_url,
    phone: item.profiles.phone,
    mobile_phone: item.profiles.mobile_phone,
    is_active: item.profiles.is_active,
    role: item.role,
    notification_preferences: item.profiles.notification_preferences
  }))
}

// Fetch contacts
async function fetchContacts(): Promise<Contact[]> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()
  
  if (!userTenant) throw new Error('No tenant found')
  
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('tenant_id', userTenant.tenant_id)
    .eq('is_active', true)
    .order('last_name', { ascending: true })
  
  if (error) throw error
  return data || []
}

// Create a new contact
async function createContact(contact: Partial<Contact>): Promise<Contact> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()
  
  if (!userTenant) throw new Error('No tenant found')
  
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      ...contact,
      tenant_id: userTenant.tenant_id,
      created_by: user.id
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Assign team members to a task
async function assignTaskTeamMembers(taskId: string, userIds: string[]): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  // First remove existing assignments
  await supabase
    .from('task_team_members')
    .delete()
    .eq('task_id', taskId)
  
  // Then add new assignments
  if (userIds.length > 0) {
    const assignments = userIds.map(userId => ({
      task_id: taskId,
      user_id: userId,
      assigned_by: user.id
    }))
    
    const { error } = await supabase
      .from('task_team_members')
      .insert(assignments)
    
    if (error) throw error
  }
}

// Get task team members
async function getTaskTeamMembers(taskId: string): Promise<TeamMember[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('task_team_members')
    .select(`
      user_id,
      role,
      profiles!inner(
        id,
        email,
        full_name,
        avatar_url,
        phone,
        is_active
      )
    `)
    .eq('task_id', taskId)
  
  if (error) throw error
  
  return (data || []).map((item: any) => ({
    id: item.profiles.id,
    email: item.profiles.email,
    full_name: item.profiles.full_name,
    avatar_url: item.profiles.avatar_url,
    phone: item.profiles.phone,
    mobile_phone: null,
    is_active: item.profiles.is_active,
    role: item.role
  }))
}

// Assign attendees to an event
async function assignEventAttendees(
  eventId: string, 
  userIds: string[], 
  contactIds: string[]
): Promise<void> {
  const supabase = createClient()
  
  // Remove existing attendees
  await supabase
    .from('schedule_event_attendees')
    .delete()
    .eq('event_id', eventId)
  
  // Add team member attendees
  if (userIds.length > 0) {
    const userAttendees = userIds.map(userId => ({
      event_id: eventId,
      user_id: userId,
      notify_enabled: true
    }))
    
    const { error } = await supabase
      .from('schedule_event_attendees')
      .insert(userAttendees)
    
    if (error) throw error
  }
  
  // Add contact attendees
  if (contactIds.length > 0) {
    const contactAttendees = contactIds.map(contactId => ({
      event_id: eventId,
      contact_id: contactId,
      notify_enabled: true
    }))
    
    const { error } = await supabase
      .from('schedule_event_attendees')
      .insert(contactAttendees)
    
    if (error) throw error
  }
}

// Create notification
async function createNotification(
  recipientUserId: string | null,
  recipientContactId: string | null,
  type: string,
  channel: 'email' | 'sms' | 'in_app',
  subject: string,
  message: string,
  data?: any
): Promise<void> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()
  
  if (!userTenant) throw new Error('No tenant found')
  
  const { error } = await supabase
    .from('notifications')
    .insert({
      tenant_id: userTenant.tenant_id,
      recipient_user_id: recipientUserId,
      recipient_contact_id: recipientContactId,
      type,
      channel,
      subject,
      message,
      data: data || {}
    })
  
  if (error) throw error
}

// Hooks
export function useTeamMembers() {
  return useQuery({
    queryKey: teamKeys.list(),
    queryFn: fetchTeamMembers,
  })
}

export function useContacts() {
  return useQuery({
    queryKey: teamKeys.contactsList(),
    queryFn: fetchContacts,
  })
}

export function useCreateContact() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.contactsList() })
    },
  })
}

export function useAssignTaskTeamMembers() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ taskId, userIds }: { taskId: string; userIds: string[] }) =>
      assignTaskTeamMembers(taskId, userIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useTaskTeamMembers(taskId: string) {
  return useQuery({
    queryKey: ['task-team-members', taskId],
    queryFn: () => getTaskTeamMembers(taskId),
    enabled: !!taskId,
  })
}

export function useAssignEventAttendees() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ 
      eventId, 
      userIds, 
      contactIds 
    }: { 
      eventId: string
      userIds: string[]
      contactIds: string[] 
    }) => assignEventAttendees(eventId, userIds, contactIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useCreateNotification() {
  return useMutation({
    mutationFn: (params: {
      recipientUserId: string | null,
      recipientContactId: string | null,
      type: string,
      channel: 'email' | 'sms' | 'in_app',
      subject: string,
      message: string,
      data?: any
    }) => createNotification(
      params.recipientUserId,
      params.recipientContactId,
      params.type,
      params.channel,
      params.subject,
      params.message,
      params.data
    ),
  })
}