import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface ProjectLocation {
  id: string
  tenant_id: string
  project_id: string
  name: string
  description?: string
  latitude?: number
  longitude?: number
  location_type: string
  address?: string
  postal_code?: string
  city?: string
  state?: string
  country: string
  is_primary: boolean
  created_at: string
  updated_at: string
  // Relations
  project?: {
    id: string
    name: string
    status: string
  }
}

export interface LocationTag {
  id: string
  name: string
  latitude: number
  longitude: number
  type: string
  description?: string
  address?: string
  project_id?: string
}

const QUERY_KEY = 'project-locations'

export function useProjectLocations(projectId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: projectId ? [QUERY_KEY, projectId] : [QUERY_KEY],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()

      if (!userTenant) throw new Error('No tenant found')

      let query = supabase
        .from('project_locations')
        .select(`
          *,
          projects!inner(
            id,
            name,
            status
          )
        `)
        .eq('tenant_id', userTenant.tenant_id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false })

      if (projectId && projectId !== 'all') {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as ProjectLocation[]
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Get locations in a format compatible with the map component
export function useLocationTags(projectId?: string) {
  const { data: locations, ...query } = useProjectLocations(projectId)
  
  const locationTags: LocationTag[] = locations?.map(location => ({
    id: location.id,
    name: location.name,
    latitude: location.latitude || 0,
    longitude: location.longitude || 0,
    type: location.location_type,
    description: location.description || `${location.project?.name} - ${location.location_type}`,
    address: location.address,
    project_id: location.project_id
  })).filter(tag => tag.latitude !== 0 && tag.longitude !== 0) || []

  return { data: locationTags, ...query }
}

// Get primary location for a project
export function usePrimaryProjectLocation(projectId: string) {
  const { data: locations, ...query } = useProjectLocations(projectId)
  
  const primaryLocation = locations?.find(location => location.is_primary) || locations?.[0]

  return { data: primaryLocation, ...query }
}

// Get locations near coordinates
export function useNearbyLocations(latitude: number, longitude: number, radiusKm = 50) {
  const { data: allLocations, ...query } = useProjectLocations()
  
  const nearbyLocations = allLocations?.filter(location => {
    if (!location.latitude || !location.longitude) return false
    
    // Simple distance calculation (approximate)
    const latDiff = Math.abs(location.latitude - latitude)
    const lngDiff = Math.abs(location.longitude - longitude)
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111 // Convert to km
    
    return distance <= radiusKm
  }) || []

  return { data: nearbyLocations, ...query }
}

// Create new project location
export function useCreateProjectLocation() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (location: Omit<ProjectLocation, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()

      if (!userTenant) throw new Error('No tenant found')

      // If this is set as primary, unset other primary locations for this project
      if (location.is_primary) {
        await supabase
          .from('project_locations')
          .update({ is_primary: false })
          .eq('tenant_id', userTenant.tenant_id)
          .eq('project_id', location.project_id)
      }

      const { data, error } = await supabase
        .from('project_locations')
        .insert([{
          ...location,
          tenant_id: userTenant.tenant_id,
        }])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

// Update project location
export function useUpdateProjectLocation() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProjectLocation> }) => {
      // If setting as primary, unset other primary locations for this project
      if (updates.is_primary) {
        const { data: location } = await supabase
          .from('project_locations')
          .select('project_id, tenant_id')
          .eq('id', id)
          .single()

        if (location) {
          await supabase
            .from('project_locations')
            .update({ is_primary: false })
            .eq('tenant_id', location.tenant_id)
            .eq('project_id', location.project_id)
            .neq('id', id)
        }
      }

      const { data, error } = await supabase
        .from('project_locations')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

// Delete project location
export function useDeleteProjectLocation() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_locations')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

// Geocode address to coordinates
export async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  if (!mapboxToken) {
    console.warn('Mapbox token not configured')
    return null
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&limit=1`
    )
    
    if (!response.ok) throw new Error('Geocoding failed')
    
    const data = await response.json()
    
    if (data.features && data.features.length > 0) {
      const [longitude, latitude] = data.features[0].center
      return { latitude, longitude }
    }
    
    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

// Create location from address
export function useCreateLocationFromAddress() {
  const createLocation = useCreateProjectLocation()

  return useMutation({
    mutationFn: async (params: {
      project_id: string
      name: string
      address: string
      location_type?: string
      description?: string
      is_primary?: boolean
    }) => {
      const coordinates = await geocodeAddress(params.address)
      
      const locationData: Omit<ProjectLocation, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> = {
        project_id: params.project_id,
        name: params.name,
        address: params.address,
        location_type: params.location_type || 'construction_site',
        description: params.description,
        is_primary: params.is_primary || false,
        country: 'USA',
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
      }

      return createLocation.mutateAsync(locationData)
    }
  })
}

// Generate sample locations for development (only if no locations exist)
export function useGenerateSampleLocations() {
  const supabase = createClient()
  
  return useMutation({
    mutationFn: async (projectIds: string[]) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()

      if (!userTenant) throw new Error('No tenant found')

      // Check if locations already exist
      const { data: existingLocations } = await supabase
        .from('project_locations')
        .select('id')
        .eq('tenant_id', userTenant.tenant_id)
        .limit(1)

      if (existingLocations && existingLocations.length > 0) {
        return { message: 'Locations already exist' }
      }

      // Create sample locations for major cities
      const sampleLocations = [
        { name: 'Manhattan Construction Site', lat: 40.7831, lng: -73.9712, city: 'New York', state: 'NY' },
        { name: 'Brooklyn Development Project', lat: 40.6782, lng: -73.9442, city: 'Brooklyn', state: 'NY' },
        { name: 'Queens Infrastructure Project', lat: 40.7282, lng: -73.7949, city: 'Queens', state: 'NY' },
        { name: 'Los Angeles Commercial Build', lat: 34.0522, lng: -118.2437, city: 'Los Angeles', state: 'CA' },
        { name: 'Chicago High-Rise Project', lat: 41.8781, lng: -87.6298, city: 'Chicago', state: 'IL' },
      ]

      const locationsToInsert = projectIds.slice(0, sampleLocations.length).map((projectId, index) => {
        const sample = sampleLocations[index]
        return {
          tenant_id: userTenant.tenant_id,
          project_id: projectId,
          name: sample.name,
          latitude: sample.lat,
          longitude: sample.lng,
          location_type: 'construction_site',
          address: `${sample.city}, ${sample.state}`,
          city: sample.city,
          state: sample.state,
          country: 'USA',
          is_primary: index === 0,
          description: `Primary construction site for ${sample.city} project`
        }
      })

      const { data, error } = await supabase
        .from('project_locations')
        .insert(locationsToInsert)
        .select()

      if (error) throw error
      return data
    }
  })
}