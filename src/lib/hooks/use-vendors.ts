import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

interface Vendor {
  id: string
  name: string
  email?: string
  phone?: string
  type?: string
  contact_email?: string
  contact_name?: string
  contact_phone?: string
  address?: string
  website?: string
  notes?: string
  tenant_id: string
  created_at?: string
  updated_at?: string
  category?: {
    id: string
    name: string
  }
}

interface VendorFilters {
  search?: string
  type?: string
  category_id?: string
}

// Query keys
export const vendorKeys = {
  all: ['vendors'] as const,
  lists: () => [...vendorKeys.all, 'list'] as const,
  list: (filters: VendorFilters) => [...vendorKeys.lists(), filters] as const,
  details: () => [...vendorKeys.all, 'detail'] as const,
  detail: (id: string) => [...vendorKeys.details(), id] as const,
}

// Fetch vendors with tenant filtering
async function fetchVendors(filters: VendorFilters = {}): Promise<{ data: Vendor[] }> {
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
  
  let query = supabase
    .from('vendors')
    .select(`
      *,
      category:categories(id, name)
    `)
    .eq('tenant_id', userTenant.tenant_id) // CRITICAL: Filter by tenant
    .order('name', { ascending: true })

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
  }

  if (filters.type) {
    query = query.eq('type', filters.type)
  }

  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id)
  }

  const { data, error } = await query

  if (error) throw error
  return { data: data || [] }
}

// Fetch single vendor
async function fetchVendor(id: string): Promise<Vendor> {
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
    .from('vendors')
    .select(`
      *,
      category:categories(id, name)
    `)
    .eq('id', id)
    .eq('tenant_id', userTenant.tenant_id) // CRITICAL: Filter by tenant
    .single()

  if (error) throw error
  return data
}

// Create vendor
async function createVendor(vendorData: Partial<Vendor>): Promise<Vendor> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get user's tenant
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()

  if (!userTenant) throw new Error('No tenant found for user')

  const { data, error } = await supabase
    .from('vendors')
    .insert({
      ...vendorData,
      tenant_id: userTenant.tenant_id // CRITICAL: Set tenant_id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Update vendor
async function updateVendor({ id, data }: { id: string; data: Partial<Vendor> }): Promise<Vendor> {
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
  
  // Remove tenant_id from update data to prevent changing it
  const { tenant_id, ...updateData } = data
  
  const { data: vendor, error } = await supabase
    .from('vendors')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', userTenant.tenant_id) // CRITICAL: Ensure can only update own tenant's vendors
    .select()
    .single()

  if (error) throw error
  return vendor
}

// Delete vendor
async function deleteVendor(id: string): Promise<void> {
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
  
  const { error } = await supabase
    .from('vendors')
    .delete()
    .eq('id', id)
    .eq('tenant_id', userTenant.tenant_id) // CRITICAL: Ensure can only delete own tenant's vendors

  if (error) throw error
}

// Hooks
export function useVendors(filters: VendorFilters = {}) {
  return useQuery({
    queryKey: vendorKeys.list(filters),
    queryFn: () => fetchVendors(filters),
  })
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: vendorKeys.detail(id),
    queryFn: () => fetchVendor(id),
    enabled: !!id,
  })
}

export function useCreateVendor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
    },
  })
}

export function useUpdateVendor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateVendor,
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
      queryClient.invalidateQueries({ queryKey: vendorKeys.detail(id) })
    },
  })
}

export function useDeleteVendor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
    },
  })
}