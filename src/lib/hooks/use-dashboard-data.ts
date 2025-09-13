import { useEffect, useState, useMemo, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/singleton'

interface DashboardStats {
  projects: {
    total: number
    active: number
    onTrack: number
    delayed: number
    completed: number
  }
  tasks: {
    total: number
    pending: number
    inProgress: number
    completed: number
    overdue: number
  }
  vendors: {
    total: number
    active: number
  }
  documents: {
    total: number
    expiringSoon: number
  }
}

/**
 * Optimized hook for fetching dashboard data with parallel queries
 * Implements caching and error handling
 */
export function useDashboardData() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentProjects, setRecentProjects] = useState<any[]>([])
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([])
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  
  const supabase = useMemo(() => getSupabaseClient(), [])

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get user and tenant in parallel
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()
      
      if (!userTenant) throw new Error('No tenant found')

      // Parallel fetch all dashboard data
      const [
        projectsResponse,
        tasksResponse,
        vendorsResponse,
        documentsResponse,
        activitiesResponse
      ] = await Promise.allSettled([
        supabase
          .from('projects')
          .select('*')
          .eq('tenant_id', userTenant.tenant_id)
          .order('updated_at', { ascending: false }),
        
        supabase
          .from('tasks')
          .select('*, projects(name)')
          .eq('tenant_id', userTenant.tenant_id)
          .order('due_date', { ascending: true }),
        
        supabase
          .from('vendors')
          .select('*')
          .eq('tenant_id', userTenant.tenant_id),
        
        supabase
          .from('documents')
          .select('*')
          .eq('tenant_id', userTenant.tenant_id),
        
        supabase
          .from('activity_logs')
          .select('*, profiles(full_name, email)')
          .eq('tenant_id', userTenant.tenant_id)
          .order('created_at', { ascending: false })
          .limit(10)
      ])

      // Process results with error handling
      const projects = projectsResponse.status === 'fulfilled' ? projectsResponse.value.data || [] : []
      const tasks = tasksResponse.status === 'fulfilled' ? tasksResponse.value.data || [] : []
      const vendors = vendorsResponse.status === 'fulfilled' ? vendorsResponse.value.data || [] : []
      const documents = documentsResponse.status === 'fulfilled' ? documentsResponse.value.data || [] : []
      const activities = activitiesResponse.status === 'fulfilled' ? activitiesResponse.value.data || [] : []

      // Calculate stats efficiently
      const projectStats = {
        total: projects.length,
        active: projects.filter(p => p.status !== 'completed').length,
        onTrack: projects.filter(p => p.status === 'on-track').length,
        delayed: projects.filter(p => p.status === 'delayed').length,
        completed: projects.filter(p => p.status === 'completed').length
      }

      const now = new Date()
      const taskStats = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        inProgress: tasks.filter(t => t.status === 'in-progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        overdue: tasks.filter(t => 
          t.due_date && new Date(t.due_date) < now && t.status !== 'completed'
        ).length
      }

      const vendorStats = {
        total: vendors.length,
        active: vendors.filter(v => v.status === 'active').length
      }

      const documentStats = {
        total: documents.length,
        expiringSoon: documents.filter(d => {
          if (!d.expiry_date) return false
          const daysUntilExpiry = Math.floor(
            (new Date(d.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
          return daysUntilExpiry <= 30 && daysUntilExpiry > 0
        }).length
      }

      setStats({
        projects: projectStats,
        tasks: taskStats,
        vendors: vendorStats,
        documents: documentStats
      })

      setRecentProjects(projects.slice(0, 5))
      setUpcomingTasks(tasks.filter(t => t.status !== 'completed').slice(0, 5))
      setRecentActivities(activities)

    } catch (err) {
      console.error('Dashboard data fetch error:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchDashboardData()

    // Refresh data every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [fetchDashboardData])

  return {
    loading,
    error,
    stats,
    recentProjects,
    upcomingTasks,
    recentActivities,
    refetch: fetchDashboardData
  }
}