"use client"

import { useState, useEffect } from 'react'
import { 
  Plus,
  Calendar,
  Filter,
  Search,
  FileDown,
  User,
  Briefcase,
  X,
  Upload,
  Image as ImageIcon,
  FileText,
  Eye,
  Edit,
  Save,
  FileX
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { format } from 'date-fns'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/hooks/use-toast'

interface UpdateLog {
  id: string
  projectId: string
  projectName: string
  projectCode: string // New: Project ID/Code
  title: string
  description: string
  date: Date
  teamMember: string // New: Team member tag
  teamMemberId: string
  photos: string[]
  weather?: {
    temp: number
    description: string
    humidity: number
    windSpeed: number
  }
  tasksCompleted: string[]
  issues?: string[]
  createdBy: string
  createdAt: Date
}

export default function UpdateLogPage() {
  const [updates, setUpdates] = useState<UpdateLog[]>([])
  const [filteredUpdates, setFilteredUpdates] = useState<UpdateLog[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedUpdate, setSelectedUpdate] = useState<UpdateLog | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  
  const [formData, setFormData] = useState({
    projectId: '',
    title: '',
    description: '',
    teamMemberId: '',
    tasksCompleted: '',
    issues: ''
  })

  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    teamMemberId: '',
    tasksCompleted: '',
    issues: ''
  })

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      
      // Check for session first
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        console.log('No active session, user needs to login')
        setIsAuthenticated(false)
        setLoading(false)
        toast({
          title: "Authentication Required",
          description: "Please log in to view update logs",
          variant: "destructive"
        })
        return
      }
      
      setIsAuthenticated(true)
      await loadProjects()
      await loadTeamMembers()
      await loadUpdates()
      setLoading(false)
    }
    loadData()
  }, [])

  // Apply filters whenever they change
  useEffect(() => {
    applyFilters()
  }, [updates, selectedProject, dateFilter, searchKeyword])

  const loadProjects = async () => {
    try {
      console.log('Loading projects for update log...')
      
      // Get current session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.user) {
        console.error('Session not found when loading projects:', sessionError)
        setProjects([])
        return
      }
      const user = session.user
      console.log('User authenticated:', user.id)

      // Get user's tenants (handle multiple tenants)
      const { data: userTenants, error: tenantError } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
      
      if (tenantError || !userTenants || userTenants.length === 0) {
        console.error('No tenant found for user:', tenantError)
        setProjects([])
        return
      }
      
      // Use the first tenant (or you could allow tenant switching)
      const tenantId = userTenants[0].tenant_id
      console.log('Tenant found:', tenantId, '(using first of', userTenants.length, 'tenants)')

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, project_code, client')
        .eq('tenant_id', tenantId)
        .order('name')

      if (error) {
        console.error('Error loading projects:', error)
        toast({
          title: "Error loading projects",
          description: error.message,
          variant: "destructive"
        })
        setProjects([])
        return
      }
      
      console.log('Projects loaded:', data?.length || 0, 'projects')
      console.log('Project data:', data)
      setProjects(data || [])
    } catch (error: any) {
      console.error('Unexpected error loading projects:', error)
      toast({
        title: "Error loading projects",
        description: "Failed to load projects. Please refresh the page.",
        variant: "destructive"
      })
      setProjects([])
    }
  }

  const loadTeamMembers = async () => {
    try {
      console.log('Loading team members for update log...')
      
      // Get current session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.user) {
        console.error('Session not found when loading team members:', sessionError)
        setTeamMembers([])
        return
      }
      const user = session.user

      // Get user's tenants (handle multiple tenants)
      const { data: userTenants, error: tenantError } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
      
      if (tenantError || !userTenants || userTenants.length === 0) {
        console.error('No tenant found for user:', tenantError)
        setTeamMembers([])
        return
      }
      
      // Use the first tenant (or you could allow tenant switching)
      const tenantId = userTenants[0].tenant_id
      console.log('Loading team members for tenant:', tenantId)

      // Get team members in the same tenant - use alternative approach for better compatibility
      const { data: userTenantData, error: userTenantError } = await supabase
        .from('user_tenants')
        .select('user_id, role')
        .eq('tenant_id', tenantId)

      if (userTenantError) {
        console.error('Error loading user_tenants:', userTenantError.message)
        toast({
          title: "Error loading team members",
          description: userTenantError.message,
          variant: "destructive"
        })
        setTeamMembers([])
        return
      }

      if (!userTenantData || userTenantData.length === 0) {
        console.log('No team members found in tenant')
        setTeamMembers([])
        return
      }

      // Get profiles for these users
      const userIds = userTenantData.map(ut => ut.user_id)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, is_active')
        .in('id', userIds)
        .eq('is_active', true)
        .order('full_name', { ascending: true })

      if (error) {
        console.error('Error loading team members:', error.message)
        toast({
          title: "Error loading team members",
          description: error.message,
          variant: "destructive"
        })
        setTeamMembers([])
        return
      }
      
      // Format the data to match expected structure
      const roleMap = new Map(userTenantData.map(ut => [ut.user_id, ut.role]))
      const formattedMembers = (data || []).map((profile: any) => ({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        role: roleMap.get(profile.id) || 'member'
      }))
      
      setTeamMembers(formattedMembers)
    } catch (error: any) {
      console.error('Error loading team members:', error?.message || 'Unknown error')
      setTeamMembers([])
    }
  }

  const loadUpdates = async () => {
    setLoading(true)
    try {
      console.log('Loading updates for update log...')
      
      // Get current session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.user) {
        console.error('Session not found when loading updates:', sessionError)
        setUpdates([])
        setLoading(false)
        return
      }
      const user = session.user

      // Get user's tenants (handle multiple tenants)
      const { data: userTenants, error: tenantError } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
      
      if (tenantError || !userTenants || userTenants.length === 0) {
        console.error('No tenant found for user:', tenantError)
        setUpdates([])
        setLoading(false)
        return
      }
      
      // Use the first tenant (or you could allow tenant switching)
      const tenantId = userTenants[0].tenant_id
      console.log('Loading updates for tenant:', tenantId)

      const { data, error } = await supabase
        .from('update_logs')
        .select(`
          *,
          projects(name, project_code)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
      
      // If we have data, fetch the team member names separately
      let formattedData = data
      if (data && data.length > 0) {
        const teamMemberIds = [...new Set(data.map(u => u.team_member_id).filter(id => id))]
        
        if (teamMemberIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', teamMemberIds)
          
          const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || [])
          
          formattedData = data.map(update => ({
            ...update,
            team_member_name: profileMap.get(update.team_member_id) || 'Unknown'
          }))
        }
      }

      if (error) {
        console.error('Error loading updates:', error)
        
        // Check if table doesn't exist
        if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
          toast({
            title: "Database Setup Required",
            description: "The update_logs table needs to be created. Please check MANUAL_UPDATE_LOGS_MIGRATION.md for instructions.",
            variant: "destructive"
          })
        } else {
          toast({
            title: "Error loading updates",
            description: error.message || "Failed to load updates",
            variant: "destructive"
          })
        }
        setUpdates([])
        setLoading(false)
        return
      }
      
      const formattedUpdates = (formattedData || []).map((update: any) => ({
        id: update.id,
        projectId: update.project_id,
        projectName: update.projects?.name || 'Unknown Project',
        projectCode: update.projects?.project_code || 'N/A',
        title: update.title,
        description: update.description,
        date: update.date ? new Date(update.date) : new Date(update.created_at),
        teamMember: update.team_member_name || 'Unknown',
        teamMemberId: update.team_member_id,
        photos: update.photos || [],
        weather: update.weather,
        tasksCompleted: update.tasks_completed || [],
        issues: update.issues || [],
        createdBy: update.created_by_name,
        createdAt: new Date(update.created_at)
      }))
      
      setUpdates(formattedUpdates)
    } catch (error: any) {
      console.error('Error loading updates:', error?.message || 'Unknown error')
      setUpdates([])
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...updates]

    // Filter by project
    if (selectedProject !== 'all') {
      filtered = filtered.filter(u => u.projectId === selectedProject)
    }

    // Filter by date
    if (dateFilter) {
      const filterDate = new Date(dateFilter)
      filtered = filtered.filter(u => {
        const updateDate = new Date(u.date)
        return updateDate.toDateString() === filterDate.toDateString()
      })
    }

    // Filter by keyword
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase()
      filtered = filtered.filter(u => 
        u.title.toLowerCase().includes(keyword) ||
        u.description.toLowerCase().includes(keyword) ||
        u.teamMember.toLowerCase().includes(keyword) ||
        u.projectCode.toLowerCase().includes(keyword)
      )
    }

    setFilteredUpdates(filtered)
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + selectedPhotos.length > 6) {
      toast({
        title: 'Photo limit reached',
        description: 'You can only upload up to 6 photos',
        variant: 'destructive'
      })
      return
    }
    
    setSelectedPhotos([...selectedPhotos, ...files])
    
    // Create preview URLs
    const newUrls = files.map(file => URL.createObjectURL(file))
    setPreviewUrls([...previewUrls, ...newUrls])
  }

  const removePhoto = (index: number) => {
    const newPhotos = selectedPhotos.filter((_, i) => i !== index)
    const newUrls = previewUrls.filter((_, i) => i !== index)
    
    // Clean up the URL to prevent memory leaks
    URL.revokeObjectURL(previewUrls[index])
    
    setSelectedPhotos(newPhotos)
    setPreviewUrls(newUrls)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const project = projects.find(p => p.id === formData.projectId)
    const teamMember = teamMembers.find(t => t.id === formData.teamMemberId)
    
    if (!project || !teamMember) {
      toast({
        title: 'Error',
        description: 'Please select a project and team member',
        variant: 'destructive'
      })
      return
    }

    try {
      // Upload photos if any
      const photoUrls: string[] = []
      for (const photo of selectedPhotos) {
        const fileName = `updates/${Date.now()}-${photo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const { data, error } = await supabase.storage
          .from('project-photos')
          .upload(fileName, photo)
        
        if (error) {
          console.error('Photo upload error:', error)
          if (error.message?.includes('not found')) {
            toast({
              title: "Storage Setup Required",
              description: "The project-photos storage bucket needs to be created first.",
              variant: "destructive"
            })
            return
          }
        } else if (data) {
          const { data: { publicUrl } } = supabase.storage
            .from('project-photos')
            .getPublicUrl(fileName)
          photoUrls.push(publicUrl)
        }
      }

      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.user) {
        throw new Error('Session not found')
      }
      const user = session.user

      // Get user's tenant_id (handle multiple tenants)
      const { data: userTenants, error: tenantError } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
      
      if (tenantError || !userTenants || userTenants.length === 0) {
        throw new Error('Could not determine user tenant')
      }
      
      const tenantId = userTenants[0].tenant_id

      // Save update to database
      const { data, error } = await supabase
        .from('update_logs')
        .insert({
          project_id: formData.projectId,
          title: formData.title,
          description: formData.description,
          team_member_id: formData.teamMemberId,
          date: new Date().toISOString(),
          photos: photoUrls,
          tasks_completed: formData.tasksCompleted.split(',').map(t => t.trim()).filter(t => t),
          issues: formData.issues ? formData.issues.split(',').map(i => i.trim()).filter(i => i) : [],
          created_by_name: teamMember.full_name,
          tenant_id: tenantId,
          created_by: user.id
        })
        .select()
        .single()

      if (error) throw error

      // Add to local state
      const newUpdate: UpdateLog = {
        id: data.id,
        projectId: formData.projectId,
        projectName: project.name,
        projectCode: project.project_code,
        title: formData.title,
        description: formData.description,
        date: new Date(),
        teamMember: teamMember.full_name,
        teamMemberId: formData.teamMemberId,
        photos: photoUrls,
        tasksCompleted: formData.tasksCompleted.split(',').map(t => t.trim()).filter(t => t),
        issues: formData.issues ? formData.issues.split(',').map(i => i.trim()).filter(i => i) : [],
        createdBy: teamMember.full_name,
        createdAt: new Date()
      }
      
      setUpdates([newUpdate, ...updates])
      
      // Reset form
      setFormData({
        projectId: '',
        title: '',
        description: '',
        teamMemberId: '',
        tasksCompleted: '',
        issues: ''
      })
      setSelectedPhotos([])
      setPreviewUrls([])
      setShowForm(false)
      
      toast({
        title: 'Success',
        description: 'Update log created successfully'
      })
    } catch (error: any) {
      console.error('Error creating update:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to create update log',
        variant: 'destructive'
      })
    }
  }

  const exportToPDF = async (update: UpdateLog) => {
    try {
      // Get report template settings
      const { data: settings } = await supabase
        .from('report_templates')
        .select('*')
        .single()

      const project = projects.find(p => p.id === update.projectId)
      
      const reportData = {
        ...update,
        companyHeader: settings?.reportHeader || 'PROJECT UPDATE REPORT',
        companySubheader: settings?.reportSubheader || 'Construction Progress Documentation',
        companyInfo: settings ? {
          name: settings.companyName,
          address: settings.companyAddress,
          phone: settings.companyPhone,
          email: settings.companyEmail,
          website: settings.companyWebsite
        } : undefined,
        signatureTitle: settings?.signatureTitle || 'Authorized Representative',
        signature: settings?.signatureText || '',
        footerText: settings?.footerText || 'Confidential',
        ref: `REF-${update.projectCode}-${format(update.date, 'yyyyMMdd')}`,
        attn: `${settings?.defaultAttentionPrefix || 'Project Manager'} - ${project?.client || project?.name || 'Client'}`,
        includePageNumbers: settings?.includePageNumbers ?? true,
        includeGenerationDate: settings?.includeGenerationDate ?? true
      }

      // PDF generation placeholder - implement actual PDF generation here
      toast({
        title: 'PDF Export',
        description: 'PDF export functionality will be implemented soon',
        variant: 'default'
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate PDF report',
        variant: 'destructive'
      })
    }
  }

  const openDetailModal = (update: UpdateLog) => {
    setSelectedUpdate(update)
    setEditFormData({
      title: update.title,
      description: update.description,
      teamMemberId: update.teamMemberId,
      tasksCompleted: Array.isArray(update.tasksCompleted) ? update.tasksCompleted.join(', ') : '',
      issues: Array.isArray(update.issues) ? update.issues.join(', ') : ''
    })
    setIsEditing(false)
    setShowDetailModal(true)
  }

  const saveUpdate = async () => {
    if (!selectedUpdate) return

    try {
      const { data, error } = await supabase
        .from('update_logs')
        .update({
          title: editFormData.title,
          description: editFormData.description,
          team_member_id: editFormData.teamMemberId,
          tasks_completed: editFormData.tasksCompleted.split(',').map(t => t.trim()).filter(t => t),
          issues: editFormData.issues ? editFormData.issues.split(',').map(i => i.trim()).filter(i => i) : []
        })
        .eq('id', selectedUpdate.id)
        .select()
        .single()

      if (error) throw error

      // Update local state
      const updatedUpdates = updates.map(u => 
        u.id === selectedUpdate.id 
          ? { 
              ...u, 
              title: editFormData.title,
              description: editFormData.description,
              teamMemberId: editFormData.teamMemberId,
              teamMember: teamMembers.find(t => t.id === editFormData.teamMemberId)?.full_name || u.teamMember,
              tasksCompleted: editFormData.tasksCompleted.split(',').map(t => t.trim()).filter(t => t),
              issues: editFormData.issues ? editFormData.issues.split(',').map(i => i.trim()).filter(i => i) : []
            }
          : u
      )
      setUpdates(updatedUpdates)
      
      // Update selected update
      setSelectedUpdate({
        ...selectedUpdate,
        title: editFormData.title,
        description: editFormData.description,
        teamMemberId: editFormData.teamMemberId,
        teamMember: teamMembers.find(t => t.id === editFormData.teamMemberId)?.full_name || selectedUpdate.teamMember,
        tasksCompleted: editFormData.tasksCompleted.split(',').map(t => t.trim()).filter(t => t),
        issues: editFormData.issues ? editFormData.issues.split(',').map(i => i.trim()).filter(i => i) : []
      })

      setIsEditing(false)
      toast({
        title: 'Success',
        description: 'Update saved successfully'
      })
    } catch (error) {
      console.error('Error saving update:', error)
      toast({
        title: 'Error',
        description: 'Failed to save update',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="text-center flex-1">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">Update Log</h1>
          <p className="text-gray-600 text-lg">
            Track project progress and generate reports
          </p>
        </div>
        <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300">
          <Button 
            onClick={async () => {
              if (projects.length === 0) {
                await loadProjects()
              }
              setShowForm(true)
            }}
            className="bg-white/90 backdrop-blur-sm border-0 text-purple-700 hover:bg-purple-50 font-semibold rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Update
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600">
        <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            {/* Project Filter */}
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-md border border-input bg-background"
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.project_code} - {project.name}
                </option>
              ))}
            </select>

            {/* Date Filter */}
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-40"
              placeholder="Filter by date"
            />

            {/* Keyword Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-600" />
              <Input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-9"
                placeholder="Search updates..."
              />
            </div>

            {/* Clear Filters */}
            {(selectedProject !== 'all' || dateFilter || searchKeyword) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedProject('all')
                  setDateFilter('')
                  setSearchKeyword('')
                }}
              >
                Clear filters
              </Button>
            )}

            <div className="ml-auto text-sm text-muted-foreground">
              {filteredUpdates.length} updates found
            </div>
          </div>
        </CardContent>
        </Card>
      </div>

      {/* Updates List - Tight View */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600">
            <Card className="p-8 text-center bg-white/80 backdrop-blur-sm border-0 rounded-xl">
              <p className="text-muted-foreground">Loading updates...</p>
            </Card>
          </div>
        ) : !isAuthenticated ? (
          <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600">
            <Card className="p-8 text-center bg-white/80 backdrop-blur-sm border-0 rounded-xl">
              <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
              <p className="text-muted-foreground">Please log in to view and manage update logs.</p>
            </Card>
          </div>
        ) : filteredUpdates.length > 0 ? (
          filteredUpdates.map((update) => (
            <div key={update.id} className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
              <Card 
                className="cursor-pointer bg-white/80 backdrop-blur-sm border-0 rounded-xl"
                onClick={() => openDetailModal(update)}
              >
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Project Code */}
                    <Badge variant="outline" className="font-mono">
                      {update.projectCode}
                    </Badge>
                    
                    {/* Title */}
                    <div className="flex-1">
                      <h3 className="font-medium">{update.title}</h3>
                      <p className="text-sm text-muted-foreground">{update.projectName}</p>
                    </div>

                    {/* Team Member Tag */}
                    <div className="flex items-center gap-1 text-sm">
                      <User className="h-4 w-4" />
                      <span>{update.teamMember}</span>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{format(update.date, 'MMM d, yyyy')}</span>
                    </div>

                    {/* PDF Export */}
                    <div className="p-[1px] rounded-lg bg-gradient-to-br from-white via-purple-100 to-purple-400 hover:shadow-lg transition-all duration-200">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="bg-white/90 border-0 rounded-lg hover:bg-purple-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          exportToPDF(update)
                        }}
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
              </Card>
            </div>
          ))
        ) : (
          <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600">
            <Card className="p-8 text-center bg-white/80 backdrop-blur-sm border-0 rounded-xl">
              <p className="text-muted-foreground mb-4">
                No updates found. Create your first update to track project progress.
              </p>
              <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300 inline-block">
                <Button 
                  onClick={async () => {
                    if (projects.length === 0) {
                      await loadProjects()
                    }
                    setShowForm(true)
                  }}
                  className="bg-white/90 backdrop-blur-sm border-0 text-purple-700 hover:bg-purple-50 font-semibold rounded-xl"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Update
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Create/Edit Update Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Update Log</DialogTitle>
            <DialogDescription>
              Create a new project update log entry
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Project Selection */}
              <div>
                <Label htmlFor="project">Project*</Label>
                <select
                  id="project"
                  className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  required
                  disabled={loading || projects.length === 0}
                >
                  <option value="">
                    {loading ? "Loading projects..." : 
                     projects.length === 0 ? "No projects available" : 
                     "Select a project"}
                  </option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.project_code ? `${project.project_code} - ${project.name}` : project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Team Member */}
              <div>
                <Label htmlFor="teamMember">Team Member*</Label>
                <select
                  id="teamMember"
                  className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
                  value={formData.teamMemberId}
                  onChange={(e) => setFormData({ ...formData, teamMemberId: e.target.value })}
                  required
                >
                  <option value="">Select team member</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title">Update Title*</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Foundation Work Complete"
                required
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description*</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the work completed..."
                rows={4}
                required
              />
            </div>

            {/* Tasks Completed */}
            <div>
              <Label htmlFor="tasks">Tasks Completed (comma-separated)</Label>
              <Input
                id="tasks"
                value={formData.tasksCompleted}
                onChange={(e) => setFormData({ ...formData, tasksCompleted: e.target.value })}
                placeholder="Foundation pour, Rebar installation, Electrical rough-in..."
              />
            </div>

            {/* Issues */}
            <div>
              <Label htmlFor="issues">Issues/Delays (comma-separated)</Label>
              <Input
                id="issues"
                value={formData.issues}
                onChange={(e) => setFormData({ ...formData, issues: e.target.value })}
                placeholder="Material delivery delay, Weather hold..."
              />
            </div>

            {/* Photos */}
            <div>
              <Label>Progress Photos (Max 6)</Label>
              <div className="mt-2">
                {previewUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {previewUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {selectedPhotos.length < 6 && (
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      id="photo-upload"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photos
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {selectedPhotos.length}/6 photos selected
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-xl transition-all duration-300 inline-block">
                <Button type="submit" className="bg-white/90 backdrop-blur-sm border-0 text-purple-700 hover:bg-purple-50 font-semibold rounded-xl">
                  Create Update
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setSelectedPhotos([])
                  setPreviewUrls([])
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail/Edit Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>
                  {selectedUpdate && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {selectedUpdate.projectCode}
                      </Badge>
                      <span>{isEditing ? 'Edit Update' : selectedUpdate.title}</span>
                    </div>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {selectedUpdate && `${selectedUpdate.projectName} • ${format(selectedUpdate.date, 'MMM d, yyyy')}`}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectedUpdate && exportToPDF(selectedUpdate)}
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false)
                        if (selectedUpdate) {
                          setEditFormData({
                            title: selectedUpdate.title,
                            description: selectedUpdate.description,
                            teamMemberId: selectedUpdate.teamMemberId,
                            tasksCompleted: Array.isArray(selectedUpdate.tasksCompleted) ? selectedUpdate.tasksCompleted.join(', ') : '',
                            issues: Array.isArray(selectedUpdate.issues) ? selectedUpdate.issues.join(', ') : ''
                          })
                        }
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveUpdate}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogHeader>

          {selectedUpdate && (
            <div className="space-y-6">
              {/* Project and Team Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Project</Label>
                  <p className="font-medium">{selectedUpdate.projectName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Team Member</Label>
                  {isEditing ? (
                    <select
                      className="w-full px-3 py-1 text-sm rounded-md border border-input bg-background mt-1"
                      value={editFormData.teamMemberId}
                      onChange={(e) => setEditFormData({ ...editFormData, teamMemberId: e.target.value })}
                    >
                      {teamMembers.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.full_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="font-medium">{selectedUpdate.teamMember}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date</Label>
                  <p className="font-medium">{format(selectedUpdate.date, 'MMMM d, yyyy')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Created By</Label>
                  <p className="font-medium">{selectedUpdate.createdBy}</p>
                </div>
              </div>

              {/* Title */}
              <div>
                <Label className="text-sm font-medium">Title</Label>
                {isEditing ? (
                  <Input
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 font-medium text-lg">{selectedUpdate.title}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <Label className="text-sm font-medium">Description</Label>
                {isEditing ? (
                  <Textarea
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    rows={4}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 whitespace-pre-wrap">{selectedUpdate.description}</p>
                )}
              </div>

              {/* Tasks Completed */}
              <div>
                <Label className="text-sm font-medium">Tasks Completed</Label>
                {isEditing ? (
                  <Input
                    value={editFormData.tasksCompleted}
                    onChange={(e) => setEditFormData({ ...editFormData, tasksCompleted: e.target.value })}
                    placeholder="Comma-separated tasks"
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-2 space-y-1">
                    {selectedUpdate.tasksCompleted?.length > 0 ? (
                      selectedUpdate.tasksCompleted.map((task, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span className="text-sm">{task}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No tasks recorded</p>
                    )}
                  </div>
                )}
              </div>

              {/* Issues */}
              {(selectedUpdate.issues?.length > 0 || isEditing) && (
                <div>
                  <Label className="text-sm font-medium">Issues/Delays</Label>
                  {isEditing ? (
                    <Input
                      value={editFormData.issues}
                      onChange={(e) => setEditFormData({ ...editFormData, issues: e.target.value })}
                      placeholder="Comma-separated issues"
                      className="mt-1"
                    />
                  ) : (
                    <div className="mt-2 space-y-1">
                      {selectedUpdate.issues?.length > 0 ? (
                        selectedUpdate.issues.map((issue, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                            <span className="text-sm">{issue}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No issues recorded</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Photos */}
              {selectedUpdate.photos?.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Progress Photos</Label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {selectedUpdate.photos.map((photo, index) => (
                      <div key={index} className="aspect-square rounded-lg overflow-hidden">
                        <img
                          src={photo}
                          alt={`Progress photo ${index + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                          onClick={() => window.open(photo, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weather Info */}
              {selectedUpdate.weather && (
                <div>
                  <Label className="text-sm font-medium">Weather Conditions</Label>
                  <div className="mt-2 flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{selectedUpdate.weather.temp}°</div>
                    <div>
                      <p className="font-medium capitalize">{selectedUpdate.weather.description}</p>
                      <p className="text-sm text-muted-foreground">
                        Humidity: {selectedUpdate.weather.humidity}% • Wind: {selectedUpdate.weather.windSpeed} mph
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}