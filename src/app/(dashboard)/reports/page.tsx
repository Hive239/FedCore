"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Calendar,
  CloudRain,
  Clock,
  FileText,
  TrendingUp,
  Users,
  AlertTriangle,
  Activity,
  Brain,
  Zap,
  Target,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useProjects } from '@/lib/hooks/use-projects'
import { useNexusData, useSubmitMLFeedback } from '@/lib/hooks/use-nexus'
import { format } from 'date-fns'
import { toast } from '@/hooks/use-toast'
import GanttChartPro from '@/components/reports/gantt-chart-pro'

interface NexusMetric {
  label: string
  value: string | number
  change: number
  changeLabel: string
  icon: React.ElementType
}

export default function ReportsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const { data: projectsData } = useProjects()
  const projects = projectsData?.data || []
  
  // Fetch real Nexus data
  const { 
    metrics, 
    weatherRisks, 
    conflicts, 
    productivity, 
    insights, 
    isLoading 
  } = useNexusData(selectedProjectId)
  
  const submitFeedback = useSubmitMLFeedback()
  
  // Build metrics display
  const nexusMetrics: NexusMetric[] = metrics ? [
    {
      label: 'Productivity Score',
      value: metrics.productivityScore ? `${metrics.productivityScore}%` : '0%',
      change: 5.2,
      changeLabel: 'vs last period',
      icon: TrendingUp
    },
    {
      label: 'Schedule Accuracy',
      value: `${metrics.scheduleAccuracy}%`,
      change: -2.1,
      changeLabel: 'vs last period',
      icon: Target
    },
    {
      label: 'Conflicts Detected',
      value: metrics.conflictsDetected || 0,
      change: -40,
      changeLabel: 'active conflicts',
      icon: AlertTriangle
    },
    {
      label: 'ML Confidence',
      value: `${metrics.mlConfidence}%`,
      change: 1.8,
      changeLabel: 'model accuracy',
      icon: Brain
    }
  ] : []

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const handleFeedback = async (accurate: boolean) => {
    try {
      await submitFeedback.mutateAsync({
        feedbackType: 'accuracy_rating',
        feedbackData: { accurate, context: 'weather_prediction' },
        rating: accurate ? 5 : 2
      })
      toast({
        title: 'Thank you!',
        description: 'Your feedback helps improve our predictions',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit feedback',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="text-center flex-1">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">Nexus Reports</h1>
          <p className="text-gray-600 text-lg">
            AI-powered analytics and insights for your construction projects
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[200px] bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600">
            <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
              <SelectTrigger className="w-[150px] bg-white/80 backdrop-blur-sm border-0 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300">
            <Button variant="outline" className="bg-white/90 backdrop-blur-sm border-0 text-purple-700 hover:bg-purple-50 font-semibold rounded-xl">
              <FileText className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {/* Nexus Engine Status */}
      <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
        <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <CardTitle>Nexus Engine Status</CardTitle>
            </div>
            <Badge className="bg-green-100 text-green-800">
              <Activity className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </div>
          <CardDescription>
            Real-time ML-powered analytics processing {selectedProjectId === 'all' ? 'all projects' : 'selected project'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading analytics...</div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-4">
              {nexusMetrics.map((metric, index) => {
                const Icon = metric.icon
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                      <Icon className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold">{metric.value}</p>
                      <span className={`text-xs ${metric.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {metric.change > 0 ? '+' : ''}{metric.change}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{metric.changeLabel}</p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="analytics" className="space-y-4">
        <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600">
          <TabsList className="grid w-full grid-cols-5 bg-white/80 backdrop-blur-sm border-0 rounded-xl">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="gantt">Gantt View</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="analytics" className="space-y-4">
          {/* ML Learning Progress */}
          <div className="p-[2px] rounded-xl bg-gradient-to-br from-purple-400 via-pink-300 to-purple-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
            <Card className="bg-gradient-to-r from-purple-50/90 to-pink-50/90 backdrop-blur-sm border-0 rounded-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  ML Learning Progress
                </CardTitle>
                <Badge variant="outline" className="bg-white/50">
                  <Activity className="h-3 w-3 mr-1" />
                  Live Learning
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Patterns Learned</p>
                  <p className="text-2xl font-bold text-purple-700">1,847</p>
                  <Progress value={87} className="h-2" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Accuracy Rate</p>
                  <p className="text-2xl font-bold text-purple-700">94.2%</p>
                  <Progress value={94} className="h-2" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Predictions Made</p>
                  <p className="text-2xl font-bold text-purple-700">3,259</p>
                  <Progress value={78} className="h-2" />
                </div>
              </div>
              <div className="mt-4 p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Latest Learning:</span> Foundation-to-framing sequence optimized based on 47 recent projects
                </p>
              </div>
            </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Schedule Conflicts */}
            <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
              <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Schedule Conflicts Detected
                </CardTitle>
                <CardDescription>
                  AI-detected scheduling issues requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {conflicts && conflicts.length > 0 ? conflicts.map(conflict => (
                    <div key={conflict.id} className="p-[1px] rounded-lg bg-gradient-to-br from-white via-orange-100 to-orange-300 hover:shadow-md transition-all duration-200">
                      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={getSeverityColor(conflict.severity)}>
                              {conflict.severity}
                            </Badge>
                            <span className="text-sm font-medium">{conflict.type}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{conflict.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Affects {conflict.affectedTasks?.length || 0} tasks
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Zap className="h-3 w-3 text-purple-600" />
                        <p className="text-xs font-medium text-purple-600">
                          Suggested: {conflict.suggestedAction}
                        </p>
                      </div>
                      </div>
                    </div>
                  )) : (
                    <div className="p-4 text-center text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No conflicts detected</p>
                      <p className="text-xs mt-1">The system is monitoring for scheduling issues</p>
                    </div>
                  )}
                </div>
              </CardContent>
              </Card>
            </div>

            {/* Weather Impact Analysis */}
            <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
              <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CloudRain className="h-5 w-5 text-blue-500" />
                  Weather Impact Forecast
                </CardTitle>
                <CardDescription>
                  7-day weather risk assessment for outdoor activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {weatherRisks && weatherRisks.length > 0 ? weatherRisks.map((risk, index) => (
                    <div key={index} className="p-[1px] rounded-lg bg-gradient-to-br from-white via-blue-100 to-blue-300 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between p-3 bg-white/90 backdrop-blur-sm rounded-lg">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {format(new Date(risk.date), 'EEEE, MMM d')}
                        </p>
                        <p className="text-xs text-muted-foreground">{risk.impact}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getRiskColor(risk.risk)}>
                          {risk.risk} risk
                        </Badge>
                        <div className="text-right">
                          <p className="text-sm font-medium">{risk.tasksAffected || 0}</p>
                          <p className="text-xs text-muted-foreground">tasks affected</p>
                        </div>
                      </div>
                      </div>
                    </div>
                  )) : (
                    <div className="p-4 text-center text-muted-foreground">
                      <CloudRain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No weather data available</p>
                      <p className="text-xs mt-1">Weather monitoring will begin when location data is provided</p>
                    </div>
                  )}
                </div>
              </CardContent>
              </Card>
            </div>
          </div>

          {/* Task Completion Trends */}
          <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
            <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
            <CardHeader>
              <CardTitle>Task Completion Trends</CardTitle>
              <CardDescription>
                Weekly task completion rates and project velocity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <BarChart className="h-8 w-8 mr-2" />
                Chart visualization will be rendered here
              </div>
            </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]">
            <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
            <CardHeader>
              <CardTitle>ML Predictions Dashboard</CardTitle>
              <CardDescription>
                Machine learning predictions for project outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <div className="space-y-2 p-4 bg-white/80 backdrop-blur-sm rounded-xl">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Project Completion</p>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">Sept 15, 2025</p>
                  <Progress value={78} className="h-2" />
                  <p className="text-xs text-muted-foreground">78% confidence</p>
                  </div>
                </div>
                <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <div className="space-y-2 p-4 bg-white/80 backdrop-blur-sm rounded-xl">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Budget Utilization</p>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">$487,250</p>
                  <Progress value={82} className="h-2" />
                  <p className="text-xs text-muted-foreground">82% of budget</p>
                  </div>
                </div>
                <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <div className="space-y-2 p-4 bg-white/80 backdrop-blur-sm rounded-xl">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Risk Score</p>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">Low</p>
                  <Progress value={25} className="h-2" />
                  <p className="text-xs text-muted-foreground">25/100 risk index</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        <TabsContent value="productivity" className="space-y-4">
          <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300">
            <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
            <CardHeader>
              <CardTitle>Team Productivity Scores</CardTitle>
              <CardDescription>
                AI-calculated productivity metrics for team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productivity && productivity.length > 0 ? productivity.map(member => (
                  <div key={member.userId} className="p-[1px] rounded-lg bg-gradient-to-br from-white via-purple-100 to-purple-300 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between p-4 bg-white/90 backdrop-blur-sm rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.completedTasks} tasks | Avg: {member.avgDuration ? `${Math.round(member.avgDuration)}h` : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold">{member.score}</span>
                          {member.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
                          {member.trend === 'down' && <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />}
                        </div>
                        <p className="text-xs text-muted-foreground">Productivity Score</p>
                      </div>
                      <Progress value={member.score} className="w-24" />
                    </div>
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No productivity data available yet</p>
                    <p className="text-xs mt-1">Complete tasks to start tracking productivity metrics</p>
                  </div>
                )}
              </div>
            </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="gantt" className="space-y-4">
          <GanttChartPro projectId={selectedProjectId} />
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300">
            <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                AI-Generated Insights
              </CardTitle>
              <CardDescription>
                Nexus Engine's intelligent analysis and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights && insights.length > 0 ? insights.map(insight => {
                  const getInsightStyle = () => {
                    switch (insight.type) {
                      case 'efficiency': 
                        return {
                          border: 'border-green-500',
                          bg: 'bg-green-50',
                          icon: CheckCircle,
                          iconColor: 'text-green-600',
                          titleColor: 'text-green-900',
                          textColor: 'text-green-800',
                          confidenceColor: 'text-green-600'
                        }
                      case 'warning': 
                        return {
                          border: 'border-yellow-500',
                          bg: 'bg-yellow-50',
                          icon: AlertTriangle,
                          iconColor: 'text-yellow-600',
                          titleColor: 'text-yellow-900',
                          textColor: 'text-yellow-800',
                          confidenceColor: 'text-yellow-600'
                        }
                      case 'risk': 
                        return {
                          border: 'border-red-500',
                          bg: 'bg-red-50',
                          icon: XCircle,
                          iconColor: 'text-red-600',
                          titleColor: 'text-red-900',
                          textColor: 'text-red-800',
                          confidenceColor: 'text-red-600'
                        }
                      case 'opportunity': 
                        return {
                          border: 'border-blue-500',
                          bg: 'bg-blue-50',
                          icon: TrendingUp,
                          iconColor: 'text-blue-600',
                          titleColor: 'text-blue-900',
                          textColor: 'text-blue-800',
                          confidenceColor: 'text-blue-600'
                        }
                      default: 
                        return {
                          border: 'border-purple-500',
                          bg: 'bg-purple-50',
                          icon: Target,
                          iconColor: 'text-purple-600',
                          titleColor: 'text-purple-900',
                          textColor: 'text-purple-800',
                          confidenceColor: 'text-purple-600'
                        }
                    }
                  }
                  const style = getInsightStyle()
                  const Icon = style.icon
                  
                  return (
                    <div key={insight.id} className="p-[1px] rounded-lg bg-gradient-to-br from-white via-purple-100 to-purple-300 hover:shadow-md transition-all duration-200">
                      <div className={`p-4 border-l-4 ${style.border} ${style.bg} rounded-lg`}>
                      <div className="flex items-start gap-3">
                        <Icon className={`h-5 w-5 ${style.iconColor} mt-0.5`} />
                        <div>
                          <p className={`font-medium ${style.titleColor}`}>{insight.title}</p>
                          <p className={`text-sm ${style.textColor} mt-1`}>
                            {insight.description}
                          </p>
                          {insight.confidence && (
                            <p className={`text-xs ${style.confidenceColor} mt-2`}>
                              Confidence: {Math.round(insight.confidence * 100)}%
                            </p>
                          )}
                        </div>
                      </div>
                      </div>
                    </div>
                  )
                }) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Gathering data for AI insights</p>
                    <p className="text-xs mt-1">Insights will appear as you log more project activity</p>
                  </div>
                )}
              </div>
            </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Feedback Loop */}
      <div className="p-[2px] rounded-xl bg-gradient-to-br from-white via-purple-200 to-purple-600 hover:shadow-2xl transition-all duration-300">
        <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-xl">
        <CardHeader>
          <CardTitle>Continuous Learning Feedback</CardTitle>
          <CardDescription>
            Help improve Nexus Engine predictions by providing feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <p className="text-sm font-medium">Was this week's weather prediction accurate?</p>
              <p className="text-xs text-muted-foreground">Your feedback helps improve our ML models</p>
            </div>
            <div className="flex gap-2">
              <div className="p-[1px] rounded-lg bg-gradient-to-br from-white via-red-200 to-red-400 hover:shadow-md transition-all duration-200">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-white/90 border-0 rounded-lg hover:bg-red-50"
                  onClick={() => handleFeedback(false)}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  No
                </Button>
              </div>
              <div className="p-[1px] rounded-lg bg-gradient-to-br from-white via-green-200 to-green-400 hover:shadow-md transition-all duration-200">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-white/90 border-0 rounded-lg hover:bg-green-50"
                  onClick={() => handleFeedback(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Yes
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
        </Card>
      </div>
    </div>
  )
}