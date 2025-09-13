"use client"

import { useEffect, useRef, useCallback, memo } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

// Use environment variable with fallback
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 
  'pk.eyJ1IjoibXBhcmlzaCIsImEiOiJjbWVuamF3aW0wY2d6MmlvaGRneTh5cWR0In0.Po5NkfuUySiKy8aSP7R7EA'

interface MapCoreProps {
  locations: Array<{ id: string; lat: number; lng: number; name: string }>
  onLocationClick?: (location: any) => void
  enableWeather?: boolean
  onError?: (error: Error) => void
}

/**
 * Core map component - only loaded when needed
 * Implements performance optimizations and error handling
 */
export const MapCore = memo(({ 
  locations, 
  onLocationClick, 
  enableWeather,
  onError 
}: MapCoreProps) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markers = useRef<mapboxgl.Marker[]>([])

  // Cleanup function
  const cleanup = useCallback(() => {
    markers.current.forEach(marker => marker.remove())
    markers.current = []
    if (map.current) {
      map.current.remove()
      map.current = null
    }
  }, [])

  // Initialize map with error handling
  useEffect(() => {
    if (!mapContainer.current) return

    const initializeMap = async () => {
      try {
        // Set token
        mapboxgl.accessToken = MAPBOX_TOKEN

        // Create map with performance settings
        const mapInstance = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [-74.006, 40.7128], // NYC
          zoom: 10,
          // Performance optimizations
          antialias: false,
          refreshExpiredTiles: false,
          maxTileCacheSize: 50,
          trackResize: true
        })

        map.current = mapInstance

        // Add navigation controls
        mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right')

        // Handle map load with timeout
        const loadTimeout = setTimeout(() => {
          if (onError) {
            onError(new Error('Map loading timeout - please refresh'))
          }
        }, 15000) // 15 second timeout

        mapInstance.on('load', () => {
          clearTimeout(loadTimeout)
          
          // Add markers for locations
          locations.forEach(location => {
            const marker = new mapboxgl.Marker()
              .setLngLat([location.lng, location.lat])
              .setPopup(
                new mapboxgl.Popup({ offset: 25 }).setHTML(
                  `<div class="p-2">
                    <h3 class="font-semibold">${location.name}</h3>
                  </div>`
                )
              )
              .addTo(mapInstance)
            
            markers.current.push(marker)
            
            // Handle marker click
            if (onLocationClick) {
              marker.getElement().addEventListener('click', () => {
                onLocationClick(location)
              })
            }
          })
        })

        // Handle errors
        mapInstance.on('error', (e) => {
          console.error('Map error:', e)
          if (onError) {
            onError(new Error('Map rendering error'))
          }
        })

      } catch (err) {
        console.error('Failed to initialize map:', err)
        if (onError) {
          onError(err as Error)
        }
      }
    }

    initializeMap()

    // Cleanup on unmount
    return cleanup
  }, [locations, onLocationClick, onError, cleanup])

  // Update markers when locations change
  useEffect(() => {
    if (!map.current || !map.current.loaded()) return

    // Clear existing markers
    markers.current.forEach(marker => marker.remove())
    markers.current = []

    // Add new markers
    locations.forEach(location => {
      const marker = new mapboxgl.Marker()
        .setLngLat([location.lng, location.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <h3 class="font-semibold">${location.name}</h3>
            </div>`
          )
        )
        .addTo(map.current!)
      
      markers.current.push(marker)
    })
  }, [locations])

  return <div ref={mapContainer} className="h-full w-full" />
})

MapCore.displayName = 'MapCore'