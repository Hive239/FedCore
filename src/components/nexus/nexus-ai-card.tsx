'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Zap
} from 'lucide-react'
import { useAggregatedAnalytics } from '@/lib/hooks/use-nexus-analytics'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface NexusAICardProps {
  projectId?: string
  className?: string
  autoRefresh?: boolean
  refreshInterval?: number
  showDetailed?: boolean
}

// Skeleton loader for individual metrics
const MetricSkeleton = () => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-8" />
    </div>
    <Skeleton className="h-2 w-full" />
    <Skeleton className="h-3 w-16" />
  </div>
)

// Skeleton loader for the entire card
const NexusCardSkeleton = ({ className }: { className?: string }) => (
  <Card className={cn("animate-pulse", className)}>
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <MetricSkeleton />
        <MetricSkeleton />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <MetricSkeleton />
        <MetricSkeleton />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    </CardContent>
  </Card>
)

// Individual metric component with smooth transitions
const MetricDisplay = memo(({ 
  label, 
  value, 
  trend, 
  icon: Icon, 
  color = 'blue',
  suffix = '%',
  showProgress = true,
  isLoading = false 
}: {
  label: string
  value: number
  trend?: 'up' | 'down' | 'stable'
  icon: any
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  suffix?: string
  showProgress?: boolean
  isLoading?: boolean
}) => {
  const [displayValue, setDisplayValue] = useState(0)
  
  // Animate value changes
  useEffect(() => {
    if (isLoading) return
    
    let start = displayValue
    let end = value
    let duration = 1000 // 1 second animation
    let startTime: number
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const current = start + (end - start) * easeOutQuart
      
      setDisplayValue(Math.round(current))
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [value, isLoading])
  
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    red: 'text-red-600 bg-red-50',
    purple: 'text-purple-600 bg-purple-50'
  }
  
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-green-500" />
      case 'down': return <TrendingDown className="h-3 w-3 text-red-500" />
      default: return <Minus className="h-3 w-3 text-gray-500" />
    }
  }
  
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-600'
      case 'down': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }
  
  if (isLoading) {
    return <MetricSkeleton />
  }
  
  return (
    <div className="space-y-2 group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg", colorClasses[color])}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium text-gray-600">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg font-bold text-gray-900 transition-all duration-300 group-hover:scale-105">
            {displayValue}{suffix}
          </span>
          {trend && getTrendIcon()}
        </div>
      </div>
      {showProgress && (
        <>
          <Progress 
            value={displayValue} 
            className="h-2 transition-all duration-500"
            style={{
              background: `linear-gradient(to right, ${colorClasses[color].replace('text-', 'bg-').replace('600', '200')} 0%, transparent 100%)`
            }}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Performance</span>
            <span className={cn("text-xs font-medium", getTrendColor())}>
              {trend === 'up' ? '↗ Improving' : trend === 'down' ? '↘ Declining' : '→ Stable'}
            </span>
          </div>
        </>
      )}
    </div>
  )
})

MetricDisplay.displayName = 'MetricDisplay'

function NexusAICard({ 
  projectId, 
  className, 
  autoRefresh = true, 
  refreshInterval = 30000, // 30 seconds
  showDetailed = false 
}: NexusAICardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [errorCount, setErrorCount] = useState(0)
  
  const { 
    data: analytics, 
    isLoading, 
    error, 
    refetch 
  } = useAggregatedAnalytics(projectId)
  
  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(async () => {
      try {
        setIsRefreshing(true)
        await refetch()
        setLastRefresh(new Date())
        setErrorCount(0)
      } catch (error) {
        console.error('Auto-refresh failed:', error)
        setErrorCount(prev => prev + 1)
        
        // Stop auto-refresh after 3 consecutive errors
        if (errorCount >= 2) {
          toast({
            title: 'Auto-refresh disabled',
            description: 'Multiple refresh failures detected. Please refresh manually.',
            variant: 'destructive'
          })
          return
        }
      } finally {
        setIsRefreshing(false)
      }
    }, refreshInterval)
    
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, refetch, errorCount])
  
  const handleManualRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true)
      await refetch()
      setLastRefresh(new Date())
      setErrorCount(0)
      toast({
        title: 'Data refreshed',
        description: 'Nexus AI analytics have been updated'
      })
    } catch (error) {
      console.error('Manual refresh failed:', error)
      toast({
        title: 'Refresh failed',
        description: 'Unable to update analytics data',
        variant: 'destructive'
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [refetch])
  
  // Show skeleton during initial load
  if (isLoading && !analytics) {
    return <NexusCardSkeleton className={className} />
  }
  
  const getOverallStatus = () => {
    if (!analytics) return { status: 'unknown', color: 'gray', message: 'No data available' }
    
    const avgScore = (
      analytics.productivityScore + 
      analytics.scheduleAccuracy + 
      analytics.mlConfidence +
      analytics.resourceUtilization
    ) / 4
    
    if (avgScore >= 85) return { status: 'excellent', color: 'green', message: 'Excellent performance' }
    if (avgScore >= 70) return { status: 'good', color: 'blue', message: 'Good performance' }
    if (avgScore >= 50) return { status: 'fair', color: 'yellow', message: 'Fair performance' }
    return { status: 'poor', color: 'red', message: 'Needs attention' }
  }
  
  const status = getOverallStatus()
  
  return (
    <div className={cn("relative", className)}>
      {/* Refreshing overlay */}
      {isRefreshing && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50 rounded-lg">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-lg">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Updating...</span>
          </div>
        </div>
      )}
      
      <Card className="relative overflow-hidden">
        {/* Status indicator bar */}
        <div 
          className={cn(
            "absolute top-0 left-0 right-0 h-1",
            status.color === 'green' && 'bg-green-500',
            status.color === 'blue' && 'bg-blue-500',
            status.color === 'yellow' && 'bg-yellow-500',
            status.color === 'red' && 'bg-red-500',
            status.color === 'gray' && 'bg-gray-500'
          )}
        />
        
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                <span>Nexus AI Insights</span>
                {analytics?.conflictsDetected && analytics.conflictsDetected > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {analytics.conflictsDetected} conflicts
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <span>{status.message}</span>
                {status.status === 'excellent' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : status.status === 'poor' ? (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : (
                  <Activity className="h-4 w-4 text-blue-500" />
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="h-8 w-8"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Unable to load analytics</span>
              </div>
              <p className="text-xs text-red-600 mt-1">
                {error.message || 'Please try refreshing the data'}
              </p>
            </div>
          )}
          
          {analytics && (
            <>
              {/* Main metrics */}
              <div className="grid grid-cols-2 gap-4">
                <MetricDisplay
                  label="Productivity"
                  value={analytics.productivityScore}
                  trend="up"
                  icon={TrendingUp}
                  color="green"
                  isLoading={isLoading}
                />
                <MetricDisplay
                  label="Schedule Accuracy"
                  value={analytics.scheduleAccuracy}
                  trend="stable"
                  icon={Clock}
                  color="blue"
                  isLoading={isLoading}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <MetricDisplay
                  label="ML Confidence"
                  value={analytics.mlConfidence}
                  trend="up"
                  icon={Brain}
                  color="purple"
                  isLoading={isLoading}
                />
                <MetricDisplay
                  label="Resource Utilization"
                  value={analytics.resourceUtilization}
                  trend="stable"
                  icon={Zap}
                  color="yellow"
                  isLoading={isLoading}
                />
              </div>
              
              {/* Additional details */}
              {showDetailed && (
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Weather Risks</span>
                    <Badge variant={analytics.weatherRisks.length > 0 ? "destructive" : "secondary"}>
                      {analytics.weatherRisks.length} active
                    </Badge>
                  </div>
                  
                  {analytics.productivity.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <span className="text-xs text-gray-600">Top Performers</span>
                      {analytics.productivity.slice(0, 2).map((person, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span>{person.name}</span>
                          <span className="font-medium">{person.completedTasks} tasks</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Last updated */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
                <div className="flex items-center gap-1">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    error ? "bg-red-500" : "bg-green-500"
                  )} />
                  <span>{error ? 'Offline' : 'Live'}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default memo(NexusAICard)