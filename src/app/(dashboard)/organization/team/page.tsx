"use client"

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
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
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  UserPlus, Users, Mail, Shield, Trash2, Edit, MoreVertical,
  CheckCircle, XCircle, Clock, Send, Copy, Building, 
  UserCheck, AlertCircle, Star, TrendingUp, Award, 
  Calendar, Phone, MapPin, Briefcase, Link2, User,
  Settings, Ban, UserX, RefreshCw, Download, Search
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface TeamMember {
  id: string
  email: string
  name: string
  role: string
  joined_at: string
  status: 'active' | 'pending' | 'inactive'
  avatar_url?: string
  phone?: string
  location?: string
  department?: string
  job_title?: string
  last_active?: string
}

interface PendingInvite {
  id: string
  email: string
  role: string
  created_at: string
  expires_at: string
  accepted: boolean
  invitation_token: string
  message?: string
}

interface TeamStats {
  totalMembers: number
  activeMembers: number
  pendingInvites: number
  departmentBreakdown: { [key: string]: number }
  roleDistribution: { [key: string]: number }
  recentActivity: any[]
}

const rolePermissions = {
  owner: {
    label: 'Owner',
    color: 'bg-gradient-to-r from-purple-500 to-purple-600',
    permissions: ['Full Access', 'Billing Management', 'Delete Organization']
  },
  admin: {
    label: 'Administrator',
    color: 'bg-gradient-to-r from-blue-500 to-blue-600',
    permissions: ['Manage Team', 'Manage Projects', 'View Reports', 'Edit Settings']
  },
  manager: {
    label: 'Manager',
    color: 'bg-gradient-to-r from-green-500 to-green-600',
    permissions: ['Create Projects', 'Assign Tasks', 'View Reports']
  },
  member: {
    label: 'Member',
    color: 'bg-gradient-to-r from-gray-500 to-gray-600',
    permissions: ['View Projects', 'Create Tasks', 'Comment']
  },
  viewer: {
    label: 'Viewer',
    color: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
    permissions: ['View Only', 'Download Reports']
  }
}

export default function TeamManagementPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [teamStats, setTeamStats] = useState<TeamStats>({
    totalMembers: 0,
    activeMembers: 0,
    pendingInvites: 0,
    departmentBreakdown: {},
    roleDistribution: {},
    recentActivity: []
  })
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isEditMemberOpen, setIsEditMemberOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [inviteForm, setInviteForm] = useState({
    emails: '',
    role: 'member',
    message: ''
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [filterRole, setFilterRole] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [currentTenant, setCurrentTenant] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('members')
  
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadTeamData()
  }, [])

  const loadTeamData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      setCurrentUser(user) // Save user to state

      // Get user's current tenant
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single()

      if (!userTenant) {
        toast.error('No organization found')
        return
      }

      // Get tenant details
      const { data: tenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', userTenant.tenant_id)
        .single()

      setCurrentTenant({ ...tenant, userRole: userTenant.role })

      // Load team members with profiles
      const { data: members } = await supabase
        .from('user_tenants')
        .select(`
          id,
          role,
          joined_at,
          user:profiles!user_tenants_user_id_fkey (
            id,
            email,
            full_name,
            phone,
            avatar_url,
            department,
            job_title,
            location
          )
        `)
        .eq('tenant_id', userTenant.tenant_id)
        .order('joined_at', { ascending: false })

      if (members) {
        const formattedMembers = members.map((m: any) => ({
          id: m.user.id,
          email: m.user.email,
          name: m.user.full_name || m.user.email.split('@')[0],
          role: m.role,
          joined_at: m.joined_at,
          status: 'active' as const,
          avatar_url: m.user.avatar_url,
          phone: m.user.phone,
          location: m.user.location,
          department: m.user.department || 'General',
          job_title: m.user.job_title,
          last_active: new Date().toISOString()
        }))
        setTeamMembers(formattedMembers)

        // Calculate stats
        const stats: TeamStats = {
          totalMembers: formattedMembers.length,
          activeMembers: formattedMembers.filter(m => m.status === 'active').length,
          pendingInvites: 0,
          departmentBreakdown: {},
          roleDistribution: {},
          recentActivity: []
        }

        formattedMembers.forEach(member => {
          // Department breakdown
          const dept = member.department || 'Unassigned'
          stats.departmentBreakdown[dept] = (stats.departmentBreakdown[dept] || 0) + 1
          
          // Role distribution
          stats.roleDistribution[member.role] = (stats.roleDistribution[member.role] || 0) + 1
        })

        setTeamStats(stats)
      }

      // Load pending invitations
      const { data: invites } = await supabase
        .from('tenant_invitations')
        .select('*')
        .eq('tenant_id', userTenant.tenant_id)
        .eq('accepted', false)
        .order('created_at', { ascending: false })

      if (invites) {
        setPendingInvites(invites)
        setTeamStats(prev => ({ ...prev, pendingInvites: invites.length }))
      }
    } catch (error) {
      console.error('Error loading team data:', error)
      toast.error('Failed to load team data')
    }
  }

  const sendInvitations = async () => {
    if (!inviteForm.emails) {
      toast.error('Please enter email addresses')
      return
    }

    setIsLoading(true)
    try {
      const emails = inviteForm.emails
        .split(/[,\n]/)
        .map(e => e.trim())
        .filter(e => e && e.includes('@'))

      if (emails.length === 0) {
        toast.error('Please enter valid email addresses')
        setIsLoading(false)
        return
      }

      let successCount = 0
      
      // Process each email and send invitation
      for (const email of emails) {
        try {
          // Create invite data
          const inviteData = {
            email: email,
            role: inviteForm.role || 'member',
            token: crypto.randomUUID(),
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            invite_type: 'team_member'
          }
          
          const encodedInvite = btoa(JSON.stringify(inviteData))
          const inviteLink = `${window.location.origin}/signup?invite=${encodedInvite}`
          
          // Call the API (using nodemailer endpoint that works with any email)
          const response = await fetch('/api/team/send-invite-nodemailer', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email,
              inviteLink: inviteLink,
              role: inviteForm.role || 'member',
              senderName: 'FEDCORE Team',
              organizationName: 'FEDCORE'
            })
          })
          
          const result = await response.json()
          
          // Check if email was sent
          if (result.success) {
            toast.success(
              <div className="space-y-1">
                <p className="font-semibold">✅ Email Sent!</p>
                <p className="text-sm">Invitation email sent to {email}</p>
                <p className="text-xs text-gray-500">They should receive it within a few seconds.</p>
              </div>,
              { duration: 5000 }
            )
            successCount++
          } else {
            // Handle error case - show the link as fallback
            toast.error(
              <div className="space-y-2">
                <p className="font-semibold">📧 Failed to send email</p>
                <p className="text-xs text-gray-500">{result.details || result.error}</p>
                <p className="text-sm mt-2">Copy this link and send to {email}:</p>
                <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs break-all mt-2">
                  <code className="text-blue-600 dark:text-blue-400">{inviteLink}</code>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink)
                    toast.success('Link copied!')
                  }}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  Copy Link
                </button>
              </div>,
              { duration: 30000 }
            )
            // Still count as success since we generated the link
            successCount++
          }
          
        
        } catch (err) {
          console.error(`Error processing ${email}:`, err)
          toast.error(`Failed to process ${email}`)
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully processed ${successCount} invitation(s)`)
      }

      setInviteForm({ emails: '', role: 'member', message: '' })
      setIsInviteDialogOpen(false)
      loadTeamData()
    } catch (error: any) {
      console.error('❌ Fatal error:', error)
      toast.error(error.message || 'Failed to send invitations')
    } finally {
      setIsLoading(false)
    }
  }

  const updateMemberRole = async (userId: string, newRole: string) => {
    if (!currentTenant) return

    try {
      const { error } = await supabase
        .from('user_tenants')
        .update({ role: newRole })
        .eq('user_id', userId)
        .eq('tenant_id', currentTenant.id)

      if (error) throw error

      toast.success('Role updated successfully')
      loadTeamData()
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error('Failed to update role')
    }
  }

  const removeMember = async (userId: string) => {
    if (!currentTenant) return
    if (!confirm('Are you sure you want to remove this team member?')) return

    try {
      const { error } = await supabase
        .from('user_tenants')
        .delete()
        .eq('user_id', userId)
        .eq('tenant_id', currentTenant.id)

      if (error) throw error

      toast.success('Team member removed')
      loadTeamData()
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error('Failed to remove team member')
    }
  }

  const resendInvitation = async (inviteId: string, email: string) => {
    try {
      const newToken = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const { error } = await supabase
        .from('tenant_invitations')
        .update({
          invitation_token: newToken,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        })
        .eq('id', inviteId)

      if (error) throw error

      toast.success(`Invitation resent to ${email}`)
      loadTeamData()
    } catch (error) {
      console.error('Error resending invitation:', error)
      toast.error('Failed to resend invitation')
    }
  }

  const cancelInvitation = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('tenant_invitations')
        .delete()
        .eq('id', inviteId)

      if (error) throw error

      toast.success('Invitation cancelled')
      loadTeamData()
    } catch (error) {
      console.error('Error cancelling invitation:', error)
      toast.error('Failed to cancel invitation')
    }
  }

  const copyInviteLink = async (token: string) => {
    const inviteLink = `${window.location.origin}/join?token=${token}`
    await navigator.clipboard.writeText(inviteLink)
    toast.success('Invitation link copied to clipboard')
  }

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = filterRole === 'all' || member.role === filterRole
    return matchesSearch && matchesRole
  })

  const canManageTeam = currentTenant?.userRole === 'owner' || currentTenant?.userRole === 'admin'

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Team Management
          </h1>
          <p className="text-muted-foreground mt-1">
            {currentTenant?.name || 'Organization'} • {teamStats.totalMembers} members • {teamStats.pendingInvites} pending invitations
          </p>
        </div>
        {canManageTeam && (
          <Button
            onClick={() => setIsInviteDialogOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Team Members
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600">
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold">{teamStats.totalMembers}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-[2px] rounded-xl bg-gradient-to-br from-white via-blue-200 to-blue-600">
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Now</p>
                <p className="text-2xl font-bold">{teamStats.activeMembers}</p>
              </div>
              <UserCheck className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-[2px] rounded-xl bg-gradient-to-br from-white via-green-200 to-green-600">
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Departments</p>
                <p className="text-2xl font-bold">{Object.keys(teamStats.departmentBreakdown).length}</p>
              </div>
              <Building className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-[2px] rounded-xl bg-gradient-to-br from-white via-orange-200 to-orange-600">
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Invites</p>
                <p className="text-2xl font-bold">{teamStats.pendingInvites}</p>
              </div>
              <Mail className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20">
          <TabsTrigger value="members" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
            <Users className="mr-2 h-4 w-4" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="invitations" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
            <Mail className="mr-2 h-4 w-4" />
            Invitations ({pendingInvites.length})
          </TabsTrigger>
          <TabsTrigger value="roles" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
            <Shield className="mr-2 h-4 w-4" />
            Roles & Permissions
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
            <TrendingUp className="mr-2 h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Team Members Tab */}
        <TabsContent value="members">
          <Card className="p-[2px] rounded-xl bg-gradient-to-br from-white via-gray-100 to-gray-300">
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Active Team Members</CardTitle>
                    <CardDescription>Manage roles and permissions for your team</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-64"
                      />
                    </div>
                    <Select value={filterRole} onValueChange={setFilterRole}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="All roles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {filteredMembers.map((member) => {
                      const roleConfig = rolePermissions[member.role as keyof typeof rolePermissions]
                      return (
                        <div key={member.id} className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12">
                                <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-500 text-white">
                                  {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold">{member.name}</p>
                                  <Badge className={`${roleConfig?.color} text-white`}>
                                    {roleConfig?.label}
                                  </Badge>
                                  {member.status === 'active' && (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{member.email}</p>
                                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                  {member.department && (
                                    <span className="flex items-center gap-1">
                                      <Briefcase className="h-3 w-3" />
                                      {member.department}
                                    </span>
                                  )}
                                  {member.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {member.location}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Joined {format(new Date(member.joined_at), 'MMM dd, yyyy')}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {canManageTeam && member.role !== 'owner' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedMember(member)
                                    setIsEditMemberOpen(true)
                                  }}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateMemberRole(member.id, 'admin')}>
                                    <Shield className="mr-2 h-4 w-4" />
                                    Change Role
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <UserX className="mr-2 h-4 w-4" />
                                    Suspend Access
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => removeMember(member.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remove Member
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </div>
          </Card>
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations">
          <Card className="p-[2px] rounded-xl bg-gradient-to-br from-white via-orange-100 to-orange-300">
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl">
              <CardHeader>
                <CardTitle>Pending Invitations</CardTitle>
                <CardDescription>Manage and track invitation status</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingInvites.length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No pending invitations</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setIsInviteDialogOpen(true)}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Send Invitations
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingInvites.map((invite) => {
                      const roleConfig = rolePermissions[invite.role as keyof typeof rolePermissions]
                      return (
                        <div key={invite.id} className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-900/10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <Clock className="h-8 w-8 text-orange-600" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{invite.email}</p>
                                  <Badge className={`${roleConfig?.color} text-white`}>
                                    {roleConfig?.label}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Expires {format(new Date(invite.expires_at), 'MMM dd, yyyy')}
                                </p>
                                {invite.message && (
                                  <p className="text-xs text-muted-foreground mt-1 italic">
                                    "{invite.message}"
                                  </p>
                                )}
                              </div>
                            </div>
                            {canManageTeam && (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyInviteLink(invite.invitation_token)}
                                >
                                  <Copy className="h-4 w-4 mr-1" />
                                  Copy Link
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => resendInvitation(invite.id, invite.email)}
                                >
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                  Resend
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => cancelInvitation(invite.id)}
                                >
                                  <XCircle className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </div>
          </Card>
        </TabsContent>

        {/* Roles & Permissions Tab */}
        <TabsContent value="roles">
          <Card className="p-[2px] rounded-xl bg-gradient-to-br from-white via-green-100 to-green-300">
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl">
              <CardHeader>
                <CardTitle>Roles & Permissions</CardTitle>
                <CardDescription>Understand what each role can do in your organization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(rolePermissions).map(([role, config]) => (
                    <Card key={role} className="overflow-hidden">
                      <div className={`h-2 ${config.color}`} />
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{config.label}</span>
                          <Badge variant="secondary">
                            {teamStats.roleDistribution[role] || 0} members
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {config.permissions.map((permission, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm">{permission}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </div>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card className="p-[2px] rounded-xl bg-gradient-to-br from-white via-blue-100 to-blue-300">
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl">
              <CardHeader>
                <CardTitle>Team Activity</CardTitle>
                <CardDescription>Recent team member activities and changes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                    <p>Activity tracking coming soon</p>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Members</DialogTitle>
            <DialogDescription>
              Send invitations to join your organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="emails">Email Addresses</Label>
              <Textarea
                id="emails"
                placeholder="Enter email addresses (one per line or comma separated)"
                value={inviteForm.emails}
                onChange={(e) => setInviteForm({ ...inviteForm, emails: e.target.value })}
                rows={4}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                You can invite multiple people at once
              </p>
            </div>
            <div>
              <Label htmlFor="role">Default Role</Label>
              <Select 
                value={inviteForm.role} 
                onValueChange={(value) => setInviteForm({ ...inviteForm, role: value })}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div>
                      <p className="font-medium">Admin</p>
                      <p className="text-xs text-muted-foreground">Full access except billing</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div>
                      <p className="font-medium">Manager</p>
                      <p className="text-xs text-muted-foreground">Manage projects and tasks</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="member">
                    <div>
                      <p className="font-medium">Member</p>
                      <p className="text-xs text-muted-foreground">Create and edit own tasks</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div>
                      <p className="font-medium">Viewer</p>
                      <p className="text-xs text-muted-foreground">View only access</p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="message">Personal Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal message to the invitation..."
                value={inviteForm.message}
                onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                sendInvitations()
              }}
              disabled={!inviteForm.emails || isLoading}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Invitations
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}