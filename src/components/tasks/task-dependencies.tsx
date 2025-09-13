"use client"

import { useState } from 'react'
import { Link2, Plus, X, ArrowRight, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { TaskDependency } from '@/lib/types'
import { useTasks } from '@/lib/hooks/use-tasks'

interface TaskDependenciesProps {
  dependencies: TaskDependency[]
  currentTaskId?: string
  projectId?: string
  onChange: (dependencies: TaskDependency[]) => void
}

const dependencyTypeLabels = {
  finish_to_start: 'Finish to Start',
  start_to_start: 'Start to Start',
  finish_to_finish: 'Finish to Finish',
  start_to_finish: 'Start to Finish'
}

export function TaskDependencies({ 
  dependencies = [], 
  currentTaskId,
  projectId,
  onChange 
}: TaskDependenciesProps) {
  const [isAddingDependency, setIsAddingDependency] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [dependencyType, setDependencyType] = useState<TaskDependency['dependency_type']>('finish_to_start')
  const [lagDays, setLagDays] = useState(0)
  
  const { data: tasksData } = useTasks({ project_id: projectId })
  const tasks = tasksData?.data || []
  
  // Filter out current task and already dependent tasks
  const availableTasks = tasks.filter(task => 
    task.id !== currentTaskId && 
    !dependencies.find(d => d.depends_on_task_id === task.id)
  )
  
  const handleAddDependency = () => {
    const selectedTask = tasks.find(t => t.id === selectedTaskId)
    if (!selectedTask) return
    
    const newDependency: TaskDependency = {
      id: crypto.randomUUID(),
      depends_on_task_id: selectedTaskId,
      dependency_type: dependencyType,
      lag_days: lagDays,
      task_title: selectedTask.title
    }
    
    onChange([...dependencies, newDependency])
    setIsAddingDependency(false)
    setSelectedTaskId('')
    setDependencyType('finish_to_start')
    setLagDays(0)
  }
  
  const handleRemoveDependency = (id: string) => {
    onChange(dependencies.filter(d => d.id !== id))
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Task Dependencies
        </Label>
        
        <Dialog open={isAddingDependency} onOpenChange={setIsAddingDependency}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7">
              <Plus className="h-3 w-3 mr-1" />
              Add Dependency
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Task Dependency</DialogTitle>
              <DialogDescription>
                Define which tasks must be completed before this task can start or finish.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="predecessor">Predecessor Task</Label>
                <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a task" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTasks.map(task => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="type">Dependency Type</Label>
                <Select 
                  value={dependencyType} 
                  onValueChange={(v) => setDependencyType(v as TaskDependency['dependency_type'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(dependencyTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {dependencyType === 'finish_to_start' && 'This task cannot start until the predecessor finishes'}
                  {dependencyType === 'start_to_start' && 'This task cannot start until the predecessor starts'}
                  {dependencyType === 'finish_to_finish' && 'This task cannot finish until the predecessor finishes'}
                  {dependencyType === 'start_to_finish' && 'This task cannot finish until the predecessor starts'}
                </p>
              </div>
              
              <div>
                <Label htmlFor="lag">Lag Time (days)</Label>
                <Input
                  id="lag"
                  type="number"
                  value={lagDays}
                  onChange={(e) => setLagDays(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Number of days to wait after the dependency is satisfied
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleAddDependency}
                  disabled={!selectedTaskId}
                >
                  Add Dependency
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddingDependency(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {dependencies.length > 0 ? (
        <div className="space-y-2">
          {dependencies.map((dep) => (
            <div
              key={dep.id}
              className="flex items-center justify-between p-2 border rounded-lg bg-muted/30"
            >
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{dep.task_title}</span>
                <Badge variant="outline" className="text-xs">
                  {dependencyTypeLabels[dep.dependency_type]}
                </Badge>
                {dep.lag_days && dep.lag_days > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    +{dep.lag_days} days
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleRemoveDependency(dep.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No dependencies. This task can start independently.
        </p>
      )}
    </div>
  )
}