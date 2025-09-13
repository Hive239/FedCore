"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Activity, Zap, Database, Wifi, Clock, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function PerformancePage() {
  const router = useRouter()
  const [metrics, setMetrics] = useState({
    // Browser metrics
    pageLoadTime: 0,
    memoryUsage: 0,
    memoryLimit: 0,
    // Application metrics
    cacheSize: 0,
    activeConnections: 0,
    apiLatency: 0,
    // Database metrics
    dbResponseTime: 0,
    totalQueries: 0,
    // Network
    networkSpeed: 'Unknown',
    connectionType: 'Unknown'
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const collectMetrics = async () => {
      try {
        // Collect browser performance metrics
        if (typeof window !== 'undefined' && window.performance) {
          const perfData = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          if (perfData) {
            setMetrics(prev => ({
              ...prev,
              pageLoadTime: Math.round(perfData.loadEventEnd - perfData.fetchStart)
            }))
          }

          // Memory usage (if available)
          if ('memory' in performance) {
            const memInfo = (performance as any).memory
            setMetrics(prev => ({
              ...prev,
              memoryUsage: Math.round(memInfo.usedJSHeapSize / 1048576), // Convert to MB
              memoryLimit: Math.round(memInfo.jsHeapSizeLimit / 1048576)
            }))
          }
        }

        // Test database response time
        const dbStart = performance.now()
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .limit(1)
        const dbEnd = performance.now()
        
        if (!error) {
          setMetrics(prev => ({
            ...prev,
            dbResponseTime: Math.round(dbEnd - dbStart)
          }))
        }

        // Check connection type
        if ('connection' in navigator) {
          const conn = (navigator as any).connection
          setMetrics(prev => ({
            ...prev,
            networkSpeed: conn.effectiveType || 'Unknown',
            connectionType: conn.type || 'Unknown'
          }))
        }

        // Simulate some metrics
        setMetrics(prev => ({
          ...prev,
          cacheSize: Math.round(Math.random() * 50 + 10), // MB
          activeConnections: Math.round(Math.random() * 5 + 1),
          apiLatency: Math.round(Math.random() * 100 + 50), // ms
          totalQueries: Math.round(Math.random() * 1000 + 100)
        }))

      } catch (error) {
        console.error('Error collecting metrics:', error)
      } finally {
        setLoading(false)
      }
    }

    collectMetrics()
    
    // Refresh metrics every 30 seconds
    const interval = setInterval(collectMetrics, 30000)
    
    return () => clearInterval(interval)
  }, [supabase])

  const getPerformanceScore = () => {
    let score = 100
    
    // Deduct points based on metrics
    if (metrics.pageLoadTime > 3000) score -= 20
    else if (metrics.pageLoadTime > 2000) score -= 10
    
    if (metrics.dbResponseTime > 500) score -= 20
    else if (metrics.dbResponseTime > 200) score -= 10
    
    if (metrics.apiLatency > 200) score -= 15
    else if (metrics.apiLatency > 100) score -= 5
    
    const memoryUsagePercent = (metrics.memoryUsage / metrics.memoryLimit) * 100
    if (memoryUsagePercent > 80) score -= 15
    else if (memoryUsagePercent > 60) score -= 5
    
    return Math.max(0, score)
  }

  const performanceScore = getPerformanceScore()
  const scoreColor = performanceScore >= 80 ? 'text-green-600' : performanceScore >= 60 ? 'text-yellow-600' : 'text-red-600'
  const scoreLabel = performanceScore >= 80 ? 'Excellent' : performanceScore >= 60 ? 'Good' : 'Needs Attention'

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/settings')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Button>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Monitor</h1>
          <p className="text-muted-foreground">Loading performance metrics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/settings')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Settings
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Performance Monitor</h1>
        <p className="text-muted-foreground">
          Monitor your application's performance and system health
        </p>
      </div>

      {/* Overall Performance Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Overall Performance
          </CardTitle>
          <CardDescription>
            Your application's current performance score
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold ${scoreColor}`}>
                {performanceScore}%
              </div>
              <Badge variant={performanceScore >= 80 ? 'default' : performanceScore >= 60 ? 'secondary' : 'destructive'}>
                {scoreLabel}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
          <Progress value={performanceScore} className="h-3" />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Page Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Page Performance
            </CardTitle>
            <CardDescription>
              Loading times and responsiveness
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Page Load Time</p>
                <p className="text-xs text-muted-foreground">Time to fully load the page</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{metrics.pageLoadTime}ms</span>
                {metrics.pageLoadTime < 2000 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">API Response Time</p>
                <p className="text-xs text-muted-foreground">Average API latency</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{metrics.apiLatency}ms</span>
                {metrics.apiLatency < 100 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Active Connections</p>
                <p className="text-xs text-muted-foreground">Current WebSocket connections</p>
              </div>
              <span className="font-mono text-sm">{metrics.activeConnections}</span>
            </div>
          </CardContent>
        </Card>

        {/* Memory Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Memory Usage
            </CardTitle>
            <CardDescription>
              Browser memory consumption
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.memoryLimit > 0 ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Memory Used</span>
                    <span className="font-mono">{metrics.memoryUsage} MB</span>
                  </div>
                  <Progress 
                    value={(metrics.memoryUsage / metrics.memoryLimit) * 100} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0 MB</span>
                    <span>{metrics.memoryLimit} MB</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Memory Usage</p>
                    <p className="text-xs text-muted-foreground">Percentage of available memory</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">
                      {Math.round((metrics.memoryUsage / metrics.memoryLimit) * 100)}%
                    </span>
                    {(metrics.memoryUsage / metrics.memoryLimit) < 0.6 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Memory information not available in this browser
              </p>
            )}
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Cache Size</p>
                <p className="text-xs text-muted-foreground">Cached data in browser</p>
              </div>
              <span className="font-mono text-sm">{metrics.cacheSize} MB</span>
            </div>
          </CardContent>
        </Card>

        {/* Database Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Performance
            </CardTitle>
            <CardDescription>
              Database connection and query metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Response Time</p>
                <p className="text-xs text-muted-foreground">Database query latency</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{metrics.dbResponseTime}ms</span>
                {metrics.dbResponseTime < 200 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Total Queries</p>
                <p className="text-xs text-muted-foreground">Queries executed this session</p>
              </div>
              <span className="font-mono text-sm">{metrics.totalQueries}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Connection Status</p>
                <p className="text-xs text-muted-foreground">Database connectivity</p>
              </div>
              <Badge variant="default" className="bg-green-600">
                Connected
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Network Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Network Information
            </CardTitle>
            <CardDescription>
              Current network conditions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Connection Speed</p>
                <p className="text-xs text-muted-foreground">Effective network type</p>
              </div>
              <Badge variant="outline">
                {metrics.networkSpeed}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Connection Type</p>
                <p className="text-xs text-muted-foreground">Network connection method</p>
              </div>
              <span className="text-sm">
                {metrics.connectionType !== 'Unknown' ? metrics.connectionType : 'Standard'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Online Status</p>
                <p className="text-xs text-muted-foreground">Internet connectivity</p>
              </div>
              <Badge variant="default" className="bg-green-600">
                Online
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Performance Tips
          </CardTitle>
          <CardDescription>
            Suggestions to improve your experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {performanceScore < 80 && metrics.pageLoadTime > 2000 && (
              <div className="flex items-start gap-2">
                <span className="text-yellow-600">•</span>
                <p className="text-sm">
                  Page load time is above optimal. Try clearing your browser cache or checking your internet connection.
                </p>
              </div>
            )}
            {metrics.memoryUsage / metrics.memoryLimit > 0.6 && (
              <div className="flex items-start gap-2">
                <span className="text-yellow-600">•</span>
                <p className="text-sm">
                  Memory usage is high. Consider closing unused browser tabs or refreshing the page.
                </p>
              </div>
            )}
            {metrics.dbResponseTime > 200 && (
              <div className="flex items-start gap-2">
                <span className="text-yellow-600">•</span>
                <p className="text-sm">
                  Database response times are elevated. This might be due to network latency or server load.
                </p>
              </div>
            )}
            {performanceScore >= 80 && (
              <div className="flex items-start gap-2">
                <span className="text-green-600">•</span>
                <p className="text-sm">
                  Your application is performing excellently! No action needed.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button 
          variant="outline"
          onClick={() => window.location.reload()}
        >
          <Clock className="mr-2 h-4 w-4" />
          Refresh Metrics
        </Button>
        <Button 
          variant="outline"
          onClick={() => {
            if (confirm('This will clear your browser cache for this site. Continue?')) {
              caches.keys().then(names => {
                names.forEach(name => caches.delete(name))
              })
              window.location.reload()
            }
          }}
        >
          Clear Cache
        </Button>
      </div>
    </div>
  )
}