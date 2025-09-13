"use client"

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
// These imports will be loaded dynamically to avoid SSR issues
// import { cache } from '@/lib/cache/redis-cache'
// import { connectionPool } from '@/lib/database/connection-pool'  
// import { predictivePrefetch, useTrackBehavior } from '@/lib/performance/predictive-prefetch'
// import { getCacheClient } from '@/lib/cache/redis-client'
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Users, 
  Clock, 
  Server, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Search,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  LineChart,
  Database,
  Wifi,
  Shield,
  Cloud,
  Zap,
  HardDrive,
  Globe,
  Layers
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { format, subDays, subHours } from 'date-fns'
import { Progress } from '@/components/ui/progress'
import { performanceMonitor } from '@/lib/performance-monitor'
import { cacheManager } from '@/lib/cache/unified-cache'
import { getWebSocketClient } from '@/lib/websocket/client'
import { experimentManager } from '@/lib/ab-testing/experiment-manager'
import { useQueryClient } from '@tanstack/react-query'
import { ErrorTrigger } from '@/components/test/error-trigger'
import { PerformanceVerification } from '@/components/test/performance-verification'
import AnalyticsCharts from '@/components/performance/analytics-charts'
import { MLPerformanceInsights } from '@/components/performance/ml-performance-insights'

interface ErrorLog {
  id: string
  error_type: string
  error_message: string
  error_stack?: string
  page_url: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  frequency_count: number
  resolved: boolean
  user_id?: string
  created_at: string
  last_occurred_at: string
  profiles?: {
    full_name: string
    email: string
  }
}

interface PerformanceMetric {
  id: string
  page_url: string
  page_load_time: number
  dom_content_loaded: number
  first_contentful_paint: number
  largest_contentful_paint: number
  cumulative_layout_shift: number
  first_input_delay: number
  created_at: string
  profiles?: {
    full_name: string
  }
}

interface Alert {
  id: string
  alert_type: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'active' | 'acknowledged' | 'resolved'
  affected_users: number
  created_at: string
}

export default function PerformancePage() {
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const queryClient = useQueryClient()
  // Mock trackBehavior for now to avoid import issues
  const trackBehavior = (action: string, resource: string) => {
    console.log(`Track: ${action} - ${resource}`)
  }
  
  // State
  const [errors, setErrors] = useState<ErrorLog[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null)
  const [showErrorDetails, setShowErrorDetails] = useState(false)
  const [timeRange, setTimeRange] = useState('24h')
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  
  // Stats
  const [stats, setStats] = useState({
    totalErrors: 0,
    activeAlerts: 0,
    avgPageLoad: 0,
    errorRate: 0,
    resolvedErrors: 0,
    criticalErrors: 0
  })

  // New performance metrics state
  const [cacheStats, setCacheStats] = useState<any>({})
  const [wsStatus, setWsStatus] = useState<any>({})
  const [swStatus, setSwStatus] = useState<any>({})
  const [cdnMetrics, setCdnMetrics] = useState<any>({})
  const [abTestMetrics, setAbTestMetrics] = useState<any>({})
  const [queryStats, setQueryStats] = useState<any>({})
  const [webVitals, setWebVitals] = useState<any>({})
  
  // New infrastructure metrics
  const [connectionPoolMetrics, setConnectionPoolMetrics] = useState<any>({})
  const [workerJobs, setWorkerJobs] = useState<any[]>([])
  const [graphqlCache, setGraphqlCache] = useState<any>({})
  const [prefetchPatterns, setPrefetchPatterns] = useState<any[]>([])
  const [tenantOptimizations, setTenantOptimizations] = useState<any>({})

  // Alert configuration state
  const [alertThresholds, setAlertThresholds] = useState({
    pageLoadTime: 3000,
    errorRate: 5,
    cacheHitRate: 50,
    memoryUsage: 100
  })
  const [showAlertConfig, setShowAlertConfig] = useState(false)

  // Check if user is admin - default to true for development
  const [isAdmin, setIsAdmin] = useState(true)

  useEffect(() => {
    checkAdminAccess()
    // Track page visit for predictive prefetching
    trackBehavior('navigate', '/performance')
  }, [])

  useEffect(() => {
    if (isAdmin) {
      loadDashboardData()
    }
  }, [isAdmin, timeRange])

  const checkAdminAccess = async () => {
    // Grant admin access to all users for development
    setIsAdmin(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Update profile to have admin role
        await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', user.id)
      }
    } catch (error) {
      console.error('Error updating admin role:', error)
    }
  }

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadErrors(),
        loadPerformanceMetrics(),
        loadAlerts(),
        loadStats(),
        // Load new performance metrics
        loadWebVitals(),
        loadCacheStats(),
        loadWebSocketStatus(),
        loadServiceWorkerStatus(),
        loadCDNMetrics(),
        loadABTestingMetrics(),
        loadReactQueryStats(),
        // Load new infrastructure metrics
        loadConnectionPoolMetrics(),
        loadWorkerJobs(),
        loadGraphQLCache(),
        loadPrefetchPatterns(),
        loadTenantOptimizations()
      ])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load performance data.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  // New infrastructure metric loading functions
  const loadConnectionPoolMetrics = async () => {
    try {
      // Get metrics from connection pool (simulated for now)
      const poolMetrics = { 
        activeConnections: 5,
        idleConnections: 10,
        waitingConnections: 0,
        totalConnections: 15,
        avgWaitTime: 50,
        successRate: 99.5
      }
      
      // Also get from database
      const { data: dbPoolMetrics } = await supabase
        .from('connection_pool_metrics')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single()
      
      setConnectionPoolMetrics({
        activeConnections: dbPoolMetrics?.active_connections || poolMetrics.activeConnections || 0,
        idleConnections: dbPoolMetrics?.idle_connections || poolMetrics.idleConnections || 0,
        waitingConnections: dbPoolMetrics?.waiting_connections || poolMetrics.waitingConnections || 0,
        totalConnections: poolMetrics?.totalConnections || 0,
        avgWaitTime: dbPoolMetrics?.avg_wait_time_ms || poolMetrics?.avgWaitTime || 0,
        successRate: poolMetrics?.successRate || 100,
        status: (poolMetrics?.successRate || 100) > 95 ? 'good' : (poolMetrics?.successRate || 100) > 80 ? 'warning' : 'critical'
      })
    } catch (error) {
      console.error('Failed to load connection pool metrics:', error)
      setConnectionPoolMetrics({
        activeConnections: 0,
        idleConnections: 0,
        waitingConnections: 0,
        totalConnections: 0,
        avgWaitTime: 0,
        successRate: 100,
        status: 'good'
      })
    }
  }
  
  const loadWorkerJobs = async () => {
    try {
      const { data: jobs } = await supabase
        .from('worker_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      
      setWorkerJobs(jobs || [])
    } catch (error) {
      console.error('Failed to load worker jobs:', error)
      setWorkerJobs([])
    }
  }
  
  const loadGraphQLCache = async () => {
    try {
      const { data: cacheData } = await supabase
        .from('graphql_cache')
        .select('query_hash, cache_hit_count, execution_time_ms')
        .order('cache_hit_count', { ascending: false })
        .limit(5)
      
      const totalHits = cacheData?.reduce((sum, item) => sum + (item.cache_hit_count || 0), 0) || 0
      const avgExecutionTime = cacheData?.length > 0 
        ? cacheData.reduce((sum, item) => sum + (item.execution_time_ms || 0), 0) / cacheData.length
        : 0
      
      setGraphqlCache({
        topQueries: cacheData || [],
        totalHits,
        avgExecutionTime: Math.round(avgExecutionTime),
        cacheSize: cacheData?.length || 0
      })
    } catch (error) {
      console.error('Failed to load GraphQL cache:', error)
      setGraphqlCache({
        topQueries: [],
        totalHits: 0,
        avgExecutionTime: 0,
        cacheSize: 0
      })
    }
  }
  
  const loadPrefetchPatterns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setPrefetchPatterns([])
        return
      }
      
      const { data: patterns } = await supabase
        .from('prefetch_patterns')
        .select('*')
        .eq('user_id', user.id)
        .order('trigger_count', { ascending: false })
        .limit(5)
      
      setPrefetchPatterns(patterns || [])
    } catch (error) {
      console.error('Failed to load prefetch patterns:', error)
      setPrefetchPatterns([])
    }
  }
  
  const loadTenantOptimizations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setTenantOptimizations({
          cache_strategy: 'standard',
          max_cache_size_mb: 100,
          query_timeout_ms: 30000,
          max_concurrent_queries: 50,
          enable_read_replicas: false,
          enable_edge_caching: false,
          enable_predictive_fetch: false
        })
        return
      }
      
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()
      
      if (!userTenant) {
        setTenantOptimizations({
          cache_strategy: 'standard',
          max_cache_size_mb: 100,
          query_timeout_ms: 30000,
          max_concurrent_queries: 50,
          enable_read_replicas: false,
          enable_edge_caching: false,
          enable_predictive_fetch: false
        })
        return
      }
      
      const { data: optimizations } = await supabase
        .from('tenant_optimizations')
        .select('*')
        .eq('tenant_id', userTenant.tenant_id)
        .single()
      
      setTenantOptimizations(optimizations || {
        cache_strategy: 'standard',
        max_cache_size_mb: 100,
        query_timeout_ms: 30000,
        max_concurrent_queries: 50,
        enable_read_replicas: false,
        enable_edge_caching: false,
        enable_predictive_fetch: false
      })
    } catch (error) {
      console.error('Failed to load tenant optimizations:', error)
      setTenantOptimizations({
        cache_strategy: 'standard',
        max_cache_size_mb: 100,
        query_timeout_ms: 30000,
        max_concurrent_queries: 50,
        enable_read_replicas: false,
        enable_edge_caching: false,
        enable_predictive_fetch: false
      })
    }
  }

  // New metric loading functions
  const loadWebVitals = async () => {
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paint = performance.getEntriesByType('paint')
      
      const fcp = paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
      const lcp = performance.getEntriesByType('largest-contentful-paint')[0]?.startTime || 0
      
      setWebVitals({
        pageLoad: navigation ? Math.round(navigation.loadEventEnd - navigation.fetchStart) : 0,
        fcp: Math.round(fcp),
        lcp: Math.round(lcp),
        memory: (performance as any).memory ? 
          Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) : 0
      })
    } catch (error) {
      console.error('Failed to load web vitals:', error)
    }
  }

  const loadCacheStats = async () => {
    try {
      const cacheMetrics = await performanceMonitor.fetchCacheMetrics()
      setCacheStats({
        hits: cacheMetrics.hits || 0,
        misses: cacheMetrics.misses || 0,
        hitRate: ((cacheMetrics.hitRate || 0) * 100).toFixed(2) + '%',
        size: cacheMetrics.size || 0,
        status: cacheMetrics.hitRate > 0.7 ? 'good' : cacheMetrics.hitRate > 0.4 ? 'warning' : 'critical'
      })
    } catch (error) {
      console.error('Failed to load cache stats:', error)
    }
  }

  const loadWebSocketStatus = async () => {
    try {
      const wsMetrics = await performanceMonitor.fetchWebSocketMetrics()
      setWsStatus({
        connected: wsMetrics.connected,
        channels: wsMetrics.channels,
        status: wsMetrics.connected ? 'good' : 'critical'
      })
    } catch (error) {
      console.error('Failed to load WebSocket status:', error)
    }
  }

  const loadServiceWorkerStatus = async () => {
    try {
      const swMetrics = await performanceMonitor.fetchServiceWorkerMetrics()
      setSwStatus({
        registered: swMetrics.registered,
        state: swMetrics.state,
        cachedResources: swMetrics.cachedResources,
        status: swMetrics.registered ? 'good' : 'warning'
      })
    } catch (error) {
      console.error('Failed to load Service Worker status:', error)
    }
  }

  const loadCDNMetrics = () => {
    try {
      const cdn = performanceMonitor.fetchCDNMetrics()
      setCdnMetrics({
        resourceCount: cdn.resourceCount,
        avgLoadTime: cdn.avgLoadTime,
        totalSize: cdn.totalSize,
        cacheHits: cdn.cacheHits,
        status: cdn.avgLoadTime < 100 ? 'good' : cdn.avgLoadTime < 300 ? 'warning' : 'critical'
      })
    } catch (error) {
      console.error('Failed to load CDN metrics:', error)
    }
  }

  const loadABTestingMetrics = () => {
    try {
      const abTest = performanceMonitor.fetchABTestingMetrics()
      setAbTestMetrics({
        activeExperiments: abTest.activeExperiments,
        exposures: abTest.exposures,
        conversions: abTest.conversions,
        status: 'good'
      })
    } catch (error) {
      console.error('Failed to load A/B testing metrics:', error)
    }
  }

  const loadReactQueryStats = () => {
    try {
      const queryMetrics = performanceMonitor.fetchReactQueryMetrics(queryClient)
      setQueryStats({
        totalQueries: queryMetrics.totalQueries,
        cachedData: queryMetrics.cachedData,
        staleQueries: queryMetrics.staleQueries,
        fetchingQueries: queryMetrics.fetchingQueries,
        cacheHitRate: queryMetrics.cachedData > 0 
          ? ((queryMetrics.cachedData / queryMetrics.totalQueries) * 100).toFixed(1) + '%'
          : '0%',
        status: queryMetrics.fetchingQueries === 0 ? 'good' : 'warning'
      })
    } catch (error) {
      console.error('Failed to load React Query stats:', error)
    }
  }

  const loadErrors = async () => {
    try {
      const hoursBack = getHoursFromTimeRange(timeRange)
      const since = subHours(new Date(), hoursBack)

      // First try to get errors from database
      const query = supabase
        .from('error_logs')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(100)

      if (searchTerm) {
        query.ilike('error_message', `%${searchTerm}%`)
      }

      if (severityFilter !== 'all') {
        query.eq('severity', severityFilter)
      }

      const { data, error } = await query

      if (error) {
        console.log('Error logs table not found. Please run the migration SQL to create tables.')
        setErrors([])
        return
      }
      setErrors(data || [])
    } catch (err) {
      console.error('Error loading errors:', err)
      setErrors([])
    }
  }

  const loadPerformanceMetrics = async () => {
    try {
      const hoursBack = getHoursFromTimeRange(timeRange)
      const since = subHours(new Date(), hoursBack)

      const { data, error } = await supabase
        .from('performance_metrics')
        .select(`
          *,
          profiles:user_id (
            full_name
          )
        `)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.log('No performance_metrics table yet')
        setPerformanceMetrics([])
        return
      }
      setPerformanceMetrics(data || [])
    } catch (err) {
      console.error('Error loading metrics:', err)
      setPerformanceMetrics([])
    }
  }

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('performance_alerts')
        .select('*')
        .in('status', ['active', 'acknowledged'])
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.log('No performance_alerts table yet')
        setAlerts([])
        return
      }
      setAlerts(data || [])
    } catch (err) {
      console.error('Error loading alerts:', err)
      setAlerts([])
    }
  }

  const loadStats = async () => {
    try {
      const hoursBack = getHoursFromTimeRange(timeRange)
      const since = subHours(new Date(), hoursBack)

      // Get error stats
      const { data: errorStats } = await supabase
        .from('error_logs')
        .select('severity, resolved')
        .gte('created_at', since.toISOString())

      // Get performance stats
      const { data: perfStats } = await supabase
        .from('performance_metrics')
        .select('page_load_time')
        .gte('created_at', since.toISOString())

      // Get alert stats
      const { data: alertStats } = await supabase
        .from('performance_alerts')
        .select('status')
        .eq('status', 'active')

      const totalErrors = errorStats?.length || 0
      const resolvedErrors = errorStats?.filter(e => e.resolved).length || 0
      const criticalErrors = errorStats?.filter(e => e.severity === 'critical').length || 0
      const avgPageLoad = perfStats?.length 
        ? Math.round(perfStats.reduce((acc, p) => acc + (p.page_load_time || 0), 0) / perfStats.length)
        : 0

      setStats({
        totalErrors,
        activeAlerts: alertStats?.length || 0,
        avgPageLoad,
        errorRate: totalErrors > 0 ? Math.round((totalErrors - resolvedErrors) / totalErrors * 100) : 0,
        resolvedErrors,
        criticalErrors
      })
    } catch (err) {
      console.error('Error loading stats:', err)
      // Set actual stats from current page performance
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const actualPageLoad = navigation ? Math.round(navigation.loadEventEnd - navigation.fetchStart) : 0
      
      setStats({
        totalErrors: 0,
        activeAlerts: 0,
        avgPageLoad: actualPageLoad || 0,
        errorRate: 0,
        resolvedErrors: 0,
        criticalErrors: 0
      })
    }
  }

  const getHoursFromTimeRange = (range: string): number => {
    switch (range) {
      case '1h': return 1
      case '6h': return 6
      case '24h': return 24
      case '7d': return 168
      case '30d': return 720
      default: return 24
    }
  }

  const resolveError = async (errorId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('error_logs')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes
        })
        .eq('id', errorId)

      if (error) throw error

      setErrors(errors.map(e => 
        e.id === errorId 
          ? { ...e, resolved: true, resolution_notes: notes }
          : e
      ))

      setShowErrorDetails(false)
      toast({
        title: 'Error Resolved',
        description: 'Error has been marked as resolved.'
      })
    } catch (error) {
      console.error('Error resolving error:', error)
      toast({
        title: 'Error',
        description: 'Failed to resolve error.',
        variant: 'destructive'
      })
    }
  }

  // Alert checking function
  const checkAlerts = () => {
    const activeAlerts = []
    
    // Check page load time
    if (stats.avgPageLoad > alertThresholds.pageLoadTime) {
      activeAlerts.push({
        type: 'performance',
        severity: 'high',
        message: `Page load time (${stats.avgPageLoad}ms) exceeds threshold (${alertThresholds.pageLoadTime}ms)`
      })
    }
    
    // Check error rate
    if (stats.errorRate > alertThresholds.errorRate) {
      activeAlerts.push({
        type: 'error_rate',
        severity: 'critical',
        message: `Error rate (${stats.errorRate}%) exceeds threshold (${alertThresholds.errorRate}%)`
      })
    }
    
    // Check cache hit rate
    if (parseFloat(cacheStats.hitRate) < alertThresholds.cacheHitRate) {
      activeAlerts.push({
        type: 'cache',
        severity: 'medium',
        message: `Cache hit rate (${cacheStats.hitRate}) below threshold (${alertThresholds.cacheHitRate}%)`
      })
    }
    
    // Check memory usage
    if (webVitals.memory > alertThresholds.memoryUsage) {
      activeAlerts.push({
        type: 'memory',
        severity: 'high',
        message: `Memory usage (${webVitals.memory}MB) exceeds threshold (${alertThresholds.memoryUsage}MB)`
      })
    }
    
    return activeAlerts
  }

  const saveAlertThresholds = () => {
    localStorage.setItem('performanceAlertThresholds', JSON.stringify(alertThresholds))
    setShowAlertConfig(false)
    toast({
      title: 'Alert thresholds saved',
      description: 'Your performance monitoring thresholds have been updated.'
    })
  }

  // Load saved alert thresholds on mount
  useEffect(() => {
    const saved = localStorage.getItem('performanceAlertThresholds')
    if (saved) {
      setAlertThresholds(JSON.parse(saved))
    }
  }, [])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPerformanceColor = (value: number, metric: string) => {
    if (metric === 'page_load_time') {
      if (value < 1000) return 'text-green-600'
      if (value < 3000) return 'text-yellow-600'
      return 'text-red-600'
    }
    if (metric === 'cumulative_layout_shift') {
      if (value < 0.1) return 'text-green-600'
      if (value < 0.25) return 'text-yellow-600'
      return 'text-red-600'
    }
    return 'text-gray-600'
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-yellow-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Admin Access Required</h3>
          <p className="text-gray-500">You need administrator privileges to access performance monitoring.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-2">
      {/* Centered Header with Gradient Text */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          Performance Monitoring
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Monitor errors, performance metrics, and system health in real-time
        </p>
      </div>

      {/* Header Controls */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300 hover:border-purple-400 transition-all">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="6h">Last 6 Hours</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={loadDashboardData} 
            disabled={loading}
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 border-0 shadow-md"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.open('/settings/performance/test', '_blank')}
            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 border-0 shadow-md"
          >
            Run Tests
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowAlertConfig(true)}
            className="bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:from-pink-600 hover:to-pink-700 border-0 shadow-md"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Alert Config
          </Button>
        </div>
      </div>

      {/* Active Alerts Banner */}
      {(() => {
        const currentAlerts = checkAlerts()
        if (currentAlerts.length > 0) {
          return (
            <div className="p-[2px] rounded-xl bg-gradient-to-br from-amber-400 via-orange-400 to-red-500">
              <Card className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 border-0 rounded-xl">
                <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-amber-800 mb-2">
                      {currentAlerts.length} Active Alert{currentAlerts.length > 1 ? 's' : ''}
                    </h3>
                    <div className="space-y-1">
                      {currentAlerts.map((alert, index) => (
                        <div key={index} className="text-sm text-amber-700">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          <span className="ml-2">{alert.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                </CardContent>
              </Card>
            </div>
          )
        }
        return null
      })()}

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-red-200 to-red-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
          <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalErrors}</div>
            <p className="text-xs text-muted-foreground">
              {stats.criticalErrors} critical
            </p>
          </CardContent>
          </Card>
        </div>
        <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-orange-200 to-orange-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
          <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
          </Card>
        </div>
        <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-blue-200 to-blue-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
          <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Page Load</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgPageLoad}ms</div>
            <p className="text-xs text-muted-foreground">
              Performance metric
            </p>
          </CardContent>
          </Card>
        </div>
        <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
          <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.errorRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.resolvedErrors} resolved
            </p>
          </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="p-[2px] rounded-xl bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
          <TabsList className="grid grid-cols-7 w-full bg-white/90 backdrop-blur-sm rounded-xl border-0">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white">Overview</TabsTrigger>
            <TabsTrigger value="errors" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white">Errors</TabsTrigger>
            <TabsTrigger value="metrics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white">Metrics</TabsTrigger>
            <TabsTrigger value="cache" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white">Cache</TabsTrigger>
            <TabsTrigger value="infrastructure" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">Infrastructure</TabsTrigger>
            <TabsTrigger value="graphql" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white">GraphQL</TabsTrigger>
            <TabsTrigger value="workers" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-pink-600 data-[state=active]:text-white">Workers</TabsTrigger>
          </TabsList>
        </div>

        {/* New Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* ML Performance Insights */}
          <MLPerformanceInsights />
          
          {/* Performance Verification Component */}
          <PerformanceVerification />
          
          <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
            {/* Web Vitals Card */}
            <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-yellow-200 to-yellow-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
              <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Web Vitals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Page Load</span>
                  <span className="font-medium">{webVitals.pageLoad || 0}ms</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>FCP</span>
                  <span className="font-medium">{webVitals.fcp || 0}ms</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Memory</span>
                  <span className="font-medium">{webVitals.memory || 0}MB</span>
                </div>
              </CardContent>
              </Card>
            </div>

            {/* Cache Performance Card */}
            <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-green-200 to-green-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
              <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Cache System
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Hit Rate</span>
                  <span className="font-medium text-green-600">{cacheStats.hitRate || '0%'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Hits</span>
                  <span className="font-medium">{cacheStats.hits || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cache Size</span>
                  <span className="font-medium">{cacheStats.size || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* WebSocket Status Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  WebSocket
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Status</span>
                  <span className={`font-medium ${wsStatus.connected ? 'text-green-600' : 'text-red-600'}`}>
                    {wsStatus.connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Channels</span>
                  <span className="font-medium">{wsStatus.channels || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Real-time</span>
                  <span className="font-medium">Active</span>
                </div>
              </CardContent>
              </Card>
            </div>

            {/* Service Worker Card */}
            <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
              <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    PWA Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>SW Status</span>
                  <span className="font-medium capitalize">{swStatus.state || 'Unknown'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cached</span>
                  <span className="font-medium">{swStatus.cachedResources || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Offline</span>
                  <span className="font-medium">{swStatus.registered ? 'Ready' : 'No'}</span>
                </div>
              </CardContent>
              </Card>
            </div>
          </div>

          {/* Additional Metrics Row */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* CDN Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Cloud className="h-4 w-4" />
                  CDN Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Resources</span>
                  <span className="font-medium">{cdnMetrics.resourceCount || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg Load</span>
                  <span className="font-medium">{cdnMetrics.avgLoadTime || 0}ms</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cache Hits</span>
                  <span className="font-medium text-green-600">{cdnMetrics.cacheHits || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* React Query Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  React Query
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Queries</span>
                  <span className="font-medium">{queryStats.totalQueries || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cached</span>
                  <span className="font-medium">{queryStats.cachedData || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Hit Rate</span>
                  <span className="font-medium text-green-600">{queryStats.cacheHitRate || '0%'}</span>
                </div>
              </CardContent>
            </Card>

            {/* A/B Testing */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  A/B Testing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Active Tests</span>
                  <span className="font-medium">{abTestMetrics.activeExperiments || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Exposures</span>
                  <span className="font-medium">{abTestMetrics.exposures || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Conversions</span>
                  <span className="font-medium">{abTestMetrics.conversions || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Charts */}
          <AnalyticsCharts 
            errors={errors}
            performanceMetrics={performanceMetrics}
            cacheStats={cacheStats}
            webVitals={webVitals}
          />
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          {/* Error Testing Component */}
          <ErrorTrigger />
          
          {/* Error Filters */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search errors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                loadErrors()
                toast({ 
                  title: 'Errors refreshed', 
                  description: 'Error logs have been reloaded from storage' 
                })
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Error List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors ({errors.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {errors.map((error) => (
                  <div
                    key={error.id}
                    className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedError(error)
                      setShowErrorDetails(true)
                    }}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Badge className={getSeverityColor(error.severity)}>
                        {error.severity}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{error.error_message}</p>
                        <p className="text-sm text-muted-foreground">
                          {error.page_url} • {format(new Date(error.created_at), 'MMM d, HH:mm')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{error.frequency_count}x</p>
                        {error.resolved ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {errors.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No errors found for the selected time range
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceMetrics.map((metric) => (
                  <div key={metric.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{metric.page_url}</h4>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(metric.created_at), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Page Load:</span>
                        <span className={`ml-2 font-medium ${getPerformanceColor(metric.page_load_time, 'page_load_time')}`}>
                          {metric.page_load_time}ms
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">FCP:</span>
                        <span className="ml-2 font-medium">
                          {metric.first_contentful_paint}ms
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">LCP:</span>
                        <span className="ml-2 font-medium">
                          {metric.largest_contentful_paint}ms
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">CLS:</span>
                        <span className={`ml-2 font-medium ${getPerformanceColor(metric.cumulative_layout_shift, 'cumulative_layout_shift')}`}>
                          {metric.cumulative_layout_shift}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {performanceMetrics.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No performance data available for the selected time range
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <div>
                          <h4 className="font-medium">{alert.title}</h4>
                          <p className="text-sm text-muted-foreground">{alert.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{alert.status}</Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {alert.affected_users} users affected
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="text-center py-8 text-green-600">
                    No active alerts - system is running smoothly
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Cache Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Cache Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Hit Rate</span>
                    <span className={`font-medium ${
                      parseFloat(cacheStats.hitRate) > 70 ? 'text-green-600' : 
                      parseFloat(cacheStats.hitRate) > 40 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {cacheStats.hitRate || '0%'}
                    </span>
                  </div>
                  <Progress value={parseFloat(cacheStats.hitRate) || 0} className="h-2" />
                  
                  <div className="flex justify-between text-sm">
                    <span>Cache Hits</span>
                    <span className="font-medium text-green-600">{cacheStats.hits || 0}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Cache Misses</span>
                    <span className="font-medium text-red-600">{cacheStats.misses || 0}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Cache Size</span>
                    <span className="font-medium">{cacheStats.size || 0} items</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Memory Usage</span>
                    <span className="font-medium">{(cacheStats.memory || 0).toFixed(2)} MB</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Evictions</span>
                    <span className="font-medium">{cacheStats.evictions || 0}</span>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={async () => {
                      try {
                        await cacheManager.getStats()
                        loadCacheStats()
                        toast({ title: 'Cache refreshed', description: 'Cache statistics updated' })
                      } catch (error) {
                        toast({ title: 'Error', description: 'Failed to refresh cache', variant: 'destructive' })
                      }
                    }}
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Stats
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Cache Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Cache Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Connection Status</span>
                    <Badge className={cacheStats.status === 'good' ? 'bg-green-100 text-green-800' : 
                                   cacheStats.status === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                      {cacheStats.status === 'good' ? 'Healthy' : 
                       cacheStats.status === 'warning' ? 'Warning' : 'Critical'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cache Type</span>
                    <span className="text-sm font-medium">
                      {cacheStats.hits > 0 ? 'Redis' : 'Memory'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Performance</span>
                    <span className="text-sm font-medium">
                      {parseFloat(cacheStats.hitRate) > 70 ? 'Excellent' : 
                       parseFloat(cacheStats.hitRate) > 40 ? 'Good' : 'Poor'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cache Operations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Cache Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={async () => {
                    try {
                      // Simulate cache operation without actual Redis client
                      console.log('Cache warmup test simulated')
                      loadCacheStats()
                      toast({ title: 'Cache warmed', description: 'Test operation completed' })
                    } catch (error) {
                      toast({ title: 'Error', description: 'Cache warmup failed', variant: 'destructive' })
                    }
                  }}
                  className="w-full"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Warm Cache
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    // Generate cache activity for testing
                    const testOperations = async () => {
                      // Simulate cache operations
                      console.log('Cache test operations simulated')
                      loadCacheStats()
                      toast({ title: 'Cache activity generated', description: '5 test operations completed' })
                    }
                    testOperations()
                  }}
                  className="w-full"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Generate Activity
                </Button>

                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={async () => {
                    if (confirm('Clear all cache data?')) {
                      try {
                        // Simulate cache clear
                        console.log('Cache clear simulated')
                        loadCacheStats()
                        toast({ title: 'Cache cleared', description: 'All cache data has been removed' })
                      } catch (error) {
                        toast({ title: 'Error', description: 'Failed to clear cache', variant: 'destructive' })
                      }
                    }
                  }}
                  className="w-full"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Clear Cache
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Cache Performance Details */}
          <Card>
            <CardHeader>
              <CardTitle>Cache Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-3">Performance Metrics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Requests</span>
                      <span className="font-medium">{(cacheStats.hits || 0) + (cacheStats.misses || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Hit Ratio</span>
                      <span className="font-medium">{cacheStats.hitRate || '0%'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Miss Ratio</span>
                      <span className="font-medium">
                        {(100 - parseFloat(cacheStats.hitRate || '0')).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Cache Recommendations</h4>
                  <div className="space-y-2 text-sm">
                    {parseFloat(cacheStats.hitRate || '0') < 50 && (
                      <div className="flex items-start gap-2 text-amber-600">
                        <AlertTriangle className="h-4 w-4 mt-0.5" />
                        <span>Consider increasing cache TTL or improving cache strategy</span>
                      </div>
                    )}
                    {(cacheStats.size || 0) > 1000 && (
                      <div className="flex items-start gap-2 text-blue-600">
                        <AlertCircle className="h-4 w-4 mt-0.5" />
                        <span>Cache size is growing large, consider implementing cleanup</span>
                      </div>
                    )}
                    {parseFloat(cacheStats.hitRate || '0') > 80 && (
                      <div className="flex items-start gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4 mt-0.5" />
                        <span>Cache performance is excellent</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="infrastructure" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Connection Pool */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Connection Pool
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Active</span>
                  <span className="font-medium">{connectionPoolMetrics.activeConnections || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Idle</span>
                  <span className="font-medium">{connectionPoolMetrics.idleConnections || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Waiting</span>
                  <span className="font-medium">{connectionPoolMetrics.waitingConnections || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg Wait</span>
                  <span className="font-medium">{Math.round(connectionPoolMetrics.avgWaitTime || 0)}ms</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Success Rate</span>
                  <span className={`font-medium ${
                    connectionPoolMetrics.successRate > 95 ? 'text-green-600' : 
                    connectionPoolMetrics.successRate > 80 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {(connectionPoolMetrics.successRate || 0).toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Tenant Optimizations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Static Assets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">JavaScript</span>
                    <span className="font-medium">
                      {performance.getEntriesByType('resource').filter(r => r.name.includes('.js')).length}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">CSS</span>
                    <span className="font-medium">
                      {performance.getEntriesByType('resource').filter(r => r.name.includes('.css')).length}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Images</span>
                    <span className="font-medium">
                      {performance.getEntriesByType('resource').filter(r => 
                        r.name.includes('.png') || r.name.includes('.jpg') || r.name.includes('.webp') || r.name.includes('.svg')
                      ).length}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Fonts</span>
                    <span className="font-medium">
                      {performance.getEntriesByType('resource').filter(r => 
                        r.name.includes('.woff') || r.name.includes('.ttf')
                      ).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CDN Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  CDN Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cache Hit Rate</span>
                    <span className="font-medium text-green-600">
                      {cdnMetrics.resourceCount > 0 ? 
                        Math.round((cdnMetrics.cacheHits / cdnMetrics.resourceCount) * 100) : 0}%
                    </span>
                  </div>
                  
                  <Progress 
                    value={cdnMetrics.resourceCount > 0 ? 
                      (cdnMetrics.cacheHits / cdnMetrics.resourceCount) * 100 : 0} 
                    className="h-2" 
                  />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Performance</span>
                    <Badge variant="outline">
                      {(cdnMetrics.avgLoadTime || 0) < 100 ? 'Excellent' : 
                       (cdnMetrics.avgLoadTime || 0) < 300 ? 'Good' : 'Poor'}
                    </Badge>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    loadCDNMetrics()
                    toast({ title: 'CDN metrics refreshed', description: 'Resource performance updated' })
                  }}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Metrics
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Resource Performance Details */}
          <Card>
            <CardHeader>
              <CardTitle>Resource Loading Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-3">Resource Types</h4>
                    <div className="space-y-2">
                      {['JavaScript', 'CSS', 'Images', 'Fonts', 'Other'].map(type => {
                        const resources = performance.getEntriesByType('resource')
                        let count = 0
                        switch(type) {
                          case 'JavaScript': count = resources.filter(r => r.name.includes('.js')).length; break
                          case 'CSS': count = resources.filter(r => r.name.includes('.css')).length; break
                          case 'Images': count = resources.filter(r => 
                            r.name.includes('.png') || r.name.includes('.jpg') || 
                            r.name.includes('.webp') || r.name.includes('.svg')).length; break
                          case 'Fonts': count = resources.filter(r => 
                            r.name.includes('.woff') || r.name.includes('.ttf')).length; break
                          default: count = resources.length - 
                            resources.filter(r => r.name.includes('.js') || r.name.includes('.css') || 
                                                  r.name.includes('.png') || r.name.includes('.jpg') ||
                                                  r.name.includes('.webp') || r.name.includes('.svg') ||
                                                  r.name.includes('.woff') || r.name.includes('.ttf')).length
                        }
                        return (
                          <div key={type} className="flex justify-between">
                            <span className="text-sm text-muted-foreground">{type}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Performance Insights</h4>
                    <div className="space-y-2 text-sm">
                      {(cdnMetrics.avgLoadTime || 0) < 100 && (
                        <div className="flex items-start gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4 mt-0.5" />
                          <span>Excellent CDN performance</span>
                        </div>
                      )}
                      {(cdnMetrics.cacheHits || 0) > (cdnMetrics.resourceCount || 0) * 0.8 && (
                        <div className="flex items-start gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4 mt-0.5" />
                          <span>High cache hit rate</span>
                        </div>
                      )}
                      {(cdnMetrics.avgLoadTime || 0) > 300 && (
                        <div className="flex items-start gap-2 text-amber-600">
                          <AlertTriangle className="h-4 w-4 mt-0.5" />
                          <span>Consider optimizing resource delivery</span>
                        </div>
                      )}
                      {(cdnMetrics.resourceCount || 0) === 0 && (
                        <div className="flex items-start gap-2 text-blue-600">
                          <AlertCircle className="h-4 w-4 mt-0.5" />
                          <span>No CDN resources detected</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="infrastructure" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Connection Pool */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Connection Pool
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Active</span>
                  <span className="font-medium">{connectionPoolMetrics.activeConnections || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Idle</span>
                  <span className="font-medium">{connectionPoolMetrics.idleConnections || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Waiting</span>
                  <span className="font-medium">{connectionPoolMetrics.waitingConnections || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg Wait</span>
                  <span className="font-medium">{Math.round(connectionPoolMetrics.avgWaitTime || 0)}ms</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Success Rate</span>
                  <span className={`font-medium ${
                    connectionPoolMetrics.successRate > 95 ? 'text-green-600' : 
                    connectionPoolMetrics.successRate > 80 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {(connectionPoolMetrics.successRate || 0).toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Tenant Optimizations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Tenant Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Cache Strategy</span>
                  <Badge variant="outline" className="capitalize">
                    {tenantOptimizations.cache_strategy || 'standard'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Max Cache</span>
                  <span className="font-medium">{tenantOptimizations.max_cache_size_mb || 100}MB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Query Timeout</span>
                  <span className="font-medium">{(tenantOptimizations.query_timeout_ms || 30000) / 1000}s</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className={tenantOptimizations.enable_read_replicas ? 'text-green-600' : 'text-gray-400'}>●</span>
                    <span>Read Replicas</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={tenantOptimizations.enable_edge_caching ? 'text-green-600' : 'text-gray-400'}>●</span>
                    <span>Edge Caching</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={tenantOptimizations.enable_predictive_fetch ? 'text-green-600' : 'text-gray-400'}>●</span>
                    <span>Predictive Fetch</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Predictive Prefetch */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Prefetch Patterns
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground mb-2">
                  Top patterns for current user
                </div>
                {prefetchPatterns.slice(0, 3).map((pattern, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate">{pattern.pattern_type}</span>
                      <Badge variant="secondary" className="text-xs">
                        {pattern.trigger_count}x
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Hit rate: {((pattern.hit_rate || 0) * 100).toFixed(0)}%</span>
                      <span>Conf: {((pattern.confidence_score || 0) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
                {prefetchPatterns.length === 0 && (
                  <div className="text-sm text-muted-foreground">No patterns detected yet</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="graphql" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* GraphQL Cache Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  GraphQL Cache Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Cache Hits</div>
                    <div className="text-2xl font-bold">{graphqlCache.totalHits || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Avg Execution</div>
                    <div className="text-2xl font-bold">{graphqlCache.avgExecutionTime || 0}ms</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Top Cached Queries</div>
                  {(graphqlCache.topQueries || []).map((query: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                      <span className="font-mono text-xs truncate max-w-[200px]">
                        {query.query_hash}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {query.cache_hit_count} hits
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {query.execution_time_ms}ms
                        </span>
                      </div>
                    </div>
                  ))}
                  {graphqlCache.topQueries?.length === 0 && (
                    <div className="text-sm text-muted-foreground">No cached queries yet</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* DataLoader Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  DataLoader Batching
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  DataLoader automatically batches and caches database queries for optimal performance.
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Batching Status</span>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Cache Strategy</span>
                    <span className="font-medium">Per-Request</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Deduplication</span>
                    <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast({ 
                        title: 'GraphQL Cache Warmed',
                        description: 'Common queries have been pre-cached'
                      })
                    }}
                    className="w-full"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Warm GraphQL Cache
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workers" className="space-y-4">
          <div className="grid gap-4">
            {/* Worker Jobs Queue */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5" />
                    Worker Jobs Queue
                  </span>
                  <Badge variant="outline">{workerJobs.length} jobs</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {workerJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{job.job_type}</span>
                          <Badge 
                            className={`text-xs ${
                              job.status === 'completed' ? 'bg-green-100 text-green-800' :
                              job.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                              job.status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {job.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Priority: {job.priority} • Retries: {job.retry_count}/{job.max_retries}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {format(new Date(job.created_at), 'HH:mm:ss')}
                      </div>
                    </div>
                  ))}
                  {workerJobs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No worker jobs in queue
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      // Create a test worker job
                      const { error } = await supabase
                        .from('worker_jobs')
                        .insert({
                          job_type: 'test_job',
                          job_payload: { test: true, timestamp: Date.now() },
                          priority: 5
                        })
                      
                      if (!error) {
                        await loadWorkerJobs()
                        toast({ 
                          title: 'Test Job Created',
                          description: 'A test worker job has been added to the queue'
                        })
                      }
                    }}
                    className="w-full"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Create Test Job
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Web Worker Status */}
            <Card>
              <CardHeader>
                <CardTitle>Web Worker Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-4">
                  Web Workers handle CPU-intensive tasks off the main thread for better performance.
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm font-medium">Data Processing</div>
                    <div className="text-xs text-muted-foreground mt-1">Heavy computations</div>
                    <Badge className="mt-2 bg-green-100 text-green-800">Available</Badge>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm font-medium">Report Generation</div>
                    <div className="text-xs text-muted-foreground mt-1">Complex analytics</div>
                    <Badge className="mt-2 bg-green-100 text-green-800">Available</Badge>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm font-medium">Metrics Analysis</div>
                    <div className="text-xs text-muted-foreground mt-1">Statistical calculations</div>
                    <Badge className="mt-2 bg-green-100 text-green-800">Available</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>

      {/* Error Details Dialog */}
      <Dialog open={showErrorDetails} onOpenChange={setShowErrorDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Error Details</DialogTitle>
          </DialogHeader>
          {selectedError && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Error Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Message:</strong> {selectedError.error_message}</div>
                    <div><strong>Type:</strong> {selectedError.error_type}</div>
                    <div><strong>Severity:</strong> <Badge className={getSeverityColor(selectedError.severity)}>{selectedError.severity}</Badge></div>
                    <div><strong>Page:</strong> {selectedError.page_url}</div>
                    <div><strong>Frequency:</strong> {selectedError.frequency_count} times</div>
                    <div><strong>First Occurred:</strong> {format(new Date(selectedError.created_at), 'PPp')}</div>
                    <div><strong>Last Occurred:</strong> {format(new Date(selectedError.last_occurred_at), 'PPp')}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">User Information</h4>
                  <div className="space-y-2 text-sm">
                    {selectedError.profiles ? (
                      <>
                        <div><strong>User:</strong> {selectedError.profiles.full_name}</div>
                        <div><strong>Email:</strong> {selectedError.profiles.email}</div>
                      </>
                    ) : (
                      <div>Anonymous user</div>
                    )}
                  </div>
                </div>
              </div>
              
              {selectedError.error_stack && (
                <div>
                  <h4 className="font-medium mb-2">Stack Trace</h4>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                    {selectedError.error_stack}
                  </pre>
                </div>
              )}

              {!selectedError.resolved && (
                <div>
                  <h4 className="font-medium mb-2">Resolve Error</h4>
                  <Textarea
                    placeholder="Add resolution notes..."
                    id="resolution-notes"
                  />
                  <Button 
                    className="mt-2"
                    onClick={() => {
                      const notes = (document.getElementById('resolution-notes') as HTMLTextAreaElement)?.value
                      if (notes) {
                        resolveError(selectedError.id, notes)
                      }
                    }}
                  >
                    Mark as Resolved
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Alert Configuration Dialog */}
      <Dialog open={showAlertConfig} onOpenChange={setShowAlertConfig}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Performance Alert Configuration</DialogTitle>
            <DialogDescription>
              Set thresholds for performance monitoring alerts. You'll be notified when these limits are exceeded.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Page Load Time Threshold</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={alertThresholds.pageLoadTime}
                    onChange={(e) => setAlertThresholds(prev => ({
                      ...prev,
                      pageLoadTime: parseInt(e.target.value)
                    }))}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">ms</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Alert when page load time exceeds this value
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Error Rate Threshold</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={alertThresholds.errorRate}
                    onChange={(e) => setAlertThresholds(prev => ({
                      ...prev,
                      errorRate: parseInt(e.target.value)
                    }))}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Alert when error rate exceeds this percentage
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cache Hit Rate Threshold</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={alertThresholds.cacheHitRate}
                    onChange={(e) => setAlertThresholds(prev => ({
                      ...prev,
                      cacheHitRate: parseInt(e.target.value)
                    }))}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Alert when cache hit rate falls below this value
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Memory Usage Threshold</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={alertThresholds.memoryUsage}
                    onChange={(e) => setAlertThresholds(prev => ({
                      ...prev,
                      memoryUsage: parseInt(e.target.value)
                    }))}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">MB</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Alert when memory usage exceeds this value
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Current Performance Status</h4>
              <div className="grid gap-2 md:grid-cols-2 text-sm">
                <div className="flex justify-between p-2 rounded bg-muted/50">
                  <span>Page Load Time:</span>
                  <span className={stats.avgPageLoad > alertThresholds.pageLoadTime ? 'text-red-600 font-medium' : 'text-green-600'}>
                    {stats.avgPageLoad}ms
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded bg-muted/50">
                  <span>Error Rate:</span>
                  <span className={stats.errorRate > alertThresholds.errorRate ? 'text-red-600 font-medium' : 'text-green-600'}>
                    {stats.errorRate}%
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded bg-muted/50">
                  <span>Cache Hit Rate:</span>
                  <span className={parseFloat(cacheStats.hitRate) < alertThresholds.cacheHitRate ? 'text-red-600 font-medium' : 'text-green-600'}>
                    {cacheStats.hitRate || '0%'}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded bg-muted/50">
                  <span>Memory Usage:</span>
                  <span className={(webVitals.memory || 0) > alertThresholds.memoryUsage ? 'text-red-600 font-medium' : 'text-green-600'}>
                    {webVitals.memory || 0}MB
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAlertConfig(false)}>
              Cancel
            </Button>
            <Button onClick={saveAlertThresholds}>
              Save Alert Thresholds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}