import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface CalendarEvent {
  id: string
  title: string
  start_time: string
  end_time: string
  all_day: boolean
  event_type: string
  trade?: string
  project_id?: string
  color?: string
}

// Lightweight fetch for calendar grid - no nested data
async function fetchCalendarEvents(startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
  console.log('🎯 fetchCalendarEvents CALLED with:', {
    startDate: startDate?.toLocaleDateString(),
    endDate: endDate?.toLocaleDateString()
  })
  
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data: userTenants } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)
  
  const userTenant = userTenants?.[0]
  
  if (!userTenant) throw new Error('No tenant found')
  
  let query = supabase
    .from('schedule_events')
    .select('id, title, start_time, end_time, all_day, event_type, trade, project_id, color')
    .eq('tenant_id', userTenant.tenant_id)
    .order('start_time', { ascending: true })
  
  // For multi-month events, we need to get events that overlap with our date range
  // This means: event_start <= range_end AND (event_end >= range_start OR event_end is null)
  if (startDate && endDate) {
    query = query
      .lte('start_time', endDate.toISOString())
      .or(`end_time.gte.${startDate.toISOString()},end_time.is.null`)
  } else if (startDate) {
    query = query.or(`end_time.gte.${startDate.toISOString()},end_time.is.null`)
  } else if (endDate) {
    query = query.lte('start_time', endDate.toISOString())
  }
  
  const { data, error } = await query
  
  console.log('🎯 fetchCalendarEvents RESULT:', {
    error,
    dataCount: data?.length || 0,
    data: data?.slice(0, 2) // Show first 2 events
  })
  
  if (error) throw error
  return data || []
}

// Fetch contacts with caching
async function fetchContacts() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data: userTenants } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)
  
  const userTenant = userTenants?.[0]
  
  if (!userTenant) throw new Error('No tenant found')
  
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name, contact_type, contact_email, contact_phone, company_name')
    .eq('tenant_id', userTenant.tenant_id)
    .order('name')
  
  if (error) throw error
  return data || []
}

// Fetch team members with caching
async function fetchTeamMembers() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data: userTenants } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)
  
  const userTenant = userTenants?.[0]
  
  if (!userTenant) throw new Error('No tenant found')
  
  // Get team members in the same tenant
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
        is_active
      )
    `)
    .eq('tenant_id', userTenant.tenant_id)
    .eq('profiles.is_active', true)
    .order('profiles.full_name', { ascending: true })
  
  if (error) throw error
  
  // Format the data to match expected structure
  return (data || []).map((item: any) => ({
    id: item.profiles.id,
    full_name: item.profiles.full_name,
    email: item.profiles.email,
    avatar_url: item.profiles.avatar_url,
    role: item.role
  }))
}

// Query keys
export const optimizedEventKeys = {
  calendar: (startDate?: Date, endDate?: Date) => ['calendar-events', startDate, endDate] as const,
  contacts: ['calendar-contacts'] as const,
  teamMembers: ['calendar-team'] as const,
}

// Optimized hooks
export function useCalendarEvents(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: optimizedEventKeys.calendar(startDate, endDate),
    queryFn: () => fetchCalendarEvents(startDate, endDate),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
  })
}

export function useCalendarContacts() {
  return useQuery({
    queryKey: optimizedEventKeys.contacts,
    queryFn: fetchContacts,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
  })
}

export function useCalendarTeamMembers() {
  return useQuery({
    queryKey: optimizedEventKeys.teamMembers,
    queryFn: fetchTeamMembers,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
  })
}