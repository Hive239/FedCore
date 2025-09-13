import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCalendarEvents } from './use-events-optimized'
import { useTasks } from './use-tasks'
import { useProjects } from './use-projects'

// Nexus Analytics Data Types
export interface NexusMetrics {
  productivityScore: number
  scheduleAccuracy: number
  conflictsDetected: number
  mlConfidence: number
}

export interface WeatherRisk {
  date: string
  risk: 'low' | 'medium' | 'high'
  impact: string
  tasksAffected: number
  location?: string
}

export interface ScheduleConflict {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  affectedTasks: string[]
  suggestedAction: string
  projectId?: string
  status: string
}

export interface ProductivityScore {
  userId: string
  name: string
  score: number
  trend: 'up' | 'down' | 'stable'
  completedTasks: number
  avgDuration: number
}

export interface NexusInsight {
  id: string
  type: 'efficiency' | 'risk' | 'opportunity' | 'warning' | 'recommendation'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  title: string
  description: string
  projectId?: string
  confidence?: number
}

// Fetch Nexus metrics from database
async function fetchNexusMetrics(projectId?: string): Promise<NexusMetrics> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()
  
  if (!userTenant) throw new Error('No tenant found')
  
  // Get productivity metrics
  let productivityQuery = supabase
    .from('productivity_metrics')
    .select('productivity_score')
    .eq('tenant_id', userTenant.tenant_id)
    .order('date_calculated', { ascending: false })
    .limit(10)
  
  if (projectId && projectId !== 'all') {
    productivityQuery = productivityQuery.eq('project_id', projectId)
  }
  
  const { data: productivityData } = await productivityQuery
  
  // Get schedule conflicts
  let conflictsQuery = supabase
    .from('schedule_conflicts')
    .select('id')
    .eq('tenant_id', userTenant.tenant_id)
    .eq('status', 'open')
  
  if (projectId && projectId !== 'all') {
    conflictsQuery = conflictsQuery.eq('project_id', projectId)
  }
  
  const { data: conflictsData } = await conflictsQuery
  
  // Calculate metrics
  const avgProductivity = productivityData?.length 
    ? productivityData.reduce((acc, curr) => acc + (curr.productivity_score || 0), 0) / productivityData.length
    : 0
  
  return {
    productivityScore: Math.round(avgProductivity * 100),
    scheduleAccuracy: 92, // Will be calculated from predictions vs actual
    conflictsDetected: conflictsData?.length || 0,
    mlConfidence: 94.3 // Will come from ML models table
  }
}

// Fetch weather risks
async function fetchWeatherRisks(projectId?: string): Promise<WeatherRisk[]> {
  const supabase = createClient()
  
  // For now, check if weather data exists
  const { data: weatherData } = await supabase
    .from('weather_data')
    .select('*')
    .gte('weather_date', new Date().toISOString().split('T')[0])
    .lte('weather_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('weather_date')
    .limit(7)
  
  if (weatherData && weatherData.length > 0) {
    return weatherData.map(w => ({
      date: w.weather_date,
      risk: w.construction_risk_score > 70 ? 'high' : w.construction_risk_score > 40 ? 'medium' : 'low',
      impact: w.impact_description || `Risk score: ${w.construction_risk_score}`,
      tasksAffected: Math.floor((w.construction_risk_score || 0) / 20),
      location: w.location_hash
    }))
  }
  
  // Return empty array if no weather data
  return []
}

// Fetch schedule conflicts
async function fetchScheduleConflicts(projectId?: string): Promise<ScheduleConflict[]> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()
  
  if (!userTenant) throw new Error('No tenant found')
  
  let query = supabase
    .from('schedule_conflicts')
    .select('*')
    .eq('tenant_id', userTenant.tenant_id)
    .eq('status', 'open')
    .order('detected_at', { ascending: false })
    .limit(10)
  
  if (projectId && projectId !== 'all') {
    query = query.eq('project_id', projectId)
  }
  
  const { data: conflictsData } = await query
  
  if (conflictsData && conflictsData.length > 0) {
    return conflictsData.map(c => ({
      id: c.id,
      type: c.conflict_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      severity: c.severity,
      description: c.conflict_data?.description || 'Conflict detected',
      affectedTasks: c.affected_tasks || [],
      suggestedAction: c.suggested_resolution?.action || 'Review and resolve',
      projectId: c.project_id,
      status: c.status
    }))
  }
  
  return []
}

// Fetch productivity scores
async function fetchProductivityScores(projectId?: string): Promise<ProductivityScore[]> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()
  
  if (!userTenant) throw new Error('No tenant found')
  
  // Get latest productivity metrics
  let query = supabase
    .from('productivity_metrics')
    .select(`
      *,
      user:profiles(id, full_name, email)
    `)
    .eq('tenant_id', userTenant.tenant_id)
    .order('date_calculated', { ascending: false })
    .limit(20)
  
  if (projectId && projectId !== 'all') {
    query = query.eq('project_id', projectId)
  }
  
  const { data: metricsData } = await query
  
  if (metricsData && metricsData.length > 0) {
    // Group by user and get latest scores
    const userScores = new Map<string, ProductivityScore>()
    
    metricsData.forEach(m => {
      if (m.user_id && !userScores.has(m.user_id)) {
        userScores.set(m.user_id, {
          userId: m.user_id,
          name: m.user?.full_name || 'Unknown User',
          score: Math.round((m.productivity_score || 0) * 100),
          trend: 'stable', // Will calculate based on historical data
          completedTasks: Math.round(m.task_completion_rate * 100) || 0,
          avgDuration: m.average_task_duration || 0
        })
      }
    })
    
    return Array.from(userScores.values())
  }
  
  return []
}

// Fetch AI insights
async function fetchNexusInsights(projectId?: string): Promise<NexusInsight[]> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()
  
  if (!userTenant) throw new Error('No tenant found')
  
  let query = supabase
    .from('nexus_insights')
    .select('*')
    .eq('tenant_id', userTenant.tenant_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (projectId && projectId !== 'all') {
    query = query.eq('project_id', projectId)
  }
  
  const { data: insightsData } = await query
  
  if (insightsData && insightsData.length > 0) {
    return insightsData.map(i => ({
      id: i.id,
      type: i.insight_type,
      priority: i.priority,
      title: i.title,
      description: i.description,
      projectId: i.project_id,
      confidence: i.confidence_score
    }))
  }
  
  // Generate insights based on current data if none exist
  return generateInsightsFromData(projectId)
}

// Generate insights from existing data
async function generateInsightsFromData(projectId?: string): Promise<NexusInsight[]> {
  const insights: NexusInsight[] = []
  
  // Get tasks data to analyze
  const supabase = createClient()
  const { data: tasksData } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  
  // Analyze task completion patterns
  if (tasksData && tasksData.length > 0) {
    const completedTasks = tasksData.filter(t => t.status === 'done')
    const completionRate = completedTasks.length / tasksData.length
    
    if (completionRate > 0.8) {
      insights.push({
        id: '1',
        type: 'efficiency',
        priority: 'medium',
        title: 'High Task Completion Rate',
        description: `Your team is maintaining a ${Math.round(completionRate * 100)}% task completion rate. Consider increasing project velocity.`,
        confidence: 0.85
      })
    }
    
    // Check for overdue tasks
    const overdueTasks = tasksData.filter(t => 
      t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
    )
    
    if (overdueTasks.length > 0) {
      insights.push({
        id: '2',
        type: 'warning',
        priority: 'high',
        title: 'Overdue Tasks Detected',
        description: `${overdueTasks.length} tasks are overdue. Review resource allocation to get back on schedule.`,
        confidence: 1.0
      })
    }
  }
  
  // Always provide at least one insight
  if (insights.length === 0) {
    insights.push({
      id: '3',
      type: 'recommendation',
      priority: 'low',
      title: 'Start Tracking Metrics',
      description: 'Begin logging tasks and events to enable AI-powered insights and predictions.',
      confidence: 1.0
    })
  }
  
  return insights
}

// Submit feedback for ML improvement
async function submitMLFeedback(data: {
  predictionId?: string
  feedbackType: string
  feedbackData: any
  rating?: number
}): Promise<void> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()
  
  if (!userTenant) throw new Error('No tenant found')
  
  const { error } = await supabase
    .from('ml_feedback')
    .insert({
      tenant_id: userTenant.tenant_id,
      user_id: user.id,
      prediction_id: data.predictionId,
      feedback_type: data.feedbackType,
      feedback_data: data.feedbackData,
      rating: data.rating
    })
  
  if (error) throw error
}

// React Query Hooks
export function useNexusMetrics(projectId?: string) {
  return useQuery({
    queryKey: ['nexus-metrics', projectId],
    queryFn: () => fetchNexusMetrics(projectId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5 // Refetch every 5 minutes
  })
}

export function useWeatherRisks(projectId?: string) {
  return useQuery({
    queryKey: ['weather-risks', projectId],
    queryFn: () => fetchWeatherRisks(projectId),
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}

export function useScheduleConflicts(projectId?: string) {
  return useQuery({
    queryKey: ['schedule-conflicts', projectId],
    queryFn: () => fetchScheduleConflicts(projectId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5 // Check for new conflicts every 5 minutes
  })
}

export function useProductivityScores(projectId?: string) {
  return useQuery({
    queryKey: ['productivity-scores', projectId],
    queryFn: () => fetchProductivityScores(projectId),
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

export function useNexusInsights(projectId?: string) {
  return useQuery({
    queryKey: ['nexus-insights', projectId],
    queryFn: () => fetchNexusInsights(projectId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useSubmitMLFeedback() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: submitMLFeedback,
    onSuccess: () => {
      // Invalidate metrics to reflect feedback
      queryClient.invalidateQueries({ queryKey: ['nexus-metrics'] })
    }
  })
}

// Combined hook for all Nexus data
export function useNexusData(projectId?: string) {
  const metrics = useNexusMetrics(projectId)
  const weatherRisks = useWeatherRisks(projectId)
  const conflicts = useScheduleConflicts(projectId)
  const productivity = useProductivityScores(projectId)
  const insights = useNexusInsights(projectId)
  
  return {
    metrics: metrics.data,
    weatherRisks: weatherRisks.data || [],
    conflicts: conflicts.data || [],
    productivity: productivity.data || [],
    insights: insights.data || [],
    isLoading: metrics.isLoading || weatherRisks.isLoading || conflicts.isLoading || productivity.isLoading || insights.isLoading,
    error: metrics.error || weatherRisks.error || conflicts.error || productivity.error || insights.error
  }
}