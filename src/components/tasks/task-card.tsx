"use client"

import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, User, Flag, MoreVertical, Trash2, Undo, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { Task } from '@/lib/types'

interface TaskCardProps {
  task: any // Temporarily use any to avoid build issues
  isDragging?: boolean
  onDelete?: (taskId: string) => void
  onUndo?: (task: any) => void
}

const priorityColors: Record<string, string> = {
  low: 'priority-low',
  medium: 'priority-medium',
  high: 'priority-high',
  urgent: 'priority-urgent',
}

const priorityLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

// Temporary storage for deleted tasks with undo functionality
const deletedTasks = new Map<string, { task: any; timer: NodeJS.Timeout }>()

export function TaskCard({ task, isDragging, onDelete, onUndo }: TaskCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showUndoToast, setShowUndoToast] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date()

  // Handle delete with undo functionality
  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }

  const confirmDelete = () => {
    setShowDeleteDialog(false)
    setIsDeleting(true)
    
    // Show undo toast
    const undoToastId = toast({
      title: 'Task deleted',
      description: (
        <div className="flex items-center justify-between w-full">
          <span>{task.title} has been deleted</span>
          <Button
            size="sm"
            variant="outline"
            className="ml-2"
            onClick={() => handleUndo()}
          >
            <Undo className="h-3 w-3 mr-1" />
            Undo
          </Button>
        </div>
      ),
      duration: 5000,
    })

    // Store deleted task temporarily
    const timeoutId = setTimeout(() => {
      // Permanently delete after 5 seconds
      deletedTasks.delete(task.id)
      if (onDelete) {
        onDelete(task.id)
      }
    }, 5000)

    deletedTasks.set(task.id, { task, timer: timeoutId })
    deleteTimeoutRef.current = timeoutId
  }

  const handleUndo = () => {
    const deletedTask = deletedTasks.get(task.id)
    if (deletedTask) {
      clearTimeout(deletedTask.timer)
      deletedTasks.delete(task.id)
      setIsDeleting(false)
      if (onUndo) {
        onUndo(deletedTask.task)
      }
      toast({
        title: 'Task restored',
        description: `${task.title} has been restored`,
      })
    }
  }

  // Analyze task dependencies for impact assessment
  const getDependentTasks = () => {
    // This would typically fetch from your task management system
    // For now, we'll simulate some dependencies
    return [
      { id: '1', title: 'Review design mockups', dependency_type: 'blocks' },
      { id: '2', title: 'Frontend implementation', dependency_type: 'depends_on' }
    ]
  }

  const dependentTasks = getDependentTasks()

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current)
      }
    }
  }, [])

  // Don't render if task is being deleted
  if (isDeleting) {
    return (
      <div className="animate-fade-out opacity-0 transform scale-95 transition-all duration-300">
        {/* Fade out placeholder */}
      </div>
    )
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "coreiq-card cursor-move transition-all group",
          (isDragging || isSortableDragging) && "opacity-50",
          "hover:shadow-lg",
          isDeleting && "animate-pulse opacity-60"
        )}
        {...attributes}
        {...listeners}
      >
      <div className="card-body p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium line-clamp-2">{task.title}</h4>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteClick()
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                // TODO: Open task menu
              }}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs">
          {task.due_date && (
            <div className={cn(
              "flex items-center gap-1",
              isOverdue && "text-destructive"
            )}>
              <Calendar className="h-3 w-3" />
              <span>
                {new Date(task.due_date).toLocaleDateString()}
              </span>
            </div>
          )}

          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${priorityColors[task?.priority as keyof typeof priorityColors] || ''}`}>
            <Flag className="h-3 w-3" />
            {priorityLabels[task?.priority as keyof typeof priorityLabels] || 'Unknown'}
          </span>
        </div>

        {task.assignee && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{task.assignee.full_name || task.assignee.email}</span>
          </div>
        )}

        {task.project && (
          <div className="text-xs text-muted-foreground truncate">
            {task.project.name}
          </div>
        )}
      </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Task
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action can be undone within 5 seconds.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Task Details */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="font-medium">{task.title}</div>
              {task.description && (
                <div className="text-sm text-muted-foreground">{task.description}</div>
              )}
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline">
                  {priorityLabels[task?.priority as keyof typeof priorityLabels] || 'Unknown'}
                </Badge>
                {task.due_date && (
                  <span className={cn(
                    "flex items-center gap-1",
                    isOverdue && "text-destructive"
                  )}>
                    <Calendar className="h-3 w-3" />
                    {new Date(task.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Impact Analysis */}
            {dependentTasks.length > 0 && (
              <div className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="font-medium text-sm">Impact Analysis</span>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  This task affects {dependentTasks.length} other task{dependentTasks.length !== 1 ? 's' : ''}:
                </div>
                <ul className="space-y-1">
                  {dependentTasks.map(depTask => (
                    <li key={depTask.id} className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>{depTask.title}</span>
                      <Badge variant="secondary" className="text-xs">
                        {depTask.dependency_type}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}