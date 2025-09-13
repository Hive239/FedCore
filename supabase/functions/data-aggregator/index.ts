import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Data Aggregator Edge Function
 * Aggregates metrics at edge for performance with 50,000 users
 * Reduces database load by pre-computing common queries
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
}

interface AggregationRequest {
  tenant_id: string
  metric_type: 'dashboard' | 'project_stats' | 'user_activity' | 'resource_usage' | 'team_productivity'
  time_range?: 'day' | 'week' | 'month' | 'quarter' | 'year'
  project_id?: string
  user_id?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const request: AggregationRequest = await req.json()
    const { tenant_id, metric_type, time_range = 'month', project_id, user_id } = request

    // Check cache first
    const cacheKey = `aggregate:${tenant_id}:${metric_type}:${time_range}:${project_id || 'all'}:${user_id || 'all'}`
    const { data: cached } = await supabase
      .from('performance_cache')
      .select('cache_value, expires_at')
      .eq('cache_key', cacheKey)
      .single()

    if (cached && new Date(cached.expires_at) > new Date()) {
      // Update hit count
      await supabase
        .from('performance_cache')
        .update({ 
          hit_count: supabase.rpc('increment', { x: 1 }),
          last_accessed: new Date().toISOString()
        })
        .eq('cache_key', cacheKey)

      return new Response(
        JSON.stringify({
          data: cached.cache_value,
          cached: true,
          cache_key: cacheKey
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
      )
    }

    let aggregatedData: any = {}

    switch (metric_type) {
      case 'dashboard': {
        // Dashboard metrics aggregation
        const timeFilter = getTimeFilter(time_range)
        
        // Projects summary
        const { data: projects } = await supabase
          .from('projects')
          .select('status', { count: 'exact' })
          .eq('tenant_id', tenant_id)
          .gte('created_at', timeFilter)

        // Tasks summary
        const { data: tasks } = await supabase
          .from('tasks')
          .select('status, priority', { count: 'exact' })
          .eq('tenant_id', tenant_id)
          .gte('created_at', timeFilter)

        // Team activity
        const { data: teamActivity } = await supabase
          .from('user_tenants')
          .select('user_id, last_active')
          .eq('tenant_id', tenant_id)
          .gte('last_active', getTimeFilter('week'))

        // Recent activities
        const { data: activities } = await supabase
          .from('activity_logs')
          .select('action, created_at, user_id')
          .eq('tenant_id', tenant_id)
          .order('created_at', { ascending: false })
          .limit(100)

        aggregatedData = {
          projects: {
            total: projects?.length || 0,
            by_status: groupBy(projects || [], 'status'),
          },
          tasks: {
            total: tasks?.length || 0,
            by_status: groupBy(tasks || [], 'status'),
            by_priority: groupBy(tasks || [], 'priority'),
          },
          team: {
            total_members: teamActivity?.length || 0,
            active_this_week: teamActivity?.filter(u => new Date(u.last_active) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length || 0,
          },
          recent_activities: activities?.slice(0, 10) || [],
        }
        break
      }

      case 'project_stats': {
        if (!project_id) {
          throw new Error('project_id required for project_stats')
        }

        // Project-specific metrics
        const { data: project } = await supabase
          .from('projects')
          .select('*')
          .eq('id', project_id)
          .eq('tenant_id', tenant_id)
          .single()

        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', project_id)

        const { data: teamMembers } = await supabase
          .from('project_teams')
          .select('user_id, role')
          .eq('project_id', project_id)

        const completionRate = tasks 
          ? (tasks.filter(t => t.status === 'completed').length / tasks.length) * 100 
          : 0

        aggregatedData = {
          project: project,
          metrics: {
            total_tasks: tasks?.length || 0,
            completed_tasks: tasks?.filter(t => t.status === 'completed').length || 0,
            pending_tasks: tasks?.filter(t => t.status === 'pending').length || 0,
            in_progress_tasks: tasks?.filter(t => t.status === 'in_progress').length || 0,
            completion_rate: Math.round(completionRate),
            team_size: teamMembers?.length || 0,
          },
          tasks_by_priority: groupBy(tasks || [], 'priority'),
          tasks_by_assignee: groupBy(tasks || [], 'assigned_to'),
        }
        break
      }

      case 'user_activity': {
        const userFilter = user_id ? { user_id } : {}
        
        // User activity metrics
        const { data: activities } = await supabase
          .from('activity_logs')
          .select('user_id, action, created_at')
          .eq('tenant_id', tenant_id)
          .match(userFilter)
          .gte('created_at', getTimeFilter(time_range))
          .order('created_at', { ascending: false })

        const { data: tasks } = await supabase
          .from('tasks')
          .select('assigned_to, status, completed_at')
          .eq('tenant_id', tenant_id)
          .match(user_id ? { assigned_to: user_id } : {})
          .gte('created_at', getTimeFilter(time_range))

        aggregatedData = {
          total_activities: activities?.length || 0,
          activities_by_user: groupBy(activities || [], 'user_id'),
          activities_by_action: groupBy(activities || [], 'action'),
          tasks_completed: tasks?.filter(t => t.status === 'completed').length || 0,
          avg_tasks_per_user: tasks && activities 
            ? (tasks.length / new Set(activities.map(a => a.user_id)).size).toFixed(2)
            : 0,
          activity_timeline: groupByDate(activities || [], 'created_at'),
        }
        break
      }

      case 'resource_usage': {
        // Resource usage metrics
        const { data: usage } = await supabase
          .from('resource_usage')
          .select('*')
          .eq('tenant_id', tenant_id)
          .gte('period_start', getTimeFilter(time_range))

        const { data: tenant } = await supabase
          .from('tenants')
          .select('max_users, max_projects, max_storage_gb, max_api_calls_per_month')
          .eq('id', tenant_id)
          .single()

        const storageUsed = usage?.filter(u => u.resource_type === 'storage')
          .reduce((sum, u) => sum + Number(u.usage_value), 0) || 0

        const apiCalls = usage?.filter(u => u.resource_type === 'api_calls')
          .reduce((sum, u) => sum + Number(u.usage_value), 0) || 0

        aggregatedData = {
          storage: {
            used_gb: storageUsed,
            limit_gb: tenant?.max_storage_gb || 0,
            percentage: tenant?.max_storage_gb 
              ? Math.round((storageUsed / tenant.max_storage_gb) * 100)
              : 0,
          },
          api_calls: {
            used: apiCalls,
            limit: tenant?.max_api_calls_per_month || 0,
            percentage: tenant?.max_api_calls_per_month
              ? Math.round((apiCalls / tenant.max_api_calls_per_month) * 100)
              : 0,
          },
          trends: {
            storage_by_day: groupByDate(usage?.filter(u => u.resource_type === 'storage') || [], 'period_start'),
            api_calls_by_day: groupByDate(usage?.filter(u => u.resource_type === 'api_calls') || [], 'period_start'),
          }
        }
        break
      }

      case 'team_productivity': {
        // Team productivity metrics
        const { data: productivity } = await supabase
          .from('productivity_metrics')
          .select('*')
          .eq('tenant_id', tenant_id)
          .gte('date_calculated', getTimeFilter(time_range))

        const avgProductivity = productivity
          ? productivity.reduce((sum, p) => sum + (p.productivity_score || 0), 0) / productivity.length
          : 0

        aggregatedData = {
          average_productivity: Math.round(avgProductivity * 100),
          by_user: groupBy(productivity || [], 'user_id'),
          by_project: groupBy(productivity || [], 'project_id'),
          trends: groupByDate(productivity || [], 'date_calculated'),
          top_performers: productivity
            ?.sort((a, b) => (b.productivity_score || 0) - (a.productivity_score || 0))
            .slice(0, 5) || [],
        }
        break
      }

      default:
        throw new Error(`Unknown metric type: ${metric_type}`)
    }

    // Cache the aggregated data
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes cache
    await supabase
      .from('performance_cache')
      .upsert({
        cache_key: cacheKey,
        cache_value: aggregatedData,
        cache_type: 'aggregate',
        tenant_id: tenant_id,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        hit_count: 0,
        last_accessed: new Date().toISOString(),
      })

    return new Response(
      JSON.stringify({
        data: aggregatedData,
        cached: false,
        cache_key: cacheKey,
        expires_at: expiresAt.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' } }
    )
  } catch (error) {
    console.error('Data aggregator error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper functions
function getTimeFilter(range: string): string {
  const now = new Date()
  switch (range) {
    case 'day':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    case 'quarter':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
    case 'year':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString()
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  }
}

function groupBy(array: any[], key: string): Record<string, number> {
  return array.reduce((result, item) => {
    const group = item[key] || 'unknown'
    result[group] = (result[group] || 0) + 1
    return result
  }, {} as Record<string, number>)
}

function groupByDate(array: any[], dateKey: string): Record<string, number> {
  return array.reduce((result, item) => {
    const date = new Date(item[dateKey]).toISOString().split('T')[0]
    result[date] = (result[date] || 0) + 1
    return result
  }, {} as Record<string, number>)
}