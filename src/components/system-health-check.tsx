'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Database,
  Brain,
  Zap,
  Shield,
  Activity,
  Clock
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'

interface HealthCheck {
  name: string
  status: 'healthy' | 'warning' | 'error' | 'checking'
  message: string
  details?: string
  metrics?: Record<string, number>
}

export function SystemHealthCheck() {
  const [checks, setChecks] = useState<HealthCheck[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [overallScore, setOverallScore] = useState(0)

  const runHealthChecks = async () => {
    setIsRunning(true)
    const healthChecks: HealthCheck[] = []
    
    try {
      // 1. Database Connection Check
      healthChecks.push({ name: 'Database Connection', status: 'checking', message: 'Testing...' })
      setChecks([...healthChecks])
      
      const supabase = createClient()
      const { data, error } = await supabase.from('profiles').select('count').limit(1)
      
      if (error) {
        healthChecks[0] = {
          name: 'Database Connection',
          status: 'error',
          message: 'Database connection failed',
          details: error.message
        }
      } else {
        healthChecks[0] = {
          name: 'Database Connection',
          status: 'healthy',
          message: 'Database connected successfully'
        }
      }

      // 2. ML Models Check
      healthChecks.push({ name: 'ML Models', status: 'checking', message: 'Checking models...' })
      setChecks([...healthChecks])
      
      const { data: models, error: modelsError } = await supabase
        .from('ml_models')
        .select('*')
        .eq('is_active', true)
      
      if (modelsError || !models || models.length === 0) {
        healthChecks[1] = {
          name: 'ML Models',
          status: 'warning',
          message: 'No active ML models found',
          details: modelsError?.message || 'Models may need to be initialized'
        }
      } else {
        const avgAccuracy = models.reduce((sum, m) => sum + (m.accuracy_score || 0), 0) / models.length
        healthChecks[1] = {
          name: 'ML Models',
          status: avgAccuracy > 0.8 ? 'healthy' : 'warning',
          message: `${models.length} models active`,
          metrics: {
            'Active Models': models.length,
            'Average Accuracy': Math.round(avgAccuracy * 100)
          }
        }
      }

      // 3. ML Predictions API Check
      healthChecks.push({ name: 'ML Predictions API', status: 'checking', message: 'Testing API...' })
      setChecks([...healthChecks])
      
      try {
        const response = await fetch('/api/ml/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model_type: 'anomaly_detection',
            input_data: { test: 'health_check' }
          })
        })
        
        const result = await response.json()
        
        if (result.success) {
          healthChecks[2] = {
            name: 'ML Predictions API',
            status: 'healthy',
            message: 'API responding correctly',
            metrics: {
              'Response Time': Math.round(performance.now()),
              'Confidence': Math.round((result.confidence || 0) * 100)
            }
          }
        } else {
          healthChecks[2] = {
            name: 'ML Predictions API',
            status: 'warning',
            message: 'API returned error',
            details: result.error
          }
        }
      } catch (apiError) {
        healthChecks[2] = {
          name: 'ML Predictions API',
          status: 'error',
          message: 'API connection failed',
          details: String(apiError)
        }
      }

      // 4. Cache System Check
      healthChecks.push({ name: 'Cache System', status: 'checking', message: 'Testing cache...' })
      setChecks([...healthChecks])
      
      try {
        // Test unified cache manager
        const { cacheManager } = await import('@/lib/cache/unified-cache')
        await cacheManager.set('health_check', 'test', 60)
        const cached = await cacheManager.get('health_check')
        
        if (cached === 'test') {
          healthChecks[3] = {
            name: 'Cache System',
            status: 'healthy',
            message: 'Cache working properly'
          }
        } else {
          healthChecks[3] = {
            name: 'Cache System',
            status: 'warning',
            message: 'Cache not storing data correctly'
          }
        }
      } catch (cacheError) {
        healthChecks[3] = {
          name: 'Cache System',
          status: 'error',
          message: 'Cache system failed',
          details: String(cacheError)
        }
      }

      // 5. Performance Metrics Check
      healthChecks.push({ name: 'Performance Metrics', status: 'checking', message: 'Checking metrics...' })
      setChecks([...healthChecks])
      
      const { data: metrics } = await supabase
        .from('performance_metrics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (metrics && metrics.length > 0) {
        const avgPageLoad = metrics.reduce((sum, m) => sum + (m.page_load_time || 0), 0) / metrics.length
        healthChecks[4] = {
          name: 'Performance Metrics',
          status: avgPageLoad < 3000 ? 'healthy' : 'warning',
          message: `${metrics.length} recent metrics`,
          metrics: {
            'Avg Page Load': Math.round(avgPageLoad),
            'Recent Entries': metrics.length
          }
        }
      } else {
        healthChecks[4] = {
          name: 'Performance Metrics',
          status: 'warning',
          message: 'No performance metrics found'
        }
      }

      // 6. Environment Configuration Check
      healthChecks.push({ name: 'Environment Config', status: 'checking', message: 'Checking config...' })
      setChecks([...healthChecks])
      
      const requiredEnvVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'NEXT_PUBLIC_OPENWEATHER_API_KEY'
      ]
      
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
      
      if (missingVars.length === 0) {
        healthChecks[5] = {
          name: 'Environment Config',
          status: 'healthy',
          message: 'All required environment variables set'
        }
      } else {
        healthChecks[5] = {
          name: 'Environment Config',
          status: 'error',
          message: `Missing ${missingVars.length} environment variables`,
          details: `Missing: ${missingVars.join(', ')}`
        }
      }

      // Calculate overall health score
      const healthyCount = healthChecks.filter(c => c.status === 'healthy').length
      const warningCount = healthChecks.filter(c => c.status === 'warning').length
      const errorCount = healthChecks.filter(c => c.status === 'error').length
      
      const score = Math.round(
        (healthyCount * 100 + warningCount * 60 + errorCount * 20) / healthChecks.length
      )
      
      setOverallScore(score)
      setChecks(healthChecks)
      
      // Show toast with results
      if (score >= 90) {
        toast({
          title: 'System Health Check Complete',
          description: `Excellent health score: ${score}/100`
        })
      } else if (score >= 70) {
        toast({
          title: 'System Health Check Complete',
          description: `Good health score: ${score}/100. Some warnings detected.`
        })
      } else {
        toast({
          title: 'System Health Issues',
          description: `Health score: ${score}/100. Please review errors.`,
          variant: 'destructive'
        })
      }

    } catch (error) {
      console.error('Health check failed:', error)
      toast({
        title: 'Health Check Failed',
        description: 'Unable to complete system health check',
        variant: 'destructive'
      })
    } finally {
      setIsRunning(false)
    }
  }

  useEffect(() => {
    runHealthChecks()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'checking':
        return <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
      default:
        return <Activity className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'checking':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-4">
      {/* Overall Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Health Check
            </span>
            <Button onClick={runHealthChecks} disabled={isRunning} size="sm">
              {isRunning ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                'Run Check'
              )}
            </Button>
          </CardTitle>
          <CardDescription>
            Comprehensive system health and performance analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-3xl font-bold">{overallScore}/100</div>
              <div className="text-sm text-muted-foreground">
                {overallScore >= 90 ? 'Excellent' : 
                 overallScore >= 80 ? 'Good' : 
                 overallScore >= 70 ? 'Fair' : 'Needs Attention'}
              </div>
            </div>
            <div className="text-right">
              <Progress value={overallScore} className="w-32 h-3 mb-1" />
              <div className="text-xs text-muted-foreground">
                Overall Health
              </div>
            </div>
          </div>
          
          <div className="grid gap-2 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-green-500 rounded-full" />
              <span className="text-sm">
                {checks.filter(c => c.status === 'healthy').length} Healthy
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-yellow-500 rounded-full" />
              <span className="text-sm">
                {checks.filter(c => c.status === 'warning').length} Warnings
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-red-500 rounded-full" />
              <span className="text-sm">
                {checks.filter(c => c.status === 'error').length} Errors
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Health Checks */}
      <div className="grid gap-3 md:grid-cols-2">
        {checks.map((check, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getStatusIcon(check.status)}
                  <div className="flex-1">
                    <div className="font-medium">{check.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {check.message}
                    </div>
                    {check.details && (
                      <div className="text-xs text-red-600 mt-1">
                        {check.details}
                      </div>
                    )}
                    {check.metrics && (
                      <div className="mt-2 space-y-1">
                        {Object.entries(check.metrics).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Badge className={getStatusColor(check.status)}>
                  {check.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}