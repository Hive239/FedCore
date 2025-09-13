'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Activity, AlertCircle, CheckCircle, Clock, Database, Globe, Zap, Info } from 'lucide-react'
import { nexusLiveIntegration } from '@/lib/nexus/live-integration'
import { getWebSocketClient } from '@/lib/websocket/client'
import { cn } from '@/lib/utils'

interface SystemStatus {
  nexus: {
    connected: boolean
    lastPrediction: string | null
    activeModels: any[]
  }
  database: {
    connected: boolean
    activeSubscriptions: string[]
  }
  websocket: {
    connected: boolean
    channels: string[]
  }
  cache: {
    stats: any
  }
  architecture: {
    lastAnalysis: string | null
    score: number
  }
}

export function NexusSystemStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    async function fetchStatus() {
      try {
        setIsUpdating(true)
        const systemStatus = await nexusLiveIntegration.getSystemStatus()
        setStatus(systemStatus)
        setError(null)
        setLastUpdated(new Date())
      } catch (err) {
        console.error('Error fetching system status:', err)
        setError('Failed to fetch system status')
      } finally {
        setLoading(false)
        setIsUpdating(false)
      }
    }

    // Initial fetch
    fetchStatus()

    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            NEXUS Live System Status
          </CardTitle>
          <CardDescription>Real-time monitoring of all integrated systems</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Skeleton loaders for each status section */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="pl-6 space-y-1">
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-32" />
                <div className="flex gap-1 mt-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            System Status Error
          </CardTitle>
          <CardDescription className="text-red-500">{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!status) return null

  const getStatusBadge = (connected: boolean, tooltip?: string) => {
    const badge = connected ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-200 transition-colors animate-fade-in">
        <CheckCircle className="h-3 w-3 mr-1" />
        Connected
      </Badge>
    ) : (
      <Badge variant="destructive" className="hover:bg-red-600 transition-colors animate-fade-in">
        <AlertCircle className="h-3 w-3 mr-1" />
        Disconnected
      </Badge>
    )

    return tooltip ? (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : badge
  }

  const getScoreBadge = (score: number, tooltip?: string) => {
    const getVariantAndIcon = (score: number) => {
      if (score >= 80) return { variant: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Excellent' }
      if (score >= 60) return { variant: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Good' }
      if (score >= 40) return { variant: 'bg-orange-100 text-orange-800', icon: AlertCircle, label: 'Needs Attention' }
      return { variant: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Critical' }
    }
    
    const { variant, icon: Icon, label } = getVariantAndIcon(score)
    
    const badge = (
      <Badge className={cn(variant, 'hover:opacity-80 transition-all animate-fade-in')}>
        <Icon className="h-3 w-3 mr-1" />
        {score}/100 ({label})
      </Badge>
    )

    return tooltip ? (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : badge
  }

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  return (
    <Card className="relative overflow-hidden">
      {/* Update indicator */}
      {isUpdating && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-500 to-blue-400 animate-pulse" />
      )}
      
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className={cn(
                "h-5 w-5 text-blue-600 transition-all", 
                isUpdating && "animate-spin"
              )} />
              NEXUS Live System Status
            </CardTitle>
            <CardDescription>
              Real-time monitoring of all integrated systems
            </CardDescription>
          </div>
          {lastUpdated && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Last updated</div>
              <div className="text-xs font-mono">
                {lastUpdated.toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* NEXUS TOP TIER Status */}
        <div className="space-y-2 transition-all animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-600" />
              <span className="font-medium">NEXUS TOP TIER ML</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Advanced machine learning models for predictive analytics and pattern recognition</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {getStatusBadge(status.nexus.connected, "Machine learning engine connectivity status")}
          </div>
          <div className="text-sm text-muted-foreground pl-6">
            <div>Last Prediction: {formatTime(status.nexus.lastPrediction)}</div>
            <div>Active Models: {status.nexus.activeModels.length}</div>
            {status.nexus.activeModels.map((model, i) => (
              <div key={i} className="ml-4 text-xs">
                • {model.model_name} v{model.version} 
                (Accuracy: {Math.round(model.accuracy_score * 100)}%)
              </div>
            ))}
          </div>
        </div>

        {/* Database Subscriptions */}
        <div className="space-y-2 transition-all animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Database Subscriptions</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Real-time database subscriptions for live data updates</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {getStatusBadge(status.database.connected, "Database subscription connectivity status")}
          </div>
          <div className="text-sm text-muted-foreground pl-6">
            <div>Active Channels: {status.database.activeSubscriptions.length}</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {status.database.activeSubscriptions.map(sub => (
                <Badge key={sub} variant="outline" className="text-xs">
                  {sub}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* WebSocket Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-green-600" />
              <span className="font-medium">WebSocket Real-time</span>
            </div>
            {getStatusBadge(status.websocket.connected)}
          </div>
          <div className="text-sm text-muted-foreground pl-6">
            <div>Active Channels: {status.websocket.channels.length}</div>
            {status.websocket.channels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {status.websocket.channels.map(channel => (
                  <Badge key={channel} variant="outline" className="text-xs">
                    {channel}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Enterprise Architecture */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="font-medium">Enterprise Architecture</span>
            </div>
            {getScoreBadge(status.architecture.score)}
          </div>
          <div className="text-sm text-muted-foreground pl-6">
            <div>Last Analysis: {formatTime(status.architecture.lastAnalysis)}</div>
            <div>Production Readiness: {status.architecture.score}%</div>
          </div>
        </div>

        {/* Cache Statistics */}
        <div className="space-y-2 transition-all animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-600" />
              <span className="font-medium">Cache Performance</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Application cache performance metrics and memory usage</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {(() => {
              const hitRate = status.cache.stats.hitRate || 0
              const variant = hitRate >= 80 ? 'bg-green-100 text-green-800' : 
                            hitRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                            hitRate >= 40 ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
              return (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className={cn(variant, "hover:opacity-80 transition-all animate-fade-in")}>
                        Hit Rate: {hitRate}%
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Cache hit rate indicates how often requested data is found in cache vs fetched from source</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            })()}
          </div>
          <div className="text-sm text-muted-foreground pl-6">
            <div>Total Entries: {status.cache.stats.size || 0}</div>
            <div>Memory Used: {status.cache.stats.memoryUsed || 0} MB</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, (status.cache.stats.hitRate || 0))}%` }}
                />
              </div>
              <span className="text-xs">{status.cache.stats.hitRate || 0}% hit rate</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}