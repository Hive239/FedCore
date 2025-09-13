'use client'

import { useEffect, useState, useMemo, useCallback, memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap, 
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  LineChart,
  PieChart
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useExpensiveMemo, useStableCallback } from '@/lib/performance/react-optimizations'

interface ModelMetrics {
  name: string
  version: string
  accuracy: number
  predictions_today: number
  avg_confidence: number
  feedback_score: number
  status: 'active' | 'training' | 'inactive'
  trend: 'up' | 'down' | 'stable'
}

interface PredictionStats {
  total: number
  today: number
  this_week: number
  avg_confidence: number
  by_type: Record<string, number>
}

function MLPerformanceDashboard() {
  const [models, setModels] = useState<ModelMetrics[]>([])
  const [predictions, setPredictions] = useState<PredictionStats | null>(null)
  const [feedback, setFeedback] = useState({ positive: 0, negative: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadDashboardData()
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = useStableCallback(async function loadDashboardData() {
    try {
      // Load ML models
      const { data: mlModels } = await supabase
        .from('ml_models')
        .select('*')
        .eq('is_active', true)
        .order('accuracy_score', { ascending: false })

      // Load predictions
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)

      const { data: allPredictions, count } = await supabase
        .from('predictions_cache')
        .select('*', { count: 'exact' })
        .gte('created_at', weekAgo.toISOString())

      const { data: todayPredictions } = await supabase
        .from('predictions_cache')
        .select('*')
        .gte('created_at', today.toISOString())

      // Load feedback
      const { data: feedbackData } = await supabase
        .from('ml_feedback')
        .select('user_action')
        .gte('created_at', weekAgo.toISOString())

      // Process model metrics
      if (mlModels) {
        const modelMetrics: ModelMetrics[] = await Promise.all(
          mlModels.map(async (model) => {
            const { count: modelPredCount } = await supabase
              .from('predictions_cache')
              .select('*', { count: 'exact', head: true })
              .eq('model_type', model.model_name)
              .gte('created_at', today.toISOString())

            const { data: modelPreds } = await supabase
              .from('predictions_cache')
              .select('confidence_score')
              .eq('model_type', model.model_name)
              .limit(10)

            const avgConfidence = modelPreds?.length 
              ? modelPreds.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / modelPreds.length
              : 0

            // Calculate real feedback score from ml_feedback table
            const { data: modelFeedback } = await supabase
              .from('ml_feedback')
              .select('user_action')
              .eq('principle_id', model.model_type)
              .gte('created_at', weekAgo.toISOString())

            const feedbackScore = modelFeedback?.length 
              ? modelFeedback.filter(f => f.user_action === 'accepted').length / modelFeedback.length
              : 0

            return {
              name: model.model_name,
              version: model.version,
              accuracy: model.accuracy_score || 0,
              predictions_today: modelPredCount || 0,
              avg_confidence: avgConfidence,
              feedback_score: feedbackScore,
              status: model.training_status === 'training' ? 'training' : model.is_active ? 'active' : 'inactive',
              trend: avgConfidence > 0.8 ? 'up' : avgConfidence > 0.6 ? 'stable' : 'down'
            }
          })
        )
        setModels(modelMetrics)
      }

      // Process prediction stats
      if (allPredictions) {
        const byType: Record<string, number> = {}
        let totalConfidence = 0
        
        allPredictions.forEach(pred => {
          byType[pred.prediction_type] = (byType[pred.prediction_type] || 0) + 1
          totalConfidence += pred.confidence_score || 0
        })

        setPredictions({
          total: count || 0,
          today: todayPredictions?.length || 0,
          this_week: allPredictions.length,
          avg_confidence: allPredictions.length ? totalConfidence / allPredictions.length : 0,
          by_type: byType
        })
      }

      // Process feedback
      if (feedbackData) {
        const positive = feedbackData.filter(f => f.user_action === 'accepted').length
        const negative = feedbackData.filter(f => f.user_action === 'rejected').length
        setFeedback({
          positive,
          negative,
          total: feedbackData.length
        })
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading dashboard:', error)
      setLoading(false)
    }
  }, [], 'loadDashboardData')

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'training': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }, [])

  const getTrendIcon = useCallback((trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />
      default: return <Activity className="h-4 w-4 text-gray-600" />
    }
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            ML Performance Dashboard
          </CardTitle>
          <CardDescription>Loading metrics...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Models
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{models.length}</span>
              <Badge className="bg-green-100 text-green-800">Online</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Predictions Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{predictions?.today || 0}</span>
              <span className="text-sm text-muted-foreground">
                / {predictions?.this_week || 0} this week
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {((predictions?.avg_confidence || 0) * 100).toFixed(0)}%
              </span>
              {predictions?.avg_confidence && predictions.avg_confidence > 0.8 && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
            </div>
            <Progress 
              value={(predictions?.avg_confidence || 0) * 100} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              User Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {feedback.total > 0 
                  ? `${((feedback.positive / feedback.total) * 100).toFixed(0)}%`
                  : 'N/A'}
              </span>
              <span className="text-sm text-muted-foreground">positive</span>
            </div>
            <div className="flex gap-2 mt-2 text-xs">
              <span className="text-green-600">👍 {feedback.positive}</span>
              <span className="text-red-600">👎 {feedback.negative}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Models Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Model Performance
          </CardTitle>
          <CardDescription>
            Real-time performance metrics for all active ML models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {models.map((model) => (
              <ModelPerformanceCard
                key={model.name}
                model={model}
                isSelected={selectedModel}
                onToggleSelect={setSelectedModel}
                getTrendIcon={getTrendIcon}
                getStatusColor={getStatusColor}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Prediction Types Distribution */}
      {predictions?.by_type && Object.keys(predictions.by_type).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Prediction Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(predictions.by_type).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium capitalize">
                    {type.replace(/_/g, ' ')}
                  </span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Training Pipeline Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Training Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Next Training Cycle</span>
              </div>
              <Badge variant="outline">In 2 days</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Training Data Size</span>
              </div>
              <Badge variant="outline">1.2M samples</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Target className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Target Accuracy</span>
              </div>
              <Badge variant="outline">90%</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Memoized model performance card component
const ModelPerformanceCard = memo(function ModelPerformanceCard({ 
  model, 
  isSelected, 
  onToggleSelect, 
  getTrendIcon, 
  getStatusColor 
}: any) {
  const handleClick = useCallback(() => {
    onToggleSelect(model.name === isSelected ? null : model.name)
  }, [model.name, isSelected, onToggleSelect])

  return (
    <div
      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={handleClick}
    >
      <div className="flex items-center gap-4">
        <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">{model.name}</h4>
            <Badge variant="outline" className="text-xs">
              v{model.version}
            </Badge>
            <Badge className={cn("text-xs", getStatusColor(model.status))}>
              {model.status}
            </Badge>
          </div>
          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
            <span>Accuracy: {(model.accuracy * 100).toFixed(0)}%</span>
            <span>•</span>
            <span>Confidence: {(model.avg_confidence * 100).toFixed(0)}%</span>
            <span>•</span>
            <span>{model.predictions_today} predictions today</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {getTrendIcon(model.trend)}
        <Progress value={model.accuracy * 100} className="w-24 h-2" />
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.model.name === nextProps.model.name &&
    prevProps.model.accuracy === nextProps.model.accuracy &&
    prevProps.model.avg_confidence === nextProps.model.avg_confidence &&
    prevProps.model.predictions_today === nextProps.model.predictions_today &&
    prevProps.model.status === nextProps.model.status &&
    prevProps.isSelected === nextProps.isSelected
  )
})

// Export memoized main component
export default memo(MLPerformanceDashboard)