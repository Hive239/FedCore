"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { MoreVertical, Shield, User, Eye, UserX, Mail, Building, Plus, UserPlus, MessageSquare, AlertTriangle, Activity, TrendingUp, ShieldAlert, Zap, Users, Settings, CreditCard, CheckCircle, XCircle, Clock, Sparkles } from 'lucide-react'
import { InviteTeamMember } from '@/components/team/invite-team-member'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'

interface TeamMember {
  user_id: string
  role: string
  created_at: string
  profile?: {
    email: string
    full_name: string
    avatar_url?: string
  }
}

interface Tenant {
  id: string
  name: string
  slug: string
  subscription_tier: string
  max_users: number
}

const roleConfig = {
  owner: { label: 'Owner', color: 'bg-gradient-to-r from-purple-500 to-purple-600', icon: Shield },
  admin: { label: 'Admin', color: 'bg-gradient-to-r from-blue-500 to-blue-600', icon: Shield },
  manager: { label: 'Manager', color: 'bg-gradient-to-r from-green-500 to-green-600', icon: User },
  member: { label: 'Member', color: 'bg-gradient-to-r from-gray-500 to-gray-600', icon: User },
  viewer: { label: 'Viewer', color: 'bg-gradient-to-r from-yellow-500 to-yellow-600', icon: Eye },
  guest: { label: 'Guest', color: 'bg-gradient-to-r from-orange-500 to-orange-600', icon: UserX },
}

export default function OrganizationPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()

  const loadTeamData = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      setCurrentUserId(user.id)

      // Get user's tenant and role
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .single()

      if (!userTenant) {
        toast({
          title: 'Error',
          description: 'No organization found',
          variant: 'destructive',
        })
        return
      }

      setCurrentUserRole(userTenant.role)

      // Get tenant details
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', userTenant.tenant_id)
        .single()

      if (tenantData) {
        setTenant(tenantData)
      }

      // Get all team members
      const { data: members } = await supabase
        .from('user_tenants')
        .select(`
          user_id,
          role,
          created_at,
          profiles!user_tenants_user_id_fkey (
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('tenant_id', userTenant.tenant_id)
        .order('created_at', { ascending: true })

      if (members) {
        setTeamMembers(members.map(m => ({
          ...m,
          profile: m.profiles as any
        })))
      }
      
      // Load security alerts
      const { data: alerts } = await supabase
        .from('security_alerts')
        .select('*')
        .eq('tenant_id', userTenant.tenant_id)
        .eq('acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (alerts) {
        setSecurityAlerts(alerts)
      }
      
      // Load performance metrics (from error_logs and performance_metrics tables)
      const { data: errorLogs } = await supabase
        .from('error_logs')
        .select('id')
        .eq('tenant_id', userTenant.tenant_id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      
      const { data: perfMetrics } = await supabase
        .from('performance_metrics')
        .select('metrics')
        .eq('tenant_id', userTenant.tenant_id)
        .order('created_at', { ascending: false })
        .limit(100)
      
      // Calculate average response time from metrics
      let avgResponseTime = 145
      let errorRate = 0.02
      
      if (perfMetrics && perfMetrics.length > 0) {
        const responseTimes = perfMetrics
          .map(p => p.metrics?.responseTime)
          .filter(Boolean)
        if (responseTimes.length > 0) {
          avgResponseTime = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        }
      }
      
      if (errorLogs) {
        errorRate = Math.round((errorLogs.length / 10000) * 100 * 100) / 100
      }
      
      setPerformanceMetrics({
        avgResponseTime,
        uptime: 99.9,
        errorRate
      })
      
    } catch (error) {
      console.error('Error loading team data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load organization data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const updateMemberRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('user_tenants')
        .update({ role: newRole })
        .eq('user_id', userId)
        .eq('tenant_id', tenant?.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Member role updated successfully',
      })

      // Reload data
      loadTeamData()
    } catch (error) {
      console.error('Error updating role:', error)
      toast({
        title: 'Error',
        description: 'Failed to update member role',
        variant: 'destructive',
      })
    }
  }

  const removeMember = async (userId: string) => {
    if (confirm('Are you sure you want to remove this member?')) {
      try {
        const { error } = await supabase
          .from('user_tenants')
          .delete()
          .eq('user_id', userId)
          .eq('tenant_id', tenant?.id)

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Member removed successfully',
        })

        // Reload data
        loadTeamData()
      } catch (error) {
        console.error('Error removing member:', error)
        toast({
          title: 'Error',
          description: 'Failed to remove member',
          variant: 'destructive',
        })
      }
    }
  }

  useEffect(() => {
    loadTeamData()
  }, [])

  const canManageTeam = currentUserRole === 'owner' || currentUserRole === 'admin'

  const getPlanColor = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 'from-purple-600 to-pink-600'
      case 'pro': return 'from-blue-600 to-cyan-600'
      case 'starter': return 'from-green-600 to-emerald-600'
      default: return 'from-gray-600 to-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
          Organization Settings
        </h1>
        <p className="text-gray-600 text-lg">
          Manage your organization settings and team members
        </p>
      </div>

      {/* Organization Info */}
      {tenant && (
        <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
          <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
                    <Building className="h-8 w-8 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{tenant.name}</CardTitle>
                    <CardDescription className="text-base">
                      {teamMembers.length} of {tenant.max_users} team members
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`p-[2px] rounded-xl bg-gradient-to-r ${getPlanColor(tenant.subscription_tier)}`}>
                    <Badge className="bg-white text-gray-800 border-0 rounded-xl px-4 py-2 text-sm font-semibold">
                      <Sparkles className="h-4 w-4 mr-2" />
                      {tenant.subscription_tier === 'pro' ? 'Pro' : 
                       tenant.subscription_tier === 'enterprise' ? 'Enterprise' : 
                       tenant.subscription_tier === 'starter' ? 'Starter' : 'Free'} Plan
                    </Badge>
                  </div>
                  <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-blue-200 to-blue-600 hover:shadow-xl transition-all duration-300">
                    <Button 
                      variant="outline"
                      onClick={() => router.push('/organization/billing')}
                      className="bg-white/90 backdrop-blur-sm border-0 text-blue-700 hover:bg-blue-50 font-semibold rounded-xl"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Upgrade Plan
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-[1px] rounded-lg bg-gradient-to-br from-white via-green-100 to-green-300">
                  <div className="p-4 bg-white/90 backdrop-blur-sm rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Uptime</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-green-700">{performanceMetrics?.uptime || 99.9}%</p>
                    <Progress value={performanceMetrics?.uptime || 99.9} className="h-2 mt-2" />
                  </div>
                </div>
                <div className="p-[1px] rounded-lg bg-gradient-to-br from-white via-blue-100 to-blue-300">
                  <div className="p-4 bg-white/90 backdrop-blur-sm rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Response Time</span>
                      <Zap className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{performanceMetrics?.avgResponseTime || 145}ms</p>
                    <Progress value={Math.max(0, 100 - (performanceMetrics?.avgResponseTime || 145) / 5)} className="h-2 mt-2" />
                  </div>
                </div>
                <div className="p-[1px] rounded-lg bg-gradient-to-br from-white via-orange-100 to-orange-300">
                  <div className="p-4 bg-white/90 backdrop-blur-sm rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Error Rate</span>
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                    </div>
                    <p className="text-2xl font-bold text-orange-700">{performanceMetrics?.errorRate || 0.02}%</p>
                    <Progress value={100 - (performanceMetrics?.errorRate || 0.02) * 50} className="h-2 mt-2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Members Card */}
      <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
        <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-6 w-6 text-purple-600" />
                  Team Members
                </CardTitle>
                <CardDescription>
                  View and manage your organization's team members
                </CardDescription>
              </div>
              {canManageTeam && (
                <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-xl transition-all duration-300">
                  <Button 
                    onClick={() => setShowInviteDialog(true)}
                    variant="outline"
                    className="bg-white/90 backdrop-blur-sm border-0 text-purple-700 hover:bg-purple-50 font-semibold rounded-xl"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite Member
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-3 animate-spin" />
                Loading team members...
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-muted-foreground mb-4">
                  No team members yet. Invite your first team member to get started.
                </p>
                {canManageTeam && (
                  <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-xl transition-all duration-300 inline-block">
                    <Button 
                      onClick={() => setShowInviteDialog(true)}
                      variant="outline"
                      className="bg-white/90 backdrop-blur-sm border-0 text-purple-700 hover:bg-purple-50 font-semibold rounded-xl"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Invite Member
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200">
                      <TableHead className="font-semibold">Member</TableHead>
                      <TableHead className="font-semibold">Email</TableHead>
                      <TableHead className="font-semibold">Role</TableHead>
                      <TableHead className="font-semibold">Joined</TableHead>
                      {canManageTeam && <TableHead></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map((member) => {
                      const config = roleConfig[member.role as keyof typeof roleConfig] || roleConfig.member
                      const isCurrentUser = member.user_id === currentUserId
                      
                      return (
                        <TableRow key={member.user_id} className="hover:bg-gray-50 transition-colors">
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="p-[1px] rounded-full bg-gradient-to-br from-purple-400 to-pink-400">
                                <Avatar className="border-2 border-white">
                                  <AvatarImage src={member.profile?.avatar_url} />
                                  <AvatarFallback className="bg-gradient-to-br from-purple-100 to-pink-100 text-purple-700 font-semibold">
                                    {member.profile?.full_name?.charAt(0) || 
                                     member.profile?.email?.charAt(0) || '?'}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              <div>
                                <div className="font-medium">
                                  {member.profile?.full_name || 'Unknown'}
                                  {isCurrentUser && (
                                    <Badge className="ml-2 bg-purple-100 text-purple-700 border-purple-200 text-xs">
                                      You
                                    </Badge>
                                  )}
                                </div>
                                {!isCurrentUser && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      router.push(`/messages?userId=${member.user_id}`)
                                    }}
                                    className="text-xs text-purple-700 hover:text-purple-800 flex items-center gap-1 mt-1 font-medium"
                                  >
                                    <MessageSquare className="h-3 w-3" />
                                    Send Message
                                  </button>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span>{member.profile?.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${config.color} text-white border-0 shadow-sm`}>
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(member.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          {canManageTeam && (
                            <TableCell>
                              {!isCurrentUser && member.role !== 'owner' && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="hover:bg-purple-50">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm">
                                    <DropdownMenuItem
                                      onClick={() => updateMemberRole(member.user_id, 'admin')}
                                      className="hover:bg-purple-50"
                                    >
                                      <Shield className="h-4 w-4 mr-2 text-blue-600" />
                                      Make Admin
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => updateMemberRole(member.user_id, 'manager')}
                                      className="hover:bg-green-50"
                                    >
                                      <User className="h-4 w-4 mr-2 text-green-600" />
                                      Make Manager
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => updateMemberRole(member.user_id, 'member')}
                                      className="hover:bg-gray-50"
                                    >
                                      <User className="h-4 w-4 mr-2 text-gray-600" />
                                      Make Member
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => updateMemberRole(member.user_id, 'viewer')}
                                      className="hover:bg-yellow-50"
                                    >
                                      <Eye className="h-4 w-4 mr-2 text-yellow-600" />
                                      Make Viewer
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600 hover:bg-red-50"
                                      onClick={() => removeMember(member.user_id)}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Remove from Team
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Security Notifications */}
      <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-orange-200 to-orange-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
        <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-orange-500" />
                  Security Notifications
                </CardTitle>
                <CardDescription>
                  Recent security alerts and notifications for your organization
                </CardDescription>
              </div>
              <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                {securityAlerts.length} Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {securityAlerts.length > 0 ? (
              <div className="space-y-3">
                {securityAlerts.map((alert) => (
                  <div key={alert.id} className="p-[1px] rounded-lg bg-gradient-to-br from-white via-orange-100 to-orange-300 hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between p-3 bg-white/90 backdrop-blur-sm rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">{alert.title}</p>
                          <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge className={
                        alert.severity === 'critical' ? 'bg-red-100 text-red-800 border-red-200' :
                        alert.severity === 'high' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                        alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        'bg-blue-100 text-blue-800 border-blue-200'
                      }>
                        {alert.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-muted-foreground">
                  No security alerts at this time
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Your organization's security status is healthy
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <Button
            variant="outline"
            className="w-full h-full bg-white/90 backdrop-blur-sm border-0 rounded-xl py-6 hover:bg-purple-50"
            onClick={() => router.push('/organization/settings')}
          >
            <div className="flex flex-col items-center">
              <Settings className="h-8 w-8 mb-2 text-purple-600" />
              <span className="font-semibold">Organization Settings</span>
              <span className="text-xs text-gray-600 mt-1">Configure organization preferences</span>
            </div>
          </Button>
        </div>

        <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-blue-200 to-blue-600 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <Button
            variant="outline"
            className="w-full h-full bg-white/90 backdrop-blur-sm border-0 rounded-xl py-6 hover:bg-blue-50"
            onClick={() => router.push('/organization/billing')}
          >
            <div className="flex flex-col items-center">
              <CreditCard className="h-8 w-8 mb-2 text-blue-600" />
              <span className="font-semibold">Billing & Subscription</span>
              <span className="text-xs text-gray-600 mt-1">Manage billing and upgrade plan</span>
            </div>
          </Button>
        </div>

        <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-green-200 to-green-600 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <Button
            variant="outline"
            className="w-full h-full bg-white/90 backdrop-blur-sm border-0 rounded-xl py-6 hover:bg-green-50"
            onClick={() => router.push('/security')}
          >
            <div className="flex flex-col items-center">
              <Shield className="h-8 w-8 mb-2 text-green-600" />
              <span className="font-semibold">Security Center</span>
              <span className="text-xs text-gray-600 mt-1">View security status and alerts</span>
            </div>
          </Button>
        </div>
      </div>

      {/* Invite Team Member Dialog */}
      {showInviteDialog && (
        <InviteTeamMember
          tenantId={tenant?.id}
          onInviteSent={() => {
            setShowInviteDialog(false)
            loadTeamData()
          }}
        />
      )}
    </div>
  )
}