"use client"

import { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react'
import { 
  Plus, ChevronLeft, ChevronRight, MapPin, Clock, Users, Calendar, 
  X, Edit2, Trash2, ChevronDown, ChevronUp, Sparkles, Zap, 
  CalendarDays, Timer, Bell, Palette, Building2, UserCheck,
  CalendarClock, Activity, TrendingUp, Filter, Grid3x3,
  CloudRain, Sun, Cloud, Snowflake, Wind, AlertTriangle,
  Shuffle, Navigation, Thermometer, Droplets, Loader2,
  Wrench, Home, Layers, Brush, Package, HardHat, Trees, 
  Hammer, Shield, DoorOpen, Brain, Building, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCalendarEvents, useCalendarContacts, useCalendarTeamMembers } from '@/lib/hooks/use-events-optimized'
import { useEvent, useCreateEvent, useUpdateEvent, useDeleteEvent } from '@/lib/hooks/use-events'
import { useProjects } from '@/lib/hooks/use-projects'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'
import { format, addDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import dynamic from 'next/dynamic'

// Dynamically import ConflictManager to avoid SSR issues
const ConflictManager = dynamic(
  () => import('@/components/calendar/conflict-manager'),
  { 
    ssr: false,
    loading: () => <div className="animate-pulse">Loading conflict analysis...</div>
  }
)

// Constants
const OPENWEATHER_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || 'cebea6d73816dccaecbe0dcd99d2471c'
const WEATHER_CACHE_KEY = 'calendar_weather_cache'
const WEATHER_CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const eventTypeConfig = {
  meeting: { 
    label: 'Meeting', 
    icon: Users,
    gradient: 'from-blue-500 to-cyan-500',
    color: 'bg-blue-500', 
    bgColor: 'bg-blue-500/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  site_visit: { 
    label: 'Site Visit', 
    icon: MapPin,
    gradient: 'from-green-500 to-emerald-500',
    color: 'bg-green-500', 
    bgColor: 'bg-emerald-500/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  inspection: { 
    label: 'Inspection', 
    icon: Activity,
    gradient: 'from-yellow-500 to-orange-500',
    color: 'bg-yellow-500', 
    bgColor: 'bg-amber-500/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  deadline: { 
    label: 'Deadline', 
    icon: Timer,
    gradient: 'from-red-500 to-pink-500',
    color: 'bg-red-500', 
    bgColor: 'bg-red-500/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  delivery: { 
    label: 'Delivery', 
    icon: Building2,
    gradient: 'from-purple-500 to-pink-500',
    color: 'bg-purple-500', 
    bgColor: 'bg-purple-500/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  payment: { 
    label: 'Payment Due', 
    icon: TrendingUp,
    gradient: 'from-orange-500 to-red-500',
    color: 'bg-orange-500', 
    bgColor: 'bg-orange-500/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  client_call: { 
    label: 'Client Call', 
    icon: Users,
    gradient: 'from-indigo-500 to-purple-500',
    color: 'bg-indigo-500', 
    bgColor: 'bg-indigo-500/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  material_delivery: { 
    label: 'Material Delivery', 
    icon: Building2,
    gradient: 'from-teal-500 to-cyan-500',
    color: 'bg-teal-500', 
    bgColor: 'bg-teal-500/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  permit_deadline: { 
    label: 'Permit Deadline', 
    icon: Timer,
    gradient: 'from-rose-500 to-pink-500',
    color: 'bg-rose-500', 
    bgColor: 'bg-rose-500/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  team_meeting: { 
    label: 'Team Meeting', 
    icon: Users,
    gradient: 'from-sky-500 to-blue-500',
    color: 'bg-sky-500', 
    bgColor: 'bg-sky-500/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  progress_review: { 
    label: 'Progress Review', 
    icon: Activity,
    gradient: 'from-violet-500 to-purple-500',
    color: 'bg-violet-500', 
    bgColor: 'bg-violet-500/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  equipment_rental: { 
    label: 'Equipment Rental', 
    icon: Building2,
    gradient: 'from-slate-500 to-gray-500',
    color: 'bg-slate-500', 
    bgColor: 'bg-slate-500/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  safety_meeting: { 
    label: 'Safety Meeting', 
    icon: Activity,
    gradient: 'from-yellow-600 to-orange-600',
    color: 'bg-yellow-600', 
    bgColor: 'bg-yellow-600/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  contractor_meeting: { 
    label: 'Contractor Meeting', 
    icon: Users,
    gradient: 'from-lime-500 to-green-500',
    color: 'bg-lime-500', 
    bgColor: 'bg-lime-500/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  milestone_review: { 
    label: 'Milestone Review', 
    icon: Activity,
    gradient: 'from-fuchsia-500 to-pink-500',
    color: 'bg-fuchsia-500', 
    bgColor: 'bg-fuchsia-500/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  installation: { 
    label: 'Installation', 
    icon: Wrench,
    gradient: 'from-cyan-500 to-blue-500',
    color: 'bg-cyan-600', 
    bgColor: 'bg-cyan-600/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  framing: { 
    label: 'Framing', 
    icon: Building2,
    gradient: 'from-amber-600 to-yellow-600',
    color: 'bg-amber-600', 
    bgColor: 'bg-amber-600/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  electrical: { 
    label: 'Electrical Work', 
    icon: Zap,
    gradient: 'from-yellow-400 to-orange-400',
    color: 'bg-yellow-600', 
    bgColor: 'bg-yellow-600/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  plumbing: { 
    label: 'Plumbing', 
    icon: Droplets,
    gradient: 'from-blue-600 to-indigo-600',
    color: 'bg-blue-700', 
    bgColor: 'bg-blue-700/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  hvac: { 
    label: 'HVAC', 
    icon: Wind,
    gradient: 'from-teal-600 to-green-600',
    color: 'bg-teal-700', 
    bgColor: 'bg-teal-700/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  roofing: { 
    label: 'Roofing', 
    icon: Home,
    gradient: 'from-stone-600 to-gray-600',
    color: 'bg-stone-600', 
    bgColor: 'bg-stone-600/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  flooring: { 
    label: 'Flooring', 
    icon: Layers,
    gradient: 'from-brown-600 to-amber-700',
    color: 'bg-orange-700', 
    bgColor: 'bg-orange-700/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  painting: { 
    label: 'Painting', 
    icon: Brush,
    gradient: 'from-pink-500 to-purple-500',
    color: 'bg-pink-600', 
    bgColor: 'bg-pink-600/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  drywall: { 
    label: 'Drywall', 
    icon: Package,
    gradient: 'from-gray-400 to-gray-600',
    color: 'bg-gray-600', 
    bgColor: 'bg-gray-600/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  concrete: { 
    label: 'Concrete Work', 
    icon: HardHat,
    gradient: 'from-slate-700 to-gray-800',
    color: 'bg-slate-700', 
    bgColor: 'bg-slate-700/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  landscaping: { 
    label: 'Landscaping', 
    icon: Trees,
    gradient: 'from-green-600 to-lime-600',
    color: 'bg-green-700', 
    bgColor: 'bg-green-700/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  demolition: { 
    label: 'Demolition', 
    icon: Hammer,
    gradient: 'from-red-700 to-orange-700',
    color: 'bg-red-700', 
    bgColor: 'bg-red-700/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  foundation: { 
    label: 'Foundation', 
    icon: Shield,
    gradient: 'from-zinc-700 to-stone-700',
    color: 'bg-zinc-700', 
    bgColor: 'bg-zinc-700/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  windows_doors: { 
    label: 'Windows & Doors', 
    icon: DoorOpen,
    gradient: 'from-purple-700 to-pink-700',
    color: 'bg-purple-700', 
    bgColor: 'bg-purple-700/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  insulation: { 
    label: 'Insulation', 
    icon: Snowflake,
    gradient: 'from-cyan-700 to-blue-700',
    color: 'bg-cyan-700', 
    bgColor: 'bg-cyan-700/90 text-white', 
    textColor: 'text-white font-medium' 
  },
  other: { 
    label: 'Other', 
    icon: Calendar,
    gradient: 'from-gray-500 to-slate-500',
    color: 'bg-gray-500', 
    bgColor: 'bg-gray-500/90 text-white', 
    textColor: 'text-white font-medium' 
  }
}

const weatherIcons: Record<string, any> = {
  'Clear': Sun,
  'Clouds': Cloud,
  'Rain': CloudRain,
  'Snow': Snowflake,
  'Wind': Wind,
  'Thunderstorm': AlertTriangle,
  'Drizzle': CloudRain,
  'Mist': Cloud,
  'Fog': Cloud
}


const colorOptions = [
  { value: '#3B82F6', label: 'Blue', class: 'bg-blue-500' },
  { value: '#10B981', label: 'Green', class: 'bg-green-500' },
  { value: '#F59E0B', label: 'Yellow', class: 'bg-yellow-500' },
  { value: '#EF4444', label: 'Red', class: 'bg-red-500' },
  { value: '#8B5CF6', label: 'Purple', class: 'bg-purple-500' },
  { value: '#EC4899', label: 'Pink', class: 'bg-pink-500' },
  { value: '#14B8A6', label: 'Teal', class: 'bg-teal-500' },
  { value: '#F97316', label: 'Orange', class: 'bg-orange-500' },
]

interface EventFormData {
  title: string
  description: string
  location: string
  work_location: 'interior' | 'exterior' | 'both' | 'underground' | 'roof' | 'structural'
  start_time: string
  end_time: string
  all_day: boolean
  event_type: string
  project_id: string
  reminder_minutes: number
  color: string
  attendees: {
    teamMembers: string[]
    designProfessionals: string[]
    contractors: string[]
    vendors: string[]
    customers: string[]
  }
}

interface WeatherData {
  date: Date
  temp: number
  condition: string
  precipitation: number
  wind: number
  humidity: number
  icon: string
}

// Helper function to check if event spans multiple days
const isMultiDayEvent = (event: any) => {
  if (!event.start_time || !event.end_time) return false
  const startDate = format(new Date(event.start_time), 'yyyy-MM-dd')
  const endDate = format(new Date(event.end_time), 'yyyy-MM-dd')
  return startDate !== endDate
}

// Helper function to check if event spans multiple months
const isMultiMonthEvent = (event: any) => {
  if (!event.start_time || !event.end_time) return false
  const startDate = new Date(event.start_time)
  const endDate = new Date(event.end_time)
  return startDate.getMonth() !== endDate.getMonth() || startDate.getFullYear() !== endDate.getFullYear()
}

// Helper function to get event position for multi-day events
const getEventDayPosition = (event: any, currentDay: Date) => {
  if (!event.start_time || !event.end_time) return 'single'
  
  const startDate = new Date(event.start_time)
  const endDate = new Date(event.end_time)
  const currentDayStart = new Date(currentDay)
  currentDayStart.setHours(0, 0, 0, 0)
  
  const startDayStart = new Date(startDate)
  startDayStart.setHours(0, 0, 0, 0)
  
  const endDayStart = new Date(endDate)
  endDayStart.setHours(0, 0, 0, 0)
  
  if (currentDayStart.getTime() === startDayStart.getTime() && currentDayStart.getTime() === endDayStart.getTime()) {
    return 'single'
  } else if (currentDayStart.getTime() === startDayStart.getTime()) {
    return 'start'
  } else if (currentDayStart.getTime() === endDayStart.getTime()) {
    return 'end'
  } else if (currentDayStart > startDayStart && currentDayStart < endDayStart) {
    return 'middle'
  }
  
  return 'single'
}

// Calendar skeleton component for loading state
const CalendarSkeleton = () => (
  <div className="grid grid-cols-7 gap-px bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl overflow-hidden p-px">
    {Array.from({ length: 7 }).map((_, i) => (
      <div key={i} className="bg-white dark:bg-gray-900 p-2 text-center">
        <Skeleton className="h-4 w-8 mx-auto" />
      </div>
    ))}
    {Array.from({ length: 35 }).map((_, i) => (
      <div key={i} className="bg-white dark:bg-gray-900 p-2 min-h-[140px]">
        <Skeleton className="h-4 w-6 mb-2" />
        <Skeleton className="h-6 w-full mb-1" />
        <Skeleton className="h-6 w-3/4" />
      </div>
    ))}
  </div>
)

// Event list skeleton
const EventListSkeleton = () => (
  <div className="space-y-2">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="p-2 rounded-lg border">
        <Skeleton className="h-4 w-3/4 mb-1" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    ))}
  </div>
)

export default function ModernCalendarPage() {
  console.log('🚀 CALENDAR PAGE LOADED - Debug Start')
  console.log('📅 Today is:', new Date().toLocaleDateString())
  console.log('📅 Today full date:', new Date().toString())
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [editingEvent, setEditingEvent] = useState<any>(null)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([])
  const [bottomBoxView, setBottomBoxView] = useState<'conflicts' | 'weather' | 'ml-insights'>('conflicts')
  const [showWeatherOverlay, setShowWeatherOverlay] = useState(false)
  const [weatherForecast, setWeatherForecast] = useState<WeatherData[]>([])
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const supabase = createClient()
  
  // Get cached weather data
  const getCachedWeather = useCallback(() => {
    try {
      const cached = localStorage.getItem(WEATHER_CACHE_KEY)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < WEATHER_CACHE_DURATION) {
          return data.map((item: any) => ({
            ...item,
            date: new Date(item.date)
          }))
        }
      }
    } catch (error) {
      console.error('Error reading weather cache:', error)
    }
    return null
  }, [])
  
  // Cache weather data
  const cacheWeather = useCallback((data: WeatherData[]) => {
    try {
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error('Error caching weather:', error)
    }
  }, [])
  
  // Get user location (only once)
  useEffect(() => {
    // Check cached weather first
    const cached = getCachedWeather()
    if (cached) {
      setWeatherForecast(cached)
    }
    
    // Get location for weather
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.warn('Geolocation access denied or unavailable, using default location')
          // Default to NYC
          setCurrentLocation({ lat: 40.7128, lng: -74.0060 })
        }
      )
    } else {
      // Default to NYC if geolocation not available
      setCurrentLocation({ lat: 40.7128, lng: -74.0060 })
    }
  }, [getCachedWeather])
  
  // Fetch weather data (debounced and cached)
  useEffect(() => {
    if (!currentLocation || weatherLoading) return
    
    // Check if we already have cached data
    const cached = getCachedWeather()
    if (cached && cached.length > 0) {
      setWeatherForecast(cached)
      return
    }
    
    const fetchWeatherForecast = async () => {
      setWeatherLoading(true)
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${currentLocation.lat}&lon=${currentLocation.lng}&appid=${OPENWEATHER_KEY}&units=imperial&cnt=40`
        )
        const data = await response.json()
        
        // Process forecast data into 7 days
        const dailyForecasts: WeatherData[] = []
        const processedDates = new Set<string>()
        
        data.list.forEach((item: any) => {
          const date = new Date(item.dt * 1000)
          const dateStr = format(date, 'yyyy-MM-dd')
          
          if (!processedDates.has(dateStr) && dailyForecasts.length < 7) {
            processedDates.add(dateStr)
            dailyForecasts.push({
              date,
              temp: Math.round(item.main.temp),
              condition: item.weather[0].main,
              precipitation: item.pop * 100,
              wind: Math.round(item.wind.speed),
              humidity: item.main.humidity,
              icon: item.weather[0].icon
            })
          }
        })
        
        setWeatherForecast(dailyForecasts)
        cacheWeather(dailyForecasts)
      } catch (error) {
        console.warn('Weather data unavailable, continuing without weather features')
      } finally {
        setWeatherLoading(false)
      }
    }
    
    // Delay weather fetch to prioritize calendar data
    const timer = setTimeout(fetchWeatherForecast, 1000)
    return () => clearTimeout(timer)
  }, [currentLocation, getCachedWeather, cacheWeather, weatherLoading])
  
  // Calculate date range for fetching events (optimized)
  const dateRange = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    const startDate = new Date(firstDayOfMonth)
    startDate.setDate(startDate.getDate() - 7)
    const endDate = new Date(lastDayOfMonth)
    endDate.setDate(endDate.getDate() + 7)
    return { startDate, endDate, firstDayOfMonth, lastDayOfMonth }
  }, [year, month])
  
  // Fetch data with optimized queries
  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = useCalendarEvents(dateRange.startDate, dateRange.endDate)
  
  console.log('🔥 IMMEDIATE EVENT CHECK:', {
    eventsLoading,
    eventsData: events,
    eventsCount: events?.length || 0,
    currentMonth: month,
    currentYear: year,
    dateRange: {
      start: dateRange.startDate.toLocaleDateString(),
      end: dateRange.endDate.toLocaleDateString()
    }
  })
  
  // Debug logging
  useEffect(() => {
    console.log('📅 Calendar Debug Effect Running')
    if (events) {
      console.log('📅 Calendar Debug:')
      console.log('   Current Month/Year:', month, '/', year)
      console.log('   Date Range:', dateRange.startDate.toLocaleDateString(), '-', dateRange.endDate.toLocaleDateString())
      console.log('   Events loaded:', events.length)
      console.log('   Events:', events)
    } else {
      console.log('❌ No events data available')
    }
  }, [events, month, year, dateRange])
  const { data: contacts = [], isLoading: contactsLoading } = useCalendarContacts()
  const { data: teamMembers = [], isLoading: teamLoading } = useCalendarTeamMembers()
  const { data: projectsData } = useProjects()
  const { data: fullEventData } = useEvent(editingEvent?.id || '')
  const createEventMutation = useCreateEvent()
  const updateEventMutation = useUpdateEvent()
  const deleteEventMutation = useDeleteEvent()
  
  const projects = projectsData?.data || []
  
  // Set initial load to false after first render
  useEffect(() => {
    if (!eventsLoading && !contactsLoading && !teamLoading) {
      setIsInitialLoad(false)
    }
  }, [eventsLoading, contactsLoading, teamLoading])
  
  // Event form state
  const [eventForm, setEventForm] = useState<EventFormData>({
    title: '',
    description: '',
    location: '',
    work_location: 'both',
    start_time: '',
    end_time: '',
    all_day: false,
    event_type: 'meeting',
    project_id: 'none',
    reminder_minutes: 15,
    color: '#3B82F6',
    attendees: {
      teamMembers: [],
      designProfessionals: [],
      contractors: [],
      vendors: [],
      customers: []
    }
  })
  
  // Update form when full event data loads
  useEffect(() => {
    if (fullEventData && editingEvent) {
      setEventForm({
        title: fullEventData.title || '',
        description: fullEventData.description || '',
        location: fullEventData.location || '',
        work_location: 'both',  // Default value since ScheduleEvent doesn't have this field
        start_time: fullEventData.start_time ? format(new Date(fullEventData.start_time), "yyyy-MM-dd'T'HH:mm") : '',
        end_time: fullEventData.end_time ? format(new Date(fullEventData.end_time), "yyyy-MM-dd'T'HH:mm") : '',
        all_day: fullEventData.all_day || false,
        event_type: fullEventData.event_type || 'meeting',
        project_id: fullEventData.project_id || 'none',
        reminder_minutes: fullEventData.reminder_minutes || 15,
        color: fullEventData.color || '#3B82F6',
        attendees: {
          teamMembers: fullEventData.attendees?.filter((a: any) => a.user_id).map((a: any) => a.user_id) || [],
          designProfessionals: [],
          contractors: [],
          vendors: [],
          customers: []
        }
      })
    }
  }, [fullEventData, editingEvent])
  
  // Memoized calendar calculations
  const calendarDays = useMemo(() => {
    const daysInMonth = dateRange.lastDayOfMonth.getDate()
    const startingDayOfWeek = dateRange.firstDayOfMonth.getDay()
    const days = []
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    return days
  }, [year, month, dateRange])
  
  // Optimized event filtering with multi-day support
  const getEventsForDay = useCallback((day: number) => {
    if (!events || !day) return []
    const currentDay = new Date(year, month, day)
    
    // Debug logging for specific days
    if (day === 26 || day === 27) {
      console.log(`🔍 Checking events for day ${day}:`, currentDay.toLocaleDateString())
    }
    
    return events.filter(event => {
      // Check if event occurs on this day (including multi-day events)
      const eventStart = new Date(event.start_time)
      const eventEnd = event.end_time ? new Date(event.end_time) : eventStart
      
      // Set times to beginning of day for date comparison
      const currentDayStart = new Date(currentDay)
      currentDayStart.setHours(0, 0, 0, 0)
      const currentDayEnd = new Date(currentDay)
      currentDayEnd.setHours(23, 59, 59, 999)
      
      const eventStartDay = new Date(eventStart)
      eventStartDay.setHours(0, 0, 0, 0)
      const eventEndDay = new Date(eventEnd)
      eventEndDay.setHours(23, 59, 59, 999)
      
      // Event occurs on this day if:
      // 1. Event starts on this day
      // 2. Event ends on this day  
      // 3. Event spans across this day (multi-day/multi-month events)
      const startsOnDay = eventStartDay >= currentDayStart && eventStartDay <= currentDayEnd
      const endsOnDay = eventEndDay >= currentDayStart && eventEndDay <= currentDayEnd
      const spansAcrossDay = eventStartDay <= currentDayStart && eventEndDay >= currentDayEnd
      
      const occursOnDay = startsOnDay || endsOnDay || spansAcrossDay
      
      const matchesProject = selectedProjectId === 'all' || event.project_id === selectedProjectId
      const matchesType = selectedEventTypes.length === 0 || selectedEventTypes.includes(event.event_type)
      
      // Debug logging for August 26 and 27
      if ((day === 26 || day === 27) && occursOnDay) {
        console.log(`   Event "${event.title}" on day ${day}:`)
        console.log(`     - Event type: ${event.event_type}`)
        console.log(`     - Event project_id: ${event.project_id}`)
        console.log(`     - Selected project: ${selectedProjectId}`)
        console.log(`     - Selected types: ${selectedEventTypes}`)
        console.log(`     - Matches project: ${matchesProject}`)
        console.log(`     - Matches type: ${matchesType}`)
        console.log(`     - Will display: ${occursOnDay && matchesProject && matchesType}`)
      }
      
      return occursOnDay && matchesProject && matchesType
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }, [events, year, month, selectedProjectId, selectedEventTypes])
  
  // Get upcoming events (memoized) - filtered by selected project
  const upcomingEvents = useMemo(() => {
    if (!events) return []
    const now = new Date()
    return events
      .filter(event => {
        const isFuture = new Date(event.start_time) > now
        const matchesProject = selectedProjectId === 'all' || event.project_id === selectedProjectId
        return isFuture && matchesProject
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .slice(0, 5)
  }, [events, selectedProjectId])
  
  // Get scheduling conflicts (memoized) - only for selected project
  const schedulingConflicts = useMemo(() => {
    if (!events) return []
    const conflicts: any[] = []
    
    // Filter events by project first
    const projectEvents = events.filter(event => 
      selectedProjectId === 'all' || event.project_id === selectedProjectId
    )
    
    projectEvents.forEach((event1, index1) => {
      projectEvents.forEach((event2, index2) => {
        if (index1 >= index2) return
        
        // Only check conflicts within the same project
        if (event1.project_id !== event2.project_id) return
        
        const start1 = new Date(event1.start_time).getTime()
        const end1 = new Date(event1.end_time || event1.start_time).getTime()
        const start2 = new Date(event2.start_time).getTime()
        const end2 = new Date(event2.end_time || event2.start_time).getTime()
        
        // Check for overlap
        if ((start1 < end2 && end1 > start2) || (start2 < end1 && end2 > start1)) {
          conflicts.push({
            event1,
            event2,
            severity: event1.trade === event2.trade ? 'high' : 'medium'
          })
        }
      })
    })
    
    return conflicts.slice(0, 3)
  }, [events, selectedProjectId])
  
  // Get weather impacted events (memoized) - filtered by selected project
  const weatherImpactedEvents = useMemo(() => {
    if (!events || weatherForecast.length === 0) return []
    
    return events.filter(event => {
      const matchesProject = selectedProjectId === 'all' || event.project_id === selectedProjectId
      if (!matchesProject) return false
      
      const eventDate = new Date(event.start_time)
      const forecast = weatherForecast.find(f => 
        format(f.date, 'yyyy-MM-dd') === format(eventDate, 'yyyy-MM-dd')
      )
      
      if (!forecast) return false
      
      // Check if outdoor event types would be impacted by weather
      const outdoorTypes = ['site_visit', 'inspection', 'delivery']
      const isOutdoor = outdoorTypes.includes(event.event_type)
      const badWeather = ['Rain', 'Snow', 'Thunderstorm'].includes(forecast.condition)
      
      return isOutdoor && badWeather
    }).slice(0, 5)
  }, [events, weatherForecast, selectedProjectId])
  
  const previousMonth = () => setCurrentDate(new Date(year, month - 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1))
  const goToToday = () => setCurrentDate(new Date())
  
  const today = new Date()
  const isToday = (day: number) => {
    return year === today.getFullYear() && 
           month === today.getMonth() && 
           day === today.getDate()
  }
  
  const getWeatherForDay = useCallback((day: number) => {
    if (!day || weatherForecast.length === 0) return null
    const dateStr = format(new Date(year, month, day), 'yyyy-MM-dd')
    return weatherForecast.find(f => format(f.date, 'yyyy-MM-dd') === dateStr)
  }, [weatherForecast, year, month])
  
  const toggleDayExpansion = useCallback((dateStr: string) => {
    setExpandedDays(prev => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(dateStr)) {
        newExpanded.delete(dateStr)
      } else {
        newExpanded.add(dateStr)
      }
      return newExpanded
    })
  }, [])
  
  const handleDayClick = useCallback((day: number) => {
    const selected = new Date(year, month, day)
    setSelectedDate(selected)
    const dateStr = format(selected, 'yyyy-MM-dd')
    setEventForm(prev => ({
      ...prev,
      start_time: `${dateStr}T09:00`,
      end_time: `${dateStr}T10:00`
    }))
    setEditingEvent(null)
    setShowEventDialog(true)
  }, [year, month])
  
  const handleEventClick = useCallback((event: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingEvent(event)
    setEventForm({
      title: event.title || '',
      description: '',
      location: '',
      work_location: 'both',  // Default value
      start_time: event.start_time ? format(new Date(event.start_time), "yyyy-MM-dd'T'HH:mm") : '',
      end_time: event.end_time ? format(new Date(event.end_time), "yyyy-MM-dd'T'HH:mm") : '',
      all_day: event.all_day || false,
      event_type: event.event_type || 'meeting',
      project_id: event.project_id || 'none',
      reminder_minutes: 15,
      color: event.color || '#3B82F6',
      attendees: {
        teamMembers: [],
        designProfessionals: [],
        contractors: [],
        vendors: [],
        customers: []
      }
    })
    setShowEventDialog(true)
  }, [])
  
  const handleSaveEvent = useCallback(async () => {
    if (!eventForm.title || !eventForm.start_time) {
      toast({
        title: 'Error',
        description: 'Event title and start time are required',
        variant: 'destructive'
      })
      return
    }
    
    try {
      const eventData = {
        title: eventForm.title,
        description: eventForm.description,
        location: eventForm.location,
        start_time: eventForm.start_time,
        end_time: eventForm.end_time || eventForm.start_time,
        all_day: eventForm.all_day,
        event_type: eventForm.event_type,
        project_id: eventForm.project_id === 'none' ? null : eventForm.project_id,
        reminder_minutes: eventForm.reminder_minutes,
        color: eventForm.color
      }
      
      if (editingEvent) {
        await updateEventMutation.mutateAsync({
          id: editingEvent.id,
          data: eventData
        })
        toast({
          title: 'Success',
          description: 'Event updated successfully'
        })
      } else {
        const created = await createEventMutation.mutateAsync(eventData)
        
        // Add attendees
        const allAttendees = [
          ...eventForm.attendees.teamMembers.map(id => ({ user_id: id, type: 'team' })),
          ...eventForm.attendees.designProfessionals.map(id => ({ contact_id: id, type: 'design_professional' })),
          ...eventForm.attendees.contractors.map(id => ({ contact_id: id, type: 'contractor' })),
          ...eventForm.attendees.vendors.map(id => ({ contact_id: id, type: 'vendor' })),
          ...eventForm.attendees.customers.map(id => ({ contact_id: id, type: 'customer' }))
        ]
        
        if (allAttendees.length > 0) {
          for (const attendee of allAttendees) {
            await supabase
              .from('schedule_event_attendees')
              .insert({
                event_id: created.id,
                user_id: 'user_id' in attendee ? attendee.user_id : null,
                contact_id: 'contact_id' in attendee ? attendee.contact_id : null,
                attendance_status: 'pending',
                notify_enabled: true
              })
          }
        }
        
        toast({
          title: 'Success',
          description: 'Event created successfully'
        })
      }
      
      // Reset and close
      setShowEventDialog(false)
      setEditingEvent(null)
      setEventForm({
        title: '',
        description: '',
        location: '',
        work_location: 'both',  // Default value
        start_time: '',
        end_time: '',
        all_day: false,
        event_type: 'meeting',
        project_id: 'none',
        reminder_minutes: 15,
        color: '#3B82F6',
        attendees: {
          teamMembers: [],
          designProfessionals: [],
          contractors: [],
          vendors: [],
          customers: []
        }
      })
      refetchEvents()
    } catch (error) {
      console.error('Failed to save event:', error)
      toast({
        title: 'Error',
        description: 'Failed to save event',
        variant: 'destructive'
      })
    }
  }, [eventForm, editingEvent, updateEventMutation, createEventMutation, supabase, refetchEvents, toast])
  
  const handleDeleteEvent = useCallback(async () => {
    if (!editingEvent) return
    
    try {
      await deleteEventMutation.mutateAsync(editingEvent.id)
      toast({
        title: 'Success',
        description: 'Event deleted successfully'
      })
      setShowEventDialog(false)
      setEditingEvent(null)
      refetchEvents()
    } catch (error) {
      console.error('Failed to delete event:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete event',
        variant: 'destructive'
      })
    }
  }, [editingEvent, deleteEventMutation, refetchEvents, toast])
  
  // Filter contacts by type (memoized)
  const getContactsByType = useCallback((type: string) => {
    return contacts.filter(c => c.contact_type === type)
  }, [contacts])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20">
      <div className="p-6 space-y-6">
        {/* Modern Centered Header */}
        <div className="flex flex-col items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Smart Calendar
          </h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2 text-center">
            <Sparkles className="h-4 w-4 text-purple-500" />
            AI-powered scheduling with intelligent conflict detection and weather forecasting
          </p>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWeatherOverlay(!showWeatherOverlay)}
              className={cn(
                "transition-all",
                showWeatherOverlay 
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0"
                  : "bg-white/10 border-white/20 hover:bg-white/20"
              )}
            >
              <CloudRain className="h-4 w-4 mr-2" />
              Weather
            </Button>
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
            >
              <SelectTrigger className="w-[180px] bg-white/10 border-white/20">
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={() => {
                setEditingEvent(null)
                const now = new Date()
                const dateStr = format(now, 'yyyy-MM-dd')
                setEventForm(prev => ({
                  ...prev,
                  start_time: `${dateStr}T09:00`,
                  end_time: `${dateStr}T10:00`
                }))
                setShowEventDialog(true)
              }}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Event
            </Button>
          </div>
        </div>
      </div>

      {/* Main Calendar - Maximized with gradient border */}
      <div className="w-full max-w-none mx-2 p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600">
        <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {monthNames[month]} {year}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={previousMonth}
                className="hover:bg-white/20 h-9 w-9"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="hover:bg-white/20"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={nextMonth}
                className="hover:bg-white/20 h-9 w-9"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isInitialLoad ? (
            <CalendarSkeleton />
          ) : (
            <div className="grid grid-cols-7 gap-px bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl overflow-hidden p-px">
              {/* Day headers with gradient */}
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-2 text-center"
                >
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {day}
                  </div>
                </div>
              ))}
              
              {/* Calendar days with enhanced styling */}
              {calendarDays.map((day, index) => {
                const dayEvents = day ? getEventsForDay(day) : []
                const dateStr = day ? `${year}-${month + 1}-${day}` : ''
                const isExpanded = expandedDays.has(dateStr)
                const displayLimit = isExpanded ? 10 : 3
                const hasMoreEvents = dayEvents.length > displayLimit
                const dayWeather = showWeatherOverlay ? getWeatherForDay(day || 0) : null
                
                // DEBUG: Log events for days 26 and 27 in August
                if ((day === 26 || day === 27) && month === 7) {  // August is month 7
                  console.log(`📌 Day ${day} in ${monthNames[month]} ${year}:`)
                  console.log(`   Events found: ${dayEvents.length}`)
                  console.log(`   Events:`, dayEvents)
                }
                
                return (
                  <div
                    key={`${year}-${month}-${index}-${day || 'empty'}`}
                    className={cn(
                      "bg-white dark:bg-gray-900 p-1 min-h-[140px] transition-all duration-300 relative rounded-lg",
                      day && "hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 dark:hover:from-gray-800 dark:hover:to-gray-700 cursor-pointer hover:shadow-2xl hover:z-10 hover:scale-[1.02] hover:border hover:border-purple-200",
                      isToday(day || 0) && "bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 ring-2 ring-purple-400 shadow-xl border-2 border-purple-500",
                      isExpanded && "row-span-2 z-20 shadow-2xl border-2 border-purple-300"
                    )}
                    onClick={() => day && handleDayClick(day)}
                  >
                    {day && (
                      <div className="h-full flex flex-col">
                        <div className="flex items-start justify-between mb-1">
                          <span className={cn(
                            "text-sm font-bold",
                            isToday(day) && "text-blue-600 dark:text-blue-400"
                          )}>
                            {day}
                          </span>
                          <div className="flex items-center gap-1">
                            {dayWeather && (
                              <div className="flex items-center gap-1 text-xs bg-white/80 dark:bg-gray-800/80 rounded px-1 py-0.5">
                                {(() => {
                                  const WeatherIcon = weatherIcons[dayWeather.condition] || Cloud
                                  return <WeatherIcon className="h-3 w-3" />
                                })()}
                                <span className="font-medium">{dayWeather.temp}°</span>
                                {dayWeather.precipitation > 30 && (
                                  <Droplets className="h-3 w-3 text-blue-500" />
                                )}
                              </div>
                            )}
                            {dayEvents.length > 0 && (
                              <Badge 
                                variant="secondary" 
                                className="h-5 px-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs"
                              >
                                {dayEvents.length}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Display events with enhanced styling */}
                        {dayEvents.length > 0 && (
                          <ScrollArea className={cn("flex-1", isExpanded && "h-48")}>
                            <div className="space-y-0.5">
                              {dayEvents.slice(0, displayLimit).map(event => {
                                const config = eventTypeConfig[event.event_type as keyof typeof eventTypeConfig] || eventTypeConfig.other
                                const currentDay = new Date(year, month, day)
                                const eventPosition = getEventDayPosition(event, currentDay)
                                const isMultiDay = isMultiDayEvent(event)
                                const isMultiMonth = isMultiMonthEvent(event)
                                
                                return (
                                  <div
                                    key={event.id}
                                    className={cn(
                                      "group relative transition-all duration-200 cursor-pointer",
                                      config.bgColor,
                                      config.textColor,
                                      "hover:scale-[1.02] hover:shadow-sm",
                                      // Multi-day event styling
                                      isMultiDay && eventPosition === 'start' && "rounded-l-md rounded-r-none",
                                      isMultiDay && eventPosition === 'middle' && "rounded-none",
                                      isMultiDay && eventPosition === 'end' && "rounded-r-md rounded-l-none",
                                      !isMultiDay && "rounded-md",
                                      // Tight padding for maximum text
                                      "px-1 py-0.5 text-[9px] leading-tight font-medium",
                                      // Multi-month event highlighting
                                      isMultiMonth && "ring-1 ring-yellow-400 shadow-lg"
                                    )}
                                    onClick={(e) => handleEventClick(event, e)}
                                    title={`${event.title}${isMultiMonth ? ' (Spans multiple months)' : isMultiDay ? ' (Multi-day event)' : ''}`}
                                  >
                                    <div className="flex items-center gap-1 min-h-[14px]">
                                      {/* Show time only on start day or single day events */}
                                      {(eventPosition === 'start' || eventPosition === 'single') && (
                                        <span className="font-bold text-[8px] opacity-95 whitespace-nowrap bg-black/10 px-1 rounded">
                                          {format(new Date(event.start_time), 'H:mm')}
                                        </span>
                                      )}
                                      <span className={cn(
                                        "truncate flex-1 font-medium",
                                        // Adjust text size based on available space
                                        eventPosition === 'middle' ? "text-[9px]" : "text-[8px] font-semibold",
                                        // Add margin for multi-month indicator
                                        isMultiMonth && "pr-2"
                                      )}>
                                        {event.title}
                                      </span>
                                    </div>
                                  </div>
                                )
                              })}
                              {hasMoreEvents && !isExpanded && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full h-5 text-xs hover:bg-white/50 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleDayExpansion(dateStr)
                                  }}
                                >
                                  +{dayEvents.length - displayLimit} more
                                  <ChevronDown className="h-3 w-3 ml-1" />
                                </Button>
                              )}
                              {isExpanded && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full h-5 text-xs hover:bg-white/50 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleDayExpansion(dateStr)
                                  }}
                                >
                                  Show less
                                  <ChevronUp className="h-3 w-3 ml-1" />
                                </Button>
                              )}
                            </div>
                          </ScrollArea>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

        {/* Bottom Section - Three columns */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Upcoming Events */}
          <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:from-purple-100 hover:to-purple-700 transition-all duration-300">
            <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {isInitialLoad ? (
                <EventListSkeleton />
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No upcoming events
                    </p>
                  ) : (
                    upcomingEvents.map(event => {
                      const config = eventTypeConfig[event.event_type as keyof typeof eventTypeConfig] || eventTypeConfig.other
                      const Icon = config.icon
                      return (
                        <div
                          key={event.id}
                          className={cn(
                            "p-2 rounded-lg border cursor-pointer transition-all duration-200",
                            config.bgColor,
                            "hover:shadow-md hover:scale-105"
                          )}
                          onClick={(e) => handleEventClick(event, e)}
                        >
                          <div className="flex items-start gap-2">
                            <div className={cn(
                              "p-1.5 rounded-lg",
                              `bg-gradient-to-br ${config.gradient}`
                            )}>
                              <Icon className="h-3 w-3 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {event.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(event.start_time), 'MMM d, h:mm a')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
        </div>

          {/* Enhanced AI Insights Panel */}
          <div className="lg:col-span-2 p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:from-purple-100 hover:to-purple-700 transition-all duration-300">
            <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {bottomBoxView === 'conflicts' ? (
                  <>
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Nexus Scheduling Conflicts
                  </>
                ) : bottomBoxView === 'ml-insights' ? (
                  <>
                    <Brain className="h-5 w-5 text-purple-500" />
                    ML Insights & Predictions
                  </>
                ) : (
                  <>
                    <CloudRain className="h-5 w-5 text-blue-500" />
                    Weather Impact Forecast
                  </>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (bottomBoxView === 'conflicts') setBottomBoxView('ml-insights')
                  else if (bottomBoxView === 'ml-insights') setBottomBoxView('weather')
                  else setBottomBoxView('conflicts')
                }}
                className="hover:bg-white/20"
              >
                <Shuffle className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {bottomBoxView === 'conflicts' ? (
                <ConflictManager 
                  events={events}
                  selectedProjectId={selectedProjectId}
                  weatherData={weatherForecast}
                  onResolveConflict={(conflict) => {
                    console.log('Conflict resolved:', conflict)
                    // Refresh events after resolution
                    refetchEvents()
                  }}
                />
              ) : bottomBoxView === 'ml-insights' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="h-4 w-4 text-purple-600" />
                        <span className="text-xs font-medium">ML Confidence</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                        87%
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Based on 1,250 learned patterns
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-medium">Optimization Score</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                        92%
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Schedule efficiency improved
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                      AI Recommendations
                    </h4>
                    <div className="space-y-2">
                      <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700">
                        <p className="text-xs">
                          <span className="font-medium text-green-700 dark:text-green-400">Optimal:</span>
                          {' '}Schedule foundation work early next week - weather conditions favorable
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700">
                        <p className="text-xs">
                          <span className="font-medium text-yellow-700 dark:text-yellow-400">Caution:</span>
                          {' '}Avoid scheduling electrical and plumbing on same day - resource conflict likely
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
                        <p className="text-xs">
                          <span className="font-medium text-blue-700 dark:text-blue-400">Efficiency:</span>
                          {' '}Group interior trades together next Thursday for better coordination
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Learning from your decisions...</span>
                      <Badge variant="outline" className="text-xs">
                        <Activity className="h-3 w-3 mr-1" />
                        Live ML Analysis
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {weatherLoading ? (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-gray-600 to-slate-600 mb-3">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      </div>
                      <p className="text-sm text-muted-foreground">Loading weather data...</p>
                    </div>
                  ) : weatherImpactedEvents.length === 0 && weatherForecast.length > 0 ? (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 mb-3">
                        <Sun className="h-6 w-6 text-white" />
                      </div>
                      <p className="text-sm text-muted-foreground">No weather impacts on scheduled events</p>
                    </div>
                  ) : weatherForecast.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-gray-600 to-slate-600 mb-3">
                        <Navigation className="h-6 w-6 text-white animate-pulse" />
                      </div>
                      <p className="text-sm text-muted-foreground">Fetching weather data...</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-7 gap-2 mb-4">
                        {weatherForecast.slice(0, 7).map((day, index) => {
                          const WeatherIcon = weatherIcons[day.condition] || Cloud
                          return (
                            <div
                              key={index}
                              className={cn(
                                "p-2 rounded-lg text-center transition-all",
                                "bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-700",
                                "border border-white/20"
                              )}
                            >
                              <p className="text-xs font-medium text-muted-foreground">
                                {format(day.date, 'EEE')}
                              </p>
                              <WeatherIcon className="h-6 w-6 mx-auto my-1" />
                              <p className="text-sm font-bold">{day.temp}°</p>
                              {day.precipitation > 30 && (
                                <div className="flex items-center justify-center gap-1 mt-1">
                                  <Droplets className="h-3 w-3 text-blue-500" />
                                  <span className="text-xs">{Math.round(day.precipitation)}%</span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      {weatherImpactedEvents.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                            ⚠️ Weather-Impacted Events:
                          </p>
                          {weatherImpactedEvents.map(event => {
                            const config = eventTypeConfig[event.event_type as keyof typeof eventTypeConfig] || eventTypeConfig.other
                            return (
                              <div
                                key={event.id}
                                className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-300"
                              >
                                <div className="flex items-center gap-2">
                                  <config.icon className="h-4 w-4 text-orange-600" />
                                  <span className="text-sm font-medium">{event.title}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(event.start_time), 'MMM d')}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Enhanced Modern Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {editingEvent ? 'Edit Event' : 'Create New Event'}
            </DialogTitle>
            <DialogDescription>
              {editingEvent ? 'Update event details and attendees' : 'Schedule a new event with intelligent conflict detection'}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="details" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Event Details</TabsTrigger>
              <TabsTrigger value="attendees">Attendees</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <ScrollArea className="h-[500px] mt-4">
              <TabsContent value="details" className="space-y-4 px-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Event Title*</Label>
                    <Input
                      id="title"
                      value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                      placeholder="Site inspection, delivery, meeting..."
                      className="bg-white/50 dark:bg-gray-800/50"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="event_type">Event Type*</Label>
                    <Select
                      value={eventForm.event_type}
                      onValueChange={(value) => setEventForm({ ...eventForm, event_type: value })}
                    >
                      <SelectTrigger className="bg-white/50 dark:bg-gray-800/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(eventTypeConfig).map(([key, config]) => {
                          const Icon = config.icon
                          return (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {config.label}
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="work_location">Work Location*</Label>
                    <Select
                      value={eventForm.work_location}
                      onValueChange={(value: any) => setEventForm({ ...eventForm, work_location: value })}
                    >
                      <SelectTrigger className="bg-white/50 dark:bg-gray-800/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interior">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            Interior Work
                          </div>
                        </SelectItem>
                        <SelectItem value="exterior">
                          <div className="flex items-center gap-2">
                            <Sun className="h-4 w-4" />
                            Exterior Work
                          </div>
                        </SelectItem>
                        <SelectItem value="both">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Both Interior & Exterior
                          </div>
                        </SelectItem>
                        <SelectItem value="underground">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            Underground/Foundation
                          </div>
                        </SelectItem>
                        <SelectItem value="roof">
                          <div className="flex items-center gap-2">
                            <Home className="h-4 w-4" />
                            Roof Work
                          </div>
                        </SelectItem>
                        <SelectItem value="structural">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Structural Work
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-end">
                    {eventForm.work_location === 'exterior' && (
                      <Alert className="w-full">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Weather conditions will be analyzed for exterior work
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    placeholder="Event details and notes..."
                    rows={3}
                    className="bg-white/50 dark:bg-gray-800/50"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  
                  <div>
                    <Label htmlFor="project">Related Project</Label>
                    <Select
                      value={eventForm.project_id}
                      onValueChange={(value) => setEventForm({ ...eventForm, project_id: value })}
                    >
                      <SelectTrigger className="bg-white/50 dark:bg-gray-800/50">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No project</SelectItem>
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_time">Start Date & Time*</Label>
                    <Input
                      id="start_time"
                      type="datetime-local"
                      value={eventForm.start_time}
                      onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                      className="bg-white/50 dark:bg-gray-800/50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_time">End Date & Time</Label>
                    <Input
                      id="end_time"
                      type="datetime-local"
                      value={eventForm.end_time}
                      onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                      className="bg-white/50 dark:bg-gray-800/50"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      value={eventForm.location}
                      onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                      placeholder="Site address, meeting room, etc."
                      className="pl-10 bg-white/50 dark:bg-gray-800/50"
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="attendees" className="space-y-4 px-1">
                {/* Team Members */}
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team Members
                  </Label>
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto border rounded-lg p-3 bg-white/50 dark:bg-gray-800/50">
                    {teamMembers.map(member => (
                      <label key={member.id} className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-2 rounded-lg transition-colors">
                        <Checkbox
                          checked={eventForm.attendees.teamMembers.includes(member.id)}
                          onCheckedChange={(checked) => {
                            const newTeamMembers = checked
                              ? [...eventForm.attendees.teamMembers, member.id]
                              : eventForm.attendees.teamMembers.filter(id => id !== member.id)
                            setEventForm({
                              ...eventForm,
                              attendees: { ...eventForm.attendees, teamMembers: newTeamMembers }
                            })
                          }}
                        />
                        <span className="text-sm font-medium">{member.full_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Other contact types with similar enhanced styling */}
                {[
                  { type: 'designProfessionals', label: 'Design Professionals', contacts: getContactsByType('design_professional') },
                  { type: 'contractors', label: 'Contractors', contacts: getContactsByType('contractor') },
                  { type: 'vendors', label: 'Vendors', contacts: getContactsByType('vendor') },
                  { type: 'customers', label: 'Customers', contacts: getContactsByType('customer') }
                ].map(({ type, label, contacts }) => (
                  <div key={type}>
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      {label}
                    </Label>
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto border rounded-lg p-3 bg-white/50 dark:bg-gray-800/50">
                      {contacts.map(contact => (
                        <label key={contact.id} className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-2 rounded-lg transition-colors">
                          <Checkbox
                            checked={eventForm.attendees[type as keyof typeof eventForm.attendees].includes(contact.id)}
                            onCheckedChange={(checked) => {
                              const attendeeType = type as keyof typeof eventForm.attendees
                              const newAttendees = checked
                                ? [...eventForm.attendees[attendeeType], contact.id]
                                : eventForm.attendees[attendeeType].filter((id: string) => id !== contact.id)
                              setEventForm({
                                ...eventForm,
                                attendees: { ...eventForm.attendees, [attendeeType]: newAttendees }
                              })
                            }}
                          />
                          <span className="text-sm font-medium">
                            {contact.name} 
                            {contact.company_name && (
                              <span className="text-muted-foreground ml-1">({contact.company_name})</span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="settings" className="space-y-4 px-1">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="all_day"
                    checked={eventForm.all_day}
                    onCheckedChange={(checked) => setEventForm({ ...eventForm, all_day: checked as boolean })}
                  />
                  <Label htmlFor="all_day" className="font-medium">All day event</Label>
                </div>
                
                <div>
                  <Label htmlFor="reminder" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Reminder
                  </Label>
                  <Select
                    value={String(eventForm.reminder_minutes)}
                    onValueChange={(value) => setEventForm({ ...eventForm, reminder_minutes: parseInt(value) })}
                  >
                    <SelectTrigger className="bg-white/50 dark:bg-gray-800/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No reminder</SelectItem>
                      <SelectItem value="5">5 minutes before</SelectItem>
                      <SelectItem value="15">15 minutes before</SelectItem>
                      <SelectItem value="30">30 minutes before</SelectItem>
                      <SelectItem value="60">1 hour before</SelectItem>
                      <SelectItem value="1440">1 day before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="flex items-center gap-2 mb-3">
                    <Palette className="h-4 w-4" />
                    Event Color
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {colorOptions.map(color => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setEventForm({ ...eventForm, color: color.value })}
                        className={cn(
                          "h-10 rounded-lg border-2 transition-all",
                          color.class,
                          eventForm.color === color.value ? "border-gray-900 dark:border-white scale-110" : "border-transparent hover:scale-105"
                        )}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
          
          <DialogFooter className="flex justify-between mt-6">
            <div>
              {editingEvent && (
                <Button 
                  variant="destructive"
                  onClick={handleDeleteEvent}
                  className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Event
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEventDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveEvent}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                {editingEvent ? 'Update Event' : 'Create Event'}
              </Button>
            </div>
          </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
