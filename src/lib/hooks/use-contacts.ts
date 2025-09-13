import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type ContactType = 'vendor' | 'design_professional' | 'contractor' | 'customer'

export interface Contact {
  id: string
  name: string
  contact_type: ContactType
  vendor_type?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  company_name?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  rating?: number
  status?: string
  created_at?: string
  updated_at?: string
}

// Query keys
export const contactKeys = {
  all: ['contacts'] as const,
  lists: () => [...contactKeys.all, 'list'] as const,
  list: (filters?: { type?: ContactType }) => [...contactKeys.lists(), filters] as const,
  details: () => [...contactKeys.all, 'detail'] as const,
  detail: (id: string) => [...contactKeys.details(), id] as const,
}

// Fetch contacts with optional type filter
async function fetchContacts(type?: ContactType): Promise<Contact[]> {
  const supabase = createClient()
  
  // Get current user and tenant
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()
  
  if (!userTenant) throw new Error('No tenant found')
  
  let query = supabase
    .from('vendors')
    .select('*')
    .eq('tenant_id', userTenant.tenant_id)
    .order('name', { ascending: true })
  
  if (type) {
    query = query.eq('contact_type', type)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data || []
}

// Create contact
async function createContact(contact: Partial<Contact>): Promise<Contact> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  // Get user's tenant
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()
  
  if (!userTenant) throw new Error('No tenant found')
  
  const { data, error } = await supabase
    .from('vendors')
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

// Update contact
async function updateContact({ id, data }: { id: string; data: Partial<Contact> }): Promise<Contact> {
  const supabase = createClient()
  const { data: contact, error } = await supabase
    .from('vendors')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return contact
}

// Delete contact
async function deleteContact(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('vendors')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Hooks
export function useContacts(type?: ContactType) {
  return useQuery({
    queryKey: contactKeys.list({ type }),
    queryFn: () => fetchContacts(type),
  })
}

export function useContact(id: string) {
  return useQuery({
    queryKey: contactKeys.detail(id),
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useCreateContact() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() })
    },
  })
}

export function useUpdateContact() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: updateContact,
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() })
      queryClient.invalidateQueries({ queryKey: contactKeys.detail(id) })
    },
  })
}

export function useDeleteContact() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() })
    },
  })
}