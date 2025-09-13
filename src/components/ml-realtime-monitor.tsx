'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  Brain, 
  Zap, 
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface RealtimePrediction {
  id: string
  model_type: string
  confidence_score: number
  inference_time_ms: number
  created_at: string
  user_feedback?: string
}

interface ModelStatus {
  model_type: string
  is_active: boolean
  predictions_today: number
  avg_inference_time_ms: number
  training_status: string
}

export function MLRealtimeMonitor() {
  const [predictions, setPredictions] = useState<RealtimePrediction[]>([])
  const [modelStatuses, setModelStatuses] = useState<ModelStatus[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Set up real-time subscription
    const channel = supabase
      .channel('ml_predictions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'predictions_cache'
        },
        (payload) => {
          console.log('New prediction:', payload.new)
          const newPrediction = payload.new as RealtimePrediction
          setPredictions(prev => [newPrediction, ...prev].slice(0, 10))
          
          // Update model status
          updateModelStatus(newPrediction.model_type)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ml_models'
        },
        (payload) => {
          console.log('Model update:', payload.new)
          fetchModelStatuses()
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    // Load initial data
    fetchRecentPredictions()
    fetchModelStatuses()

    // Set up polling for stats update
    const interval = setInterval(() => {
      fetchModelStatuses()
    }, 10000) // Update every 10 seconds

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [])

  async function fetchRecentPredictions() {
    const { data } = await supabase
      .from('predictions_cache')
      .select('id, model_type, confidence_score, inference_time_ms, created_at, user_feedback')
      .order('created_at', { ascending: false })
      .limit(10)

    if (data) {
      setPredictions(data)
    }
  }

  async function fetchModelStatuses() {
    const { data } = await supabase
      .from('ml_models')
      .select('model_type, is_active, predictions_today, avg_inference_time_ms, training_status')
      .eq('is_active', true)

    if (data) {
      setModelStatuses(data)
    }
  }

  async function updateModelStatus(modelType: string) {
    // Increment prediction count for the model
    const model = modelStatuses.find(m => m.model_type === modelType)
    if (model) {
      setModelStatuses(prev => 
        prev.map(m => 
          m.model_type === modelType 
            ? { ...m, predictions_today: m.predictions_today + 1 }
            : m
        )
      )
    }
  }

  const getModelIcon = (modelType: string) => {
    switch (modelType) {
      case 'nexus_top_tier':
        return <Brain className="h-4 w-4" />
      case 'anomaly_detection':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Zap className="h-4 w-4" />
    }
  }

  const getFeedbackColor = (feedback?: string) => {
    switch (feedback) {
      case 'accepted':
        return 'text-green-600'
      case 'rejected':
        return 'text-red-600'
      case 'modified':
        return 'text-yellow-600'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Real-Time Monitor
            </span>
            <Badge variant={isConnected ? 'default' : 'secondary'} className="text-xs">
              <div className={cn(
                "h-2 w-2 rounded-full mr-1",
                isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"
              )} />
              {isConnected ? 'Connected' : 'Connecting...'}
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Active Models Grid */}
      <div className="grid gap-2 md:grid-cols-3">
        {modelStatuses.slice(0, 6).map((model) => (
          <Card key={model.model_type} className="overflow-hidden">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-xs font-medium flex items-center justify-between">
                <span className="flex items-center gap-1">
                  {getModelIcon(model.model_type)}
                  {model.model_type.replace(/_/g, ' ')}
                </span>
                {model.training_status === 'training' && (
                  <Badge variant="outline" className="text-xs">
                    Training
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Today</span>
                  <span className="font-medium">{model.predictions_today}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Avg time</span>
                  <span className="font-medium">
                    {model.avg_inference_time_ms?.toFixed(0) || '0'}ms
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Predictions Stream */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Recent Predictions
          </CardTitle>
          <CardDescription className="text-xs">
            Live stream of ML predictions across all models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {predictions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No predictions yet. Make a prediction to see it here in real-time.
              </p>
            ) : (
              predictions.map((prediction) => (
                <div
                  key={prediction.id}
                  className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded">
                      {getModelIcon(prediction.model_type)}
                    </div>
                    <div>
                      <p className="text-xs font-medium">
                        {prediction.model_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(prediction.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Progress 
                          value={prediction.confidence_score * 100} 
                          className="w-12 h-1.5"
                        />
                        <span className="text-xs font-medium">
                          {(prediction.confidence_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {prediction.inference_time_ms.toFixed(0)}ms
                      </p>
                    </div>
                    {prediction.user_feedback && (
                      <div className={cn("text-xs", getFeedbackColor(prediction.user_feedback))}>
                        {prediction.user_feedback === 'accepted' && <CheckCircle className="h-3 w-3" />}
                        {prediction.user_feedback === 'rejected' && <AlertCircle className="h-3 w-3" />}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}