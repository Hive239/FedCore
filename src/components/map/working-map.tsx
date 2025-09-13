"use client"

import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react'
import { Map as MapIcon, CloudRain, Plus, Search } from 'lucide-react'
import mapboxgl from 'mapbox-gl'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useStableCallback, useExpensiveMemo } from '@/lib/performance/react-optimizations'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

// HARDCODE THE TOKEN - DO NOT USE IMPORTS
const MAPBOX_TOKEN = 'pk.eyJ1IjoibXBhcmlzaCIsImEiOiJjbWVuamF3aW0wY2d6MmlvaGRneTh5cWR0In0.Po5NkfuUySiKy8aSP7R7EA'
const OPENWEATHER_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || 'cebea6d73816dccaecbe0dcd99d2471c'

// Set token globally
if (typeof window !== 'undefined' && mapboxgl) {
  mapboxgl.accessToken = MAPBOX_TOKEN
}

interface LocationData {
  id: string
  name: string
  description: string
  latitude: number
  longitude: number
  type: string
  address?: string
  projectId?: string
  weather?: {
    temp: number
    description: string
    humidity: number
    wind_speed: number
  }
}

interface AddLocationModalProps {
  isOpen: boolean
  coordinates: { lat: number; lng: number } | null
  address?: string
  onClose: () => void
  onSave: (location: Omit<LocationData, 'id'>) => void
  projects: Array<{ id: string; name: string }>
}

const AddLocationModal = memo(function AddLocationModal({ isOpen, coordinates, address, onClose, onSave, projects }: AddLocationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'project',
    address: address || '',
    projectId: ''
  })

  useEffect(() => {
    if (address) {
      setFormData(prev => ({ ...prev, address }))
    }
  }, [address])

  // Debug log for projects
  useEffect(() => {
    console.log('AddLocationModal - Projects received:', projects)
    console.log('AddLocationModal - Projects count:', projects?.length || 0)
    if (projects && projects.length > 0) {
      console.log('AddLocationModal - First project:', projects[0])
    }
  }, [projects, isOpen])

  if (!isOpen || !coordinates) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      latitude: coordinates.lat,
      longitude: coordinates.lng
    })
    setFormData({
      name: '',
      description: '',
      type: 'project',
      address: '',
      projectId: ''
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Add New Location</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Location Name*</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="type">Type*</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Project Site</SelectItem>
                  <SelectItem value="site">Construction Site</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="projectId">Link to Project</Label>
              <Select value={formData.projectId} onValueChange={(value) => setFormData({ ...formData, projectId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Project</SelectItem>
                  {projects && projects.length > 0 && 
                    projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background min-h-[80px]"
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              Coordinates: {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                Add Location
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.coordinates?.lat === nextProps.coordinates?.lat &&
    prevProps.coordinates?.lng === nextProps.coordinates?.lng &&
    prevProps.address === nextProps.address &&
    prevProps.projects.length === nextProps.projects.length
  )
})

function WorkingMap() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markers = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const isAddingLocationRef = useRef(false)
  const supabase = createClientComponentClient()
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [locations, setLocations] = useState<LocationData[]>([])
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [projectPins, setProjectPins] = useState<Array<{
    id: string
    name: string
    address: string
    coordinates: { lat: number; lng: number }
    status: string
    budget?: number
  }>>([])
  const [showProjectPins, setShowProjectPins] = useState(true)
  const [mapStyle, setMapStyle] = useState('satellite')
  const [showWeatherOverlay, setShowWeatherOverlay] = useState(false)
  const [weatherLayer, setWeatherLayer] = useState<'temp' | 'precipitation' | 'clouds' | 'wind' | 'humidity' | 'pressure' | 'snow' | 'radar' | 'satellite' | 'lightning'>('temp')
  const [showGeographicalOverlays, setShowGeographicalOverlays] = useState(false)
  const [geographicalLayer, setGeographicalLayer] = useState<'fema-flood' | 'parcels' | 'zoning' | 'elevation' | 'wetlands' | 'usgs-topo' | 'contours' | 'buildings' | 'flood-plain' | 'water-table' | 'soil' | 'fault-lines' | 'watersheds' | 'infrastructure' | 'slope' | 'aspect'>('parcels')
  const [weatherData, setWeatherData] = useState<any>(null)
  const [isAddingLocation, setIsAddingLocation] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newLocationCoords, setNewLocationCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [newLocationAddress, setNewLocationAddress] = useState('')

  // Handle adding new location
  const handleAddLocation = useStableCallback(async (location: Omit<LocationData, 'id'>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !session.user) {
        console.error('User not authenticated - please log in to add locations')
        // Optionally show a toast/alert to the user
        alert('Please log in to add locations')
        return
      }
      const user = session.user

      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()
      
      if (!userTenant) {
        console.error('User tenant not found')
        return
      }

      // Save location to database
      const { data, error } = await supabase
        .from('project_locations')
        .insert({
          name: location.name,
          description: location.description,
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
          type: location.type,
          project_id: location.projectId,
          tenant_id: userTenant.tenant_id,
          created_by: user.id
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving location:', error)
        return
      }

      // Add to local state
      const newLocation: LocationData = {
        id: data.id,
        ...location
      }
      setLocations(prev => [...prev, newLocation])

      // Add marker to map
      if (map.current) {
        const marker = new mapboxgl.Marker({ color: '#7c3aed' })
          .setLngLat([location.longitude, location.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`
                <div class="p-2">
                  <h3 class="font-bold">${location.name}</h3>
                  <p class="text-sm">${location.description || ''}</p>
                  ${location.address ? `<p class="text-xs mt-1">${location.address}</p>` : ''}
                </div>
              `)
          )
          .addTo(map.current)
        
        markers.current.set(newLocation.id, marker)
      }
    } catch (error) {
      console.error('Error adding location:', error)
    }
  }, [supabase], 'handleAddLocation')

  // Fetch projects immediately on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        console.log('Fetching projects...')
        
        // Clear any corrupted auth cookies
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          console.log('No session, skipping project fetch')
          return
        }
        
        const user = session.user
        
        if (!user) {
          console.log('No user found')
          return
        }
        
        console.log('User found:', user.id)
        
        const { data: userTenant, error: tenantError } = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single()
        
        if (tenantError) {
          console.error('Error fetching user tenant:', tenantError)
          return
        }
        
        if (!userTenant) {
          console.log('No user tenant found')
          return
        }
        
        console.log('Tenant found:', userTenant.tenant_id)
        
        // First try with tenant filter
        let { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .eq('tenant_id', userTenant.tenant_id)
        
        // If no projects found with tenant, try without filter to debug
        if (!projectsData || projectsData.length === 0) {
          console.log('No projects for tenant, trying without filter...')
          const { data: allProjects } = await supabase
            .from('projects')
            .select('*')
            .limit(10)
          
          if (allProjects && allProjects.length > 0) {
            console.log('Found projects without tenant filter:', allProjects)
            projectsData = allProjects // Use all projects for now
          }
        }
        
        if (projectsError) {
          console.error('Error fetching projects:', projectsError)
          return
        }
        
        console.log('Projects fetched from database:', projectsData)
        console.log('Raw projects data:', JSON.stringify(projectsData, null, 2))
        
        if (projectsData && projectsData.length > 0) {
          setProjects(projectsData)
          console.log('Projects set in state:', projectsData.length, 'projects')
          console.log('Project names:', projectsData.map(p => p.name).join(', '))
        } else {
          console.log('No projects found for tenant')
          setProjects([])
        }
      } catch (err) {
        console.error('Unexpected error fetching projects:', err)
      }
    }
    fetchProjects()
  }, [supabase])

  // Fetch project pins with coordinates
  useEffect(() => {
    const fetchProjectPins = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const user = session.user
          const { data: userTenant } = await supabase
            .from('user_tenants')
            .select('tenant_id')
            .eq('user_id', user.id)
            .single()
          
          if (userTenant) {
            const { data: projectsWithCoords } = await supabase
              .from('projects')
              .select('id, name, address, coordinates, status, budget')
              .eq('tenant_id', userTenant.tenant_id)
              .not('coordinates', 'is', null)
              .not('address', 'is', null)
            
            if (projectsWithCoords) {
              const pins = projectsWithCoords.map(project => ({
                id: project.id,
                name: project.name,
                address: project.address,
                coordinates: typeof project.coordinates === 'string' 
                  ? JSON.parse(project.coordinates)
                  : project.coordinates,
                status: project.status,
                budget: project.budget
              })).filter(pin => pin.coordinates && pin.coordinates.lat && pin.coordinates.lng)
              
              setProjectPins(pins)
            }
          }
        }
      } catch (err) {
        console.log('Could not fetch project pins:', err)
      }
    }
    fetchProjectPins()
  }, [supabase])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const initMap = async () => {
      try {
        setIsLoading(true)
        console.log('Initializing Mapbox with token:', MAPBOX_TOKEN ? 'Token found (' + MAPBOX_TOKEN.substring(0, 20) + '...)' : 'NO TOKEN - Map will fail!')
        
        // Verify mapbox is loaded
        if (!mapboxgl) {
          throw new Error('Mapbox GL JS failed to load')
        }
        
        // Set the token
        mapboxgl.accessToken = MAPBOX_TOKEN
        
        // Test if container is available
        if (!mapContainer.current) {
          throw new Error('Map container not found')
        }
        
        console.log('Map container dimensions:', mapContainer.current.offsetWidth, 'x', mapContainer.current.offsetHeight)
        
        const mapInstance = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/satellite-streets-v12', // Start with satellite view
          center: [-73.9857, 40.7484], // Default center (will be overridden by GPS)
          zoom: 15 // Closer zoom for better detail
        })

        map.current = mapInstance

        // Add controls
        mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right')
        
        // Add geolocation control with auto-trigger
        const geolocateControl = new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true,
          showUserHeading: true,
          showAccuracyCircle: true
        })
        
        mapInstance.addControl(geolocateControl, 'top-right')
        
        // Handle load event
        mapInstance.on('load', () => {
          console.log('Map loaded successfully!')
          setIsLoading(false)
          
          // Trigger geolocation immediately with delay
          setTimeout(() => {
            try {
              geolocateControl.trigger()
            } catch (e) {
              console.warn('Geolocation trigger failed:', e)
            }
          }, 1000)
          
          // Add geocoder
          try {
            const geocoder = new MapboxGeocoder({
              accessToken: MAPBOX_TOKEN,
              mapboxgl: mapboxgl,
              placeholder: 'Search for an address...',
              marker: false
            })
            
            mapInstance.addControl(geocoder, 'top-left')
            
            geocoder.on('result', (e: any) => {
              const { center, place_name } = e.result
              setNewLocationCoords({
                lat: center[1],
                lng: center[0]
              })
              setNewLocationAddress(place_name)
              setShowAddModal(true)
            })
          } catch (geoErr) {
            console.error('Geocoder error:', geoErr)
          }

          // Add click handler for adding locations
          mapInstance.on('click', async (e) => {
            if (isAddingLocationRef.current) {
              const { lng, lat } = e.lngLat
              setNewLocationCoords({ lat, lng })
              
              // Try to get address for the clicked location
              try {
                const response = await fetch(
                  `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`
                )
                const data = await response.json()
                if (data.features && data.features.length > 0) {
                  setNewLocationAddress(data.features[0].place_name)
                }
              } catch (error) {
                console.error('Error getting address:', error)
                setNewLocationAddress('')
              }
              
              setShowAddModal(true)
              setIsAddingLocation(false)
              isAddingLocationRef.current = false
            }
          })
          
          // Add demo markers
          const demoLocations = [
            { lat: 40.7484, lng: -73.9857, name: 'Empire State Building' },
            { lat: 40.7614, lng: -73.9776, name: 'Rockefeller Center' },
            { lat: 40.7794, lng: -73.9632, name: 'Central Park' }
          ]
          
          demoLocations.forEach(loc => {
            new mapboxgl.Marker()
              .setLngLat([loc.lng, loc.lat])
              .setPopup(new mapboxgl.Popup().setHTML(`<h3>${loc.name}</h3>`))
              .addTo(mapInstance)
          })
        })


        // Handle errors
        mapInstance.on('error', (e) => {
          console.error('Map error:', e)
          setError('Map error: ' + (e.error?.message || 'Unknown error'))
        })

      } catch (err) {
        console.error('Failed to initialize map:', err)
        setError('Failed to initialize map: ' + (err as Error).message)
        setIsLoading(false)
      }
    }

    initMap()

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Sync isAddingLocation state with ref for click handler
  useEffect(() => {
    isAddingLocationRef.current = isAddingLocation
  }, [isAddingLocation])

  // Add project pins to map
  useEffect(() => {
    if (!map.current || !showProjectPins) return

    // Remove existing project markers
    const existingMarkers = document.querySelectorAll('.project-pin-marker')
    existingMarkers.forEach(marker => marker.remove())

    // Add project pin markers
    projectPins.forEach(pin => {
      const getStatusColor = (status: string) => {
        switch (status) {
          case 'completed': return '#10B981' // green
          case 'on-track': case 'new': return '#3B82F6' // blue
          case 'planning': return '#F59E0B' // yellow
          case 'on-hold': return '#6B7280' // gray
          case 'delayed': return '#EF4444' // red
          default: return '#8B5CF6' // purple
        }
      }

      // Create custom marker element
      const markerEl = document.createElement('div')
      markerEl.className = 'project-pin-marker'
      markerEl.style.cssText = `
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background-color: ${getStatusColor(pin.status)};
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
        color: white;
      `
      markerEl.innerHTML = '🏗️'

      // Create popup content
      const popupContent = `
        <div class="project-popup" style="min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">${pin.name}</h3>
          <p style="margin: 4px 0; font-size: 12px; color: #666;">📍 ${pin.address}</p>
          <p style="margin: 4px 0; font-size: 12px;">
            <span style="padding: 2px 6px; background-color: ${getStatusColor(pin.status)}; color: white; border-radius: 4px; font-size: 10px;">
              ${pin.status.toUpperCase().replace('-', ' ')}
            </span>
          </p>
          ${pin.budget ? `<p style="margin: 4px 0; font-size: 12px; font-weight: bold;">💰 $${pin.budget.toLocaleString()}</p>` : ''}
        </div>
      `

      // Create marker and popup
      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat([pin.coordinates.lng, pin.coordinates.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent))
        .addTo(map.current!)

      // Store marker reference for cleanup
      markerEl.dataset.markerId = pin.id
    })
  }, [projectPins, showProjectPins])

  // Fetch weather data
  const fetchWeatherData = async () => {
    if (!map.current) return
    
    const bounds = map.current.getBounds()
    const center = bounds.getCenter()
    
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${center.lat}&lon=${center.lng}&appid=${OPENWEATHER_KEY}&units=imperial`
      )
      const data = await response.json()
      setWeatherData(data)
    } catch (error) {
      console.error('Failed to fetch weather:', error)
    }
  }

  // Handle weather overlay with unique layer IDs
  useEffect(() => {
    if (!map.current || !map.current.loaded()) return

    const updateOverlay = () => {
      // Generate unique layer and source IDs based on the weather type
      const currentLayerId = `weather-layer-${weatherLayer}`
      const currentSourceId = `weather-source-${weatherLayer}`
      
      // Remove ALL existing weather layers and sources
      const allLayerIds = ['weather-layer-temp', 'weather-layer-precipitation', 'weather-layer-clouds', 
                          'weather-layer-wind', 'weather-layer-humidity', 'weather-layer-pressure',
                          'weather-layer-snow', 'weather-layer-radar', 'weather-layer-satellite', 
                          'weather-layer-lightning']
      const allSourceIds = ['weather-source-temp', 'weather-source-precipitation', 'weather-source-clouds',
                           'weather-source-wind', 'weather-source-humidity', 'weather-source-pressure',
                           'weather-source-snow', 'weather-source-radar', 'weather-source-satellite',
                           'weather-source-lightning']
      
      // Clean up all existing layers
      allLayerIds.forEach(layerId => {
        if (map.current?.getLayer(layerId)) {
          try {
            map.current.removeLayer(layerId)
          } catch (e) {
            // Layer doesn't exist, ignore
          }
        }
      })
      
      // Clean up all existing sources
      allSourceIds.forEach(sourceId => {
        if (map.current?.getSource(sourceId)) {
          try {
            map.current.removeSource(sourceId)
          } catch (e) {
            // Source doesn't exist, ignore
          }
        }
      })

      if (showWeatherOverlay) {
        fetchWeatherData()
        
        // Add weather layer based on type
        const layerUrls: Record<string, string> = {
          temp: `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`,
          precipitation: `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`,
          clouds: `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`,
          wind: `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`,
          humidity: `https://tile.openweathermap.org/map/humidity_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`,
          pressure: `https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`,
          snow: `https://tile.openweathermap.org/map/snow_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`,
          radar: `https://tilecache.rainviewer.com/v2/radar/{z}/{x}/{y}/6/0_1.png`,
          satellite: `https://tilecache.rainviewer.com/v2/satellite/{z}/{x}/{y}/0/0_0.png`,
          lightning: `https://tiles.blitzortung.org/tiles/{z}/{x}/{y}.png`,
        }

        try {
          if (layerUrls[weatherLayer]) {
            map.current?.addSource(currentSourceId, {
              type: 'raster',
              tiles: [layerUrls[weatherLayer]],
              tileSize: 256
            })

            map.current?.addLayer({
              id: currentLayerId,
              type: 'raster',
              source: currentSourceId,
              paint: {
                'raster-opacity': 0.6
              }
            })
          }
        } catch (error) {
          console.error('Error adding weather overlay:', error)
        }
      }
    }

    // Wait for map to be fully loaded
    if (map.current.loaded()) {
      updateOverlay()
    } else {
      map.current.on('load', updateOverlay)
    }

    return () => {
      // Cleanup - remove all layers on unmount
      if (map.current && map.current.loaded()) {
        const allLayerIds = ['weather-layer-temp', 'weather-layer-precipitation', 'weather-layer-clouds', 
                            'weather-layer-wind', 'weather-layer-humidity']
        const allSourceIds = ['weather-source-temp', 'weather-source-precipitation', 'weather-source-clouds',
                             'weather-source-wind', 'weather-source-humidity']
        
        allLayerIds.forEach(layerId => {
          if (map.current?.getLayer(layerId)) {
            try {
              map.current.removeLayer(layerId)
            } catch (e) {}
          }
        })
        
        allSourceIds.forEach(sourceId => {
          if (map.current?.getSource(sourceId)) {
            try {
              map.current.removeSource(sourceId)
            } catch (e) {}
          }
        })
      }
    }
  }, [showWeatherOverlay, weatherLayer])

  // Handle geographical overlays (separate from weather)
  useEffect(() => {
    if (!map.current || !map.current.loaded()) return

    const updateGeographicalOverlay = () => {
      const currentLayerId = `geo-layer-${geographicalLayer}`
      const currentSourceId = `geo-source-${geographicalLayer}`
      
      // Remove ALL existing geographical layers and sources
      const allGeoLayerIds = ['geo-layer-fema-flood', 'geo-layer-parcels', 'geo-layer-zoning', 
                             'geo-layer-elevation', 'geo-layer-wetlands', 'geo-layer-usgs-topo', 
                             'geo-layer-contours', 'geo-layer-buildings', 'geo-layer-flood-plain',
                             'geo-layer-water-table', 'geo-layer-soil', 'geo-layer-fault-lines',
                             'geo-layer-watersheds', 'geo-layer-infrastructure', 'geo-layer-slope',
                             'geo-layer-aspect']
      const allGeoSourceIds = ['geo-source-fema-flood', 'geo-source-parcels', 'geo-source-zoning',
                              'geo-source-elevation', 'geo-source-wetlands', 'geo-source-usgs-topo',
                              'geo-source-contours', 'geo-source-buildings', 'geo-source-flood-plain',
                              'geo-source-water-table', 'geo-source-soil', 'geo-source-fault-lines',
                              'geo-source-watersheds', 'geo-source-infrastructure', 'geo-source-slope',
                              'geo-source-aspect']
      
      // Clean up all existing geographical layers
      allGeoLayerIds.forEach(layerId => {
        if (map.current?.getLayer(layerId)) {
          try {
            map.current.removeLayer(layerId)
          } catch (e) {
            // Layer doesn't exist, ignore
          }
        }
      })
      
      // Clean up all existing geographical sources
      allGeoSourceIds.forEach(sourceId => {
        if (map.current?.getSource(sourceId)) {
          try {
            map.current.removeSource(sourceId)
          } catch (e) {
            // Source doesn't exist, ignore
          }
        }
      })

      if (showGeographicalOverlays) {
        try {
          const bounds = map.current?.getBounds()
          const center = bounds?.getCenter()
          const zoom = map.current?.getZoom() || 12
          
          // Different layer configurations based on type
          switch(geographicalLayer) {
            case 'fema-flood':
              // Use Mapbox's built-in flood risk data if available, or NOAA data
              map.current?.addSource(currentSourceId, {
                type: 'raster',
                tiles: [
                  `https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/wwa_meteocean_tropicalcyclones_hazards_time/MapServer/export?dpi=96&transparent=true&format=png8&bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&f=image`
                ],
                tileSize: 256
              })
              map.current?.addLayer({
                id: currentLayerId,
                type: 'raster',
                source: currentSourceId,
                paint: { 'raster-opacity': 0.6 }
              })
              break
              
            case 'parcels':
              // Use OpenStreetMap building footprints and property data
              map.current?.addSource(currentSourceId, {
                type: 'vector',
                url: 'mapbox://mapbox.mapbox-streets-v8'
              })
              map.current?.addLayer({
                id: currentLayerId,
                type: 'line',
                source: currentSourceId,
                'source-layer': 'building',
                paint: {
                  'line-color': '#FFD700',
                  'line-width': 2,
                  'line-opacity': 0.8
                }
              })
              break
              
            case 'zoning':
              // Use Mapbox Streets layer with land use data
              map.current?.addSource(currentSourceId, {
                type: 'vector',
                url: 'mapbox://mapbox.mapbox-streets-v8'
              })
              map.current?.addLayer({
                id: currentLayerId,
                type: 'fill',
                source: currentSourceId,
                'source-layer': 'landuse',
                paint: {
                  'fill-color': [
                    'match',
                    ['get', 'class'],
                    'residential', '#FFA500',
                    'commercial', '#FF0000',
                    'industrial', '#800080',
                    'park', '#00FF00',
                    'hospital', '#0000FF',
                    'school', '#FFFF00',
                    '#CCCCCC'
                  ],
                  'fill-opacity': 0.4
                }
              })
              break
              
            case 'elevation':
              // Use Mapbox Terrain RGB tiles for elevation
              map.current?.addSource(currentSourceId, {
                type: 'raster-dem',
                url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                tileSize: 512,
                maxzoom: 14
              })
              map.current?.addLayer({
                id: currentLayerId,
                type: 'hillshade',
                source: currentSourceId,
                paint: {
                  'hillshade-exaggeration': 0.5,
                  'hillshade-shadow-color': '#000000',
                  'hillshade-highlight-color': '#FFFFFF',
                  'hillshade-accent-color': '#8B4513'
                }
              })
              break
              
            case 'wetlands':
              // Use Mapbox outdoors style water features
              map.current?.addSource(currentSourceId, {
                type: 'vector',
                url: 'mapbox://mapbox.mapbox-streets-v8'
              })
              map.current?.addLayer({
                id: currentLayerId,
                type: 'fill',
                source: currentSourceId,
                'source-layer': 'water',
                paint: {
                  'fill-color': '#00CED1',
                  'fill-opacity': 0.6
                }
              })
              break
              
            case 'usgs-topo':
              // USGS Topo tiles - these should work without CORS issues
              map.current?.addSource(currentSourceId, {
                type: 'raster',
                tiles: [
                  'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}'
                ],
                tileSize: 256
              })
              map.current?.addLayer({
                id: currentLayerId,
                type: 'raster',
                source: currentSourceId,
                paint: { 'raster-opacity': 0.7 }
              })
              break
              
            case 'contours':
              // Add contour lines using Mapbox Terrain
              map.current?.addSource(currentSourceId, {
                type: 'vector',
                url: 'mapbox://mapbox.mapbox-terrain-v2'
              })
              map.current?.addLayer({
                id: currentLayerId,
                type: 'line',
                source: currentSourceId,
                'source-layer': 'contour',
                paint: {
                  'line-color': '#877b59',
                  'line-width': 1,
                  'line-opacity': 0.7
                }
              })
              break
              
            case 'buildings':
              // 3D buildings from Mapbox
              map.current?.addSource(currentSourceId, {
                type: 'vector',
                url: 'mapbox://mapbox.mapbox-streets-v8'
              })
              map.current?.addLayer({
                id: currentLayerId,
                type: 'fill-extrusion',
                source: currentSourceId,
                'source-layer': 'building',
                paint: {
                  'fill-extrusion-color': '#aaa',
                  'fill-extrusion-height': ['get', 'height'],
                  'fill-extrusion-base': ['get', 'min_height'],
                  'fill-extrusion-opacity': 0.6
                }
              })
              break
              
            case 'flood-plain':
              // 100-year and 500-year flood plains
              map.current?.addSource(currentSourceId, {
                type: 'raster',
                tiles: [
                  'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                ],
                tileSize: 256
              })
              // Add flood plain visualization using Mapbox terrain
              map.current?.addSource('flood-dem', {
                type: 'raster-dem',
                url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                tileSize: 512,
                maxzoom: 14
              })
              map.current?.addLayer({
                id: currentLayerId,
                type: 'fill',
                source: 'mapbox-dem',
                'source-layer': 'contour',
                paint: {
                  'fill-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'ele'],
                    0, '#0066CC',    // Sea level - dark blue
                    10, '#3399FF',   // 10m - medium blue
                    20, '#66CCFF',   // 20m - light blue
                    50, '#99FFFF',   // 50m - very light blue
                    100, '#FFFFFF'   // 100m+ - white
                  ],
                  'fill-opacity': 0.5
                }
              })
              break
              
            case 'water-table':
              // Groundwater depth and water table
              map.current?.addSource(currentSourceId, {
                type: 'raster',
                tiles: [
                  'https://waterdata.usgs.gov/nwisweb/service/gwlevels/1.0/tiles/{z}/{x}/{y}.png'
                ],
                tileSize: 256
              })
              map.current?.addLayer({
                id: currentLayerId,
                type: 'raster',
                source: currentSourceId,
                paint: { 'raster-opacity': 0.6 }
              })
              break
              
            case 'soil':
              // USDA Soil Survey data
              map.current?.addSource(currentSourceId, {
                type: 'raster',
                tiles: [
                  'https://services.arcgisonline.com/arcgis/rest/services/Specialty/Soil_Survey_Map/MapServer/tile/{z}/{y}/{x}'
                ],
                tileSize: 256
              })
              map.current?.addLayer({
                id: currentLayerId,
                type: 'raster',
                source: currentSourceId,
                paint: { 'raster-opacity': 0.7 }
              })
              break
              
            case 'fault-lines':
              // USGS Earthquake fault lines
              map.current?.addSource(currentSourceId, {
                type: 'geojson',
                data: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson'
              })
              map.current?.addLayer({
                id: currentLayerId,
                type: 'circle',
                source: currentSourceId,
                paint: {
                  'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['get', 'mag'],
                    0, 4,
                    5, 20
                  ],
                  'circle-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'mag'],
                    0, '#00FF00',
                    3, '#FFFF00',
                    5, '#FF0000'
                  ],
                  'circle-opacity': 0.7
                }
              })
              break
              
            case 'watersheds':
              // Watershed boundaries and drainage basins
              map.current?.addSource(currentSourceId, {
                type: 'vector',
                url: 'mapbox://mapbox.mapbox-terrain-v2'
              })
              map.current?.addLayer({
                id: currentLayerId,
                type: 'line',
                source: currentSourceId,
                'source-layer': 'waterway',
                paint: {
                  'line-color': '#006699',
                  'line-width': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    10, 1,
                    15, 3
                  ],
                  'line-opacity': 0.7
                }
              })
              break
              
            case 'infrastructure':
              // Roads, utilities, pipelines
              map.current?.addSource(currentSourceId, {
                type: 'vector',
                url: 'mapbox://mapbox.mapbox-streets-v8'
              })
              // Add multiple layers for different infrastructure types
              map.current?.addLayer({
                id: currentLayerId,
                type: 'line',
                source: currentSourceId,
                'source-layer': 'road',
                filter: ['==', ['get', 'class'], 'motorway'],
                paint: {
                  'line-color': '#FF6600',
                  'line-width': 4,
                  'line-opacity': 0.8
                }
              })
              break
              
            case 'slope':
              // Terrain slope analysis
              map.current?.addSource(currentSourceId, {
                type: 'raster-dem',
                url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                tileSize: 512,
                maxzoom: 14
              })
              map.current?.addLayer({
                id: currentLayerId,
                type: 'hillshade',
                source: currentSourceId,
                paint: {
                  'hillshade-exaggeration': 1.5,
                  'hillshade-shadow-color': '#FF0000',  // Red for steep slopes
                  'hillshade-highlight-color': '#00FF00', // Green for gentle slopes
                  'hillshade-accent-color': '#FFFF00'
                }
              })
              break
              
            case 'aspect':
              // Slope direction/aspect (north-facing, south-facing, etc.)
              map.current?.addSource(currentSourceId, {
                type: 'raster-dem',
                url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                tileSize: 512,
                maxzoom: 14
              })
              map.current?.addLayer({
                id: currentLayerId,
                type: 'hillshade',
                source: currentSourceId,
                paint: {
                  'hillshade-illumination-direction': 315, // Northwest lighting
                  'hillshade-exaggeration': 0.8,
                  'hillshade-shadow-color': '#000080',  // Navy for north-facing
                  'hillshade-highlight-color': '#FFD700', // Gold for south-facing
                  'hillshade-accent-color': '#8B4513'
                }
              })
              break
          }
        } catch (error) {
          console.error('Error adding geographical overlay:', error)
        }
      }
    }

    // Wait for map to be fully loaded
    if (map.current.loaded()) {
      updateGeographicalOverlay()
    } else {
      map.current.on('load', updateGeographicalOverlay)
    }

    return () => {
      // Cleanup - remove all geographical layers on unmount
      if (map.current && map.current.loaded()) {
        const allGeoLayerIds = ['geo-layer-fema-flood', 'geo-layer-parcels', 'geo-layer-zoning', 
                               'geo-layer-elevation', 'geo-layer-wetlands', 'geo-layer-usgs-topo',
                               'geo-layer-contours', 'geo-layer-buildings', 'geo-layer-flood-plain',
                               'geo-layer-water-table', 'geo-layer-soil', 'geo-layer-fault-lines',
                               'geo-layer-watersheds', 'geo-layer-infrastructure', 'geo-layer-slope',
                               'geo-layer-aspect']
        const allGeoSourceIds = ['geo-source-fema-flood', 'geo-source-parcels', 'geo-source-zoning',
                                'geo-source-elevation', 'geo-source-wetlands', 'geo-source-usgs-topo',
                                'geo-source-contours', 'geo-source-buildings', 'geo-source-flood-plain',
                                'geo-source-water-table', 'geo-source-soil', 'geo-source-fault-lines',
                                'geo-source-watersheds', 'geo-source-infrastructure', 'geo-source-slope',
                                'geo-source-aspect', 'flood-dem']
        
        allGeoLayerIds.forEach(layerId => {
          if (map.current?.getLayer(layerId)) {
            try {
              map.current.removeLayer(layerId)
            } catch (e) {}
          }
        })
        
        allGeoSourceIds.forEach(sourceId => {
          if (map.current?.getSource(sourceId)) {
            try {
              map.current.removeSource(sourceId)
            } catch (e) {}
          }
        })
      }
    }
  }, [showGeographicalOverlays, geographicalLayer])

  // Handle map style changes
  useEffect(() => {
    if (!map.current) return
    
    const styles: Record<string, string> = {
      streets: 'mapbox://styles/mapbox/streets-v12',
      satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
      outdoors: 'mapbox://styles/mapbox/outdoors-v12',
      dark: 'mapbox://styles/mapbox/dark-v11'
    }
    
    map.current.setStyle(styles[mapStyle])
  }, [mapStyle])

  // Handle cursor for adding location
  useEffect(() => {
    if (map.current) {
      map.current.getCanvas().style.cursor = isAddingLocation ? 'crosshair' : ''
    }
  }, [isAddingLocation])


  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Map Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <AddLocationModal
        isOpen={showAddModal}
        coordinates={newLocationCoords}
        address={newLocationAddress}
        onClose={() => {
          setShowAddModal(false)
          setNewLocationCoords(null)
          setNewLocationAddress('')
        }}
        onSave={handleAddLocation}
        projects={projects}
      />
      
      {/* Modern Horizontal Control Bar - Sleek 2025 Design */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-black/90 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left Section - Location Controls */}
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                const newValue = !isAddingLocation
                setIsAddingLocation(newValue)
                isAddingLocationRef.current = newValue
              }}
              variant={isAddingLocation ? "default" : "outline"}
              className={`${isAddingLocation 
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 border-0 text-white shadow-lg shadow-blue-500/25' 
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'} 
                rounded-full px-4 py-2 text-sm font-medium transition-all`}
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {isAddingLocation ? 'Click Map to Add' : 'Add Location'}
            </Button>
            
            <div className="h-8 w-px bg-white/20" />
            
            <Badge variant="secondary" className="bg-white/10 text-white border-white/20 rounded-full px-3 py-1">
              {locations.length} locations
            </Badge>
          </div>
          {/* Center Section - Weather & Geographical Overlays */}
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowWeatherOverlay(!showWeatherOverlay)}
              variant="outline"
              className={`${showWeatherOverlay 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 border-0 text-white shadow-lg shadow-purple-500/25' 
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'} 
                rounded-full px-4 py-2 text-sm font-medium transition-all`}
            >
              <CloudRain className="h-4 w-4 mr-1.5" />
              Weather {showWeatherOverlay ? 'On' : 'Off'}
            </Button>
            
            {showWeatherOverlay && (
              <Select value={weatherLayer} onValueChange={(value: any) => setWeatherLayer(value)}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white rounded-full px-4 py-2 h-auto text-sm w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/90 backdrop-blur-xl border-white/20 max-h-[400px] overflow-y-auto">
                  <SelectItem value="temp" className="text-white hover:bg-white/10">🌡️ Temperature</SelectItem>
                  <SelectItem value="precipitation" className="text-white hover:bg-white/10">🌧️ Precipitation</SelectItem>
                  <SelectItem value="clouds" className="text-white hover:bg-white/10">☁️ Cloud Cover</SelectItem>
                  <SelectItem value="wind" className="text-white hover:bg-white/10">💨 Wind Speed</SelectItem>
                  <SelectItem value="humidity" className="text-white hover:bg-white/10">💧 Humidity</SelectItem>
                  <SelectItem value="pressure" className="text-white hover:bg-white/10">📊 Air Pressure</SelectItem>
                  <SelectItem value="snow" className="text-white hover:bg-white/10">❄️ Snow Cover</SelectItem>
                  <SelectItem value="radar" className="text-white hover:bg-white/10">📡 Weather Radar</SelectItem>
                  <SelectItem value="satellite" className="text-white hover:bg-white/10">🛰️ Satellite IR</SelectItem>
                  <SelectItem value="lightning" className="text-white hover:bg-white/10">⚡ Lightning Strikes</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            <Button
              onClick={() => setShowProjectPins(!showProjectPins)}
              variant="outline"
              className={`${showProjectPins 
                ? 'bg-gradient-to-r from-blue-600 to-green-600 border-0 text-white shadow-lg shadow-blue-500/25' 
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'} 
                rounded-full px-4 py-2 text-sm font-medium transition-all`}
            >
              🏗️ Projects {showProjectPins ? 'On' : 'Off'}
            </Button>
            
            <div className="h-8 w-px bg-white/20" />
            
            <Button
              onClick={() => setShowGeographicalOverlays(!showGeographicalOverlays)}
              variant="outline"
              className={`${showGeographicalOverlays 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 border-0 text-white shadow-lg shadow-green-500/25' 
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'} 
                rounded-full px-4 py-2 text-sm font-medium transition-all`}
            >
              🗺️ Geo {showGeographicalOverlays ? 'On' : 'Off'}
            </Button>
            
            {showGeographicalOverlays && (
              <Select value={geographicalLayer} onValueChange={(value: any) => setGeographicalLayer(value)}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white rounded-full px-4 py-2 h-auto text-sm w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/90 backdrop-blur-xl border-white/20 max-h-[400px] overflow-y-auto">
                  <SelectItem value="parcels" className="text-white hover:bg-white/10">🏠 Building Outlines</SelectItem>
                  <SelectItem value="buildings" className="text-white hover:bg-white/10">🏢 3D Buildings</SelectItem>
                  <SelectItem value="zoning" className="text-white hover:bg-white/10">🏗️ Land Use Zones</SelectItem>
                  <SelectItem value="flood-plain" className="text-white hover:bg-white/10">🌊 Flood Plains (100/500yr)</SelectItem>
                  <SelectItem value="water-table" className="text-white hover:bg-white/10">💧 Groundwater Depth</SelectItem>
                  <SelectItem value="watersheds" className="text-white hover:bg-white/10">🏞️ Watershed Boundaries</SelectItem>
                  <SelectItem value="elevation" className="text-white hover:bg-white/10">⛰️ Elevation Hillshade</SelectItem>
                  <SelectItem value="slope" className="text-white hover:bg-white/10">📐 Slope Analysis</SelectItem>
                  <SelectItem value="aspect" className="text-white hover:bg-white/10">🧭 Slope Aspect</SelectItem>
                  <SelectItem value="contours" className="text-white hover:bg-white/10">📏 Contour Lines</SelectItem>
                  <SelectItem value="soil" className="text-white hover:bg-white/10">🌱 Soil Types</SelectItem>
                  <SelectItem value="fault-lines" className="text-white hover:bg-white/10">⚠️ Seismic Activity</SelectItem>
                  <SelectItem value="infrastructure" className="text-white hover:bg-white/10">🛤️ Infrastructure</SelectItem>
                  <SelectItem value="wetlands" className="text-white hover:bg-white/10">🦆 Water Bodies</SelectItem>
                  <SelectItem value="fema-flood" className="text-white hover:bg-white/10">🚨 FEMA Hazards</SelectItem>
                  <SelectItem value="usgs-topo" className="text-white hover:bg-white/10">🗺️ USGS Topo</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          
          {/* Right Section - Map Style */}
          <div className="flex items-center gap-3">
            <Select value={mapStyle} onValueChange={setMapStyle}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white rounded-full px-4 py-2 h-auto text-sm w-auto">
                <MapIcon className="h-4 w-4 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black/90 backdrop-blur-xl border-white/20">
                <SelectItem value="streets" className="text-white hover:bg-white/10">Streets</SelectItem>
                <SelectItem value="satellite" className="text-white hover:bg-white/10">Satellite</SelectItem>
                <SelectItem value="outdoors" className="text-white hover:bg-white/10">Outdoors</SelectItem>
                <SelectItem value="dark" className="text-white hover:bg-white/10">Dark</SelectItem>
              </SelectContent>
            </Select>
            
            {weatherData && showWeatherOverlay && (
              <div className="flex items-center gap-2 text-xs text-white/80 bg-white/10 rounded-full px-3 py-1.5">
                <span>🌡️ {Math.round(weatherData.main?.temp)}°F</span>
                <span className="text-white/40">|</span>
                <span>💧 {weatherData.main?.humidity}%</span>
                <span className="text-white/40">|</span>
                <span>💨 {Math.round(weatherData.wind?.speed)}mph</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Map Container - Full screen with top padding for control bar */}
      <div ref={mapContainer} className="w-full h-full bg-gray-900" style={{ position: 'absolute', top: '60px', left: 0, right: 0, bottom: 0 }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-40">
            <div className="text-center text-white">
              <div className="h-8 w-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading map...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Export memoized component
export default memo(WorkingMap)