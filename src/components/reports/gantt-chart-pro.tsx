'use client'

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { arrayPropsEqual, useExpensiveMemo, useStableCallback } from '@/lib/performance/react-optimizations'
import { cn } from '@/lib/utils'
import { format, parseISO, isWithinInterval, differenceInDays, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isBefore, isAfter, addWeeks, addMonths, isSameDay } from 'date-fns'
import { 
  Calendar, Clock, Users, MapPin, AlertTriangle, CheckCircle, PlayCircle,
  Maximize2, Minimize2, Download, Settings, Printer, ChevronLeft, ChevronRight,
  Building2, HardHat, Phone, Mail, FileText, ZoomIn, ZoomOut, GitBranch,
  Activity, Target, Flag, Link, Milestone, TrendingUp, UserCheck, BarChart3,
  Layers, Grid, Filter, Save, Upload, RefreshCw, Copy, Trash2, Edit,
  ChevronDown, ChevronUp, Plus, Minus, ArrowRight, ArrowDown, Percent,
  DollarSign, CalendarDays, ListChecks, Network
} from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { toast } from '@/hooks/use-toast'
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'

interface Task {
  id: string
  title: string
  description?: string
  start_date: Date
  end_date: Date
  duration: number
  progress: number
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assigned_to?: string[]
  dependencies?: string[]
  predecessors?: TaskDependency[]
  successors?: TaskDependency[]
  milestone?: boolean
  critical_path?: boolean
  baseline_start?: Date
  baseline_end?: Date
  actual_start?: Date
  actual_end?: Date
  cost?: number
  budget?: number
  resources?: Resource[]
  subtasks?: Task[]
  parent_id?: string
  wbs?: string // Work Breakdown Structure
  constraint_type?: 'ASAP' | 'ALAP' | 'SNET' | 'SNLT' | 'FNET' | 'FNLT' | 'MFO' | 'MSO'
  constraint_date?: Date
  notes?: string
  color?: string
  level?: number
  expanded?: boolean
}

interface TaskDependency {
  task_id: string
  type: 'FS' | 'SS' | 'FF' | 'SF' // Finish-to-Start, Start-to-Start, Finish-to-Finish, Start-to-Finish
  lag?: number // Days of lag/lead time
}

interface Resource {
  id: string
  name: string
  type: 'labor' | 'material' | 'equipment'
  rate?: number
  max_units?: number
  allocated_units?: number
  calendar?: string
  skills?: string[]
  availability?: ResourceAvailability[]
}

interface ResourceAvailability {
  start_date: Date
  end_date: Date
  available_units: number
}

interface ProjectInfo {
  id: string
  name: string
  project_code: string
  start_date: Date
  end_date: Date
  budget?: number
  actual_cost?: number
  completion?: number
  critical_tasks?: number
  total_tasks?: number
  resources?: Resource[]
  calendar?: ProjectCalendar
}

interface ProjectCalendar {
  working_days: number[] // 0-6 (Sunday-Saturday)
  holidays: Date[]
  working_hours: { start: string, end: string }
}

interface GanttSettings {
  view: 'tasks' | 'resources' | 'calendar' | 'network'
  timeScale: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'
  showWeekends: boolean
  showHolidays: boolean
  showProgress: boolean
  showBaseline: boolean
  showCriticalPath: boolean
  showDependencies: boolean
  showResources: boolean
  showMilestones: boolean
  showSubtasks: boolean
  showLabels: boolean
  showGrid: boolean
  autoSchedule: boolean
  levelResources: boolean
  trackingMode: 'none' | 'progress' | 'actual'
  colorScheme: 'status' | 'priority' | 'resource' | 'critical'
  barHeight: number
  zoom: number
}

const defaultSettings: GanttSettings = {
  view: 'tasks',
  timeScale: 'day',
  showWeekends: true,
  showHolidays: true,
  showProgress: true,
  showBaseline: false,
  showCriticalPath: true,
  showDependencies: true,
  showResources: true,
  showMilestones: true,
  showSubtasks: true,
  showLabels: true,
  showGrid: true,
  autoSchedule: true,
  levelResources: false,
  trackingMode: 'progress',
  colorScheme: 'status',
  barHeight: 32,
  zoom: 100
}

// Draggable Task Bar Component
const DraggableTaskBar = memo(function DraggableTaskBar({ task, children, position }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: task
  })

  const style = useMemo(() => ({
    ...position,
    transform: transform ? `translateX(${transform.x}px)` : undefined,
    opacity: isDragging ? 0.3 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    zIndex: isDragging ? 1000 : position.zIndex || 1,
    transition: isDragging ? 'none' : 'all 0.2s ease'
  }), [position, transform, isDragging])

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {/* Ghost preview overlay when dragging */}
      {isDragging && (
        <div className="absolute inset-0 border-2 border-blue-400 bg-blue-100 rounded opacity-60 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-200 to-blue-300 rounded animate-pulse" />
        </div>
      )}
      {children}
    </div>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.position.left === nextProps.position.left &&
    prevProps.position.width === nextProps.position.width
  )
})

// Droppable Timeline Slot Component
const DroppableTimeSlot = memo(function DroppableTimeSlot({ date, children }: any) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${date.toISOString()}`,
    data: { date }
  })

  const className = useMemo(() => 
    cn(
      'relative transition-all duration-200',
      isOver && 'bg-blue-50 ring-2 ring-blue-300 ring-inset'
    ), [isOver])

  return (
    <div ref={setNodeRef} className={className}>
      {/* Visual drop indicator */}
      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-0.5 h-full bg-blue-500 animate-pulse" />
        </div>
      )}
      {children}
    </div>
  )
}, (prevProps, nextProps) => {
  return prevProps.date.getTime() === nextProps.date.getTime()
})

function GanttChartPro({ projectId }: { projectId?: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewDate, setViewDate] = useState(new Date())
  const [settings, setSettings] = useState<GanttSettings>(defaultSettings)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0)
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [showFullView, setShowFullView] = useState(false)
  const [showResourceDialog, setShowResourceDialog] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [criticalPath, setCriticalPath] = useState<string[]>([])
  const [filter, setFilter] = useState<any>({})
  const [showPrintDialog, setShowPrintDialog] = useState(false)
  const [printSettings, setPrintSettings] = useState({
    orientation: 'landscape' as 'portrait' | 'landscape',
    pageSize: 'A4' as 'A4' | 'A3' | 'Legal' | 'Letter',
    includeDetails: true,
    includeTimeline: true,
    includeResources: false,
    includeNotes: false,
    dateRange: 'all' as 'all' | 'visible' | 'custom',
    customStartDate: '',
    customEndDate: '',
    scale: 'fit' as 'fit' | '100%' | '75%' | '50%'
  })
  
  const chartRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Fetch project data when projectId changes
  useEffect(() => {
    if (projectId && projectId !== 'all') {
      fetchProjectData()
    }
  }, [projectId])

  // Calculate critical path when tasks change
  useEffect(() => {
    if (tasks.length > 0 && settings.showCriticalPath) {
      calculateCriticalPath()
    }
  }, [tasks, settings.showCriticalPath])

  // Enhanced keyboard navigation with accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showFullView) return

      // Check if user is typing in an input field
      const isInputActive = document.activeElement?.tagName === 'INPUT' || 
                           document.activeElement?.tagName === 'TEXTAREA' ||
                           document.activeElement?.getAttribute('contenteditable') === 'true'
      
      if (isInputActive) return

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          setSelectedTaskIndex(prev => {
            const newIndex = Math.max(0, prev - 1)
            // Announce selection change for screen readers
            const task = tasks[newIndex]
            if (task) {
              announceToScreenReader(`Selected ${task.title}, ${task.status}, ${task.progress}% complete`)
            }
            return newIndex
          })
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedTaskIndex(prev => {
            const newIndex = Math.min(tasks.length - 1, prev + 1)
            // Announce selection change for screen readers
            const task = tasks[newIndex]
            if (task) {
              announceToScreenReader(`Selected ${task.title}, ${task.status}, ${task.progress}% complete`)
            }
            return newIndex
          })
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (e.shiftKey) {
            // Shift+Left: Move view by day
            setViewDate(prev => addDays(prev, -1))
            announceToScreenReader('View moved back by 1 day')
          } else {
            // Left: Move view by week
            setViewDate(prev => addDays(prev, -7))
            announceToScreenReader('View moved back by 1 week')
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          if (e.shiftKey) {
            // Shift+Right: Move view by day
            setViewDate(prev => addDays(prev, 1))
            announceToScreenReader('View moved forward by 1 day')
          } else {
            // Right: Move view by week
            setViewDate(prev => addDays(prev, 7))
            announceToScreenReader('View moved forward by 1 week')
          }
          break
        case 'Enter':
        case ' ': // Space bar
          e.preventDefault()
          if (tasks[selectedTaskIndex]) {
            setEditingTask(tasks[selectedTaskIndex])
            setShowTaskDialog(true)
            announceToScreenReader(`Editing ${tasks[selectedTaskIndex].title}`)
          }
          break
        case 'Delete':
        case 'Backspace':
          e.preventDefault()
          if (tasks[selectedTaskIndex]) {
            handleDeleteTask(tasks[selectedTaskIndex].id)
            announceToScreenReader(`Deleted ${tasks[selectedTaskIndex].title}`)
          }
          break
        case 'Escape':
          e.preventDefault()
          setSelectedTask(null)
          setSelectedTaskIndex(0)
          announceToScreenReader('Selection cleared')
          break
        case 'Home':
          e.preventDefault()
          setSelectedTaskIndex(0)
          if (tasks[0]) {
            announceToScreenReader(`First task selected: ${tasks[0].title}`)
          }
          break
        case 'End':
          e.preventDefault()
          setSelectedTaskIndex(tasks.length - 1)
          if (tasks[tasks.length - 1]) {
            announceToScreenReader(`Last task selected: ${tasks[tasks.length - 1].title}`)
          }
          break
        case 'PageUp':
          e.preventDefault()
          setSelectedTaskIndex(prev => {
            const newIndex = Math.max(0, prev - 5)
            const task = tasks[newIndex]
            if (task) {
              announceToScreenReader(`Moved up 5 tasks: ${task.title}`)
            }
            return newIndex
          })
          break
        case 'PageDown':
          e.preventDefault()
          setSelectedTaskIndex(prev => {
            const newIndex = Math.min(tasks.length - 1, prev + 5)
            const task = tasks[newIndex]
            if (task) {
              announceToScreenReader(`Moved down 5 tasks: ${task.title}`)
            }
            return newIndex
          })
          break
        case 'f':
        case 'F':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            // Focus search input if available
            const searchInput = document.querySelector('[role="searchbox"]') as HTMLInputElement
            if (searchInput) {
              searchInput.focus()
              announceToScreenReader('Search focused')
            }
          }
          break
        case '?':
          e.preventDefault()
          // Show keyboard shortcuts help
          announceToScreenReader('Keyboard shortcuts: Arrow keys to navigate, Enter to edit, Delete to remove, Escape to clear selection')
          break
      }
    }

    // Focus management
    const handleFocus = (e: FocusEvent) => {
      if (!showFullView) return
      
      // If focus moves outside the Gantt chart, clear selection highlight
      const ganttContainer = document.querySelector('[data-gantt-container]')
      if (ganttContainer && !ganttContainer.contains(e.target as Node)) {
        // Don't clear if focus moved to a dialog
        if (!(e.target as Element)?.closest('[role="dialog"]')) {
          setSelectedTask(null)
        }
      }
    }

    if (showFullView) {
      document.addEventListener('keydown', handleKeyDown)
      document.addEventListener('focusout', handleFocus)
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.removeEventListener('focusout', handleFocus)
      }
    }
  }, [showFullView, tasks, selectedTaskIndex])

  // Helper function to announce messages to screen readers
  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.style.position = 'absolute'
    announcement.style.left = '-10000px'
    announcement.style.width = '1px'
    announcement.style.height = '1px'
    announcement.style.overflow = 'hidden'
    announcement.textContent = message
    
    document.body.appendChild(announcement)
    
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }

  // Update selected task when index changes
  useEffect(() => {
    if (tasks[selectedTaskIndex]) {
      setSelectedTask(tasks[selectedTaskIndex])
    }
  }, [selectedTaskIndex, tasks])

  const fetchProjectData = async () => {
    if (!projectId || projectId === 'all') {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Fetch project info with error handling
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()
        
      if (projectError && projectError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Project fetch error:', projectError)
        throw projectError
      }

      if (project) {
        setProjectInfo({
          id: project.id,
          name: project.name,
          project_code: project.project_code,
          start_date: parseISO(project.start_date),
          end_date: parseISO(project.end_date),
          budget: project.budget,
          actual_cost: project.actual_cost,
          completion: project.completion_percentage,
          calendar: {
            working_days: [1, 2, 3, 4, 5], // Monday to Friday
            holidays: [],
            working_hours: { start: '08:00', end: '17:00' }
          }
        })
      }

      // Fetch tasks from multiple sources with error handling
      const [scheduleEventsResult, projectTasks] = await Promise.all([
        // Calendar events
        supabase
          .from('schedule_events')
          .select('*')
          .eq('project_id', projectId)
          .order('start_time', { ascending: true })
          .then(result => ({ data: result.data || [], error: result.error }),
                error => ({ data: [], error })),
        
        // Project tasks (if table exists)
        supabase
          .from('project_tasks')
          .select('*')
          .eq('project_id', projectId)
          .order('start_date', { ascending: true })
          .then(result => result.data || [],
                () => [])
      ])
      
      // Handle schedule events error
      if (scheduleEventsResult.error) {
        console.warn('Schedule events fetch error:', scheduleEventsResult.error)
      }
      
      const scheduleEvents = scheduleEventsResult

      // Convert events to tasks with automatic progress calculation
      const tasksFromEvents = (scheduleEvents.data || []).map(event => {
        const startDate = parseISO(event.start_time)
        const endDate = parseISO(event.end_time || event.start_time)
        const duration = differenceInDays(endDate, startDate) + 1
        
        // Calculate progress based on current date
        const now = new Date()
        let progress = 0
        let status: 'not_started' | 'in_progress' | 'completed' = 'not_started'
        
        if (now < startDate) {
          // Task hasn't started yet
          progress = 0
          status = 'not_started'
        } else if (now > endDate) {
          // Task is past its end date
          progress = 100
          status = 'completed'
        } else {
          // Task is in progress
          const totalDays = differenceInDays(endDate, startDate) + 1
          const daysPassed = differenceInDays(now, startDate) + 1
          progress = Math.round((daysPassed / totalDays) * 100)
          status = 'in_progress'
        }
        
        return {
          id: event.id,
          title: event.title,
          description: event.description,
          start_date: startDate,
          end_date: endDate,
          duration,
          progress,
          status,
          priority: 'medium' as const,
          milestone: event.event_type === 'milestone',
          wbs: event.id.slice(0, 8)
        }
      })

      // Merge with project tasks if available
      const allTasks = [...tasksFromEvents, ...projectTasks].map((task, index) => ({
        ...task,
        level: 0,
        expanded: true,
        critical_path: false,
        color: getTaskColor(task)
      }))

      // Build task hierarchy
      const hierarchicalTasks = buildTaskHierarchy(allTasks)
      setTasks(hierarchicalTasks)

      // Fetch resources with error handling
      const { data: teamMembers, error: teamError } = await supabase
        .from('project_team_members')
        .select('profiles(*)')
        .eq('project_id', projectId)
        
      if (teamError) {
        console.warn('Team members fetch error:', teamError)
      }

      const projectResources: Resource[] = ((teamMembers || []) as any[]).map(member => ({
        id: member.profiles?.id || '',
        name: member.profiles?.full_name || 'Unknown',
        type: 'labor',
        rate: 150,
        max_units: 100,
        allocated_units: 0,
        skills: []
      }))

      setResources(projectResources)

    } catch (error) {
      console.error('Error fetching project data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load project data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const buildTaskHierarchy = (flatTasks: Task[]): Task[] => {
    const taskMap = new Map<string, Task>()
    const rootTasks: Task[] = []

    // First pass: create task map
    flatTasks.forEach(task => {
      taskMap.set(task.id, { ...task, subtasks: [] })
    })

    // Second pass: build hierarchy
    flatTasks.forEach(task => {
      if (task.parent_id && taskMap.has(task.parent_id)) {
        const parent = taskMap.get(task.parent_id)!
        parent.subtasks = parent.subtasks || []
        parent.subtasks.push(taskMap.get(task.id)!)
      } else {
        rootTasks.push(taskMap.get(task.id)!)
      }
    })

    // Calculate levels
    const setLevels = (tasks: Task[], level = 0) => {
      tasks.forEach(task => {
        task.level = level
        if (task.subtasks && task.subtasks.length > 0) {
          setLevels(task.subtasks, level + 1)
        }
      })
    }
    setLevels(rootTasks)

    return rootTasks
  }

  const calculateCriticalPath = () => {
    // Simplified CPM algorithm
    const taskMap = new Map<string, Task>()
    tasks.forEach(task => taskMap.set(task.id, task))

    // Calculate early start and finish
    const calculateEarlyTimes = (task: Task): number => {
      if (!task.predecessors || task.predecessors.length === 0) {
        return 0
      }
      
      let maxFinish = 0
      task.predecessors.forEach(dep => {
        const predTask = taskMap.get(dep.task_id)
        if (predTask) {
          const predFinish = calculateEarlyTimes(predTask) + predTask.duration
          maxFinish = Math.max(maxFinish, predFinish + (dep.lag || 0))
        }
      })
      
      return maxFinish
    }

    // Find tasks with no successors
    const endTasks = tasks.filter(task => !task.successors || task.successors.length === 0)
    
    // Calculate late times and identify critical tasks
    const criticalTasks: string[] = []
    
    endTasks.forEach(task => {
      const earlyFinish = calculateEarlyTimes(task) + task.duration
      // Tasks with zero float are critical
      if (earlyFinish >= Math.max(...endTasks.map(t => calculateEarlyTimes(t) + t.duration))) {
        criticalTasks.push(task.id)
        // Trace back through predecessors
        const traceCriticalPath = (taskId: string) => {
          const t = taskMap.get(taskId)
          if (t?.predecessors) {
            t.predecessors.forEach(dep => {
              criticalTasks.push(dep.task_id)
              traceCriticalPath(dep.task_id)
            })
          }
        }
        traceCriticalPath(task.id)
      }
    })

    setCriticalPath([...new Set(criticalTasks)])
  }

  const getTaskColor = (task: Task): string => {
    if (settings.colorScheme === 'critical' && criticalPath.includes(task.id)) {
      return '#dc2626' // red
    }
    
    switch (settings.colorScheme) {
      case 'status':
        switch (task.status) {
          case 'completed': return '#10b981'
          case 'in_progress': return '#f59e0b'
          case 'on_hold': return '#6b7280'
          default: return '#3b82f6'
        }
      case 'priority':
        switch (task.priority) {
          case 'critical': return '#dc2626'
          case 'high': return '#ea580c'
          case 'medium': return '#0ea5e9'
          default: return '#6b7280'
        }
      case 'resource':
        // Color by resource assignment
        return task.assigned_to?.length ? '#8b5cf6' : '#6b7280'
      default:
        return '#3b82f6'
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || !active) {
      announceToScreenReader('Drag operation cancelled')
      return
    }
    
    try {
      const task = tasks.find(t => t.id === active.id)
      const newDate = over.data.current?.date
      
      if (!task || !newDate || isNaN(newDate.getTime())) {
        console.warn('Invalid drag operation: task or date not found')
        announceToScreenReader('Invalid drag operation')
        return
      }
      
      const duration = Math.max(1, task.duration || 1)
      const newEndDate = addDays(newDate, duration - 1)
      
      // Calculate progress for new dates
      const { progress, status } = calculateTaskProgress(newDate, newEndDate)
      
      // Announce the change for accessibility
      announceToScreenReader(
        `${task.title} moved to ${format(newDate, 'MMM dd, yyyy')} - ${format(newEndDate, 'MMM dd, yyyy')}`
      )
      
      // Update task dates optimistically with improved state management
      setTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === task.id 
            ? { 
                ...t, 
                start_date: newDate, 
                end_date: newEndDate, 
                progress, 
                status,
                duration,
                // Add temporary visual indicator
                isUpdating: true
              }
            : t
        )
      )
      
      // Save to database with error recovery
      saveTaskUpdate(task.id, { 
        start_date: newDate, 
        end_date: newEndDate,
        progress,
        status 
      }).finally(() => {
        // Remove updating indicator
        setTasks(prevTasks => 
          prevTasks.map(t => 
            t.id === task.id 
              ? { ...t, isUpdating: false }
              : t
          )
        )
      })
      
      toast({
        title: 'Task updated',
        description: `${task.title} rescheduled successfully`
      })
    } catch (error) {
      console.error('Drag operation failed:', error)
      announceToScreenReader('Drag operation failed')
      toast({
        title: 'Error',
        description: 'Failed to update task position',
        variant: 'destructive'
      })
    }
  }

  const saveTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      // Validate inputs
      if (!taskId || !updates) {
        throw new Error('Invalid task update parameters')
      }
      
      // Update in schedule_events table
      const { error } = await supabase
        .from('schedule_events')
        .update({
          start_time: updates.start_date?.toISOString(),
          end_time: updates.end_date?.toISOString()
        })
        .eq('id', taskId)
      
      if (error) {
        console.error('Database update error:', error)
        throw error
      }
      
      toast({
        title: 'Task updated',
        description: 'Task schedule has been updated successfully'
      })
    } catch (error) {
      console.error('Failed to update task:', error)
      
      // Revert optimistic update on error
      fetchProjectData()
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update task',
        variant: 'destructive'
      })
    }
  }

  const generateTimeHeaders = useCallback(() => {
    const { timeScale } = settings
    const headers: Date[] = []
    
    // Calculate project range from tasks and project info
    let projectStart = new Date(viewDate)
    let projectEnd = new Date(viewDate)
    
    if (tasks.length > 0) {
      // Get earliest start and latest end from tasks
      const taskDates = tasks.flatMap(task => [task.start_date, task.end_date])
      projectStart = new Date(Math.min(...taskDates.map(d => d.getTime())))
      projectEnd = new Date(Math.max(...taskDates.map(d => d.getTime())))
    }
    
    // If we have project info, use those dates
    if (projectInfo) {
      if (projectInfo.start_date < projectStart) projectStart = projectInfo.start_date
      if (projectInfo.end_date > projectEnd) projectEnd = projectInfo.end_date
    }
    
    // Add buffer before and after
    let startDate = new Date(projectStart)
    let endDate = new Date(projectEnd)
    
    switch (timeScale) {
      case 'hour':
        startDate.setMinutes(0, 0, 0)
        startDate.setDate(startDate.getDate() - 1) // 1 day buffer
        endDate.setDate(endDate.getDate() + 1)
        break
      case 'day':
        startDate.setHours(0, 0, 0, 0)
        startDate.setDate(startDate.getDate() - 7) // 1 week buffer
        endDate.setDate(endDate.getDate() + 7)
        break
      case 'week':
        startDate = startOfWeek(startDate)
        startDate = addWeeks(startDate, -2) // 2 weeks buffer
        endDate = addWeeks(endOfWeek(endDate), 2)
        break
      case 'month':
        startDate = startOfMonth(startDate)
        startDate = addMonths(startDate, -1) // 1 month buffer
        endDate = addMonths(endOfMonth(endDate), 1)
        break
      case 'quarter':
        startDate = startOfQuarter(startDate)
        startDate = addMonths(startDate, -3) // 1 quarter buffer
        endDate = addMonths(endOfQuarter(endDate), 3)
        break
      case 'year':
        startDate = startOfYear(startDate)
        startDate.setFullYear(startDate.getFullYear() - 1) // 1 year buffer
        endDate.setFullYear(endOfYear(endDate).getFullYear() + 1)
        break
    }
    
    // Generate headers from start to end
    let current = new Date(startDate)
    while (current <= endDate) {
      headers.push(new Date(current))
      
      switch (timeScale) {
        case 'hour':
          current.setHours(current.getHours() + 1)
          break
        case 'day':
          current = addDays(current, 1)
          break
        case 'week':
          current = addWeeks(current, 1)
          break
        case 'month':
          current = addMonths(current, 1)
          break
        case 'quarter':
          current = addMonths(current, 3)
          break
        case 'year':
          current.setFullYear(current.getFullYear() + 1)
          break
      }
      
      // Safety check to prevent infinite loops
      if (headers.length > 200) break
    }
    
    return headers
  }, [settings.timeScale, viewDate, tasks, projectInfo])

  const calculateTaskPosition = useCallback((task: Task, headers: Date[]) => {
    if (!headers.length || !task.start_date || !task.end_date) {
      return { left: '0%', width: '1%' }
    }
    
    const firstDate = headers[0]
    const lastDate = headers[headers.length - 1]
    const totalDays = Math.max(1, differenceInDays(lastDate, firstDate))
    
    const startDiff = Math.max(0, differenceInDays(task.start_date, firstDate))
    const endDiff = Math.max(startDiff, differenceInDays(task.end_date, firstDate))
    
    const left = (startDiff / totalDays) * 100
    const width = Math.max(0.5, ((endDiff - startDiff + 1) / totalDays) * 100)
    
    return {
      left: `${Math.max(0, Math.min(99, left))}%`,
      width: `${Math.min(100 - Math.max(0, left), width)}%`
    }
  }, [])

  const renderTaskRow = (task: Task, depth = 0) => {
    const headers = generateTimeHeaders()
    const position = calculateTaskPosition(task, headers)
    const isExpanded = task.expanded !== false
    const hasCriticalPath = settings.showCriticalPath && criticalPath.includes(task.id)
    const isSelected = selectedTask?.id === task.id
    const isUpdating = (task as any).isUpdating || false
    
    return (
      <div key={task.id}>
        {/* Task Row */}
        <div 
          className={`group hover:bg-gray-50 border-b border-gray-200 ${
            isSelected ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset' : ''
          } ${isUpdating ? 'opacity-75' : ''}`}
          role="row"
          aria-selected={isSelected}
          aria-label={`Task: ${task.title}, Status: ${task.status}, Progress: ${task.progress}%${hasCriticalPath ? ', Critical path' : ''}`}
          tabIndex={0}
          onFocus={() => {
            setSelectedTask(task)
            setSelectedTaskIndex(tasks.findIndex(t => t.id === task.id))
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setEditingTask(task)
              setShowTaskDialog(true)
            }
          }}
        >
          <div className="grid w-full max-w-full" style={{ gridTemplateColumns: '400px minmax(800px, 1fr)' }}>
            {/* Task Info */}
            <div 
              className="p-2 flex items-center space-x-2 border-r border-gray-200 overflow-hidden"
              style={{ paddingLeft: `${depth * 24 + 8}px` }}
              role="gridcell"
            >
              {task.subtasks && task.subtasks.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0"
                  onClick={() => {
                    const updated = { ...task, expanded: !isExpanded }
                    setTasks(prev => updateTaskInTree(prev, task.id, updated))
                  }}
                >
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </Button>
              )}
              
              {task.milestone ? (
                <Flag className="h-4 w-4 text-purple-600" />
              ) : (
                <div className={`h-4 w-4 rounded ${hasCriticalPath ? 'bg-red-500' : 'bg-gray-300'}`} />
              )}
              
              <span className="text-sm font-medium truncate flex-1">{task.title}</span>
              
              {task.wbs && (
                <span className="text-xs text-gray-500">{task.wbs}</span>
              )}
              
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    setEditingTask(task)
                    setShowTaskDialog(true)
                  }}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleDeleteTask(task.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {/* Timeline */}
            <div 
              className="relative p-1 overflow-hidden" 
              style={{ height: `${settings.barHeight}px`, minWidth: '800px' }}
              role="gridcell"
              aria-label={`Timeline for ${task.title}`}
            >
              {/* Updating indicator */}
              {isUpdating && (
                <div className="absolute inset-0 bg-blue-100 bg-opacity-50 flex items-center justify-center z-30">
                  <div className="text-xs text-blue-600 font-medium bg-white px-2 py-1 rounded shadow">
                    Updating...
                  </div>
                </div>
              )}
              
              {/* Today line indicator */}
              {(() => {
                const today = new Date()
                const todayIndex = headers.slice(0, 50).findIndex(date => 
                  date.toDateString() === today.toDateString()
                )
                if (todayIndex >= 0) {
                  const leftPosition = (todayIndex / Math.min(headers.length, 50)) * 100
                  return (
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 opacity-80"
                      style={{ left: `${leftPosition}%` }}
                      title="Today"
                    >
                      <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <div className="w-1 h-1 bg-white rounded-full" />
                      </div>
                    </div>
                  )
                }
                return null
              })()}
              
              {settings.showGrid && (
                <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${Math.min(headers.length, 50)}, 1fr)` }}>
                  {headers.slice(0, 50).map((_, i) => (
                    <div key={i} className="border-l border-gray-100" />
                  ))}
                </div>
              )}
              
              {/* Dependencies */}
              {settings.showDependencies && task.predecessors && task.predecessors.map(dep => (
                <svg
                  key={dep.task_id}
                  className="absolute inset-0 pointer-events-none"
                  style={{ zIndex: 0 }}
                >
                  {/* Dependency arrow rendering would go here */}
                </svg>
              ))}
              
              {/* Task Bar */}
              <DraggableTaskBar task={task} position={{
                position: 'absolute',
                top: '4px',
                height: `${settings.barHeight - 8}px`,
                ...position,
                zIndex: 1
              }}>
                <div
                  className={`h-full rounded-md shadow-sm transition-all ${
                    hasCriticalPath ? 'ring-2 ring-red-500' : ''
                  }`}
                  style={{
                    backgroundColor: task.color || getTaskColor(task),
                    opacity: task.status === 'on_hold' ? 0.5 : 1
                  }}
                >
                  {/* Progress bar */}
                  {settings.showProgress && task.progress > 0 && (
                    <div
                      className="h-full bg-black bg-opacity-20 rounded-md"
                      style={{ width: `${task.progress}%` }}
                    />
                  )}
                  
                  {/* Task label */}
                  {settings.showLabels && parseFloat(position.width) > 5 && (
                    <div className="absolute inset-0 flex items-center px-2">
                      <span className="text-xs text-white truncate">
                        {task.title} {task.progress > 0 && `(${task.progress}%)`}
                      </span>
                    </div>
                  )}
                  
                  {/* Milestone diamond */}
                  {task.milestone && (
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
                      <div className="w-4 h-4 bg-purple-600 transform rotate-45" />
                    </div>
                  )}
                </div>
              </DraggableTaskBar>
              
              {/* Baseline */}
              {settings.showBaseline && task.baseline_start && task.baseline_end && (
                <div
                  className="absolute top-0 h-1 bg-gray-400 opacity-50"
                  style={calculateTaskPosition({
                    ...task,
                    start_date: task.baseline_start,
                    end_date: task.baseline_end
                  }, headers)}
                />
              )}
            </div>
          </div>
        </div>
        
        {/* Subtasks */}
        {isExpanded && task.subtasks && task.subtasks.map(subtask => 
          renderTaskRow(subtask, depth + 1)
        )}
      </div>
    )
  }

  const updateTaskInTree = (tasks: Task[], taskId: string, updates: Partial<Task>): Task[] => {
    return tasks.map(task => {
      if (task.id === taskId) {
        return { ...task, ...updates }
      }
      if (task.subtasks) {
        return {
          ...task,
          subtasks: updateTaskInTree(task.subtasks, taskId, updates)
        }
      }
      return task
    })
  }

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const calculateTaskProgress = (startDate: Date, endDate: Date): { progress: number, status: 'not_started' | 'in_progress' | 'completed' } => {
    const now = new Date()
    
    if (now < startDate) {
      return { progress: 0, status: 'not_started' }
    } else if (now > endDate) {
      return { progress: 100, status: 'completed' }
    } else {
      const totalDays = differenceInDays(endDate, startDate) + 1
      const daysPassed = differenceInDays(now, startDate) + 1
      const progress = Math.round((daysPassed / totalDays) * 100)
      return { progress, status: 'in_progress' }
    }
  }

  const handleAddTask = () => {
    const startDate = new Date()
    const endDate = addDays(new Date(), 7)
    const { progress, status } = calculateTaskProgress(startDate, endDate)
    
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: 'New Task',
      start_date: startDate,
      end_date: endDate,
      duration: 7,
      progress,
      status,
      priority: 'medium',
      level: 0,
      expanded: true
    }
    
    setEditingTask(newTask)
    setShowTaskDialog(true)
  }

  const handleSaveTask = async () => {
    if (!editingTask) return
    
    if (editingTask.id.startsWith('task-')) {
      // New task
      setTasks(prev => [...prev, editingTask])
    } else {
      // Update existing
      setTasks(prev => updateTaskInTree(prev, editingTask.id, editingTask))
    }
    
    setShowTaskDialog(false)
    setEditingTask(null)
  }

  const exportToProjectFile = () => {
    // Generate MS Project XML format
    const xml = generateMSProjectXML(tasks, projectInfo)
    
    function generateMSProjectXML(tasks: any[], projectInfo: any) {
      // Simple XML generation for MS Project
      return `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Name>${projectInfo?.name || 'Project'}</Name>
  <Tasks>
    ${tasks.map(task => `
    <Task>
      <ID>${task.id}</ID>
      <Name>${task.name}</Name>
      <Start>${task.start}</Start>
      <Finish>${task.end}</Finish>
      <Duration>${task.duration}d</Duration>
      <PercentComplete>${task.progress}</PercentComplete>
    </Task>`).join('')}
  </Tasks>
</Project>`
    }
    const blob = new Blob([xml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectInfo?.project_code || 'project'}.xml`
    a.click()
  }

  const generateProjectXML = (tasks: Task[], project: ProjectInfo | null): string => {
    // Project XML generation
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Name>${project?.name || 'Project'}</Name>
  <StartDate>${project?.start_date.toISOString() || new Date().toISOString()}</StartDate>
  <FinishDate>${project?.end_date.toISOString() || new Date().toISOString()}</FinishDate>
  <Tasks>
    ${tasks.map(task => `
    <Task>
      <UID>${task.id}</UID>
      <Name>${task.title}</Name>
      <Start>${task.start_date.toISOString()}</Start>
      <Finish>${task.end_date.toISOString()}</Finish>
      <Duration>PT${task.duration * 8}H0M0S</Duration>
      <PercentComplete>${task.progress}</PercentComplete>
      <Priority>${task.priority === 'critical' ? 1000 : task.priority === 'high' ? 750 : 500}</Priority>
    </Task>`).join('')}
  </Tasks>
</Project>`
  }

  const handlePrint = () => {
    setShowPrintDialog(true)
  }

  const generatePrintableContent = () => {
    const headers = generateTimeHeaders()
    const filteredTasks = printSettings.dateRange === 'visible' 
      ? tasks.filter(task => {
          const startDate = headers[0]
          const endDate = headers[headers.length - 1]
          return task.start_date >= startDate && task.end_date <= endDate
        })
      : printSettings.dateRange === 'custom' && printSettings.customStartDate && printSettings.customEndDate
      ? tasks.filter(task => {
          const customStart = new Date(printSettings.customStartDate)
          const customEnd = new Date(printSettings.customEndDate)
          return task.start_date >= customStart && task.end_date <= customEnd
        })
      : tasks

    return { headers, tasks: filteredTasks }
  }

  const printGanttChart = async () => {
    try {
      const { headers, tasks: filteredTasks } = generatePrintableContent()
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm', 
        format: 'a4'
      })
      
      // PAGE 1: Visual Gantt Chart (like the UI)
      const ganttPageContent = document.createElement('div')
      ganttPageContent.style.width = '1200px'
      ganttPageContent.style.backgroundColor = 'white'
      ganttPageContent.style.fontFamily = 'system-ui, -apple-system, sans-serif'
      ganttPageContent.style.fontSize = '12px'
      ganttPageContent.style.padding = '20px'
      
      // Calculate timeline width and positioning
      const timelineStartDate = headers[0]
      const timelineEndDate = headers[headers.length - 1]
      const totalDays = headers.length
      const dayWidth = Math.min(25, Math.max(15, 800 / totalDays)) // Responsive day width
      const timelineWidth = totalDays * dayWidth
      const taskNameWidth = 350
      
      const ganttHTML = `
        <div style="margin-bottom: 20px; text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px;">
          <h1 style="margin: 0; font-size: 24px; color: #333; font-weight: bold;">${projectInfo?.name || 'Project Schedule'}</h1>
          <p style="margin: 8px 0 4px 0; color: #666; font-size: 14px;">Generated on ${format(new Date(), 'PP')}</p>
          ${projectInfo ? `<p style="margin: 0 0 4px 0; color: #666; font-size: 13px;">Project: ${projectInfo.project_code}</p>` : ''}
          <p style="margin: 0; color: #888; font-size: 12px;">Timeline: ${format(timelineStartDate, 'MMM dd, yyyy')} - ${format(timelineEndDate, 'MMM dd, yyyy')}</p>
        </div>
        
        <!-- Visual Gantt Chart Container -->
        <div style="overflow-x: auto; border: 1px solid #ddd;">
          <div style="display: flex; min-width: ${taskNameWidth + timelineWidth}px;">
            <!-- Task Names Column -->
            <div style="width: ${taskNameWidth}px; flex-shrink: 0; background: #f8f9fa;">
              <!-- Header -->
              <div style="height: 60px; border-bottom: 1px solid #ddd; display: flex; align-items: center; padding: 0 15px; font-weight: bold; font-size: 14px; background: #e9ecef;">
                Task Name
              </div>
              <!-- Task Rows -->
              ${filteredTasks.map(task => `
                <div style="min-height: 50px; height: auto; border-bottom: 1px solid #e0e0e0; display: flex; align-items: center; padding: 10px 15px; background: #f8f9fa;">
                  <div style="display: flex; align-items: flex-start; width: 100%;">
                    <span style="width: 16px; height: 16px; background: ${getTaskColor(task)}; border-radius: 3px; margin-right: 10px; flex-shrink: 0; margin-top: 2px;"></span>
                    <span style="font-size: 12px; font-weight: 500; color: #333; line-height: 1.4; word-wrap: break-word; word-break: break-word; white-space: normal; flex: 1;">${task.title}</span>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <!-- Timeline Grid -->
            <div style="flex: 1; background: white; min-width: ${timelineWidth}px;">
              <!-- Month/Day Headers -->
              <div style="height: 30px; background: #e9ecef; border-bottom: 1px solid #ddd; display: flex;">
                ${headers.map((date, index) => `
                  <div style="width: ${dayWidth}px; flex-shrink: 0; border-right: 1px solid #ddd; text-align: center; padding: 2px; font-size: 9px; font-weight: bold; color: #666;">
                    ${format(date, 'MMM')}
                  </div>
                `).join('')}
              </div>
              <div style="height: 30px; background: #f8f9fa; border-bottom: 1px solid #ddd; display: flex;">
                ${headers.map((date, index) => `
                  <div style="width: ${dayWidth}px; flex-shrink: 0; border-right: 1px solid #e0e0e0; text-align: center; padding: 2px; font-size: 10px; color: #888;">
                    ${format(date, 'dd')}
                  </div>
                `).join('')}
              </div>
              
              <!-- Task Timeline Rows -->
              ${filteredTasks.map(task => {
                const startIndex = headers.findIndex(date => date >= task.start_date);
                const endIndex = headers.findIndex(date => date > task.end_date);
                const actualStartIndex = Math.max(0, startIndex >= 0 ? startIndex : 0);
                const actualEndIndex = endIndex >= 0 ? endIndex - 1 : headers.length - 1;
                const leftPos = actualStartIndex * dayWidth;
                const width = Math.max(dayWidth, (actualEndIndex - actualStartIndex + 1) * dayWidth);
                
                return `
                  <div style="min-height: 50px; height: auto; border-bottom: 1px solid #e0e0e0; position: relative; background: white; padding: 10px 0;">
                    <div style="position: absolute; top: 50%; left: ${leftPos}px; width: ${width}px; height: 20px; background: ${getTaskColor(task)}; border-radius: 4px; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transform: translateY(-50%);">
                      ${task.progress > 0 ? `<div style="position: absolute; left: 0; top: 0; height: 100%; width: ${task.progress}%; background: rgba(0,0,0,0.15); border-radius: 4px;"></div>` : ''}
                      <span style="font-size: 10px; color: white; font-weight: bold; z-index: 1; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">${task.progress}%</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
      
      ganttPageContent.innerHTML = ganttHTML
      document.body.appendChild(ganttPageContent)
      
      const ganttCanvas = await html2canvas(ganttPageContent, {
        scale: 1.2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true
      })
      
      document.body.removeChild(ganttPageContent)
      
      // Add Gantt chart to PDF
      const ganttImgData = ganttCanvas.toDataURL('image/png', 1.0)
      const pageWidth = 297
      const pageHeight = 210
      const margin = 10
      
      const maxWidth = pageWidth - (margin * 2)
      const maxHeight = pageHeight - (margin * 2)
      const aspectRatio = ganttCanvas.height / ganttCanvas.width
      
      let imgWidth = maxWidth
      let imgHeight = imgWidth * aspectRatio
      
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight
        imgWidth = imgHeight / aspectRatio
      }
      
      const x = (pageWidth - imgWidth) / 2
      const y = (pageHeight - imgHeight) / 2
      
      pdf.addImage(ganttImgData, 'PNG', x, y, imgWidth, imgHeight)
      
      // PAGE 2: Task List Table
      pdf.addPage()
      
      const taskListContent = document.createElement('div')
      taskListContent.style.width = '1100px'
      taskListContent.style.backgroundColor = 'white'
      taskListContent.style.fontFamily = 'system-ui, -apple-system, sans-serif'
      taskListContent.style.fontSize = '12px'
      taskListContent.style.padding = '20px'
      
      const taskListHTML = `
        <div style="margin-bottom: 20px; text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px;">
          <h1 style="margin: 0; font-size: 24px; color: #333; font-weight: bold;">Task Details</h1>
          <p style="margin: 8px 0; color: #666; font-size: 14px;">${projectInfo?.name || 'Project Schedule'}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-size: 13px; font-weight: bold; width: 350px;">Task Name</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: center; font-size: 13px; font-weight: bold; width: 100px;">Duration</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: center; font-size: 13px; font-weight: bold; width: 120px;">Start Date</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: center; font-size: 13px; font-weight: bold; width: 120px;">End Date</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: center; font-size: 13px; font-weight: bold; width: 100px;">Status</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: center; font-size: 13px; font-weight: bold; width: 120px;">Progress</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTasks.map(task => `
              <tr style="height: auto; min-height: 50px;">
                <td style="border: 1px solid #ddd; padding: 12px; vertical-align: top; width: 350px;">
                  <div style="display: flex; align-items: flex-start;">
                    <span style="width: 16px; height: 16px; background: ${getTaskColor(task)}; border-radius: 3px; margin-right: 10px; flex-shrink: 0; margin-top: 2px;"></span>
                    <span style="font-size: 12px; line-height: 1.4; word-wrap: break-word; word-break: break-word; white-space: normal; flex: 1;">${task.title}</span>
                  </div>
                </td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center; vertical-align: middle; font-size: 12px;">
                  ${task.duration} days
                </td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center; vertical-align: middle; font-size: 12px;">
                  ${format(task.start_date, 'MMM dd, yyyy')}
                </td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center; vertical-align: middle; font-size: 12px;">
                  ${format(task.end_date, 'MMM dd, yyyy')}
                </td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center; vertical-align: middle;">
                  <span style="padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; background: ${
                    task.status === 'completed' ? '#d4edda; color: #155724' : 
                    task.status === 'in_progress' ? '#d1ecf1; color: #0c5460' :
                    task.status === 'on_hold' ? '#fff3cd; color: #856404' : 
                    '#f8d7da; color: #721c24'
                  };">
                    ${task.status.replace('_', ' ').toUpperCase()}
                  </span>
                </td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center; vertical-align: middle;">
                  <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <div style="width: 50px; height: 10px; background: #e0e0e0; border-radius: 5px; position: relative;">
                      <div style="width: ${task.progress}%; height: 100%; background: ${getTaskColor(task)}; border-radius: 5px;"></div>
                    </div>
                    <span style="font-size: 12px; font-weight: bold; color: #333;">${task.progress}%</span>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      
      taskListContent.innerHTML = taskListHTML
      document.body.appendChild(taskListContent)
      
      const taskListCanvas = await html2canvas(taskListContent, {
        scale: 1.2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true
      })
      
      document.body.removeChild(taskListContent)
      
      // Add task list to PDF
      const taskListImgData = taskListCanvas.toDataURL('image/png', 1.0)
      const taskListAspectRatio = taskListCanvas.height / taskListCanvas.width
      
      let taskListImgWidth = maxWidth
      let taskListImgHeight = taskListImgWidth * taskListAspectRatio
      
      if (taskListImgHeight > maxHeight) {
        taskListImgHeight = maxHeight
        taskListImgWidth = taskListImgHeight / taskListAspectRatio
      }
      
      const taskListX = (pageWidth - taskListImgWidth) / 2
      const taskListY = (pageHeight - taskListImgHeight) / 2
      
      pdf.addImage(taskListImgData, 'PNG', taskListX, taskListY, taskListImgWidth, taskListImgHeight)
      
      return pdf
      
    } catch (error) {
      console.error('Error generating visual print content:', error)
      throw error
    }
  }

  const handlePrintAction = async (action: 'print' | 'pdf') => {
    try {
      const pdf = await printGanttChart()
      
      if (action === 'print') {
        // Open print dialog
        pdf.autoPrint()
        window.open(pdf.output('bloburl'), '_blank')
      } else {
        // Download PDF
        pdf.save(`${projectInfo?.name || 'gantt-chart'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
      }
      
      setShowPrintDialog(false)
      toast({
        title: action === 'print' ? 'Opening Print Dialog' : 'PDF Downloaded',
        description: action === 'print' ? 'Print dialog should open in a new window' : 'Gantt chart has been saved as PDF'
      })
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate printable content',
        variant: 'destructive'
      })
    }
  }

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const headers = useExpensiveMemo(
    () => generateTimeHeaders(),
    [generateTimeHeaders],
    'generateTimeHeaders'
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading Gantt Chart...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Dialog open={showFullView} onOpenChange={setShowFullView}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="truncate">Nexus Gantt View - {projectInfo?.name}</DialogTitle>
            <DialogDescription className="truncate">
              Advanced project management with task dependencies, resource allocation, and intelligent scheduling
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="gantt" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="gantt">Gantt Chart</TabsTrigger>
              <TabsTrigger value="tasks">Task List</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="network">Network Diagram</TabsTrigger>
            </TabsList>
            
            <TabsContent value="gantt" className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg">
                <Button size="sm" variant="outline" onClick={handleAddTask}>
                  <Plus className="h-4 w-4 mr-1" /> Add Task
                </Button>
                <Button size="sm" variant="outline">
                  <Link className="h-4 w-4 mr-1" /> Link Tasks
                </Button>
                <Button size="sm" variant="outline">
                  <GitBranch className="h-4 w-4 mr-1" /> Auto Schedule
                </Button>
                <Button size="sm" variant="outline">
                  <Users className="h-4 w-4 mr-1" /> Assign Resources
                </Button>
                <Separator orientation="vertical" className="h-8" />
                <Button size="sm" variant="outline" onClick={() => setSettings(s => ({ ...s, zoom: Math.min(200, s.zoom + 10) }))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSettings(s => ({ ...s, zoom: Math.max(50, s.zoom - 10) }))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Select value={settings.timeScale} onValueChange={(v: any) => setSettings(s => ({ ...s, timeScale: v }))}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hour">Hour</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="quarter">Quarter</SelectItem>
                    <SelectItem value="year">Year</SelectItem>
                  </SelectContent>
                </Select>
                <Separator orientation="vertical" className="h-8" />
                <Button size="sm" variant="outline" onClick={exportToProjectFile}>
                  <Download className="h-4 w-4 mr-1" /> Export
                </Button>
                <Button size="sm" variant="outline">
                  <Upload className="h-4 w-4 mr-1" /> Import
                </Button>
                <Button size="sm" variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-1" /> Print
                </Button>
              </div>
              
              {/* Gantt Chart - Fixed Width Container */}
              <div 
                className="w-full max-w-full border rounded-lg overflow-x-auto overflow-y-auto" 
                style={{ maxHeight: '600px' }}
                data-gantt-container
                role="grid"
                aria-label="Gantt chart with task timeline"
              >
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                  <div style={{ minWidth: '1200px', width: 'max-content' }}>
                    {/* Time Headers - Sticky */}
                    <div className="grid sticky top-0 bg-white z-20 border-b shadow-sm" style={{ gridTemplateColumns: '400px minmax(800px, 1fr)' }}>
                      <div className="p-2 border-r font-medium bg-gradient-to-r from-gray-50 to-gray-100 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                          <span className="truncate">Task Name</span>
                          <div className="flex gap-2 flex-shrink-0">
                            <Filter className="h-4 w-4" />
                            <ListChecks className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.min(headers.length, 50)}, minmax(40px, 1fr))`, minWidth: '800px' }}>
                          {headers.slice(0, 50).map((date, i) => (
                            <DroppableTimeSlot key={i} date={date}>
                              <div className="text-xs text-center p-1 border-r border-gray-200 truncate">
                                {format(date, settings.timeScale === 'hour' ? 'HH:mm' : 
                                           settings.timeScale === 'day' ? 'dd' :
                                           settings.timeScale === 'week' ? 'wo' :
                                           settings.timeScale === 'month' ? 'MMM' :
                                           settings.timeScale === 'quarter' ? 'Qo' : 'yyyy')}
                              </div>
                            </DroppableTimeSlot>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Task Rows */}
                    <div className="w-full max-w-full overflow-hidden">
                      {tasks.map(task => renderTaskRow(task))}
                    </div>
                  </div>
                </DndContext>
              </div>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-2xl font-bold">{tasks.length}</div>
                  <div className="text-sm text-gray-600">Total Tasks</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {tasks.filter(t => t.status === 'completed').length}
                  </div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {tasks.filter(t => t.status === 'in_progress').length}
                  </div>
                  <div className="text-sm text-gray-600">In Progress</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {criticalPath.length}
                  </div>
                  <div className="text-sm text-gray-600">Critical Tasks</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length)}%
                  </div>
                  <div className="text-sm text-gray-600">Overall Progress</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    ${projectInfo?.budget?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-gray-600">Budget</div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="tasks" className="space-y-4">
              {/* Task list table view */}
              <div className="border rounded-lg overflow-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2">WBS</th>
                      <th className="text-left p-2">Task Name</th>
                      <th className="text-left p-2">Duration</th>
                      <th className="text-left p-2">Start</th>
                      <th className="text-left p-2">Finish</th>
                      <th className="text-left p-2">Predecessors</th>
                      <th className="text-left p-2">Resources</th>
                      <th className="text-left p-2">% Complete</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(task => (
                      <tr key={task.id} className="border-t hover:bg-gray-50">
                        <td className="p-2">{task.wbs}</td>
                        <td className="p-2">{task.title}</td>
                        <td className="p-2">{task.duration}d</td>
                        <td className="p-2">{format(task.start_date, 'MMM dd')}</td>
                        <td className="p-2">{format(task.end_date, 'MMM dd')}</td>
                        <td className="p-2">{task.predecessors?.map(p => p.task_id).join(', ')}</td>
                        <td className="p-2">{task.assigned_to?.join(', ')}</td>
                        <td className="p-2">{task.progress}%</td>
                        <td className="p-2">
                          <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                            {task.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            
            <TabsContent value="resources" className="space-y-4">
              {/* Resource allocation view */}
              <div className="grid gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Resource Allocation</h3>
                  <Button size="sm" onClick={() => setShowResourceDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Add Resource
                  </Button>
                </div>
                
                {resources.map(resource => (
                  <Card key={resource.id}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base">{resource.name}</CardTitle>
                        <Badge>{resource.type}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Allocation</span>
                          <span>{resource.allocated_units || 0}%</span>
                        </div>
                        <Progress value={resource.allocated_units || 0} />
                        <div className="text-sm text-gray-600">
                          Rate: ${resource.rate}/hour • Max Units: {resource.max_units}%
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="calendar" className="space-y-4">
              {/* Calendar view with working days and holidays */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Project Calendar</h3>
                <div className="grid gap-4">
                  <div>
                    <Label>Working Days</Label>
                    <div className="flex gap-2 mt-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                        <Badge
                          key={i}
                          variant={projectInfo?.calendar?.working_days.includes(i) ? 'default' : 'outline'}
                        >
                          {day}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Working Hours</Label>
                    <div className="text-sm mt-2">
                      {projectInfo?.calendar?.working_hours.start} - {projectInfo?.calendar?.working_hours.end}
                    </div>
                  </div>
                  <div>
                    <Label>Holidays</Label>
                    <div className="text-sm mt-2 text-gray-600">
                      {projectInfo?.calendar?.holidays.length || 0} holidays configured
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="network" className="space-y-4">
              {/* Network diagram view */}
              <div className="border rounded-lg p-8 min-h-[400px] flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Network className="h-12 w-12 mx-auto mb-4" />
                  <p>Network diagram shows task dependencies and critical path</p>
                  <p className="text-sm mt-2">Critical Path: {criticalPath.length} tasks</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Task Edit Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask?.id.startsWith('task-') ? 'New Task' : 'Edit Task'}</DialogTitle>
          </DialogHeader>
          
          {editingTask && (
            <div className="space-y-4">
              <div>
                <Label>Task Name</Label>
                <Input
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={format(editingTask.start_date, 'yyyy-MM-dd')}
                    onChange={(e) => {
                      const newStartDate = parseISO(e.target.value)
                      const { progress, status } = calculateTaskProgress(newStartDate, editingTask.end_date)
                      setEditingTask({
                        ...editingTask,
                        start_date: newStartDate,
                        progress,
                        status
                      })
                    }}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={format(editingTask.end_date, 'yyyy-MM-dd')}
                    onChange={(e) => {
                      const newEndDate = parseISO(e.target.value)
                      const { progress, status } = calculateTaskProgress(editingTask.start_date, newEndDate)
                      setEditingTask({
                        ...editingTask,
                        end_date: newEndDate,
                        progress,
                        status
                      })
                    }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status (Auto-calculated)</Label>
                  <Select
                    value={editingTask.status}
                    disabled
                  >
                    <SelectTrigger disabled>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select
                    value={editingTask.priority}
                    onValueChange={(v: any) => setEditingTask({ ...editingTask, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>Progress (Auto-calculated based on schedule)</Label>
                <div className="space-y-2">
                  <Progress value={editingTask.progress} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{editingTask.progress}% Complete</span>
                    <Badge variant={editingTask.status === 'completed' ? 'default' : 
                                   editingTask.status === 'in_progress' ? 'secondary' : 'outline'}>
                      {editingTask.status === 'not_started' ? 'Not Started' :
                       editingTask.status === 'in_progress' ? 'In Progress' : 'Completed'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Progress is automatically calculated based on the current date relative to the task schedule
                  </p>
                </div>
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingTask.milestone || false}
                  onCheckedChange={(checked) => setEditingTask({ ...editingTask, milestone: checked })}
                />
                <Label>Mark as Milestone</Label>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveTask}>
                  Save Task
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Main Gantt Chart Card - Fixed Width Container */}
      <div className="w-full max-w-full overflow-hidden">
        <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300">
          <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl w-full max-w-full">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="min-w-0 flex-1 mr-4">
                  <CardTitle className="flex items-center gap-2 truncate">
                    <BarChart3 className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">Nexus Gantt View</span>
                  </CardTitle>
                  <CardDescription className="truncate">
                    {projectInfo?.name || 'Select a project'} • {tasks.length} tasks
                  </CardDescription>
                </div>
                <Button onClick={() => setShowFullView(true)} className="flex-shrink-0">
                  <Maximize2 className="h-4 w-4 mr-1" />
                  Full View
                </Button>
              </div>
            </CardHeader>
            <CardContent className="w-full max-w-full overflow-hidden">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Calendar className="h-12 w-12 mb-4" />
                  <p>No tasks found for this project</p>
                  <Button className="mt-4" onClick={handleAddTask}>
                    <Plus className="h-4 w-4 mr-1" /> Add First Task
                  </Button>
                </div>
              ) : (
                <div className="w-full max-w-full border rounded-lg overflow-x-auto overflow-y-auto" style={{ maxHeight: '400px' }}>
                  <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <div style={{ minWidth: '800px', width: 'max-content' }}>
                      {/* Time Headers */}
                      <div className="grid sticky top-0 bg-white z-10 border-b" style={{ gridTemplateColumns: '300px minmax(500px, 1fr)' }}>
                        <div className="p-2 border-r font-medium bg-gray-50 truncate">Task Name</div>
                        <div className="overflow-x-auto">
                          <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.min(headers.length, 30)}, minmax(60px, 1fr))`, minWidth: '500px' }}>
                            {headers.slice(0, 30).map((date, i) => (
                              <DroppableTimeSlot key={i} date={date}>
                                <div className="text-xs text-center p-1 border-r border-gray-200 truncate">
                                  {format(date, 'MMM dd')}
                                </div>
                              </DroppableTimeSlot>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Task Rows (simplified) */}
                      {tasks.map(task => (
                        <div key={task.id} className="grid border-b" style={{ gridTemplateColumns: '300px minmax(500px, 1fr)' }}>
                          <div className="p-2 flex items-center space-x-2 border-r overflow-hidden">
                            {task.milestone ? (
                              <Flag className="h-4 w-4 text-purple-600 flex-shrink-0" />
                            ) : (
                              <div className="h-4 w-4 rounded bg-gray-300 flex-shrink-0" />
                            )}
                            <span className="text-sm truncate">{task.title}</span>
                          </div>
                          <div className="relative p-1 overflow-hidden" style={{ minWidth: '500px' }}>
                            {/* Today line indicator */}
                            {(() => {
                              const today = new Date()
                              const todayIndex = headers.slice(0, 30).findIndex(date => 
                                date.toDateString() === today.toDateString()
                              )
                              if (todayIndex >= 0) {
                                const leftPosition = (todayIndex / Math.min(headers.length, 30)) * 100
                                return (
                                  <div 
                                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 opacity-80"
                                    style={{ left: `${leftPosition}%` }}
                                    title="Today"
                                  >
                                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
                                  </div>
                                )
                              }
                              return null
                            })()}
                            <div
                              className="absolute h-6 rounded shadow-sm"
                              style={{
                                ...calculateTaskPosition(task, headers.slice(0, 30)),
                                backgroundColor: getTaskColor(task),
                                top: '4px',
                                minWidth: '10px',
                                maxWidth: 'calc(100% - 8px)'
                              }}
                            >
                              {settings.showProgress && task.progress > 0 && (
                                <div
                                  className="h-full bg-black bg-opacity-20 rounded"
                                  style={{ width: `${task.progress}%` }}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </DndContext>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print Settings Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Print Settings</DialogTitle>
            <DialogDescription>
              Configure print options for the Gantt chart
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Page Setup */}
            <div className="space-y-4">
              <h4 className="font-medium">Page Setup</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Orientation</Label>
                  <Select 
                    value={printSettings.orientation} 
                    onValueChange={(value: 'portrait' | 'landscape') => 
                      setPrintSettings(prev => ({ ...prev, orientation: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Page Size</Label>
                  <Select 
                    value={printSettings.pageSize} 
                    onValueChange={(value: 'A4' | 'A3' | 'Legal' | 'Letter') => 
                      setPrintSettings(prev => ({ ...prev, pageSize: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4</SelectItem>
                      <SelectItem value="A3">A3</SelectItem>
                      <SelectItem value="Letter">Letter</SelectItem>
                      <SelectItem value="Legal">Legal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Content Options */}
            <div className="space-y-4">
              <h4 className="font-medium">Content Options</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Include Timeline</Label>
                  <Switch 
                    checked={printSettings.includeTimeline}
                    onCheckedChange={(checked) => 
                      setPrintSettings(prev => ({ ...prev, includeTimeline: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Include Resources</Label>
                  <Switch 
                    checked={printSettings.includeResources}
                    onCheckedChange={(checked) => 
                      setPrintSettings(prev => ({ ...prev, includeResources: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Include Details</Label>
                  <Switch 
                    checked={printSettings.includeDetails}
                    onCheckedChange={(checked) => 
                      setPrintSettings(prev => ({ ...prev, includeDetails: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-4">
              <h4 className="font-medium">Date Range</h4>
              <Select 
                value={printSettings.dateRange} 
                onValueChange={(value: 'all' | 'visible' | 'custom') => 
                  setPrintSettings(prev => ({ ...prev, dateRange: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tasks</SelectItem>
                  <SelectItem value="visible">Visible Range</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              
              {printSettings.dateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input 
                      type="date" 
                      value={printSettings.customStartDate}
                      onChange={(e) => 
                        setPrintSettings(prev => ({ ...prev, customStartDate: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input 
                      type="date" 
                      value={printSettings.customEndDate}
                      onChange={(e) => 
                        setPrintSettings(prev => ({ ...prev, customEndDate: e.target.value }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Scale */}
            <div className="space-y-4">
              <h4 className="font-medium">Scale</h4>
              <Select 
                value={printSettings.scale} 
                onValueChange={(value: 'fit' | '100%' | '75%' | '50%') => 
                  setPrintSettings(prev => ({ ...prev, scale: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fit">Fit to Page</SelectItem>
                  <SelectItem value="100%">100%</SelectItem>
                  <SelectItem value="75%">75%</SelectItem>
                  <SelectItem value="50%">50%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowPrintDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => handlePrintAction('print')}
              className="flex-1"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button 
              onClick={() => handlePrintAction('pdf')}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Save PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Export memoized component with custom comparison
export default memo(GanttChartPro, (prevProps, nextProps) => {
  return prevProps.projectId === nextProps.projectId
})