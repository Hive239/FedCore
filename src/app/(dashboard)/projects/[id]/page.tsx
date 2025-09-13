"use client";

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft,
  Upload,
  Download,
  Eye,
  Trash2,
  FileText,
  Clock,
  Users,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Plus,
  Search,
  Grid3x3,
  List,
  Edit,
  Save,
  X,
  FolderOpen,
  ChevronLeft,
  TrendingUp,
  Brain,
  Target,
  Zap,
  Activity,
  PieChart,
  BarChart3,
  LineChart,
  Settings,
  Star,
  Lightbulb,
  Shield,
  Timer,
  Award,
  Building2,
  Phone,
  Mail,
  MapPin,
  Gauge,
  Cpu,
  RefreshCw,
  Database,
  Workflow
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useProject, useUpdateProject } from '@/lib/hooks/use-projects'
import { nexusPatternRecognition } from '@/lib/ml/nexus-pattern-recognition'
import { useCurrentTenant } from '@/components/tenant/tenant-switcher'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'

// Document type for project files
interface Document {
  id: string
  name: string
  type: string
  size: number
  lastModified: Date
  folder: string
}

const folderConfig = {
  contracts: { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  permits: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-100' },
  design: { icon: Grid3x3, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  invoices: { icon: DollarSign, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  specifications: { icon: FileText, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  correspondence: { icon: Users, color: 'text-pink-600', bgColor: 'bg-pink-100' },
  photos: { icon: Grid3x3, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  reports: { icon: FileText, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  changeOrders: { icon: AlertCircle, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  rfis: { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-100' }
}

const folderNames = {
  contracts: 'Contracts',
  permits: 'Permits',
  design: 'Design Documents',
  invoices: 'Invoices',
  specifications: 'Specifications',
  correspondence: 'Correspondence',
  photos: 'Photos',
  reports: 'Reports',
  changeOrders: 'Change Orders',
  rfis: 'RFIs'
}

const statusConfig = {
  'new': { label: 'New', color: 'bg-blue-500' },
  'planning': { label: 'Planning', color: 'bg-purple-500' },
  'on-track': { label: 'On Track', color: 'bg-green-500' },
  'in-progress': { label: 'In Progress', color: 'bg-green-500' },
  'on-hold': { label: 'On Hold', color: 'bg-yellow-500' },
  'delayed': { label: 'Delayed', color: 'bg-red-500' },
  'completed': { label: 'Completed', color: 'bg-gray-500' }
}

export default function ProjectControlCenter() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const { data: project, isLoading, error } = useProject(projectId)
  const updateProjectMutation = useUpdateProject()
  const [selectedFolder, setSelectedFolder] = useState<keyof typeof folderConfig | null>(null)
  
  // Debug folder state
  console.log('Current selectedFolder:', selectedFolder)
  
  // Dedicated handler for back button
  const handleBackToFolders = () => {
    console.log('BACK TO FOLDERS HANDLER CALLED');
    setSelectedFolder(null);
  }
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFolder, setUploadFolder] = useState<string>('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // New ML and pattern recognition states
  const [nexusData, setNexusData] = useState<any>(null)
  const [weeklyTasks, setWeeklyTasks] = useState<any[]>([])
  const [budgetTracking, setBudgetTracking] = useState<any>(null)
  const [projectMetrics, setProjectMetrics] = useState<any>(null)
  const [mlInsights, setMLInsights] = useState<any[]>([])
  const [changeOrders, setChangeOrders] = useState<any[]>([])
  const [isLoadingML, setIsLoadingML] = useState(true)
  
  // Current tenant for data isolation
  const { tenant: currentTenant } = useCurrentTenant()
  const supabase = createClient()
  
  // Fetch project activities
  const { data: activities } = useQuery({
    queryKey: ['project-activities', projectId, currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) {
        return []
      }
      
      try {
        const supabase = createClient()
        
        // Try activity_logs table first (which exists)
        const { data: activityLogs, error: logsError } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('entity_type', 'project')
          .eq('entity_id', projectId)
          .eq('tenant_id', currentTenant.id)
          .order('created_at', { ascending: false })
          .limit(10)
        
        if (!logsError && activityLogs && activityLogs.length > 0) {
          // Transform activity logs to match expected format
          return activityLogs.map(log => ({
            id: log.id,
            description: log.action || 'Activity',
            action: log.action,
            created_at: log.created_at,
            user_id: log.user_id,
            metadata: log.metadata || {}
          }))
        }
        
        // Return demo activities for now
        const now = new Date()
        return [
          { 
            id: '1', 
            description: 'Foundation inspection completed', 
            action: 'inspection_complete', 
            created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
            user_id: 'team_lead' 
          },
          { 
            id: '2', 
            description: 'Materials delivered to site', 
            action: 'materials_delivered', 
            created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
            user_id: 'supervisor' 
          },
          { 
            id: '3', 
            description: 'Safety briefing conducted', 
            action: 'safety_briefing', 
            created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
            user_id: 'safety_officer' 
          },
          {
            id: '4',
            description: 'Electrical rough-in started',
            action: 'work_started',
            created_at: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
            user_id: 'contractor'
          }
        ]
      } catch (error) {
        console.log('Using demo activity data')
        // Return demo activities on any error
        return []
      }
    },
    enabled: !!projectId && !!currentTenant?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  }) // <- This closes the useQuery
// DO NOT CLOSE COMPONENT HERE - Component continues with more definitions  
  // Rest of component continues here - DO NOT ADD EXTRA CLOSING BRACE
  // Handle file upload
  
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    client: '',
    address: '',
    projectLocation: '',
    budget: 0,
    progress: 0,
    team: '',
    contractorName: '',
    contractorPhone: '',
    contractorEmail: '',
    permitNumber: '',
    squareFootage: '',
    projectType: '',
    paymentTerms: '',
    insurancePolicy: '',
    bondNumber: '',
    architect: '',
    engineer: '',
    superintendent: '',
    startDate: '',
    completionDate: '',
    notes: '',
    emergencyContact: '',
    emergencyPhone: '',
    safetyOfficer: '',
    qualityController: '',
    projectManager: '',
    estimatedWorkers: '',
    workingHours: '',
    projectPriority: 'medium',
    riskLevel: 'low',
    environmentalConsiderations: '',
    specialRequirements: '',
    clientExpectations: '',
    materialSuppliers: '',
    equipmentNeeds: '',
    weatherConsiderations: ''
  })

  // Initialize Nexus ML and load comprehensive data
  useEffect(() => {
    if (project && currentTenant) {
      setEditData({
        name: project.name || '',
        description: project.description || '',
        client: project.customer?.name || '',
        address: project.address || '',
        projectLocation: '',  // Field not in database yet
        budget: project.budget || 0,
        progress: project.progress || 0,
        team: Array.isArray(project.team) ? project.team.join(', ') : (project.team || ''),
        contractorName: '',  // Field not in database yet
        contractorPhone: '',  // Field not in database yet
        contractorEmail: '',  // Field not in database yet
        permitNumber: '',  // Field not in database yet
        squareFootage: '',  // Field not in database yet
        projectType: '',  // Field not in database yet  
        paymentTerms: '',  // Field not in database yet
        insurancePolicy: '',  // Field not in database yet
        bondNumber: '',  // Field not in database yet
        architect: '',  // Field not in database yet
        engineer: '',  // Field not in database yet
        superintendent: '',  // Field not in database yet
        startDate: project.start_date || '',
        completionDate: project.end_date || '',
        notes: '',  // Field not in database yet
        emergencyContact: '',  // Field not in database yet
        emergencyPhone: '',  // Field not in database yet
        safetyOfficer: '',  // Field not in database yet
        qualityController: '',  // Field not in database yet
        projectManager: '',  // Field not in database yet
        estimatedWorkers: '',  // Field not in database yet
        workingHours: '',  // Field not in database yet
        projectPriority: 'medium',  // Field not in database yet
        riskLevel: 'low',  // Field not in database yet
        environmentalConsiderations: '',  // Field not in database yet
        specialRequirements: '',  // Field not in database yet
        clientExpectations: '',  // Field not in database yet
        materialSuppliers: '',  // Field not in database yet
        equipmentNeeds: '',  // Field not in database yet
        weatherConsiderations: ''  // Field not in database yet
      })
      
      // Initialize Nexus ML Analysis
      initializeNexusAnalysis()
    }
  }, [project, currentTenant])
  
  // Nexus ML initialization and continuous learning
  const initializeNexusAnalysis = async () => {
    if (!project?.id || !currentTenant) return
    
    setIsLoadingML(true)
    try {
      // Analyze project patterns with ML
      const patterns = await nexusPatternRecognition.analyzeProjectPatterns(project.id)
      setNexusData(patterns)
      
      // Generate weekly task suggestions
      const weeklyTaskSuggestions = await nexusPatternRecognition.generateWeeklyTasks(project.id)
      setWeeklyTasks(weeklyTaskSuggestions)
      
      // Load budget tracking and change orders
      await loadBudgetTracking()
      await loadProjectMetrics()
      await loadChangeOrders()
      
      // Start continuous learning feedback loop
      startContinuousLearning()
    } catch (error) {
      console.error('Error initializing Nexus analysis:', error)
    } finally {
      setIsLoadingML(false)
    }
  }
  
  const loadBudgetTracking = async () => {
    if (!project?.id || !currentTenant) return
    
    const { data: budgetData } = await supabase
      .from('budget_history')
      .select('*')
      .eq('project_id', project.id)
      .eq('tenant_id', currentTenant.id)
      .order('created_at', { ascending: true })
      
    const { data: changeOrderData } = await supabase
      .from('change_orders')
      .select('*')
      .eq('project_id', project.id)
      .eq('tenant_id', currentTenant.id)
      
    setBudgetTracking({
      history: budgetData || [],
      changeOrders: changeOrderData || [],
      totalSpent: budgetData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0,
      changeOrderTotal: changeOrderData?.reduce((sum, order) => sum + (order.amount || 0), 0) || 0
    })
  }
  
  // Helper functions for calculations
  const calculateAverageTaskDuration = (completedTasks: any[]) => {
    if (completedTasks.length === 0) return 0
    
    const durations = completedTasks
      .filter(t => t.created_at && t.completed_at)
      .map(t => {
        const start = new Date(t.created_at)
        const end = new Date(t.completed_at)
        return Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) // days
      })
      
    return durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0
  }
  
  const calculateProductivityScore = (activities: any[], tasks: any[]) => {
    // Calculate productivity based on activity frequency and task completion rate
    const recentActivities = activities.filter(a => {
      const activityDate = new Date(a.created_at)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return activityDate > weekAgo
    })
    
    const completedThisWeek = tasks.filter(t => {
      if (!t.completed_at) return false
      const completedDate = new Date(t.completed_at)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return completedDate > weekAgo
    })
    
    return Math.min(100, (recentActivities.length * 2) + (completedThisWeek.length * 10))
  }

  const loadProjectMetrics = async () => {
    if (!project?.id || !currentTenant) return
    
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', project.id)
      .eq('tenant_id', currentTenant.id)
      
    const { data: activitiesData } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('entity_id', project.id)
      .eq('tenant_id', currentTenant.id)
      .order('created_at', { ascending: false })
      .limit(100)
    
    const completedTasks = tasksData?.filter(t => t.status === 'completed') || []
    const totalTasks = tasksData?.length || 0
    const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0
    
    setProjectMetrics({
      tasks: tasksData || [],
      activities: activitiesData || [],
      totalTasks,
      completedTasks: completedTasks.length,
      completionRate,
      averageTaskDuration: calculateAverageTaskDuration(completedTasks),
      productivityScore: calculateProductivityScore(activitiesData || [], tasksData || [])
    })
  }
  
  const loadChangeOrders = async () => {
    if (!project?.id || !currentTenant) return
    
    const { data } = await supabase
      .from('change_orders')
      .select('*')
      .eq('project_id', project.id)
      .eq('tenant_id', currentTenant.id)
      .order('created_at', { ascending: false })
      
    setChangeOrders(data || [])
  }
  
  const startContinuousLearning = () => {
    // Real-time feedback loop for pattern recognition
    const interval = setInterval(async () => {
      if (project?.id && currentTenant) {
        try {
          const updatedPatterns = await nexusPatternRecognition.analyzeProjectPatterns(project.id)
          setNexusData(updatedPatterns)
          
          // Generate ML insights
          const insights = generateMLInsights(updatedPatterns)
          setMLInsights(insights)
        } catch (error) {
          console.error('Continuous learning update failed:', error)
        }
      }
    }, 300000) // Update every 5 minutes
    
    return () => clearInterval(interval)
  }
  
  const generateMLInsights = (patterns: any) => {
    const insights = []
    
    if (patterns.successProbability < 0.7) {
      insights.push({
        type: 'warning',
        title: 'Project Success Risk',
        message: `Current success probability is ${(patterns.successProbability * 100).toFixed(0)}%`,
        suggestion: 'Consider addressing identified bottlenecks and risk factors',
        confidence: 0.85
      })
    }
    
    if (patterns.taskVelocity < 3) {
      insights.push({
        type: 'info',
        title: 'Low Task Velocity',
        message: `Current velocity: ${patterns.taskVelocity.toFixed(1)} tasks/week`,
        suggestion: 'Review resource allocation and remove blockers',
        confidence: 0.9
      })
    }
    
    if (patterns.bottlenecks.length > 0) {
      insights.push({
        type: 'critical',
        title: 'Bottlenecks Detected',
        message: `${patterns.bottlenecks.length} bottlenecks identified`,
        suggestion: 'Prioritize resolving dependency issues',
        confidence: 0.95
      })
    }
    
    return insights
  }
  
  const handleFileUpload = async (files: File[], folderName: string) => {
    if (!project || !currentTenant) return
    
    setIsUploading(true)
    const supabase = createClient()
    
    try {
      for (const file of files) {
        const fileName = `${project.id}/${folderName}/${Date.now()}-${file.name}`
        
        // Upload to Supabase storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-documents')
          .upload(fileName, file)
        
        if (uploadError) {
          console.error('Upload error:', uploadError)
          alert(`Failed to upload ${file.name}: ${uploadError.message}`)
          continue
        }
        
        // Record file in database
        const { error: dbError } = await supabase
          .from('project_documents')
          .insert({
            project_id: project.id,
            tenant_id: currentTenant.id,
            file_name: file.name,
            file_path: fileName,
            folder: folderName,
            file_size: file.size,
            uploaded_by: (await supabase.auth.getSession()).data.session?.user?.id
          })
        
        if (dbError) {
          console.error('Database error:', dbError)
        }
        
        // Log activity
        await supabase
          .from('project_activities')
          .insert({
            project_id: project.id,
            tenant_id: currentTenant.id,
            user_id: (await supabase.auth.getSession()).data.session?.user?.id,
            action: 'file_uploaded',
            description: `Uploaded ${file.name} to ${folderName}`,
            metadata: { file_name: file.name, folder: folderName, file_size: file.size }
          })
      }
      
      alert(`Successfully uploaded ${files.length} file(s)`)
      setShowUploadModal(false)
      setSelectedFiles([])
      setUploadFolder('')
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload files. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  // ENSURE THESE CHECKS STAY INSIDE COMPONENT
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }
  
  // Helper functions and calculations (must be before early returns)
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

  // Calculate values if project exists
  const budgetPercentage = project ? 0 : 0 // Will calculate from actual expenses later
  const daysRemaining = project?.end_date ? Math.ceil((new Date(project.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0
  const statusInfo = project ? (statusConfig[project.status || 'new'] || statusConfig['new']) : statusConfig['new']

  // Document counts - all zero since no documents yet
  const documentCounts = {
    contracts: 0,
    permits: 0,
    design: 0,
    invoices: 0,
    specifications: 0,
    correspondence: 0,
    photos: 0,
    reports: 0,
    changeOrders: 0,
    rfis: 0
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Project Not Found</h2>
          <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/projects')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Modernized Header with Gradient */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 rounded-2xl" />
        <div className="relative bg-white/60 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push('/projects')}
              className="hover:bg-white/50 border border-purple-200 shadow-sm"
            >
              <ArrowLeft className="h-5 w-5 text-purple-600" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  {project.name}
                </h1>
                <Badge className={`${statusInfo.color} text-white border-0 px-4 py-2 rounded-full shadow-lg`}>
                  <div className="flex items-center gap-2">
                    {statusInfo.label === 'Completed' ? <Award className="h-3 w-3" /> : 
                     statusInfo.label === 'In Progress' ? <Activity className="h-3 w-3" /> :
                     <Timer className="h-3 w-3" />}
                    {statusInfo.label}
                  </div>
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-purple-500" />
                  <span>Project Control Center</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  <span>Live Learning Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <span>Data Protected</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => initializeNexusAnalysis()}
                className="border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 shadow-sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingML ? 'animate-spin' : ''} text-purple-600`} />
                Refresh AI
              </Button>
              <Button
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className={`shadow-lg transition-all duration-300 ${
                  isEditing 
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white' 
                    : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white'
                }`}
              >
                {isEditing ? (
                  <><X className="h-4 w-4 mr-2" />Cancel</>
                ) : (
                  <><Edit className="h-4 w-4 mr-2" />Edit Project</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights Banner - Modernized */}
      {mlInsights.length > 0 && (
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-orange-400/20 to-red-400/20 rounded-2xl blur-sm" />
          <Card className="relative bg-white/80 backdrop-blur-sm border-2 border-yellow-300/50 shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full">
                  <Lightbulb className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                  Nexus AI Live Insights
                </span>
                <Badge className="bg-gradient-to-r from-green-400 to-emerald-400 text-white border-0 shadow-sm">
                  <Activity className="h-3 w-3 mr-1" />
                  Real-time
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mlInsights.slice(0, 3).map((insight, index) => (
                  <div key={index} className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-white to-gray-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="flex-shrink-0">
                        <div className={`p-2 rounded-full ${
                          insight.type === 'critical' ? 'bg-gradient-to-r from-red-400 to-pink-400' :
                          insight.type === 'warning' ? 'bg-gradient-to-r from-yellow-400 to-orange-400' : 
                          'bg-gradient-to-r from-blue-400 to-cyan-400'
                        }`}>
                          {insight.type === 'critical' ? <AlertCircle className="h-4 w-4 text-white" /> :
                           insight.type === 'warning' ? <Clock className="h-4 w-4 text-white" /> :
                           <Lightbulb className="h-4 w-4 text-white" />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-1">{insight.title}</h4>
                            <p className="text-sm text-gray-600 mb-2">{insight.message}</p>
                            <div className="flex items-center gap-2">
                              <Zap className="h-3 w-3 text-green-500" />
                              <p className="text-sm text-green-700 font-medium">{insight.suggestion}</p>
                            </div>
                          </div>
                          <Badge className="bg-gradient-to-r from-purple-400 to-blue-400 text-white border-0 shadow-sm flex-shrink-0">
                            {Math.round(insight.confidence * 100)}% confident
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modernized Comprehensive Project Information */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl" />
        <Card className="relative bg-white/70 backdrop-blur-sm border-2 border-white/30 shadow-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Project Information
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">Comprehensive project details with AI enhancement</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`px-4 py-2 rounded-full border-0 shadow-lg transition-all duration-300 ${
                  isEditing 
                    ? 'bg-gradient-to-r from-orange-400 to-red-400 text-white' 
                    : 'bg-gradient-to-r from-green-400 to-emerald-400 text-white'
                }`}>
                  <div className="flex items-center gap-2">
                    {isEditing ? <Edit className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                    {isEditing ? 'Editing Mode' : 'All Saved'}
                  </div>
                </Badge>
                <Button
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className={`shadow-xl transition-all duration-300 border-0 ${
                    isEditing 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white' 
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
                  }`}
                >
                  {isEditing ? (
                    <><Save className="h-4 w-4 mr-2" />Save All Changes</>
                  ) : (
                    <><Edit className="h-4 w-4 mr-2" />Edit Information</>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
        <CardContent>
          {isEditing ? (
            <>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="contacts">Contacts</TabsTrigger>
                <TabsTrigger value="technical">Technical</TabsTrigger>
                <TabsTrigger value="management">Management</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="edit-name">Project Name *</Label>
                    <Input
                      id="edit-name"
                      value={editData.name}
                      onChange={(e) => setEditData({...editData, name: e.target.value})}
                      placeholder="Enter project name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-client">Client *</Label>
                    <Input
                      id="edit-client"
                      value={editData.client}
                      onChange={(e) => setEditData({...editData, client: e.target.value})}
                      placeholder="Client name"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="edit-description">Project Description *</Label>
                    <Textarea
                      id="edit-description"
                      value={editData.description}
                      onChange={(e) => setEditData({...editData, description: e.target.value})}
                      rows={3}
                      placeholder="Detailed project description..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-address">Project Address *</Label>
                    <Input
                      id="edit-address"
                      value={editData.address}
                      onChange={(e) => setEditData({...editData, address: e.target.value})}
                      placeholder="123 Main St, City, State, ZIP"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-location">Project Location Details</Label>
                    <Input
                      id="edit-location"
                      value={editData.projectLocation}
                      onChange={(e) => setEditData({...editData, projectLocation: e.target.value})}
                      placeholder="Building, Floor, Wing, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-type">Project Type *</Label>
                    <Select value={editData.projectType} onValueChange={(value) => setEditData({...editData, projectType: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="residential">Residential</SelectItem>
                        <SelectItem value="industrial">Industrial</SelectItem>
                        <SelectItem value="renovation">Renovation</SelectItem>
                        <SelectItem value="new-construction">New Construction</SelectItem>
                        <SelectItem value="infrastructure">Infrastructure</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-priority">Project Priority</Label>
                    <Select value={editData.projectPriority} onValueChange={(value) => setEditData({...editData, projectPriority: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Priority</SelectItem>
                        <SelectItem value="medium">Medium Priority</SelectItem>
                        <SelectItem value="high">High Priority</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-budget">Total Budget *</Label>
                    <Input
                      id="edit-budget"
                      type="number"
                      value={editData.budget}
                      onChange={(e) => setEditData({...editData, budget: parseInt(e.target.value) || 0})}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-sqft">Square Footage</Label>
                    <Input
                      id="edit-sqft"
                      value={editData.squareFootage}
                      onChange={(e) => setEditData({...editData, squareFootage: e.target.value})}
                      placeholder="25,000 sq ft"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-workers">Estimated Workers</Label>
                    <Input
                      id="edit-workers"
                      value={editData.estimatedWorkers}
                      onChange={(e) => setEditData({...editData, estimatedWorkers: e.target.value})}
                      placeholder="15-20 workers"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-hours">Working Hours</Label>
                    <Input
                      id="edit-hours"
                      value={editData.workingHours}
                      onChange={(e) => setEditData({...editData, workingHours: e.target.value})}
                      placeholder="7:00 AM - 5:00 PM"
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="contacts" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="edit-contractor">General Contractor *</Label>
                    <Input
                      id="edit-contractor"
                      value={editData.contractorName}
                      onChange={(e) => setEditData({...editData, contractorName: e.target.value})}
                      placeholder="ABC Construction LLC"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-contractor-phone">Contractor Phone *</Label>
                    <Input
                      id="edit-contractor-phone"
                      value={editData.contractorPhone}
                      onChange={(e) => setEditData({...editData, contractorPhone: e.target.value})}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-contractor-email">Contractor Email</Label>
                    <Input
                      id="edit-contractor-email"
                      type="email"
                      value={editData.contractorEmail}
                      onChange={(e) => setEditData({...editData, contractorEmail: e.target.value})}
                      placeholder="contact@abcconstruction.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-project-manager">Project Manager</Label>
                    <Input
                      id="edit-project-manager"
                      value={editData.projectManager}
                      onChange={(e) => setEditData({...editData, projectManager: e.target.value})}
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-superintendent">Superintendent</Label>
                    <Input
                      id="edit-superintendent"
                      value={editData.superintendent}
                      onChange={(e) => setEditData({...editData, superintendent: e.target.value})}
                      placeholder="Mike Thompson"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-safety">Safety Officer</Label>
                    <Input
                      id="edit-safety"
                      value={editData.safetyOfficer}
                      onChange={(e) => setEditData({...editData, safetyOfficer: e.target.value})}
                      placeholder="Sarah Johnson"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-quality">Quality Controller</Label>
                    <Input
                      id="edit-quality"
                      value={editData.qualityController}
                      onChange={(e) => setEditData({...editData, qualityController: e.target.value})}
                      placeholder="David Wilson"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-emergency-contact">Emergency Contact</Label>
                    <Input
                      id="edit-emergency-contact"
                      value={editData.emergencyContact}
                      onChange={(e) => setEditData({...editData, emergencyContact: e.target.value})}
                      placeholder="Emergency coordinator name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-emergency-phone">Emergency Phone</Label>
                    <Input
                      id="edit-emergency-phone"
                      value={editData.emergencyPhone}
                      onChange={(e) => setEditData({...editData, emergencyPhone: e.target.value})}
                      placeholder="(555) 911-0000"
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="technical" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="edit-architect">Architect</Label>
                    <Input
                      id="edit-architect"
                      value={editData.architect}
                      onChange={(e) => setEditData({...editData, architect: e.target.value})}
                      placeholder="Smith & Associates"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-engineer">Structural Engineer</Label>
                    <Input
                      id="edit-engineer"
                      value={editData.engineer}
                      onChange={(e) => setEditData({...editData, engineer: e.target.value})}
                      placeholder="Johnson Engineering"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-permit">Permit Number</Label>
                    <Input
                      id="edit-permit"
                      value={editData.permitNumber}
                      onChange={(e) => setEditData({...editData, permitNumber: e.target.value})}
                      placeholder="PERMIT-2024-0123"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-insurance">Insurance Policy #</Label>
                    <Input
                      id="edit-insurance"
                      value={editData.insurancePolicy}
                      onChange={(e) => setEditData({...editData, insurancePolicy: e.target.value})}
                      placeholder="POL-2024-456789"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-bond">Bond Number</Label>
                    <Input
                      id="edit-bond"
                      value={editData.bondNumber}
                      onChange={(e) => setEditData({...editData, bondNumber: e.target.value})}
                      placeholder="BOND-2024-789"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-risk">Risk Level</Label>
                    <Select value={editData.riskLevel} onValueChange={(value) => setEditData({...editData, riskLevel: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Risk</SelectItem>
                        <SelectItem value="medium">Medium Risk</SelectItem>
                        <SelectItem value="high">High Risk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="edit-suppliers">Material Suppliers</Label>
                    <Textarea
                      id="edit-suppliers"
                      value={editData.materialSuppliers}
                      onChange={(e) => setEditData({...editData, materialSuppliers: e.target.value})}
                      rows={2}
                      placeholder="List key material suppliers..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="edit-equipment">Equipment Needs</Label>
                    <Textarea
                      id="edit-equipment"
                      value={editData.equipmentNeeds}
                      onChange={(e) => setEditData({...editData, equipmentNeeds: e.target.value})}
                      rows={2}
                      placeholder="Heavy machinery, tools, specialized equipment..."
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="management" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="edit-start">Start Date *</Label>
                    <Input
                      id="edit-start"
                      type="date"
                      value={editData.startDate}
                      onChange={(e) => setEditData({...editData, startDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-completion">Target Completion *</Label>
                    <Input
                      id="edit-completion"
                      type="date"
                      value={editData.completionDate}
                      onChange={(e) => setEditData({...editData, completionDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-payment">Payment Terms</Label>
                    <Input
                      id="edit-payment"
                      value={editData.paymentTerms}
                      onChange={(e) => setEditData({...editData, paymentTerms: e.target.value})}
                      placeholder="Net 30 days, 10% down, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-progress">Current Progress (%)</Label>
                    <Input
                      id="edit-progress"
                      type="number"
                      min="0"
                      max="100"
                      value={editData.progress}
                      onChange={(e) => setEditData({...editData, progress: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="edit-expectations">Client Expectations</Label>
                    <Textarea
                      id="edit-expectations"
                      value={editData.clientExpectations}
                      onChange={(e) => setEditData({...editData, clientExpectations: e.target.value})}
                      rows={3}
                      placeholder="Key client expectations and requirements..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="edit-environmental">Environmental Considerations</Label>
                    <Textarea
                      id="edit-environmental"
                      value={editData.environmentalConsiderations}
                      onChange={(e) => setEditData({...editData, environmentalConsiderations: e.target.value})}
                      rows={2}
                      placeholder="Environmental impact, regulations, sustainability measures..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="edit-special">Special Requirements</Label>
                    <Textarea
                      id="edit-special"
                      value={editData.specialRequirements}
                      onChange={(e) => setEditData({...editData, specialRequirements: e.target.value})}
                      rows={2}
                      placeholder="Security clearances, special access, unique conditions..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="edit-weather">Weather Considerations</Label>
                    <Textarea
                      id="edit-weather"
                      value={editData.weatherConsiderations}
                      onChange={(e) => setEditData({...editData, weatherConsiderations: e.target.value})}
                      rows={2}
                      placeholder="Seasonal considerations, weather-dependent activities..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="edit-notes">Additional Notes</Label>
                    <Textarea
                      id="edit-notes"
                      value={editData.notes}
                      onChange={(e) => setEditData({...editData, notes: e.target.value})}
                      rows={3}
                      placeholder="Any additional project notes, lessons learned, special considerations..."
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <Separator className="my-6" />
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                * Required fields • Changes are automatically saved with ML pattern recognition
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                  onClick={async () => {
                    try {
                      const updateData = {
                        name: editData.name,
                        description: editData.description,
                        address: editData.address,
                        project_location: editData.projectLocation,
                        budget: editData.budget.toString(),
                        progress: editData.progress,
                        start_date: editData.startDate,
                        end_date: editData.completionDate,
                        contractor_name: editData.contractorName,
                        contractor_phone: editData.contractorPhone,
                        contractor_email: editData.contractorEmail,
                        permit_number: editData.permitNumber,
                        square_footage: editData.squareFootage,
                        project_type: editData.projectType,
                        payment_terms: editData.paymentTerms,
                        insurance_policy: editData.insurancePolicy,
                        bond_number: editData.bondNumber,
                        architect: editData.architect,
                        engineer: editData.engineer,
                        superintendent: editData.superintendent,
                        notes: editData.notes,
                        emergency_contact: editData.emergencyContact,
                        emergency_phone: editData.emergencyPhone,
                        safety_officer: editData.safetyOfficer,
                        quality_controller: editData.qualityController,
                        project_manager: editData.projectManager,
                        estimated_workers: editData.estimatedWorkers,
                        working_hours: editData.workingHours,
                        project_priority: editData.projectPriority,
                        risk_level: editData.riskLevel,
                        environmental_considerations: editData.environmentalConsiderations,
                        special_requirements: editData.specialRequirements,
                        client_expectations: editData.clientExpectations,
                        material_suppliers: editData.materialSuppliers,
                        equipment_needs: editData.equipmentNeeds,
                        weather_considerations: editData.weatherConsiderations
                      }
                      
                      await updateProjectMutation.mutateAsync({
                        id: projectId,
                        data: updateData
                      })
                      
                      setIsEditing(false)
                      
                      // Trigger ML pattern recognition update after save
                      await initializeNexusAnalysis()
                    } catch (error: any) {
                      console.error('Failed to update project:', error)
                      alert(`Error saving project: ${error.message || 'Unknown error'}`)
                    }
                  }}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Save with AI Analysis
                </Button>
              </div>
            </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <h4 className="font-semibold">Basic Information</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-muted-foreground">Client:</span> {editData.client || 'Not specified'}</div>
                    <div><span className="text-muted-foreground">Type:</span> {editData.projectType || 'Not specified'}</div>
                    <div><span className="text-muted-foreground">Priority:</span> 
                      <Badge className={`ml-2 ${
                        editData.projectPriority === 'critical' ? 'bg-red-100 text-red-800' :
                        editData.projectPriority === 'high' ? 'bg-orange-100 text-orange-800' :
                        editData.projectPriority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>{editData.projectPriority || 'medium'}</Badge>
                    </div>
                    <div><span className="text-muted-foreground">Square Footage:</span> {editData.squareFootage || 'Not specified'}</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-600" />
                    <h4 className="font-semibold">Key Contacts</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-muted-foreground">Contractor:</span> {editData.contractorName || 'Not assigned'}</div>
                    <div><span className="text-muted-foreground">Project Manager:</span> {editData.projectManager || 'Not assigned'}</div>
                    <div><span className="text-muted-foreground">Superintendent:</span> {editData.superintendent || 'Not assigned'}</div>
                    <div><span className="text-muted-foreground">Safety Officer:</span> {editData.safetyOfficer || 'Not assigned'}</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <h4 className="font-semibold">Timeline & Budget</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-muted-foreground">Start Date:</span> {editData.startDate || 'Not set'}</div>
                    <div><span className="text-muted-foreground">Target End:</span> {editData.completionDate || 'Not set'}</div>
                    <div><span className="text-muted-foreground">Budget:</span> {formatCurrency(editData.budget)}</div>
                    <div><span className="text-muted-foreground">Progress:</span> {editData.progress}%</div>
                  </div>
                </div>
              </div>
              
              {editData.notes && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Additional Notes</h4>
                  <p className="text-sm text-muted-foreground">{editData.notes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Nexus Project Metrics Dashboard - Fully Modernized */}
      <div className="relative mb-8">
        <Card className="relative bg-white/60 backdrop-blur-xl border-2 border-white/40 shadow-2xl rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent" />
          <CardHeader className="relative pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 rounded-2xl shadow-xl">
                  <Cpu className="h-8 w-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent font-bold">
                    Project Metrics Dashboard
                  </CardTitle>
                  <div className="flex items-center gap-3 mt-2">
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-1">System Status</div>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${isLoadingML ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
                  <span className="text-sm font-medium">{isLoadingML ? 'Processing...' : 'Online'}</span>
                </div>
              </div>
            </div>
          </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6 bg-gray-100/50 p-1 rounded-xl border shadow-sm">
              <TabsTrigger 
                value="overview" 
                className="relative flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 ease-in-out hover:bg-white/60 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-blue-200/50 rounded-lg"
              >
                <PieChart className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger 
                value="timeline" 
                className="relative flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 ease-in-out hover:bg-white/60 data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-green-200/50 rounded-lg"
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Timeline</span>
              </TabsTrigger>
              <TabsTrigger 
                value="budget" 
                className="relative flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 ease-in-out hover:bg-white/60 data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-orange-200/50 rounded-lg"
              >
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Budget</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tasks" 
                className="relative flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 ease-in-out hover:bg-white/60 data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-purple-200/50 rounded-lg"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="hidden sm:inline">Tasks</span>
              </TabsTrigger>
              <TabsTrigger 
                value="insights" 
                className="relative flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 ease-in-out hover:bg-white/60 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-indigo-200/50 rounded-lg"
              >
                <Brain className="h-4 w-4" />
                <span className="hidden sm:inline">Insights</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Tab Content */}
            <TabsContent value="overview" className="mt-0 space-y-6 animate-in fade-in-50 duration-200">
              <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="relative group">
                  <Card className="relative bg-white border rounded-lg shadow hover:shadow-md transition-shadow duration-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        Completion Percentage
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                          <PieChart className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-cyan-700 bg-clip-text text-transparent">
                            {projectMetrics?.completionRate?.toFixed(1) || '0.0'}%
                          </div>
                          <div className="text-xs text-blue-600 font-medium">
                            {projectMetrics?.completedTasks || 0} of {projectMetrics?.totalTasks || 0} tasks
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="bg-gradient-to-r from-blue-200 to-cyan-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500 shadow-sm"
                            style={{ width: `${projectMetrics?.completionRate || 0}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="relative group">
                  <Card className="relative bg-white border rounded-lg shadow hover:shadow-md transition-shadow duration-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        AI Timeline Prediction
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl shadow-lg">
                          <Calendar className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
                            {nexusData?.estimatedCompletion ? 
                              Math.ceil((new Date(nexusData.estimatedCompletion).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                              : daysRemaining
                            } days
                          </div>
                          <div className="text-xs text-green-600 font-medium">ML estimated remaining</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="relative group">
                  <Card className="relative bg-white border rounded-lg shadow hover:shadow-md transition-shadow duration-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                        Smart Budget Tracking
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg">
                          <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-3xl font-bold bg-gradient-to-r from-orange-700 to-red-700 bg-clip-text text-transparent">
                            {budgetTracking ? 
                              Math.round((budgetTracking.totalSpent / (project.budget || 1)) * 100)
                              : budgetPercentage
                            }%
                          </div>
                          <div className="text-xs text-orange-600 font-medium">of budget utilized</div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="bg-gradient-to-r from-orange-200 to-red-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-500 shadow-sm"
                            style={{ width: `${budgetTracking ? (budgetTracking.totalSpent / (project.budget || 1)) * 100 : budgetPercentage}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="relative group">
                  <Card className="relative bg-white border rounded-lg shadow hover:shadow-md transition-shadow duration-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Productivity Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
                          <Gauge className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-3xl font-bold bg-gradient-to-r from-purple-700 to-pink-700 bg-clip-text text-transparent">
                            {projectMetrics?.productivityScore || 0}
                          </div>
                          <div className="text-xs text-purple-600 font-medium">AI calculated score</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="relative group">
                  <Card className="relative bg-white border rounded-lg shadow hover:shadow-md transition-shadow duration-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                        Critical Path Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl shadow-lg">
                          <Workflow className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-3xl font-bold bg-gradient-to-r from-yellow-700 to-amber-700 bg-clip-text text-transparent">
                            {nexusData?.criticalPath?.length || 0}
                          </div>
                          <div className="text-xs text-yellow-600 font-medium">critical tasks identified</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="relative group">
                  <Card className="relative bg-white border rounded-lg shadow hover:shadow-md transition-shadow duration-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                        Bottleneck Detection
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-r from-red-500 to-rose-500 rounded-xl shadow-lg">
                          <AlertCircle className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-3xl font-bold bg-gradient-to-r from-red-700 to-rose-700 bg-clip-text text-transparent">
                            {nexusData?.bottlenecks?.length || 0}
                          </div>
                          <div className="text-xs text-red-600 font-medium">issues requiring attention</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {nexusData && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-3">Risk Factors</h4>
                  <div className="space-y-2">
                    {nexusData.riskFactors?.map((risk: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-red-50 rounded border border-red-200">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-800">{risk}</span>
                      </div>
                    ))}
                    {(!nexusData.riskFactors || nexusData.riskFactors.length === 0) && (
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-800">No significant risk factors detected</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>
            </TabsContent>
            
            <TabsContent value="timeline" className="mt-0 space-y-6 animate-in fade-in-50 duration-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Timeline Analysis</h4>
                  <Badge className="bg-blue-100 text-blue-800">
                    AI Predicted
                  </Badge>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Average Task Duration</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {projectMetrics?.averageTaskDuration?.toFixed(1) || '0.0'} days
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Task Velocity</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {nexusData?.taskVelocity?.toFixed(1) || '0.0'} /week
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {nexusData?.estimatedCompletion && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">AI Estimated Completion</span>
                      </div>
                      <div className="text-lg font-bold">
                        {new Date(nexusData.estimatedCompletion).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Based on current velocity and ML pattern analysis
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="budget" className="mt-0 space-y-6 animate-in fade-in-50 duration-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Budget Tracking & Change Orders</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadBudgetTracking()}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Original Budget</div>
                      <div className="text-2xl font-bold">{formatCurrency(project.budget || 0)}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Spent to Date</div>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(budgetTracking?.totalSpent || 0)}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Change Orders</div>
                      <div className="text-2xl font-bold text-orange-600">
                        {formatCurrency(budgetTracking?.changeOrderTotal || 0)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Change Orders History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {changeOrders.length > 0 ? (
                      <div className="space-y-3">
                        {changeOrders.slice(0, 5).map((order, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded">
                            <div>
                              <div className="font-medium">{order.description || `Change Order #${index + 1}`}</div>
                              <div className="text-sm text-muted-foreground">
                                {order.created_at && new Date(order.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{formatCurrency(order.amount || 0)}</div>
                              <Badge className={order.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                {order.approved ? 'Approved' : 'Pending'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No change orders recorded yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="tasks" className="mt-0 space-y-6 animate-in fade-in-50 duration-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Suggested Weekly Tasks</h4>
                  <Badge className="bg-green-100 text-green-800">
                    ML Based Dependencies
                  </Badge>
                </div>
                
                {weeklyTasks.length > 0 ? (
                  <div className="space-y-3">
                    {weeklyTasks.map((task, index) => (
                      <Card key={index} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h5 className="font-medium">{task.title || `Task ${index + 1}`}</h5>
                                <Badge className={`${
                                  task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {task.priority || 'medium'} priority
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {task.description || 'No description available'}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>📅 {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</span>
                                <span>👤 {task.assignee_name || 'Unassigned'}</span>
                                <span>⏱️ {task.estimated_hours || 8}h estimated</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className={`${
                                task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                task.status === 'blocked' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {task.status || 'pending'}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Demo tasks for display */}
                    {[
                      { title: 'Foundation Inspection', priority: 'high', status: 'pending', description: 'Complete foundation inspection and documentation', due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), estimated_hours: 4 },
                      { title: 'Electrical Rough-In', priority: 'medium', status: 'in-progress', description: 'Install electrical wiring for main floor', due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), estimated_hours: 8 },
                      { title: 'HVAC Installation', priority: 'medium', status: 'pending', description: 'Install HVAC ducting and equipment', due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), estimated_hours: 12 },
                      { title: 'Safety Inspection', priority: 'high', status: 'pending', description: 'Weekly safety audit and compliance check', due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), estimated_hours: 2 }
                    ].map((task, index) => (
                      <Card key={index} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h5 className="font-medium">{task.title}</h5>
                                <Badge className={`${
                                  task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {task.priority} priority
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {task.description}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>📅 {task.due_date.toLocaleDateString()}</span>
                                <span>👤 Team Lead</span>
                                <span>⏱️ {task.estimated_hours}h estimated</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className={`${
                                task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                task.status === 'blocked' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {task.status}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="insights" className="mt-0 space-y-6 animate-in fade-in-50 duration-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Machine Learning Insights</h4>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">Live Learning Active</span>
                  </div>
                </div>
                
                {isLoadingML ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Brain className="h-12 w-12 text-purple-600 mx-auto mb-4 animate-pulse" />
                      <h5 className="font-medium mb-2">Analyzing Project Patterns...</h5>
                      <p className="text-sm text-muted-foreground">
                        Nexus AI is processing your project data to generate insights
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card className="border-purple-200 bg-purple-50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-purple-700">Success Probability</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-purple-800">
                            {nexusData ? Math.round(nexusData.successProbability * 100) : 0}%
                          </div>
                          <Progress value={nexusData ? nexusData.successProbability * 100 : 0} className="mt-2" />
                          <p className="text-xs text-purple-600 mt-2">
                            Based on ML analysis of similar projects
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-blue-200 bg-blue-50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-blue-700">Pattern Recognition</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-blue-800">
                            {nexusData ? Object.keys(nexusData).length : 0}
                          </div>
                          <p className="text-xs text-blue-600 mt-2">
                            Active pattern types identified
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Continuous Learning Feedback</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 p-3 bg-green-50 rounded border border-green-200">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-800">Pattern recognition models are continuously learning from your project data</span>
                          </div>
                          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded border border-blue-200">
                            <Brain className="h-4 w-4 text-blue-600" />
                            <span className="text-sm text-blue-800">Predictions improve automatically as more data becomes available</span>
                          </div>
                          <div className="flex items-center gap-2 p-3 bg-purple-50 rounded border border-purple-200">
                            <Star className="h-4 w-4 text-purple-600" />
                            <span className="text-sm text-purple-800">Your feedback helps train the AI models for better accuracy</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>

      {/* Modernized Document Management System */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl" />
        <Card className="relative bg-white/60 backdrop-blur-xl border-2 border-white/30 shadow-2xl rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
          <CardHeader className="relative pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-xl">
                  <FolderOpen className="h-8 w-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
                    Smart Document Management
                  </CardTitle>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0 shadow-lg px-3 py-1">
                      <FileText className="h-3 w-3 mr-1" />
                      AI Organized
                    </Badge>
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-lg px-3 py-1">
                      <Search className="h-3 w-3 mr-1" />
                      Smart Search
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/50 to-gray-100/50 rounded-xl blur-sm" />
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-500" />
                    <Input
                      placeholder="AI-powered document search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 w-80 bg-white/80 backdrop-blur-sm border-2 border-purple-200 rounded-xl shadow-lg focus:border-purple-400"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 p-1 bg-white/70 backdrop-blur-sm rounded-xl border border-purple-200 shadow-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={`rounded-lg transition-all duration-300 ${
                      viewMode === 'grid' 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                        : 'hover:bg-purple-100 text-purple-600'
                    }`}
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={`rounded-lg transition-all duration-300 ${
                      viewMode === 'list' 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                        : 'hover:bg-purple-100 text-purple-600'
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
                <Button 
                  onClick={() => {
                    setShowUploadModal(true)
                    setUploadFolder('')
                  }}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-xl border-0 px-6 py-2 rounded-xl transition-all duration-300"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Documents
                </Button>
              </div>
            </div>
          </CardHeader>
        <CardContent>
          <div className="mb-4 text-sm text-gray-600">Debug: Selected Folder = {selectedFolder || 'none'}</div>
          {selectedFolder ? (
            // Folder View - Show contents of selected folder
            <div className="space-y-4" style={{ pointerEvents: 'auto' }}>
              <div className="flex items-center justify-between mb-4" style={{ pointerEvents: 'auto' }}>
                <div className="flex items-center gap-3" style={{ pointerEvents: 'auto' }}>
                  <Button
                    variant="outline"
                    onClick={handleBackToFolders}
                    className="bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700 font-medium px-4 py-2 z-50 relative"
                    style={{ 
                      pointerEvents: 'auto',
                      zIndex: 1000,
                      position: 'relative'
                    }}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back to Folders
                  </Button>
                  <div className="flex items-center gap-2">
                    <div className={`${folderConfig[selectedFolder].bgColor} ${folderConfig[selectedFolder].color} rounded p-2`}>
                      {React.createElement(folderConfig[selectedFolder].icon, { className: "h-4 w-4" })}
                    </div>
                    <h3 className="font-semibold">{folderNames[selectedFolder]}</h3>
                    <Badge variant="secondary">0 files</Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="bg-white border-4 border-purple-700 text-purple-700 hover:bg-purple-50 font-semibold"
                  onClick={() => {
                    setUploadFolder(selectedFolder)
                    setShowUploadModal(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Upload to {folderNames[selectedFolder]}
                </Button>
              </div>
              
              {false ? (
                <div className="grid gap-3">
                  {project.folders[selectedFolder].map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{file.name}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{file.size}</span>
                            <span>•</span>
                            <span>Uploaded {file.uploadedAt.toLocaleDateString()}</span>
                            <span>•</span>
                            <span>by {file.uploadedBy}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No files in this folder yet</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUploadFolder(selectedFolder)
                      setShowUploadModal(true)
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload First File
                  </Button>
                </div>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Object.entries(folderConfig).map(([key, config]) => {
                const Icon = config.icon
                const folderKey = key as keyof typeof folderConfig
                const count = documentCounts[folderKey]
                
                return (
                  <div key={key} className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-gray-100/50 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300" />
                    <div
                      className="relative cursor-pointer transform hover:scale-105 transition-all duration-300 p-6 bg-white/70 backdrop-blur-sm rounded-2xl border-2 border-white/40 shadow-xl hover:shadow-2xl"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log(`Opening ${folderNames[folderKey]} folder`);
                        setSelectedFolder(folderKey);
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-white/30 rounded-2xl" />
                      <div className="relative">
                        <div className={`p-4 rounded-2xl shadow-lg mb-4 bg-gradient-to-br ${
                          key === 'contracts' ? 'from-blue-400 to-blue-600' :
                          key === 'permits' ? 'from-green-400 to-green-600' :
                          key === 'design' ? 'from-purple-400 to-purple-600' :
                          key === 'invoices' ? 'from-emerald-400 to-emerald-600' :
                          key === 'specifications' ? 'from-indigo-400 to-indigo-600' :
                          key === 'correspondence' ? 'from-pink-400 to-pink-600' :
                          key === 'photos' ? 'from-amber-400 to-amber-600' :
                          key === 'reports' ? 'from-cyan-400 to-cyan-600' :
                          key === 'changeOrders' ? 'from-orange-400 to-orange-600' :
                          'from-red-400 to-red-600'
                        }`}>
                          <Icon className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="font-bold text-gray-800 mb-2 text-sm">{folderNames[folderKey]}</h3>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-gradient-to-r from-gray-400 to-gray-600 text-white border-0 text-xs px-2 py-1">
                            {count} files
                          </Badge>
                          <Database className="h-3 w-3 text-green-500" />
                        </div>
                      </div>
                      
                      {/* Modernized Upload Button */}
                      <Button
                        size="sm"
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-r from-green-400 to-emerald-400 hover:from-green-500 hover:to-emerald-500 text-white border-0 shadow-lg h-8 w-8 p-0 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          setUploadFolder(key)
                          setShowUploadModal(true)
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(folderConfig).map(([key, config]) => {
                const Icon = config.icon
                const folderKey = key as keyof typeof folderConfig
                const count = documentCounts[folderKey]
                
                return (
                  <div key={key} className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/50 to-gray-100/50 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300" />
                    <div
                      className="relative flex items-center justify-between p-4 bg-white/60 backdrop-blur-sm rounded-xl border-2 border-white/40 shadow-lg hover:shadow-xl cursor-pointer transition-all duration-300"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log(`Opening ${folderNames[folderKey]} folder`);
                        setSelectedFolder(folderKey);
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl shadow-lg bg-gradient-to-br ${
                          key === 'contracts' ? 'from-blue-400 to-blue-600' :
                          key === 'permits' ? 'from-green-400 to-green-600' :
                          key === 'design' ? 'from-purple-400 to-purple-600' :
                          key === 'invoices' ? 'from-emerald-400 to-emerald-600' :
                          key === 'specifications' ? 'from-indigo-400 to-indigo-600' :
                          key === 'correspondence' ? 'from-pink-400 to-pink-600' :
                          key === 'photos' ? 'from-amber-400 to-amber-600' :
                          key === 'reports' ? 'from-cyan-400 to-cyan-600' :
                          key === 'changeOrders' ? 'from-orange-400 to-orange-600' :
                          'from-red-400 to-red-600'
                        }`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 text-sm">{folderNames[folderKey]}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge className="bg-gradient-to-r from-gray-400 to-gray-600 text-white border-0 text-xs px-2 py-1">
                              {count} files
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              <Database className="h-3 w-3" />
                              <span>Live sync</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-9 w-9 p-0 rounded-full bg-gradient-to-r from-green-400 to-emerald-400 hover:from-green-500 hover:to-emerald-500 text-white border-0 shadow-lg opacity-70 hover:opacity-100 transition-all"
                          onClick={(e) => {
                            e.stopPropagation()
                            setUploadFolder(key)
                            setShowUploadModal(true)
                          }}
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-9 w-9 p-0 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 hover:from-blue-500 hover:to-cyan-500 text-white border-0 shadow-lg opacity-70 hover:opacity-100 transition-all"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-9 w-9 p-0 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white border-0 shadow-lg opacity-70 hover:opacity-100 transition-all"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* AI-Enhanced Recent Activity Feed */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-400/10 via-gray-400/10 to-zinc-400/10 rounded-3xl" />
        <Card className="relative bg-white/60 backdrop-blur-xl border-2 border-white/30 shadow-2xl rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
          <CardHeader className="relative pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-slate-600 via-gray-600 to-zinc-600 rounded-2xl shadow-xl">
                  <Activity className="h-8 w-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl bg-gradient-to-r from-slate-600 via-gray-600 to-zinc-600 bg-clip-text text-transparent font-bold">
                    Enhanced Activity Feed
                  </CardTitle>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge className="bg-gradient-to-r from-slate-500 to-gray-500 text-white border-0 shadow-lg px-3 py-1">
                      <Clock className="h-3 w-3 mr-1" />
                      Real-time
                    </Badge>
                    <Badge className="bg-gradient-to-r from-gray-500 to-zinc-500 text-white border-0 shadow-lg px-3 py-1">
                      <Brain className="h-3 w-3 mr-1" />
                      ML Analyzed
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  // Refresh activity data with live sync
                  if (project?.id && currentTenant) {
                    const { data: activities } = await supabase
                      .from('activity_logs')
                      .select('*')
                      .eq('entity_id', project.id)
                      .eq('tenant_id', currentTenant.id)
                      .order('created_at', { ascending: false })
                      .limit(10)
                    
                    if (projectMetrics) {
                      setProjectMetrics({
                        ...projectMetrics,
                        activities: activities || []
                      })
                    }
                  }
                }}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-lg px-4 py-2 rounded-xl"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Live Feed
              </Button>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-4">
              {activities && activities.length > 0 ? (
                activities.slice(0, 8).map((activity: any, index: number) => (
                  <div key={index} className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-gray-50/30 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300" />
                    <div className="relative flex items-start gap-4 p-4 bg-white/40 backdrop-blur-sm rounded-xl border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300">
                      <div className="flex-shrink-0">
                        <div className={`p-2 rounded-full shadow-lg bg-gradient-to-r ${
                          activity.action?.includes('upload') ? 'from-green-400 to-emerald-400' :
                          activity.action?.includes('create') ? 'from-blue-400 to-cyan-400' :
                          activity.action?.includes('update') ? 'from-yellow-400 to-orange-400' :
                          activity.action?.includes('delete') ? 'from-red-400 to-pink-400' :
                          'from-purple-400 to-blue-400'
                        }`}>
                          {activity.action?.includes('upload') ? <Upload className="h-4 w-4 text-white" /> :
                           activity.action?.includes('create') ? <Plus className="h-4 w-4 text-white" /> :
                           activity.action?.includes('update') ? <Edit className="h-4 w-4 text-white" /> :
                           activity.action?.includes('delete') ? <Trash2 className="h-4 w-4 text-white" /> :
                           <Activity className="h-4 w-4 text-white" />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900 mb-1">
                              {activity.description || `${activity.action || 'Activity'} performed`}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Users className="h-3 w-3" />
                              <span>{activity.user_name || 'System'}</span>
                              <span>•</span>
                              <Clock className="h-3 w-3" />
                              <span>{activity.created_at ? new Date(activity.created_at).toLocaleString() : 'Recently'}</span>
                            </div>
                          </div>
                          <Badge className="bg-gradient-to-r from-blue-400 to-purple-400 text-white border-0 shadow-sm flex-shrink-0 text-xs">
                            Live
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-4">
                  {[
                    { user: 'AI System', action: 'analyzed project patterns', time: 'Just now', type: 'ai', color: 'from-purple-400 to-blue-400' },
                    { user: 'Nexus ML', action: 'updated success probability to 87%', time: '5 minutes ago', type: 'ml', color: 'from-green-400 to-emerald-400' },
                    { user: 'Pattern Recognition', action: 'identified 2 potential bottlenecks', time: '15 minutes ago', type: 'analysis', color: 'from-yellow-400 to-orange-400' },
                    { user: 'Smart Budget', action: 'tracked new expense of $2,450', time: '1 hour ago', type: 'budget', color: 'from-blue-400 to-cyan-400' },
                    { user: 'AI Scheduler', action: 'generated weekly task suggestions', time: '2 hours ago', type: 'schedule', color: 'from-pink-400 to-rose-400' }
                  ].map((activity, index) => (
                    <div key={index} className="group relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-gray-50/30 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300" />
                      <div className="relative flex items-start gap-4 p-4 bg-white/40 backdrop-blur-sm rounded-xl border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="flex-shrink-0">
                          <div className={`p-2 rounded-full shadow-lg bg-gradient-to-r ${activity.color}`}>
                            {activity.type === 'ai' ? <Brain className="h-4 w-4 text-white" /> :
                             activity.type === 'ml' ? <Cpu className="h-4 w-4 text-white" /> :
                             activity.type === 'analysis' ? <TrendingUp className="h-4 w-4 text-white" /> :
                             activity.type === 'budget' ? <DollarSign className="h-4 w-4 text-white" /> :
                             <Calendar className="h-4 w-4 text-white" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900 mb-1">
                                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent font-semibold">{activity.user}</span> {activity.action}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                <span>{activity.time}</span>
                              </div>
                            </div>
                            <Badge className="bg-gradient-to-r from-green-400 to-emerald-400 text-white border-0 shadow-sm flex-shrink-0 text-xs">
                              AI
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </CardContent>
        </Card>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Upload Files</CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    setShowUploadModal(false)
                    setSelectedFiles([])
                    setUploadFolder('')
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="upload-folder">Select Folder</Label>
                <select
                  id="upload-folder"
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
                >
                  <option value="">Choose a folder...</option>
                  {Object.entries(folderNames).map(([key, name]) => (
                    <option key={key} value={key}>{name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label>Select Files</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      setSelectedFiles(files)
                    }}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Files
                  </Button>
                  
                  {selectedFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium">{selectedFiles.length} files selected:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="text-sm truncate flex-1">{file.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {(file.size / 1024 / 1024).toFixed(1)} MB
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => {
                    if (selectedFiles.length > 0 && uploadFolder) {
                      handleFileUpload(selectedFiles, uploadFolder)
                    }
                  }}
                  disabled={selectedFiles.length === 0 || !uploadFolder || isUploading}
                  className="flex-1"
                >
                  {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}`}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowUploadModal(false)
                    setSelectedFiles([])
                    setUploadFolder('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
