"use client"

import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { TaskCard } from './task-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Task } from '@/lib/types'

interface KanbanColumnProps {
  id: Task['status']
  title: string
  tasks: any[]
  color?: string
}

export function KanbanColumn({ id, title, tasks, color }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  })

  const taskIds = tasks.map((task: any) => task.id)

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "w-80 md:w-auto flex-shrink-0 bg-gray-50 rounded-lg border border-gray-200 transition-all",
        isOver && "border-primary bg-primary/5 shadow-lg"
      )}
    >
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: color }}
            />
            <h3 className="font-semibold text-gray-900">{title}</h3>
          </div>
          <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-gray-600 bg-gray-200 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>
      <div className="p-2">
        <SortableContext 
          items={taskIds} 
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 min-h-[100px]">
            {tasks.map((task: any) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}