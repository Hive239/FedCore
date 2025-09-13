"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Search, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Users,
  ChevronRight,
  Building2,
  Clock,
  AlertCircle,
  X,
  FolderKanban,
  CalendarCheck,
  TrendingUp,
  CheckCircle2,
  Activity,
  ArrowUp,
  ArrowDown,
  ListTodo
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useProjects, useCreateProject } from '@/lib/hooks/use-projects'
import type { ProjectStatus } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Status configuration
const statusConfig = {
  'new': { label: 'New', color: 'bg-blue-500' },
  'planning': { label: 'Planning', color: 'bg-purple-500' },
  'in-progress': { label: 'In Progress', color: 'bg-green-500' },
  'on-hold': { label: 'On Hold', color: 'bg-yellow-500' },
  'completed': { label: 'Completed', color: 'bg-gray-500' }
}

export default function ProjectsPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all')
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false)
  const [customers, setCustomers] = useState<Array<{id: string, name: string, phone: string, email?: string}>>([])
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [completedPeriod, setCompletedPeriod] = useState<'quarter' | 'year'>('quarter')
  const [eventsInProgress, setEventsInProgress] = useState(0)
  const [tasksInProgress, setTasksInProgress] = useState(0)
  const supabase = createClient()
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    phone: ''
  })
  const [newProjectData, setNewProjectData] = useState({
    name: '',
    description: '',
    customer: '',
    budget: '',
    start_date: '',
    end_date: '',
    status: 'new' as ProjectStatus,
    address: '',
    coordinates: null as { lat: number; lng: number } | null,
    formatted_address: '',
    place_id: ''
  })
  
  // Fetch projects with filters
  const { data: projectsData, isLoading } = useProjects({
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: searchTerm || undefined
  })
  
  const createProjectMutation = useCreateProject()
  
  const projects = projectsData?.data || []

  // Fetch events and tasks in progress
  useEffect(() => {
    const fetchInProgressData = async () => {
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        
        // Fetch events in progress
        const { count: eventCount } = await supabase
          .from('schedule_events')
          .select('*', { count: 'exact', head: true })
          .gte('start_time', today.toISOString())
          .lt('start_time', tomorrow.toISOString())
        
        setEventsInProgress(eventCount || 0)
        
        // Fetch tasks in progress
        const { count: taskCount } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'in_progress')
        
        setTasksInProgress(taskCount || 0)
      } catch (error) {
        console.error('Error fetching in progress data:', error)
      }
    }
    
    fetchInProgressData()
  }, [])
  
  // Cycle between quarter and year for completed projects
  useEffect(() => {
    const interval = setInterval(() => {
      setCompletedPeriod(prev => prev === 'quarter' ? 'year' : 'quarter')
    }, 3000)
    
    return () => clearInterval(interval)
  }, [])

  // Load customers from database
  useEffect(() => {
    let isMounted = true
    
    const loadCustomers = async () => {
      if (!isMounted) return
      
      try {
        setLoadingCustomers(true)
        
        // Get current session and tenant
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          console.error('Session not found when loading customers')
          setCustomers([])
          setLoadingCustomers(false)
          return
        }
        const user = session.user
        
        // Get user's tenant
        const { data: userTenant } = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single()
        
        if (!userTenant) {
          console.error('No tenant found for user')
          setCustomers([])
          setLoadingCustomers(false)
          return
        }
        
        const { data, error } = await supabase
          .from('vendors')
          .select('id, name, contact_phone, contact_email')
          .eq('contact_type', 'customer')
          .eq('tenant_id', userTenant.tenant_id)
          .order('name')

        if (!isMounted) return
        
        if (error) {
          console.error('Error loading customers:', error)
        } else if (data) {
          setCustomers(data.map(c => ({
            id: c.id,
            name: c.name,
            phone: c.contact_phone || '',
            email: c.contact_email
          })))
        }
      } catch (error) {
        console.error('Failed to load customers:', error)
      } finally {
        if (isMounted) {
          setLoadingCustomers(false)
        }
      }
    }

    loadCustomers()
    
    return () => {
      isMounted = false
    }
  }, [])
  
  // Calculate stats
  const stats = {
    total: projects.length,
    inProgress: projects.filter(p => p.status === 'in-progress').length,
    delayed: 0, // 'delayed' status not in ProjectStatus type
    completed: projects.filter(p => p.status === 'completed').length,
    completedQuarter: projects.filter(p => {
      if (p.status !== 'completed') return false
      const completedDate = new Date((p as any).updated_at || (p as any).created_at)
      const now = new Date()
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      return completedDate >= quarterStart
    }).length,
    completedYear: projects.filter(p => {
      if (p.status !== 'completed') return false
      const completedDate = new Date((p as any).updated_at || (p as any).created_at)
      const now = new Date()
      const yearStart = new Date(now.getFullYear(), 0, 1)
      return completedDate >= yearStart
    }).length,
    totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
    totalSpent: 0 // Would need to calculate from tasks/expenses
  }

  const handleProjectClick = (e: React.MouseEvent<HTMLTableRowElement>, projectId: string) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('PROJECT CLICK - Navigating to:', projectId)
    window.location.href = `/projects/${projectId}`
  }

  const handleAddCustomer = async () => {
    try {
      // Get current session and tenant
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        console.error('Session not found when adding customer')
        return
      }
      const user = session.user
      
      // Get user's tenant
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()
      
      if (!userTenant) {
        console.error('No tenant found for user')
        return
      }
      
      // Save to database with tenant_id
      const { data, error } = await supabase
        .from('vendors')
        .insert([{
          name: newCustomerData.name,
          contact_phone: newCustomerData.phone,
          contact_type: 'customer',
          status: 'active',
          tenant_id: userTenant.tenant_id,
          created_by: user.id
        }])
        .select()
        .single()

      if (error) {
        console.error('Error adding customer:', error)
        return
      }

      if (data) {
        const newCustomer = {
          id: data.id,
          name: data.name,
          phone: data.contact_phone || '',
          email: data.contact_email
        }
        
        // Add to customers list
        setCustomers([...customers, newCustomer])
        
        // Set as selected customer for the project
        setNewProjectData({ ...newProjectData, customer: data.id })
        
        // Reset and close
        setNewCustomerData({ name: '', phone: '' })
        setShowAddCustomerDialog(false)
      }
    } catch (error) {
      console.error('Failed to add customer:', error)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const result = await createProjectMutation.mutateAsync(newProjectData)
      setShowNewProjectDialog(false)
      setNewProjectData({
        name: '',
        description: '',
        customer: '',
        budget: '',
        start_date: '',
        end_date: '',
        status: 'new',
        address: '',
        coordinates: null,
        formatted_address: '',
        place_id: ''
      })
      // Don't redirect automatically - let user see success and click on project
      // router.push(`/projects/${result.id}`)
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20">
      <div className="p-6 space-y-6">
        {/* Centered Title */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Project Directory
          </h1>
          
          <Button 
            onClick={() => {
              console.log('New Project button clicked')
              setShowNewProjectDialog(true)
            }}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

      {/* Modern Stats Grid with Glass Effect */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Projects */}
        <div className="group relative p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:from-purple-100 hover:to-purple-700 transition-all duration-300 hover:scale-[1.02]">
          <Card className="relative overflow-hidden bg-white/95 backdrop-blur-sm border-0 rounded-xl hover:shadow-2xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-500 opacity-0 group-hover:opacity-5 transition-opacity" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg">
                  <FolderKanban className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <ArrowUp className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">12%</span>
                </div>
              </div>
              <div>
                <p className="text-4xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 bg-clip-text text-transparent mb-1">
                  {stats.total}
                </p>
                <p className="text-sm font-medium text-gray-700">Total Projects</p>
                <p className="text-xs text-gray-500 mt-1">{stats.inProgress} in progress</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tasks in Progress */}
        <div className="group relative p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:from-purple-100 hover:to-purple-700 transition-all duration-300 hover:scale-[1.02]">
          <Card className="relative overflow-hidden bg-white/95 backdrop-blur-sm border-0 rounded-xl hover:shadow-2xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-emerald-500 opacity-0 group-hover:opacity-5 transition-opacity" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-500 shadow-lg">
                  <ListTodo className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Activity className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">Active</span>
                </div>
              </div>
              <div>
                <p className="text-4xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 bg-clip-text text-transparent mb-1">
                  {tasksInProgress}
                </p>
                <p className="text-sm font-medium text-gray-700">Tasks in Progress</p>
                <p className="text-xs text-gray-500 mt-1">Active work items</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Events In Progress */}
        <div className="group relative p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:from-purple-100 hover:to-purple-700 transition-all duration-300 hover:scale-[1.02]">
          <Card className="relative overflow-hidden bg-white/95 backdrop-blur-sm border-0 rounded-xl hover:shadow-2xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-500 opacity-0 group-hover:opacity-5 transition-opacity" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 shadow-lg">
                  <CalendarCheck className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <span className="text-blue-600">Live</span>
                </div>
              </div>
              <div>
                <p className="text-4xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 bg-clip-text text-transparent mb-1">
                  {eventsInProgress}
                </p>
                <p className="text-sm font-medium text-gray-700">Events In Progress</p>
                <p className="text-xs text-gray-500 mt-1">Scheduled today</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Completed Projects (Cycling) */}
        <div className="group relative p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:from-purple-100 hover:to-purple-700 transition-all duration-300 hover:scale-[1.02]">
          <Card className="relative overflow-hidden bg-white/95 backdrop-blur-sm border-0 rounded-xl hover:shadow-2xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-red-500 opacity-0 group-hover:opacity-5 transition-opacity" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-600 to-red-500 shadow-lg">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <ArrowUp className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">23%</span>
                </div>
              </div>
              <div>
                <p className="text-4xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 bg-clip-text text-transparent mb-1">
                  {completedPeriod === 'quarter' ? stats.completedQuarter : stats.completedYear}
                </p>
                <p className="text-sm font-medium text-gray-700">Completed</p>
                <p className="text-xs text-gray-500 mt-1 transition-all duration-300">
                  This {completedPeriod}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modern Search Bar and Filters - Compact Layout */}
      <div className="flex flex-col lg:flex-row gap-3 items-center">
        <div className="relative w-full lg:w-80 p-[1px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600">
          <div className="relative bg-white rounded-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 h-9 text-sm bg-white/50 backdrop-blur-sm border-0 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap lg:flex-nowrap">
          <Button
            variant={statusFilter === 'all' ? "default" : "outline"}
            size="sm"
            className={statusFilter === 'all' ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-9 px-3 text-xs" : "h-9 px-3 text-xs"}
            onClick={() => setStatusFilter('all')}
          >
            All
          </Button>
          {Object.entries(statusConfig).map(([key, config]) => (
            <Button
              key={key}
              variant={statusFilter === key ? "default" : "outline"}
              size="sm"
              className={statusFilter === key ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-9 px-3 text-xs" : "h-9 px-3 text-xs"}
              onClick={() => setStatusFilter(key as ProjectStatus)}
            >
              {config.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Projects Table with gradient border */}
      <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600">
        <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left font-medium py-1 px-3 text-sm">Project Name</th>
                  <th className="text-left font-medium py-1 px-3 text-sm hidden md:table-cell">Customer</th>
                  <th className="text-left font-medium py-1 px-3 text-sm">Date Added</th>
                  <th className="text-left font-medium py-1 px-3 text-sm">Status</th>
                  <th className="text-left font-medium py-1 px-3 text-sm">Projected Finish</th>
                  <th className="text-left font-medium py-1 px-3 text-sm hidden xl:table-cell">Budget</th>
                  <th className="text-left font-medium py-1 px-3 text-sm hidden xl:table-cell">Team</th>
                  <th className="text-left font-medium py-1 px-3 text-sm"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8">
                      <div className="text-muted-foreground">Loading projects...</div>
                    </td>
                  </tr>
                ) : (
                  projects.map((project) => {
                    const config = statusConfig[project.status] || statusConfig['new']
                    
                    return (
                      <tr
                        key={project.id}
                        className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={(e) => handleProjectClick(e, project.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="py-1 px-3">
                          <span className="font-medium text-sm">{project.name}</span>
                        </td>
                        <td className="py-1 px-3 hidden md:table-cell">
                          <span className="text-sm">{(project as any).customer?.name || (project as any).association?.name || '-'}</span>
                        </td>
                        <td className="py-1 px-3">
                          <span className="text-xs">{(project as any).created_at ? formatDate(new Date((project as any).created_at)) : '-'}</span>
                        </td>
                        <td className="py-1 px-3">
                          <Badge className={`${config.color} text-white border-0 text-xs`}>
                            {config.label}
                          </Badge>
                        </td>
                        <td className="py-1 px-3">
                          <span className="text-xs">{(project as any).end_date ? formatDate(new Date((project as any).end_date)) : '-'}</span>
                        </td>
                        <td className="py-1 px-3 hidden xl:table-cell">
                          <span className="text-sm font-medium">{formatCurrency(project.budget || 0)}</span>
                        </td>
                        <td className="py-1 px-3 hidden xl:table-cell">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">0</span>
                          </div>
                        </td>
                        <td className="py-1 px-3">
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {!isLoading && projects.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No projects found matching your filters.' 
                  : 'No projects yet. Create your first project to get started.'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button 
                  variant="outline"
                  className="bg-white border-4 border-purple-700 text-purple-700 hover:bg-purple-50 font-semibold"
                  onClick={() => setShowNewProjectDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Add a new construction project to your portfolio
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateProject} className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Project Name*</Label>
                <Input
                  id="name"
                  value={newProjectData.name}
                  onChange={(e) => setNewProjectData({ ...newProjectData, name: e.target.value })}
                  placeholder="Downtown Office Renovation"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="customer">Customer</Label>
                <div className="flex gap-2">
                  <Select
                    value={newProjectData.customer}
                    onValueChange={(value) => setNewProjectData({ ...newProjectData, customer: value })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={loadingCustomers ? "Loading customers..." : "Select a customer"} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            <span>{customer.name}</span>
                            {customer.phone && (
                              <span className="text-xs text-muted-foreground">• {customer.phone}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                      {!loadingCustomers && customers.length === 0 && (
                        <div className="text-sm text-muted-foreground px-2 py-1">
                          No customers yet. Click "Add New" to create one.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddCustomerDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add New
                  </Button>
                </div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newProjectData.description}
                onChange={(e) => setNewProjectData({ ...newProjectData, description: e.target.value })}
                placeholder="Brief description of the project scope and objectives..."
                rows={3}
              />
            </div>

            <div>
              <AddressAutocomplete
                label="Project Address"
                placeholder="Enter project location address..."
                value={newProjectData.address}
                onChange={(address, coordinates) => {
                  setNewProjectData({ 
                    ...newProjectData, 
                    address,
                    coordinates,
                    formatted_address: address
                  })
                }}
                onPlaceSelect={(place) => {
                  setNewProjectData({
                    ...newProjectData,
                    place_id: place.place_id || '',
                    formatted_address: place.formatted_address || newProjectData.address
                  })
                }}
                required
                className="w-full"
              />
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={newProjectData.start_date}
                  onChange={(e) => setNewProjectData({ ...newProjectData, start_date: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={newProjectData.end_date}
                  onChange={(e) => setNewProjectData({ ...newProjectData, end_date: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="budget">Project Budget</Label>
                <Input
                  id="budget"
                  type="number"
                  value={newProjectData.budget}
                  onChange={(e) => setNewProjectData({ ...newProjectData, budget: e.target.value })}
                  placeholder="2500000"
                />
              </div>
              
              <div>
                <Label htmlFor="status">Initial Status</Label>
                <select
                  id="status"
                  value={newProjectData.status}
                  onChange={(e) => setNewProjectData({ ...newProjectData, status: e.target.value as ProjectStatus })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
                >
                  <option value="new">New</option>
                  <option value="planning">Planning</option>
                  <option value="in-progress">In Progress</option>
                  <option value="on-hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            
            
            <div className="flex gap-3 pt-4">
              <Button 
                type="submit" 
                disabled={!newProjectData.name || createProjectMutation.isPending}
                className="flex-1"
              >
                Create Project
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowNewProjectDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddCustomerDialog} onOpenChange={setShowAddCustomerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              This customer will be added to your contacts directory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="customer-name">Customer Name*</Label>
              <Input
                id="customer-name"
                value={newCustomerData.name}
                onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                placeholder="ABC Construction LLC"
              />
            </div>
            <div>
              <Label htmlFor="customer-phone">Phone Number*</Label>
              <Input
                id="customer-phone"
                value={newCustomerData.phone}
                onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddCustomerDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddCustomer}
                disabled={!newCustomerData.name || !newCustomerData.phone}
              >
                Add Customer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}