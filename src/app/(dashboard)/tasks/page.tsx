"use client"

import { useState, useEffect } from 'react'
import { Plus, MoreVertical, Calendar, User, Tag, Clock, AlertCircle, CheckCircle2, Users, Filter, Search, ArrowUp, ArrowDown, TrendingUp, Activity, Layers3, FolderKanban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/lib/hooks/use-tasks'
import { useProjects } from '@/lib/hooks/use-projects'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useAssignTaskTeamMembers, useTaskTeamMembers, useTeamMembers } from '@/lib/hooks/use-team-members'
import { TeamAssignmentDialog } from '@/components/team/team-assignment-dialog'
import { TaskContactTags } from '@/components/tasks/task-contact-tags'
import { TaskDependencies } from '@/components/tasks/task-dependencies'
import { TaskSuggestions } from '@/components/tasks/task-suggestions'
import { ContactTag, TaskDependency } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'

type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
type TaskStatus = 'pending' | 'in-progress' | 'completed'

const priorityConfig = {
  low: { label: 'Low', color: 'bg-gray-500' },
  medium: { label: 'Medium', color: 'bg-yellow-500' },
  high: { label: 'High', color: 'bg-orange-500' },
  urgent: { label: 'Urgent', color: 'bg-red-500' }
}

const statusColumns = {
  'pending': { label: 'Pending', icon: Clock, color: 'text-gray-600' },
  'in-progress': { label: 'In Progress', icon: AlertCircle, color: 'text-blue-600' },
  'completed': { label: 'Completed', icon: CheckCircle2, color: 'text-green-600' }
}


export default function TasksPage() {
  // Fetch tasks and projects
  const { data: tasksData, isLoading: tasksLoading } = useTasks()
  const { data: projectsData } = useProjects()
  const { data: teamMembersData } = useTeamMembers()
  const createTaskMutation = useCreateTask()
  const assignTeamMutation = useAssignTaskTeamMembers()
  const deleteTaskMutation = useDeleteTask()
  const { toast } = useToast()
  
  // New state for filtering
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [selectedTaskForTeam, setSelectedTaskForTeam] = useState<string | null>(null)
  const [teamAssignmentOpen, setTeamAssignmentOpen] = useState(false)
  const [completedTaskId, setCompletedTaskId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [taskToDelete, setTaskToDelete] = useState<any | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<any | null>(null)
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false)
  const [editTaskData, setEditTaskData] = useState({
    title: '',
    description: '',
    project_id: '',
    assignee_id: '',
    priority: 'medium' as TaskPriority,
    due_date: '',
    status: 'pending' as TaskStatus,
    tags: [] as string[],
    contact_tags: [] as ContactTag[],
    dependencies: [] as TaskDependency[]
  })
  const updateTaskMutation = useUpdateTask()
  
  const allTasks = tasksData?.data || []
  const projects = projectsData?.data || []
  const teamMembers = teamMembersData || []
  
  // Filter tasks based on project and search
  const tasks = allTasks.filter(task => {
    const matchesProject = selectedProjectFilter === 'all' || task.project_id === selectedProjectFilter
    const matchesSearch = !searchQuery || 
      task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.project?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesProject && matchesSearch
  })
  
  const [draggedTask, setDraggedTask] = useState<any>(null)
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    project_id: '',
    assignee_id: '',
    priority: 'medium' as TaskPriority,
    due_date: '',
    status: 'pending' as TaskStatus,
    tags: [] as string[],
    contact_tags: [] as ContactTag[],
    dependencies: [] as TaskDependency[]
  })

  const handleDragStart = (e: React.DragEvent, task: any) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault()
    if (draggedTask) {
      try {
        await updateTaskMutation.mutateAsync({
          id: draggedTask.id,
          data: { status: newStatus }
        })
        
        // If task is marked as completed, show AI suggestions
        if (newStatus === 'completed') {
          setCompletedTaskId(draggedTask.id)
          setSelectedProjectId(draggedTask.project_id)
        }
        
        toast({
          title: "Task Updated",
          description: `Task moved to ${newStatus.replace('-', ' ')}`,
          variant: "default"
        })
      } catch (error) {
        console.error('Failed to update task status:', error)
        toast({
          title: "Error",
          description: "Failed to update task status. Please try again.",
          variant: "destructive"
        })
      }
      setDraggedTask(null)
    }
  }

  const handleAddTask = async () => {
    if (!newTask.title) return

    try {
      const createdTask = await createTaskMutation.mutateAsync({
        ...newTask,
        tags: newTask.tags,
        contact_tags: newTask.contact_tags
      })
      
      setIsAddTaskOpen(false)
      setNewTask({
        title: '',
        description: '',
        project_id: '',
        assignee_id: '',
        priority: 'medium',
        due_date: '',
        status: 'pending',
        tags: [],
        contact_tags: [],
        dependencies: []
      })
      
      toast({
        title: "Task Created",
        description: `"${newTask.title}" has been created successfully.`,
        variant: "default"
      })
    } catch (error) {
      console.error('Failed to create task:', error)
      toast({
        title: "Error",
        description: "Failed to create task. Please check your input and try again.",
        variant: "destructive"
      })
    }
  }

  const handleEditTask = (task: any) => {
    setTaskToEdit(task)
    setEditTaskData({
      title: task.title || '',
      description: task.description || '',
      project_id: task.project_id || '',
      assignee_id: task.assignee_id || '',
      priority: task.priority || 'medium',
      due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
      status: task.status || 'pending',
      tags: Array.isArray(task.tags) ? task.tags : [],
      contact_tags: Array.isArray(task.contact_tags) ? task.contact_tags : [],
      dependencies: Array.isArray(task.dependencies) ? task.dependencies : []
    })
    setIsEditTaskOpen(true)
  }

  const handleSaveEditTask = async () => {
    if (!taskToEdit || !editTaskData.title) return

    try {
      await updateTaskMutation.mutateAsync({
        id: taskToEdit.id,
        data: editTaskData
      })
      
      setIsEditTaskOpen(false)
      setTaskToEdit(null)
      
      toast({
        title: "Task Updated",
        description: `"${editTaskData.title}" has been updated successfully.`,
        variant: "default"
      })
    } catch (error) {
      console.error('Failed to update task:', error)
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleDeleteTask = async (task: any) => {
    setTaskToDelete(task)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return

    try {
      // Store task title before deletion for toast message
      const taskTitle = taskToDelete.title
      
      // Show loading state by keeping dialog open but disabling buttons
      await deleteTaskMutation.mutateAsync(taskToDelete.id)
      
      // Close dialog and reset state
      setIsDeleteDialogOpen(false)
      setTaskToDelete(null)
      
      toast({
        title: "Task Deleted",
        description: `"${taskTitle}" has been deleted successfully.`,
        variant: "default"
      })
    } catch (error) {
      console.error('Failed to delete task:', error)
      
      // Don't close dialog on error - let user retry
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete task. Please try again.",
        variant: "destructive"
      })
    }
  }

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(task => (task as any).status === status)
  }

  const formatDate = (date: string | Date | null) => {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(d)
  }

  const isOverdue = (date: string | Date | null) => {
    if (!date) return false
    const d = typeof date === 'string' ? new Date(date) : date
    return d < new Date() && d.toDateString() !== new Date().toDateString()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20">
      <div className="p-6 space-y-6">
        {/* Modern Header with Search and Filters */}
        <div className="flex flex-col gap-4">
          {/* Centered Title */}
          <div className="flex flex-col items-center gap-3 mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Task Management</h1>
            <p className="text-muted-foreground">
              Track and manage project tasks across all projects
            </p>
            
            <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl px-6 h-11 font-semibold shadow-lg hover:shadow-xl transition-all">
                  <Plus className="h-5 w-5 mr-2" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white/95 backdrop-blur-sm border-0 rounded-xl shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Add New Task</DialogTitle>
                  <DialogDescription>
                    Create a new task and assign it to a project
                  </DialogDescription>
                </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Task Title*</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Review electrical plans"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task details..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="project">Project*</Label>
                <select
                  id="project"
                  value={newTask.project_id}
                  onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
                >
                  <option value="">Select a project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="assignee">Assignee</Label>
                  <Select
                    value={newTask.assignee_id || "unassigned"}
                    onValueChange={(value) => setNewTask({ ...newTask, assignee_id: value === "unassigned" ? "" : value })}
                  >
                    <SelectTrigger id="assignee">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {teamMembers.map((member: any) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name || member.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    id="priority"
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={newTask.tags.join(', ')}
                  onChange={(e) => setNewTask({ ...newTask, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                  placeholder="electrical, plans, approval (comma-separated)"
                />
              </div>
              
              <TaskContactTags
                contactTags={newTask.contact_tags}
                onChange={(tags) => setNewTask({ ...newTask, contact_tags: tags })}
              />
              
              <TaskDependencies
                dependencies={newTask.dependencies}
                projectId={newTask.project_id}
                onChange={(deps) => setNewTask({ ...newTask, dependencies: deps })}
              />
                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={handleAddTask}
                    disabled={!newTask.title || !newTask.project_id || createTaskMutation.isPending}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl"
                  >
                    Add Task
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddTaskOpen(false)} className="rounded-xl">
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
          
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md p-[1px] rounded-xl bg-gradient-to-r from-white via-purple-200 to-purple-600">
              <div className="relative bg-white rounded-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 h-10 bg-white/50 backdrop-blur-sm border-0 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            
            {/* Project Filter */}
            <div className="p-[1px] rounded-xl bg-gradient-to-r from-white via-purple-200 to-purple-600">
              <div className="bg-white rounded-xl">
                <Select value={selectedProjectFilter} onValueChange={setSelectedProjectFilter}>
                  <SelectTrigger className="w-48 h-10 bg-white/50 backdrop-blur-sm border-0 rounded-xl focus:ring-2 focus:ring-purple-500">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-200">
                    <SelectItem value="all" className="rounded-lg">All Projects</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id} className="rounded-lg">
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Stats Grid with Gradient Borders */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            {
              title: "Total Tasks",
              value: tasks.length.toString(),
              description: `Across ${new Set(tasks.map(t => t.project_id)).size} projects`,
              icon: Tag,
              trend: { value: 8, up: true },
              gradient: "from-blue-600 to-cyan-500"
            },
            {
              title: "In Progress",
              value: tasks.filter(t => t.status === 'in-progress').length.toString(),
              description: "Currently being worked on",
              icon: Activity,
              trend: { value: 12, up: true },
              gradient: "from-purple-600 to-pink-500"
            },
            {
              title: "High Priority",
              value: tasks.filter(t => t.priority === 'high' || (t as any).priority === 'urgent').length.toString(),
              description: "Require immediate attention",
              icon: AlertCircle,
              trend: { value: 3, up: false },
              gradient: "from-orange-600 to-red-500"
            },
            {
              title: "Completed",
              value: tasks.filter(t => (t as any).status === 'done').length.toString(),
              description: "Tasks completed",
              icon: CheckCircle2,
              trend: { value: 15, up: true },
              gradient: "from-green-600 to-emerald-500"
            }
          ].map((stat, idx) => {
            const Icon = stat.icon
            return (
              <div key={stat.title} className="group relative p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:from-purple-100 hover:to-purple-700 transition-all duration-300 hover:scale-[1.02]">
                <Card className="relative overflow-hidden bg-white/95 backdrop-blur-sm border-0 rounded-xl hover:shadow-2xl transition-all duration-300">
                  <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity ${stat.gradient}`} />
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn(
                        "p-3 rounded-2xl bg-gradient-to-br shadow-lg",
                        stat.gradient
                      )}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        {stat.trend.up ? (
                          <ArrowUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className={stat.trend.up ? "text-green-600" : "text-red-600"}>
                          {stat.trend.value}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-4xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 bg-clip-text text-transparent mb-1">
                        {stat.value}
                      </p>
                      <p className="text-sm font-medium text-gray-700">{stat.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>

        {/* Modern Kanban Board */}
        {tasksLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading tasks...</div>
          </div>
        ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {(Object.entries(statusColumns) as [TaskStatus, typeof statusColumns[TaskStatus]][]).map(([status, config]) => {
            const Icon = config.icon
            const columnTasks = getTasksByStatus(status)
            
            return (
              <div
                key={status}
                className="space-y-4"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
              >
                {/* Column Header with Gradient Border */}
                <div className="p-[2px] rounded-xl bg-gradient-to-r from-white via-purple-200 to-purple-600">
                  <div className="bg-white rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-xl bg-gradient-to-br",
                        status === 'pending' ? 'from-gray-500 to-slate-600' :
                        status === 'in-progress' ? 'from-blue-500 to-cyan-500' :
                        'from-green-500 to-emerald-500'
                      )}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{config.label}</h3>
                        <Badge variant="secondary" className="mt-1 rounded-full">
                          {columnTasks.length} tasks
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Tasks Container */}
                <div className="space-y-3 min-h-[500px] p-4 bg-gradient-to-br from-gray-50/50 to-white/50 backdrop-blur-sm rounded-xl border border-gray-200/50">
                  {columnTasks.map(task => (
                    <div
                      key={task.id}
                      className="group relative p-[2px] rounded-xl bg-gradient-to-br from-white via-gray-100 to-gray-200 hover:from-purple-100 hover:via-purple-200 hover:to-purple-300 transition-all duration-300 cursor-move"
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                    >
                      <Card className="bg-white/95 backdrop-blur-sm border-0 rounded-xl hover:shadow-lg transition-all duration-300">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <h4 className="text-sm font-bold text-gray-900 line-clamp-2 flex-1">
                              {task.title}
                            </h4>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl border-gray-200">
                                <DropdownMenuItem 
                                  className="rounded-lg"
                                  onClick={() => handleEditTask(task)}
                                >
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="rounded-lg"
                                  onClick={() => {
                                    setSelectedTaskForTeam(task.id)
                                    setTeamAssignmentOpen(true)
                                  }}
                                >
                                  <Users className="h-4 w-4 mr-2" />
                                  Assign Team
                                </DropdownMenuItem>
                                <DropdownMenuItem className="rounded-lg">Duplicate</DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600 rounded-lg"
                                  onClick={() => handleDeleteTask(task)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                      
                          {task.description && (
                            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <Badge 
                              className={cn(
                                "text-white border-0 px-2 py-1 text-xs font-medium rounded-full",
                                priorityConfig[task.priority].color
                              )}
                            >
                              {priorityConfig[task.priority].label}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <FolderKanban className="h-3 w-3" />
                              <span className="truncate">
                                {task.project?.name || 'No project'}
                              </span>
                            </div>
                          </div>
                      
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-500 truncate font-medium">
                                {task.assignee?.full_name || 'Unassigned'}
                              </span>
                            </div>
                            <div className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-full",
                              isOverdue(task.due_date) ? 'text-red-600 bg-red-50' : 'text-gray-500 bg-gray-50'
                            )}>
                              <Calendar className="h-3 w-3" />
                              <span className="font-medium">{formatDate(task.due_date)}</span>
                            </div>
                          </div>
                          
                          {task.category && (
                            <Badge variant="secondary" className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border-0">
                              {task.category.name}
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                
                  {columnTasks.length === 0 && (
                    <div className="text-center py-12">
                      <Layers3 className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 font-medium">No tasks</p>
                      <p className="text-xs text-gray-400 mt-1">Drag tasks here or create new ones</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        )}
      
      {/* Team Assignment Dialog */}
      {selectedTaskForTeam && (
        <TeamAssignmentDialog
          open={teamAssignmentOpen}
          onOpenChange={setTeamAssignmentOpen}
          title="Assign Team Members to Task"
          description="Select team members and contacts to work on this task"
          selectedUserIds={[]}
          selectedContactIds={[]}
          onAssign={async (userIds, contactIds) => {
            try {
              await assignTeamMutation.mutateAsync({
                taskId: selectedTaskForTeam,
                userIds
              })
              setTeamAssignmentOpen(false)
              setSelectedTaskForTeam(null)
              
              toast({
                title: "Team Assigned",
                description: "Team members have been assigned to the task successfully.",
                variant: "default"
              })
            } catch (error) {
              console.error('Failed to assign team members:', error)
              toast({
                title: "Error",
                description: "Failed to assign team members. Please try again.",
                variant: "destructive"
              })
            }
          }}
          allowContacts={false}
          notificationEnabled={true}
        />
      )}
      
      {/* AI Task Suggestions */}
      {completedTaskId && (
        <div className="fixed bottom-4 right-4 w-96 z-50">
          <TaskSuggestions
            currentTaskId={completedTaskId}
            projectId={selectedProjectId || undefined}
            onTaskCreated={(taskId) => {
              // Optionally refresh tasks or show success message
              setCompletedTaskId(null)
            }}
          />
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 rounded-xl"
              onClick={() => setCompletedTaskId(null)}
            >
              Dismiss suggestions
            </Button>
          </div>
        )}
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-md bg-white/95 backdrop-blur-sm border-0 rounded-xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-red-600">Delete Task</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{taskToDelete?.title}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 pt-4">
              <Button 
                variant="destructive"
                onClick={confirmDeleteTask}
                disabled={deleteTaskMutation.isPending}
                className="rounded-xl"
              >
                {deleteTaskMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteDialogOpen(false)} 
                className="rounded-xl"
                disabled={deleteTaskMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Edit Task Dialog */}
        <Dialog open={isEditTaskOpen} onOpenChange={setIsEditTaskOpen}>
          <DialogContent className="max-w-md bg-white/95 backdrop-blur-sm border-0 rounded-xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Edit Task</DialogTitle>
              <DialogDescription>
                Update the task information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Task Title*</Label>
                <Input
                  id="edit-title"
                  value={editTaskData.title}
                  onChange={(e) => setEditTaskData({ ...editTaskData, title: e.target.value })}
                  placeholder="Task title"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editTaskData.description}
                  onChange={(e) => setEditTaskData({ ...editTaskData, description: e.target.value })}
                  placeholder="Task details..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-project">Project*</Label>
                <select
                  id="edit-project"
                  value={editTaskData.project_id}
                  onChange={(e) => setEditTaskData({ ...editTaskData, project_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
                >
                  <option value="">Select a project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-assignee">Assignee</Label>
                  <Select
                    value={editTaskData.assignee_id || "unassigned"}
                    onValueChange={(value) => setEditTaskData({ ...editTaskData, assignee_id: value === "unassigned" ? "" : value })}
                  >
                    <SelectTrigger id="edit-assignee">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {teamMembers.map((member: any) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name || member.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-priority">Priority</Label>
                  <select
                    id="edit-priority"
                    value={editTaskData.priority}
                    onChange={(e) => setEditTaskData({ ...editTaskData, priority: e.target.value as TaskPriority })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <select
                  id="edit-status"
                  value={editTaskData.status}
                  onChange={(e) => setEditTaskData({ ...editTaskData, status: e.target.value as TaskStatus })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <Label htmlFor="edit-dueDate">Due Date</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={editTaskData.due_date}
                  onChange={(e) => setEditTaskData({ ...editTaskData, due_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-tags">Tags</Label>
                <Input
                  id="edit-tags"
                  value={editTaskData.tags.join(', ')}
                  onChange={(e) => setEditTaskData({ ...editTaskData, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                  placeholder="electrical, plans, approval (comma-separated)"
                />
              </div>
              
              <TaskContactTags
                contactTags={editTaskData.contact_tags}
                onChange={(tags) => setEditTaskData({ ...editTaskData, contact_tags: tags })}
              />
              
              <TaskDependencies
                dependencies={editTaskData.dependencies}
                currentTaskId={taskToEdit?.id}
                projectId={editTaskData.project_id}
                onChange={(deps) => setEditTaskData({ ...editTaskData, dependencies: deps })}
              />
              
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleSaveEditTask}
                  disabled={!editTaskData.title || !editTaskData.project_id || updateTaskMutation.isPending}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl"
                >
                  {updateTaskMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => setIsEditTaskOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}