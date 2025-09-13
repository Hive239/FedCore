"use client"

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Dynamically import the working map component to avoid SSR issues with Mapbox
const WorkingMap = dynamic(
  () => import('@/components/map/working-map'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    )
  }
)

export default function MapPage() {
  return (
    <div className="h-[calc(100vh-4rem)] w-full">
      <WorkingMap />
    </div>
  )
}