import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface ScheduleEvent {
  id: string
  tenant_id: string
  project_id?: string
  title: string
  description?: string
  location?: string
  start_time: string
  end_time: string
  all_day: boolean
  recurring_rule?: string
  event_type: string
  color: string
  reminder_minutes: number
  created_by?: string
  created_at: string
  updated_at: string
  project?: any
  attendees?: EventAttendee[]
}

export interface EventAttendee {
  id: string
  event_id: string
  user_id?: string
  contact_id?: string
  attendance_status: string
  is_organizer: boolean
  notify_enabled: boolean
  user?: any
  contact?: any
}

// Query keys
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filters?: any) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
  attendees: (eventId: string) => [...eventKeys.all, 'attendees', eventId] as const,
}

// Fetch events for a date range
async function fetchEvents(startDate?: Date, endDate?: Date): Promise<ScheduleEvent[]> {
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
    .select(`
      *,
      project:projects(id, name),
      attendees:schedule_event_attendees(
        id,
        user_id,
        contact_id,
        attendance_status,
        is_organizer,
        notify_enabled,
        user:profiles(id, email, full_name, avatar_url),
        contact:contacts(id, first_name, last_name, email, phone)
      )
    `)
    .eq('tenant_id', userTenant.tenant_id)
    .order('start_time', { ascending: true })
  
  if (startDate) {
    query = query.gte('start_time', startDate.toISOString())
  }
  
  if (endDate) {
    query = query.lte('start_time', endDate.toISOString())
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data || []
}

// Fetch single event
async function fetchEvent(id: string): Promise<ScheduleEvent> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('schedule_events')
    .select(`
      *,
      project:projects(id, name),
      attendees:schedule_event_attendees(
        id,
        user_id,
        contact_id,
        attendance_status,
        is_organizer,
        notify_enabled,
        user:profiles(id, email, full_name, avatar_url),
        contact:contacts(id, first_name, last_name, email, phone)
      )
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// Create event
async function createEvent(event: Partial<ScheduleEvent>): Promise<ScheduleEvent> {
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
    .from('schedule_events')
    .insert({
      ...event,
      tenant_id: userTenant.tenant_id,
      created_by: user.id
    })
    .select()
    .single()
  
  if (error) throw error
  
  // Add the creator as an organizer attendee
  await supabase
    .from('schedule_event_attendees')
    .insert({
      event_id: data.id,
      user_id: user.id,
      is_organizer: true,
      attendance_status: 'accepted',
      notify_enabled: false
    })
  
  return data
}

// Update event
async function updateEvent({ id, data }: { id: string; data: Partial<ScheduleEvent> }): Promise<ScheduleEvent> {
  const supabase = createClient()
  
  const { data: event, error } = await supabase
    .from('schedule_events')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return event
}

// Delete event
async function deleteEvent(id: string): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('schedule_events')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Get event attendees
async function getEventAttendees(eventId: string): Promise<EventAttendee[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('schedule_event_attendees')
    .select(`
      *,
      user:profiles(id, email, full_name, avatar_url),
      contact:contacts(id, first_name, last_name, email, phone)
    `)
    .eq('event_id', eventId)
  
  if (error) throw error
  return data || []
}

// Update attendee status
async function updateAttendeeStatus(
  eventId: string,
  userId: string,
  status: 'accepted' | 'declined' | 'tentative'
): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('schedule_event_attendees')
    .update({ 
      attendance_status: status,
      responded_at: new Date().toISOString()
    })
    .eq('event_id', eventId)
    .eq('user_id', userId)
  
  if (error) throw error
}

// Hooks
export function useEvents(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: eventKeys.list({ startDate, endDate }),
    queryFn: () => fetchEvents(startDate, endDate),
  })
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => fetchEvent(id),
    enabled: !!id,
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
    },
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: updateEvent,
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) })
    },
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
    },
  })
}

export function useEventAttendees(eventId: string) {
  return useQuery({
    queryKey: eventKeys.attendees(eventId),
    queryFn: () => getEventAttendees(eventId),
    enabled: !!eventId,
  })
}

export function useUpdateAttendeeStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ eventId, userId, status }: { 
      eventId: string
      userId: string
      status: 'accepted' | 'declined' | 'tentative' 
    }) => updateAttendeeStatus(eventId, userId, status),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.attendees(eventId) })
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) })
    },
  })
}