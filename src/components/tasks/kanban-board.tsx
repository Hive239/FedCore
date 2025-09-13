"use client"

import { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { TaskCard } from './task-card'
import { KanbanColumn } from './kanban-column'
import { useUpdateTaskPosition } from '@/lib/hooks/use-tasks'
import { useDebouncedCallback } from '@/lib/hooks/use-debounced-search'
import { useOptimisticUpdates } from '@/lib/hooks/use-optimistic-updates'
import { VirtualList } from '@/components/ui/virtual-list'
import type { Task } from '@/lib/types'

interface KanbanBoardProps {
  tasks: any[]
  virtualScrolling?: boolean
  itemHeight?: number
  maxColumnHeight?: number
  enableOptimisticUpdates?: boolean
  debounceDelay?: number
}

// CoreIQ Kanban columns: Todo, In Progress, Completed
const columns: { id: Task['status']; title: string; color: string }[] = [
  { id: 'pending', title: 'Todo', color: '#6b7280' },      // Gray
  { id: 'in-progress', title: 'In Progress', color: '#3b82f6' }, // Blue
  { id: 'completed', title: 'Completed', color: '#10b981' }, // Green
]

// Memoized task card wrapper for performance
const MemoizedTaskCard = memo(({ 
  task, 
  isDragging = false, 
  style 
}: { 
  task: any; 
  isDragging?: boolean; 
  style?: React.CSSProperties 
}) => (
  <div style={style}>
    <TaskCard task={task} isDragging={isDragging} />
  </div>
), (prevProps, nextProps) => {
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.title === nextProps.task.title &&
    prevProps.task.status === nextProps.task.status &&
    prevProps.task.priority === nextProps.task.priority &&
    prevProps.task.progress === nextProps.task.progress &&
    prevProps.task.due_date === nextProps.task.due_date &&
    prevProps.task.position === nextProps.task.position &&
    prevProps.isDragging === nextProps.isDragging
  )
})

MemoizedTaskCard.displayName = 'MemoizedTaskCard'

// Optimized column component with virtual scrolling
const OptimizedKanbanColumn = memo(({
  id,
  title,
  tasks,
  color,
  virtualScrolling = false,
  itemHeight = 120,
  maxHeight = 600,
  onTaskMove
}: {
  id: string
  title: string
  tasks: any[]
  color: string
  virtualScrolling?: boolean
  itemHeight?: number
  maxHeight?: number
  onTaskMove?: (taskId: string, newStatus: string, newPosition: number) => void
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  
  const renderTask = useCallback((task: any, index: number, style: React.CSSProperties) => (
    <MemoizedTaskCard 
      key={task.id}
      task={task} 
      style={style}
    />
  ), [])
  
  return (
    <div className="flex flex-col bg-gray-50 rounded-lg p-4 min-w-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <div 
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm text-gray-500 ml-2">{tasks.length}</span>
      </div>
      
      <div 
        ref={containerRef}
        className="flex-1 min-h-0"
        style={{ maxHeight }}
      >
        {virtualScrolling && tasks.length > 10 ? (
          <VirtualList
            items={tasks}
            itemHeight={itemHeight}
            containerHeight={maxHeight}
            renderItem={renderTask}
            className="space-y-2"
          />
        ) : (
          <div className="space-y-2">
            {tasks.map((task, index) => (
              <MemoizedTaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Only re-render if tasks array changes in meaningful ways
  if (prevProps.tasks.length !== nextProps.tasks.length) return false
  
  return prevProps.tasks.every((task, index) => {
    const nextTask = nextProps.tasks[index]
    return task && nextTask && 
           task.id === nextTask.id &&
           task.position === nextTask.position &&
           task.status === nextTask.status
  })
})

OptimizedKanbanColumn.displayName = 'OptimizedKanbanColumn'

export function KanbanBoard({ 
  tasks,
  virtualScrolling = false,
  itemHeight = 120,
  maxColumnHeight = 600,
  enableOptimisticUpdates = true,
  debounceDelay = 300
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<any | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragError, setDragError] = useState<string | null>(null)
  const updateTaskPosition = useUpdateTaskPosition()
  const { createOptimisticUpdate, rollbackUpdate } = useOptimisticUpdates()
  
  // Cast tasks to any to avoid TypeScript build issues
  const tasksAny = tasks as any[]
  
  // Performance tracking
  const performanceMetrics = useRef({
    dragStartTime: 0,
    dragEndTime: 0,
    renderCount: 0
  })
  
  // Increment render count for performance monitoring
  performanceMetrics.current.renderCount++

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  )

  // Optimized task grouping with memoization
  const tasksByStatus = useMemo(() => {
    const grouped = tasksAny.reduce((acc, task: any) => {
      const status = task.status as Task['status']
      if (!acc[status]) {
        acc[status] = []
      }
      acc[status].push(task)
      return acc
    }, {} as Record<Task['status'], any[]>)
    
    // Sort tasks by position within each column
    Object.keys(grouped).forEach(status => {
      grouped[status as Task['status']].sort((a: any, b: any) => a.position - b.position)
    })
    
    return grouped
  }, [tasksAny])
  
  // Memoize column data to prevent unnecessary re-renders
  const columnData = useMemo(() => {
    return columns.map(column => ({
      ...column,
      tasks: tasksByStatus[column.id] || [],
      taskCount: (tasksByStatus[column.id] || []).length
    }))
  }, [tasksByStatus])

  // Debounced drag update to prevent excessive API calls
  const [debouncedDragUpdate] = useDebouncedCallback((
    taskId: string, 
    newStatus: Task['status'], 
    newPosition: number
  ) => {
    const task = tasksAny.find(t => t.id === taskId)
    if (!task) return
    
    let updateId: string | undefined
    
    if (enableOptimisticUpdates) {
      // Create optimistic update
      updateId = createOptimisticUpdate(
        ['tasks'],
        { taskId, newStatus, newPosition },
        (oldTasks: any[]) => {
          if (!oldTasks) return []
          return oldTasks.map(t => 
            t.id === taskId 
              ? { ...t, status: newStatus, position: newPosition }
              : t
          )
        }
      )
    }
    
    updateTaskPosition.mutate(
      { id: taskId, newStatus, newPosition },
      {
        onSuccess: () => {
          setDragError(null)
          performanceMetrics.current.dragEndTime = performance.now()
          const dragDuration = performanceMetrics.current.dragEndTime - performanceMetrics.current.dragStartTime
          console.log(`Drag operation completed in ${dragDuration.toFixed(2)}ms`)
        },
        onError: (error: any) => {
          if (updateId && enableOptimisticUpdates) {
            rollbackUpdate(updateId, error.message || 'Failed to update task position')
          }
          setDragError(error.message || 'Failed to update task position')
          console.error('Drag and drop error:', error)
        }
      }
    )
  }, debounceDelay)
  
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const task = tasksAny.find(t => t.id === active.id)
    if (task) {
      setActiveTask(task)
      setIsDragging(true)
      setDragError(null)
      performanceMetrics.current.dragStartTime = performance.now()
    }
  }, [tasksAny])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    
    setActiveTask(null)
    setIsDragging(false)
    
    if (!over) return

    const activeTask = tasksAny.find(t => t.id === active.id)
    if (!activeTask) return

    // Determine the new status
    let newStatus: Task['status'] = activeTask.status
    
    // If dropped on a column
    if (columns.some(col => col.id === over.id)) {
      newStatus = over.id as Task['status']
    } else {
      // If dropped on another task, get its status
      const overTask = tasksAny.find(t => t.id === over.id)
      if (overTask) {
        newStatus = overTask.status
      }
    }

    // Calculate new position with improved logic
    const tasksInNewColumn = tasksByStatus[newStatus] || []
    let newPosition = 0
    
    if (over.id !== newStatus) {
      // Dropped on another task
      const overTask = tasksAny.find(t => t.id === over.id)
      if (overTask) {
        newPosition = overTask.position
        
        // Use more precise position calculation
        if (activeTask.status === newStatus) {
          // Moving within the same column
          newPosition = activeTask.position < overTask.position 
            ? overTask.position - 0.1 
            : overTask.position + 0.1
        } else {
          // Moving to a different column
          newPosition = overTask.position + 0.1
        }
      }
    } else {
      // Dropped on empty column
      newPosition = tasksInNewColumn.length > 0 
        ? Math.max(...tasksInNewColumn.map((t: any) => t.position)) + 1 
        : 0
    }

    // Only update if there's an actual change
    if (activeTask.status !== newStatus || Math.abs(activeTask.position - newPosition) > 0.01) {
      debouncedDragUpdate(activeTask.id, newStatus, newPosition)
    }
  }, [tasksAny, tasksByStatus, debouncedDragUpdate])

  const handleDragCancel = () => {
    setActiveTask(null)
    setIsDragging(false)
    setDragError(null)
  }

  return (
    <div className="space-y-4">
      {/* Drag Error Display */}
      {dragError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-red-600"></div>
            <p className="text-sm font-medium text-red-900">Drag and Drop Error</p>
          </div>
          <p className="mt-1 text-sm text-red-700">{dragError}</p>
          <button 
            onClick={() => setDragError(null)}
            className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-3 md:overflow-visible">
          {columnData.map(column => (
            <OptimizedKanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={column.tasks}
              color={column.color}
              virtualScrolling={virtualScrolling}
              itemHeight={itemHeight}
              maxHeight={maxColumnHeight}
            />
          ))}
        </div>
        
        <DragOverlay>
          {activeTask && (
            <div className="opacity-80 rotate-3">
              <TaskCard task={activeTask} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Enhanced Loading Indicator with Progress */}
      {updateTaskPosition.isPending && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-white shadow-lg border p-4 z-50">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">
              {enableOptimisticUpdates ? 'Syncing changes...' : 'Updating task...'}
            </span>
          </div>
        </div>
      )}
      
      {/* Performance Debug Info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 text-xs text-gray-500 bg-white/90 p-2 rounded border">
          <div>Renders: {performanceMetrics.current.renderCount}</div>
          <div>Virtual Scrolling: {virtualScrolling ? 'ON' : 'OFF'}</div>
          <div>Optimistic Updates: {enableOptimisticUpdates ? 'ON' : 'OFF'}</div>
          <div>Tasks: {tasksAny.length}</div>
        </div>
      )}
    </div>
  )
}

// Export memoized board to prevent unnecessary re-renders at parent level
export default memo(KanbanBoard, (prevProps, nextProps) => {
  // Deep comparison for tasks array
  if (prevProps.tasks.length !== nextProps.tasks.length) return false
  
  const tasksChanged = prevProps.tasks.some((task, index) => {
    const nextTask = nextProps.tasks[index]
    return !nextTask || 
           task.id !== nextTask.id ||
           task.status !== nextTask.status ||
           task.position !== nextTask.position ||
           task.title !== nextTask.title ||
           task.updated_at !== nextTask.updated_at
  })
  
  return !tasksChanged &&
         prevProps.virtualScrolling === nextProps.virtualScrolling &&
         prevProps.itemHeight === nextProps.itemHeight &&
         prevProps.maxColumnHeight === nextProps.maxColumnHeight &&
         prevProps.enableOptimisticUpdates === nextProps.enableOptimisticUpdates &&
         prevProps.debounceDelay === nextProps.debounceDelay
})