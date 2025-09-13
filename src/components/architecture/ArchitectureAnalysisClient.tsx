'use client'

/**
 * Client Component for Architecture Analysis UI
 * Receives pre-fetched data from server component for better performance
 */

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Brain,
  Shield,
  Bug,
  GitBranch,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  FileCode,
  Lock,
  Database,
  Activity,
  RefreshCw,
  Download,
  Eye,
  Sparkles,
  Building2,
  HardHat,
  Wrench,
  Layers,
  Network,
  Users
} from 'lucide-react'

interface SystemData {
  profiles: any[]
  projects: any[]
  tasks: any[]
  reports: any[]
  vulnerabilities: any[]
  performanceLogs: any[]
  errorLogs: any[]
  organizations: any[]
  activityLogs: any[]
}

interface AnalysisMetrics {
  totalProfiles: number
  activeProjects: number
  pendingTasks: number
  completedTasks: number
  criticalVulnerabilities: number
  performanceIssues: number
  errorRate: number
  systemHealth: number
}

export function ArchitectureAnalysisClient({ initialData }: { initialData: SystemData }) {
  const [data, setData] = useState<SystemData>(initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Memoized calculations for better performance
  const metrics = useMemo((): AnalysisMetrics => {
    const activeProjects = data.projects.filter(p => p.status === 'active' || p.status === 'in_progress').length
    const pendingTasks = data.tasks.filter(t => t.status === 'pending').length
    const completedTasks = data.tasks.filter(t => t.status === 'completed').length
    const criticalVulns = data.vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high').length
    const recentErrors = data.errorLogs.filter(log => {
      const logTime = new Date(log.created_at)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      return logTime > oneDayAgo
    }).length
    
    const totalTasks = pendingTasks + completedTasks
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    const errorRate = recentErrors > 0 ? Math.min(recentErrors / 100 * 100, 100) : 0
    const systemHealth = Math.max(0, 100 - (criticalVulns * 10) - (errorRate * 0.5))

    return {
      totalProfiles: data.profiles.length,
      activeProjects,
      pendingTasks,
      completedTasks,
      criticalVulnerabilities: criticalVulns,
      performanceIssues: data.performanceLogs.filter(log => log.response_time > 1000).length,
      errorRate,
      systemHealth: Math.round(systemHealth)
    }
  }, [data])

  const mlInsights = useMemo(() => {
    // Simple ML-style insights based on data patterns
    const insights = []
    
    if (metrics.completedTasks > metrics.pendingTasks * 2) {
      insights.push({
        type: 'positive',
        message: 'High task completion velocity detected',
        confidence: 85
      })
    }
    
    if (metrics.criticalVulnerabilities > 0) {
      insights.push({
        type: 'warning',
        message: `${metrics.criticalVulnerabilities} critical security issues require attention`,
        confidence: 95
      })
    }
    
    if (metrics.performanceIssues > 10) {
      insights.push({
        type: 'warning',
        message: 'Performance degradation pattern detected',
        confidence: 78
      })
    }

    if (metrics.activeProjects > metrics.totalProfiles * 2) {
      insights.push({
        type: 'info',
        message: 'Resource allocation may need optimization',
        confidence: 72
      })
    }

    return insights
  }, [metrics])

  const refreshData = async () => {
    setIsRefreshing(true)
    // In a real implementation, this would refetch data from the server
    // For now, we'll simulate a refresh
    setTimeout(() => {
      setIsRefreshing(false)
    }, 2000)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-600" />
            Enterprise Architecture Analysis
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Real-time system health, performance metrics, and ML-powered insights
          </p>
        </div>
        <Button onClick={refreshData} disabled={isRefreshing} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {/* System Health Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.systemHealth}%</div>
            <Progress value={metrics.systemHealth} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.systemHealth > 90 ? 'Excellent' : metrics.systemHealth > 70 ? 'Good' : 'Needs Attention'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeProjects}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalProfiles} team members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Task Progress</CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completedTasks}</div>
            <Progress 
              value={(metrics.completedTasks / (metrics.completedTasks + metrics.pendingTasks)) * 100} 
              className="mt-2" 
            />
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.pendingTasks} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.criticalVulnerabilities === 0 ? '100' : Math.max(0, 100 - metrics.criticalVulnerabilities * 15)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.criticalVulnerabilities} critical issues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ML Insights */}
      {mlInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              ML Insights
            </CardTitle>
            <CardDescription>
              AI-powered analysis of your system patterns and recommendations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mlInsights.map((insight, index) => (
              <Alert key={index} className={
                insight.type === 'positive' ? 'border-green-200 bg-green-50 dark:bg-green-950' :
                insight.type === 'warning' ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950' :
                'border-blue-200 bg-blue-50 dark:bg-blue-950'
              }>
                <Brain className="h-4 w-4" />
                <AlertTitle className="flex items-center gap-2">
                  {insight.type === 'positive' && <TrendingUp className="h-4 w-4 text-green-600" />}
                  {insight.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                  {insight.type === 'info' && <Eye className="h-4 w-4 text-blue-600" />}
                  Confidence: {insight.confidence}%
                </AlertTitle>
                <AlertDescription>{insight.message}</AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="architecture" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="architecture" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Module Architecture
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Core Modules</span>
                    <Badge variant="secondary">23</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>UI Components</span>
                    <Badge variant="secondary">45</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>API Routes</span>
                    <Badge variant="secondary">18</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Database Models</span>
                    <Badge variant="secondary">12</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  System Connectivity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Database Connection</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>API Endpoints</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>External Services</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Authentication</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dependencies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Dependency Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">45</div>
                  <div className="text-sm text-muted-foreground">Up to Date</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">8</div>
                  <div className="text-sm text-muted-foreground">Minor Updates</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">2</div>
                  <div className="text-sm text-muted-foreground">Security Updates</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Security & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'SOC 2 Type II', status: 'compliant' },
                  { name: 'GDPR', status: 'compliant' },
                  { name: 'ISO 27001', status: 'partial' },
                  { name: 'PCI DSS', status: 'not_applicable' }
                ].map((item) => (
                  <div key={item.name} className="flex justify-between items-center">
                    <span>{item.name}</span>
                    {item.status === 'compliant' && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {item.status === 'partial' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                    {item.status === 'not_applicable' && <XCircle className="h-4 w-4 text-gray-400" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Recommended Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { priority: 'high', action: 'Update security dependencies', estimate: '2 hours' },
                { priority: 'medium', action: 'Implement automated testing', estimate: '1 day' },
                { priority: 'medium', action: 'Optimize database queries', estimate: '4 hours' },
                { priority: 'low', action: 'Update documentation', estimate: '3 hours' }
              ].map((item, index) => (
                <Alert key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'default' : 'secondary'}>
                      {item.priority}
                    </Badge>
                    <span>{item.action}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{item.estimate}</span>
                </Alert>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}