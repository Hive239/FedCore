"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { 
  FolderKanban, 
  Calendar,
  Users, 
  UserCheck,
  Clock,
  AlertCircle,
  Activity,
  Plus,
  Filter,
  TrendingUp,
  BarChart3,
  PieChart,
  Brain,
  Zap,
  Target,
  MessageSquare,
  Shield,
  Database,
  Search,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Globe,
  Layers3,
  Cpu,
  Network
} from "lucide-react"
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

import { useAggregatedAnalytics } from '@/lib/hooks/use-nexus-analytics'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [stats, setStats] = useState<any>(null)
  const [recentProjects, setRecentProjects] = useState<any[]>([])
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [recentReports, setRecentReports] = useState<any[]>([])
  const [recentMessages, setRecentMessages] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  
  // Real analytics data
  const { data: nexusAnalytics, isLoading: analyticsLoading } = useAggregatedAnalytics(selectedProject)
  const [tenantId, setTenantId] = useState<string | null>(null)
  
  // Debug logging
  useEffect(() => {
    console.log('Dashboard - Analytics Loading:', analyticsLoading)
    console.log('Dashboard - Analytics Data:', nexusAnalytics)
    console.log('Dashboard - Selected Project:', selectedProject)
    if (nexusAnalytics) {
      console.log('✅ Nexus Analytics Data:', nexusAnalytics)
    } else {
      console.log('❌ No Nexus Analytics Data Available')
    }
  }, [nexusAnalytics, analyticsLoading, selectedProject])

  const fetchDashboardData = async () => {
    try {
      // Get current user and tenant
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      setUser(user)

      // Get user's tenant
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()
      
      if (!userTenant) return
      setTenantId(userTenant.tenant_id)

      // Fetch all data in parallel
      const [
        projectsData,
        eventsData,
        contactsData,
        usersData,
        activitiesData,
        notificationsData,
        reportsData,
        messagesData,
        tasksData
      ] = await Promise.all([
        // Projects
        supabase
          .from('projects')
          .select('*')
          .eq('tenant_id', userTenant.tenant_id)
          .order('updated_at', { ascending: false }),
        
        // Calendar Events - for scheduled events count
        supabase
          .from('calendar_events')
          .select('*')
          .eq('tenant_id', userTenant.tenant_id)
          .gte('start_time', new Date().toISOString()),
        
        // Contacts (using vendors table as that's where contacts are stored)
        supabase
          .from('vendors')
          .select('*')
          .eq('tenant_id', userTenant.tenant_id),
        
        // Users in organization
        supabase
          .from('user_tenants')
          .select('*, profiles(*)')
          .eq('tenant_id', userTenant.tenant_id),
        
        // Activity logs
        supabase
          .from('activity_logs')
          .select('*, profiles(full_name, email)')
          .eq('tenant_id', userTenant.tenant_id)
          .order('created_at', { ascending: false })
          .limit(10),
        
        // Notifications
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(5),
        
        // Update Logs (Reports)
        supabase
          .from('update_logs')
          .select('*, projects(name)')
          .eq('tenant_id', userTenant.tenant_id)
          .order('created_at', { ascending: false })
          .limit(5),
        
        // Messages
        supabase
          .from('messages')
          .select('*, profiles(full_name)')
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        
        // Tasks (for recent activity)
        supabase
          .from('tasks')
          .select('*, projects(name)')
          .eq('tenant_id', userTenant.tenant_id)
          .order('due_date', { ascending: true })
          .limit(5)
      ])

      // Calculate stats
      if (projectsData.data) {
        const projectStats = {
          total: projectsData.data.length,
          active: projectsData.data.filter(p => p.status !== 'completed').length,
        }

        const eventStats = eventsData.data ? {
          scheduled: eventsData.data.length,
          thisWeek: eventsData.data.filter(e => {
            const eventDate = new Date(e.start_time)
            const weekFromNow = new Date()
            weekFromNow.setDate(weekFromNow.getDate() + 7)
            return eventDate <= weekFromNow
          }).length
        } : { scheduled: 0, thisWeek: 0 }

        const contactStats = contactsData.data ? {
          total: contactsData.data.length + (usersData.data?.length || 0), // External + internal
          external: contactsData.data.length
        } : { total: 0, external: 0 }

        const userStats = usersData.data ? {
          total: usersData.data.length,
          active: usersData.data.filter(u => u.is_active !== false).length
        } : { total: 0, active: 0 }

        setStats({
          projects: projectStats,
          events: eventStats,
          contacts: contactStats,
          users: userStats
        })

        setRecentProjects(projectsData.data.slice(0, 5))
        setProjects(projectsData.data)
      }

      if (eventsData?.data) {
        setUpcomingEvents(eventsData.data.slice(0, 5))
      }
      
      if (tasksData?.data) {
        setUpcomingTasks(tasksData.data)
      }

      if (activitiesData.data) {
        setRecentActivities(activitiesData.data)
      }

      if (notificationsData.data) {
        setNotifications(notificationsData.data)
      }
      
      if (reportsData?.data) {
        setRecentReports(reportsData.data)
      }
      
      if (messagesData?.data) {
        setRecentMessages(messagesData.data)
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Search all organization files
  const handleSearch = async () => {
    if (!searchQuery.trim() || !tenantId) return
    
    setSearching(true)
    try {
      const results = []
      
      // Search projects
      const { data: projectResults } = await supabase
        .from('projects')
        .select('*')
        .eq('tenant_id', tenantId)
        .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .limit(5)
      
      if (projectResults) {
        results.push(...projectResults.map(p => ({
          ...p,
          type: 'project',
          icon: FolderKanban,
          link: `/projects/${p.id}`
        })))
      }
      
      // Search documents
      const { data: docResults } = await supabase
        .from('documents')
        .select('*')
        .eq('tenant_id', tenantId)
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .limit(5)
      
      if (docResults) {
        results.push(...docResults.map(d => ({
          ...d,
          type: 'document',
          icon: Database,
          link: `/documents/${d.id}`
        })))
      }
      
      // Search contacts (using vendors table)
      const { data: contactResults } = await supabase
        .from('vendors')
        .select('*')
        .eq('tenant_id', tenantId)
        .or(`name.ilike.%${searchQuery}%,contact_email.ilike.%${searchQuery}%`)
        .limit(5)
      
      if (contactResults) {
        results.push(...contactResults.map(c => ({
          ...c,
          type: 'contact',
          icon: Users,
          link: `/contacts/${c.id}`
        })))
      }
      
      setSearchResults(results)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setSearching(false)
    }
  }

  const dashboardStats = [
    {
      title: "Active Projects",
      value: stats ? stats.projects.active.toString() : "0",
      description: stats ? `${stats.projects.total} total projects` : "No projects yet",
      icon: FolderKanban,
      trend: { value: 12, up: true },
      gradient: "from-blue-600 to-cyan-500",
      link: "/projects"
    },
    {
      title: "Scheduled Events",
      value: stats ? stats.events.scheduled.toString() : "0",
      description: stats ? `${stats.events.thisWeek} this week` : "No events scheduled",
      icon: Calendar,
      trend: { value: 8, up: true },
      gradient: "from-purple-600 to-pink-500",
      link: "/calendar"
    },
    {
      title: "Contacts",
      value: stats ? stats.contacts.total.toString() : "0",
      description: stats ? `${stats.contacts.external} external contacts` : "No contacts yet",
      icon: UserCheck,
      trend: { value: 23, up: true },
      gradient: "from-green-600 to-emerald-500",
      link: "/contacts"
    },
    {
      title: "Users",
      value: stats ? stats.users.total.toString() : "0",
      description: stats ? `${stats.users.active} active members` : "No team members",
      icon: Users,
      trend: { value: 2, up: false },
      gradient: "from-orange-600 to-red-500",
      link: "/organization"
    }
  ]

  const formatTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20">
      {/* Dashboard Content without sticky header wrapper */}
      <div className="p-6">
        <div className="flex flex-col items-center gap-3 mb-6">
          {/* Centered Title */}
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          
          {/* Modern Search Bar with gradient border */}
          <div className="relative w-full max-w-2xl p-[2px] rounded-2xl bg-gradient-to-br from-white via-purple-200 to-purple-600">
            <div className="relative bg-white rounded-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search across all organization files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-12 pr-4 h-12 bg-white/50 backdrop-blur-sm border-0 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
              <Button
                onClick={handleSearch}
                disabled={searching}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl px-4 h-8"
              >
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-6">
            <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50">
              <CardHeader>
                <CardTitle className="text-sm">Search Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {searchResults.map((result, idx) => {
                    const Icon = result.icon
                    return (
                      <Link key={idx} href={result.link}>
                        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                          <Icon className="h-5 w-5 text-gray-600" />
                          <div>
                            <p className="font-medium">{result.name || result.title}</p>
                            <p className="text-sm text-gray-500">{result.type}</p>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="space-y-6">
        {/* Modern Stats Grid with Glass Effect */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <Skeleton className="h-12 w-12 rounded-2xl mb-4" />
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))
          ) : (
            dashboardStats.map((stat, idx) => {
              const Icon = stat.icon
              return (
                <Link href={stat.link} key={stat.title}>
                  <div className="group relative p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:from-purple-100 hover:to-purple-700 transition-all duration-300 hover:scale-[1.02]">
                    <Card className="relative overflow-hidden bg-white/95 backdrop-blur-sm border-0 rounded-xl hover:shadow-2xl transition-all duration-300">
                      <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity ${stat.gradient}`} />
                      <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={cn(
                          "p-3 rounded-2xl bg-gradient-to-br",
                          stat.gradient,
                          "shadow-lg"
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
                </Link>
              )
            })
          )}
        </div>

        {/* Modern Activity Feed with Smooth Scrolling */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Activity - 2/3 width with gradient border */}
          <div className="lg:col-span-2 rounded-xl bg-gradient-to-r from-white via-purple-200 to-purple-500 p-[1.5px]">
            <Card className="bg-white backdrop-blur-sm border-0 rounded-xl h-full">
            <CardHeader className="border-b border-gray-100 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle>Recent Activity</CardTitle>
                </div>
                <Link href="/updates" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                  View All →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[350px] overflow-y-auto smooth-scroll">
                <div className="divide-y divide-gray-100">
                  {(() => {
                    const allUpdates = [
                      ...upcomingEvents.map(event => ({
                        id: `event-${event.id}`,
                        type: 'event',
                        title: event.title,
                        description: `Scheduled for ${new Date(event.start_time).toLocaleString()}`,
                        icon: <Calendar className="h-4 w-4" />,
                        gradient: 'from-blue-500 to-cyan-500',
                        timestamp: event.start_time,
                        link: '/calendar'
                      })),
                      ...upcomingTasks.map(task => ({
                        id: `task-${task.id}`,
                        type: 'task',
                        title: task.title,
                        description: task.projects?.name || 'Task',
                        icon: <Layers3 className="h-4 w-4" />,
                        gradient: 'from-green-500 to-emerald-500',
                        timestamp: task.due_date || task.created_at,
                        link: '/tasks'
                      })),
                      ...recentReports.map(report => ({
                        id: `report-${report.id}`,
                        type: 'report',
                        title: report.title || 'Update Log',
                        description: report.projects?.name || 'Project Update',
                        icon: <BarChart3 className="h-4 w-4" />,
                        gradient: 'from-purple-500 to-pink-500',
                        timestamp: report.created_at,
                        link: '/updates'
                      }))
                    ]
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 8)
                    
                    if (allUpdates.length === 0) {
                      return (
                        <div className="p-12 text-center">
                          <Sparkles className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">No recent activity</p>
                        </div>
                      )
                    }
                    
                    return allUpdates.map((update) => (
                      <Link key={update.id} href={update.link}>
                        <div className="px-4 py-2.5 hover:bg-gray-50/50 transition-all group">
                          <div className="flex gap-3 items-start">
                            <div className={cn(
                              "p-1.5 rounded-lg bg-gradient-to-br shadow-sm group-hover:shadow-md transition-all",
                              update.gradient
                            )}>
                              <div className="text-white">{update.icon}</div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm truncate">{update.title}</p>
                              <p className="text-xs text-gray-600 truncate">{update.description}</p>
                              <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(update.timestamp)}</p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
          </div>

          {/* Nexus AI Insights - 1/3 width */}
          <Card className="bg-gradient-to-br from-slate-900 to-purple-900 text-white border-0">
            <CardHeader className="border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-6 w-6 text-purple-300" />
                  <CardTitle className="text-white">Nexus AI</CardTitle>
                  {/* Demo/Fallback indicator */}
                  {process.env.NODE_ENV === 'development' && (
                    nexusAnalytics?.productivityScore === 82 || 
                    nexusAnalytics?.productivityScore === 85 ||
                    analyticsLoading
                  ) && (
                    <span className="text-xs bg-blue-500/20 text-blue-200 px-2 py-1 rounded border border-blue-400/30">
                      {analyticsLoading ? 'Loading' : 'Demo'}
                    </span>
                  )}
                </div>
                <Cpu className="h-5 w-5 text-purple-400 animate-pulse" />
              </div>
              <CardDescription className="text-purple-200">ML-Powered Insights</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Performance Metric */}
                <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-purple-200">Performance</span>
                    <span className="text-2xl font-bold text-white">
                      {analyticsLoading ? '...' : `${nexusAnalytics?.productivityScore || 0}%`}
                    </span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-1000"
                      style={{ width: `${nexusAnalytics?.productivityScore || 0}%` }}
                    />
                  </div>
                </div>

                {/* AI Predictions */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-purple-200 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    AI Predictions
                  </h4>
                  <div className="space-y-2">
                    {/* Productivity Trend */}
                    <div className={`p-3 rounded-lg border ${
                      (nexusAnalytics?.productivityScore || 0) > 80 
                        ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-400/30' 
                        : 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400/30'
                    }`}>
                      <p className={`text-xs ${
                        (nexusAnalytics?.productivityScore || 0) > 80 ? 'text-green-200' : 'text-yellow-200'
                      }`}>
                        {(nexusAnalytics?.productivityScore || 0) > 80 
                          ? `↑ ${Math.round(((nexusAnalytics?.productivityScore || 0) - 70) / 70 * 100)}% productivity increase detected`
                          : `⚡ Productivity at ${nexusAnalytics?.productivityScore || 0}% - optimization needed`}
                      </p>
                    </div>
                    
                    {/* Conflicts Alert */}
                    <div className={`p-3 rounded-lg border ${
                      (nexusAnalytics?.conflictsDetected || 0) > 0
                        ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400/30'
                        : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-400/30'
                    }`}>
                      <p className={`text-xs ${
                        (nexusAnalytics?.conflictsDetected || 0) > 0 ? 'text-yellow-200' : 'text-blue-200'
                      }`}>
                        {(nexusAnalytics?.conflictsDetected || 0) > 0 
                          ? `⚡ ${nexusAnalytics?.conflictsDetected} scheduling conflicts detected`
                          : '✓ No scheduling conflicts detected'}
                      </p>
                    </div>
                    
                    {/* Resource Utilization */}
                    <div className={`p-3 rounded-lg border ${
                      (nexusAnalytics?.resourceUtilization || 0) > 70
                        ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-400/30'
                        : 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/30'
                    }`}>
                      <p className={`text-xs ${
                        (nexusAnalytics?.resourceUtilization || 0) > 70 ? 'text-blue-200' : 'text-purple-200'
                      }`}>
                        📊 Resource utilization: {nexusAnalytics?.resourceUtilization || 0}%
                        {(nexusAnalytics?.resourceUtilization || 0) > 85 ? ' (optimal)' : ' (room for improvement)'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Network Status */}
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Network className="h-4 w-4 text-green-400" />
                      <span className="text-xs text-green-300">System Online</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-xs text-gray-400">Live</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Grid - Modern Design with gradient border */}
        <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600">
        <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { icon: FolderKanban, label: "New Project", link: "/projects/new", color: "from-blue-500 to-cyan-500" },
                { icon: Calendar, label: "Schedule", link: "/calendar", color: "from-purple-500 to-pink-500" },
                { icon: UserCheck, label: "Add Contact", link: "/contacts", color: "from-green-500 to-emerald-500" },
                { icon: BarChart3, label: "Reports", link: "/reports", color: "from-orange-500 to-red-500" },
                { icon: MessageSquare, label: "Messages", link: "/messages", color: "from-indigo-500 to-purple-500" },
                { icon: Shield, label: "Security", link: "/security", color: "from-slate-600 to-gray-800" }
              ].map((action, idx) => {
                const Icon = action.icon
                return (
                  <Link key={idx} href={action.link}>
                    <div className="p-[2px] rounded-2xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:from-purple-100 hover:to-purple-700 transition-all duration-300">
                      <div className="group relative p-4 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-lg transition-all duration-300">
                        <div className={cn(
                          "p-3 rounded-xl bg-gradient-to-br mb-3 mx-auto w-fit",
                          action.color,
                          "group-hover:scale-110 transition-transform"
                        )}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <p className="text-xs font-medium text-center text-gray-700">{action.label}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
      </div>

    </div>
  )
}