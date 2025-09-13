'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  MapPin, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Building, 
  Navigation,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProjects } from '@/lib/hooks/use-projects'
import { useCurrentTenant } from '@/components/tenant/tenant-switcher'

interface ProjectPin {
  id: string
  name: string
  address: string
  coordinates: { lat: number; lng: number }
  status: string
  budget?: number
  start_date?: string
  end_date?: string
}

interface MapLayer {
  id: string
  name: string
  visible: boolean
  color: string
  icon: any
  pins: ProjectPin[]
}

interface ProjectMapProps {
  className?: string
  height?: string
  showControls?: boolean
  selectedProject?: string
  onProjectSelect?: (projectId: string) => void
}

// Simple OpenStreetMap implementation using Leaflet-style approach
export function ProjectMap({ 
  className, 
  height = "400px", 
  showControls = true,
  selectedProject,
  onProjectSelect 
}: ProjectMapProps) {
  const { tenant } = useCurrentTenant()
  const { data: projectsData } = useProjects()
  const projects = projectsData?.data || []

  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.0060 }) // Default to NYC
  const [zoomLevel, setZoomLevel] = useState(10)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showLayers, setShowLayers] = useState(false)
  const [mapPins, setMapPins] = useState<ProjectPin[]>([])
  
  const [layers, setLayers] = useState<MapLayer[]>([
    {
      id: 'active-projects',
      name: 'Active Projects',
      visible: true,
      color: '#10B981', // green
      icon: Building,
      pins: []
    },
    {
      id: 'completed-projects', 
      name: 'Completed Projects',
      visible: true,
      color: '#6B7280', // gray
      icon: Building,
      pins: []
    },
    {
      id: 'planning-projects',
      name: 'Planning Phase',
      visible: true, 
      color: '#F59E0B', // yellow
      icon: Building,
      pins: []
    }
  ])

  // Convert projects to map pins with geocoding
  const processProjectsToMapPins = useCallback(async (projects: any[]) => {
    const pins: ProjectPin[] = []
    
    for (const project of projects) {
      if (project.address) {
        try {
          // Use Nominatim for geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(project.address)}&limit=1`
          )
          const data = await response.json()
          
          if (data && data.length > 0) {
            const pin: ProjectPin = {
              id: project.id,
              name: project.name,
              address: project.address,
              coordinates: {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
              },
              status: project.status,
              budget: project.budget,
              start_date: project.start_date,
              end_date: project.end_date
            }
            pins.push(pin)
          }
        } catch (error) {
          console.error(`Failed to geocode address for project ${project.name}:`, error)
        }
      }
    }
    
    setMapPins(pins)
    
    // Update layers with pins
    setLayers(prev => prev.map(layer => ({
      ...layer,
      pins: pins.filter(pin => {
        switch (layer.id) {
          case 'active-projects':
            return pin.status === 'on-track' || pin.status === 'new'
          case 'completed-projects':
            return pin.status === 'completed'
          case 'planning-projects':
            return pin.status === 'planning' || pin.status === 'on-hold'
          default:
            return false
        }
      })
    })))

    // Center map on first pin if available
    if (pins.length > 0) {
      setMapCenter(pins[0].coordinates)
    }
  }, [])

  // Process projects when data changes
  useEffect(() => {
    if (projects && projects.length > 0) {
      processProjectsToMapPins(projects)
    }
  }, [projects, processProjectsToMapPins])

  const toggleLayer = (layerId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
    ))
  }

  const handlePinClick = (pin: ProjectPin) => {
    onProjectSelect?.(pin.id)
    setMapCenter(pin.coordinates)
  }

  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 1, 18))
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 1, 1))

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981'
      case 'on-track': case 'new': return '#3B82F6' 
      case 'planning': return '#F59E0B'
      case 'on-hold': return '#6B7280'
      case 'delayed': return '#EF4444'
      default: return '#8B5CF6'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'on-track': return 'Active'
      case 'new': return 'New'
      case 'planning': return 'Planning'
      case 'on-hold': return 'On Hold'
      case 'completed': return 'Completed'
      case 'delayed': return 'Delayed'
      default: return status
    }
  }

  return (
    <div className={cn("relative", isFullscreen && "fixed inset-0 z-50 bg-white", className)}>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Project Locations
              <Badge variant="outline" className="ml-2">
                {mapPins.length} projects
              </Badge>
            </CardTitle>
            
            {showControls && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLayers(!showLayers)}
                  className="flex items-center gap-1"
                >
                  <Layers className="h-4 w-4" />
                  Layers
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-0 relative">
          {/* Map Container */}
          <div 
            className="relative bg-gradient-to-br from-blue-50 to-green-50 border border-gray-200 overflow-hidden"
            style={{ height: isFullscreen ? 'calc(100vh - 120px)' : height }}
          >
            {/* Placeholder Map Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-green-50 to-blue-50">
              {/* Grid Pattern */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                                   linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
                  backgroundSize: '50px 50px'
                }}
              />
            </div>

            {/* Project Pins */}
            <div className="absolute inset-0">
              {layers.map(layer => 
                layer.visible && layer.pins.map(pin => (
                  <div
                    key={pin.id}
                    className={cn(
                      "absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 hover:scale-110 hover:z-10",
                      selectedProject === pin.id && "scale-125 z-20 drop-shadow-lg"
                    )}
                    style={{
                      left: `${50 + (pin.coordinates.lng - mapCenter.lng) * 100}%`,
                      top: `${50 - (pin.coordinates.lat - mapCenter.lat) * 100}%`
                    }}
                    onClick={() => handlePinClick(pin)}
                    title={`${pin.name} - ${pin.address}`}
                  >
                    <div className="relative">
                      {/* Pin Icon */}
                      <div 
                        className="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
                        style={{ backgroundColor: getStatusColor(pin.status) }}
                      >
                        <Building className="h-4 w-4 text-white" />
                      </div>
                      
                      {/* Pin Stem */}
                      <div 
                        className="absolute top-8 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent"
                        style={{ borderTopColor: getStatusColor(pin.status) }}
                      />
                      
                      {/* Hover Card */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <div className="bg-white p-3 rounded-lg shadow-lg border min-w-[200px] text-left">
                          <h4 className="font-semibold text-sm text-gray-900">{pin.name}</h4>
                          <p className="text-xs text-gray-600 mt-1">{pin.address}</p>
                          <div className="flex items-center justify-between mt-2">
                            <Badge 
                              variant="outline" 
                              className="text-xs"
                              style={{ color: getStatusColor(pin.status), borderColor: getStatusColor(pin.status) }}
                            >
                              {getStatusLabel(pin.status)}
                            </Badge>
                            {pin.budget && (
                              <span className="text-xs font-medium text-gray-700">
                                ${pin.budget.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Map Controls */}
            {showControls && (
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-30">
                <Button variant="outline" size="icon" onClick={zoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={zoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Center Crosshair */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <Navigation className="h-6 w-6 text-gray-400 opacity-50" />
            </div>
          </div>

          {/* Layer Controls Panel */}
          {showLayers && (
            <div className="absolute top-4 left-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[250px] z-40">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Map Layers
              </h4>
              
              {layers.map(layer => (
                <div key={layer.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: layer.visible ? layer.color : '#E5E7EB' }}
                    />
                    <div>
                      <Label className="text-sm font-medium">{layer.name}</Label>
                      <p className="text-xs text-gray-500">{layer.pins.length} projects</p>
                    </div>
                  </div>
                  <Switch 
                    checked={layer.visible}
                    onCheckedChange={() => toggleLayer(layer.id)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 bg-white border border-gray-200 rounded-lg shadow p-3">
            <h5 className="text-xs font-semibold mb-2">Project Status</h5>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Complete</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>Planning</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500" />
                <span>On Hold</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ProjectMap