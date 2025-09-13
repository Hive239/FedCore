'use client'

import { useEffect, useState, useMemo, useCallback, memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Calendar,
  Users,
  Shield,
  Target,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStableCallback, useExpensiveMemo } from '@/lib/performance/react-optimizations'

interface ProjectMLInsightsProps {
  projectId: string
  projectName?: string
}

interface MLPrediction {
  type: string
  prediction: any
  confidence: number
  timestamp: string
}

function ProjectMLInsights({ projectId, projectName }: ProjectMLInsightsProps) {
  const [predictions, setPredictions] = useState<MLPrediction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('low')

  useEffect(() => {
    if (projectId) {
      loadProjectPredictions()
    }
  }, [projectId])

  const loadProjectPredictions = useStableCallback(async function loadProjectPredictions() {
    setIsLoading(true)
    try {
      // Make multiple ML predictions for the project
      const [
        scheduleResponse,
        costResponse,
        qualityResponse,
        safetyResponse
      ] = await Promise.all([
        // Schedule optimization
        fetch('/api/ml/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model_type: 'schedule_optimizer',
            input_data: {
              total_tasks: 25,
              critical_path_length: 15,
              resource_availability: 0.85,
              dependencies: 10,
              buffer_time: 3,
              parallel_tasks: 5,
              milestone_count: 4,
              constraint_count: 2,
              team_productivity: 0.9,
              historical_variance: 0.1,
              risk_buffer: 5,
              optimization_goal: 1
            },
            project_id: projectId
          })
        }).then(r => r.json()),

        // Cost prediction
        fetch('/api/ml/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model_type: 'cost_prediction',
            input_data: {
              budget: 500000,
              spent: 150000,
              progress: 30,
              change_orders: 2,
              labor_cost: 200000,
              material_cost: 150000,
              equipment_cost: 100000,
              overhead: 50000,
              contingency: 25000,
              market_conditions: 0.6
            },
            project_id: projectId
          })
        }).then(r => r.json()),

        // Quality control
        fetch('/api/ml/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model_type: 'quality_control',
            input_data: {
              defect_rate: 0.03,
              inspection_frequency: 0.9,
              compliance_score: 0.92,
              training_hours: 60
            },
            project_id: projectId
          })
        }).then(r => r.json()),

        // Worker safety
        fetch('/api/ml/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model_type: 'worker_safety',
            input_data: {
              incident_rate: 0.02,
              safety_training: 0.95,
              ppe_compliance: 0.98,
              hazard_count: 5
            },
            project_id: projectId
          })
        }).then(r => r.json())
      ])

      const newPredictions: MLPrediction[] = [
        {
          type: 'schedule',
          prediction: scheduleResponse.prediction,
          confidence: scheduleResponse.confidence,
          timestamp: new Date().toISOString()
        },
        {
          type: 'cost',
          prediction: costResponse.prediction,
          confidence: costResponse.confidence,
          timestamp: new Date().toISOString()
        },
        {
          type: 'quality',
          prediction: qualityResponse.prediction,
          confidence: qualityResponse.confidence,
          timestamp: new Date().toISOString()
        },
        {
          type: 'safety',
          prediction: safetyResponse.prediction,
          confidence: safetyResponse.confidence,
          timestamp: new Date().toISOString()
        }
      ]

      setPredictions(newPredictions)

      // Determine overall risk level
      const costRisk = costResponse.prediction?.overrun_probability > 0.7
      const qualityRisk = qualityResponse.prediction?.defect_probability > 0.3
      const safetyRisk = safetyResponse.prediction?.safety_score < 70

      if (costRisk || safetyRisk) {
        setRiskLevel('high')
      } else if (qualityRisk) {
        setRiskLevel('medium')
      } else {
        setRiskLevel('low')
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Error loading project predictions:', error)
      setIsLoading(false)
    }
  }, [projectId], 'loadProjectPredictions')

  const getRiskColor = useCallback((level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-green-100 text-green-800 border-green-200'
    }
  }, [])

  const getIcon = useCallback((type: string) => {
    switch (type) {
      case 'schedule':
        return <Calendar className="h-4 w-4" />
      case 'cost':
        return <DollarSign className="h-4 w-4" />
      case 'quality':
        return <Target className="h-4 w-4" />
      case 'safety':
        return <Shield className="h-4 w-4" />
      default:
        return <Brain className="h-4 w-4" />
    }
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 animate-pulse" />
            Loading ML Insights...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  const schedulePred = useMemo(() => predictions.find(p => p.type === 'schedule'), [predictions])
  const costPred = useMemo(() => predictions.find(p => p.type === 'cost'), [predictions])
  const qualityPred = useMemo(() => predictions.find(p => p.type === 'quality'), [predictions])
  const safetyPred = useMemo(() => predictions.find(p => p.type === 'safety'), [predictions])

  return (
    <div className="space-y-4">
      {/* Overall Risk Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Risk Assessment
            </span>
            <Badge className={cn("capitalize", getRiskColor(riskLevel))}>
              {riskLevel} Risk
            </Badge>
          </CardTitle>
          <CardDescription>
            ML-powered analysis for {projectName || 'this project'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Prediction Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Schedule Prediction */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completion Date</span>
                <span className="font-medium">
                  {schedulePred?.prediction?.estimated_completion 
                    ? new Date(schedulePred.prediction.estimated_completion).toLocaleDateString()
                    : 'Calculating...'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Efficiency Gain</span>
                <span className="font-medium flex items-center gap-1">
                  {schedulePred?.prediction?.efficiency_gain?.toFixed(0)}%
                  {schedulePred?.prediction?.efficiency_gain > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-yellow-600" />
                  )}
                </span>
              </div>
              <Progress value={(schedulePred?.confidence || 0) * 100} className="h-2" />
              <span className="text-xs text-muted-foreground">
                {(schedulePred?.confidence || 0) * 100}% confidence
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Cost Prediction */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cost Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Final Cost</span>
                <span className="font-medium">
                  ${(costPred?.prediction?.estimated_cost || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overrun Risk</span>
                <span className="font-medium">
                  {((costPred?.prediction?.overrun_probability || 0) * 100).toFixed(0)}%
                </span>
              </div>
              <Progress 
                value={(costPred?.prediction?.overrun_probability || 0) * 100} 
                className={cn(
                  "h-2",
                  costPred?.prediction?.overrun_probability > 0.7 ? "bg-red-200" : ""
                )}
              />
              {costPred?.prediction?.overrun_probability > 0.7 && (
                <Alert className="mt-2 p-2">
                  <AlertTriangle className="h-3 w-3" />
                  <AlertDescription className="text-xs">
                    High risk of cost overrun detected
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quality Prediction */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Quality Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quality Score</span>
                <span className="font-medium">
                  {qualityPred?.prediction?.quality_score?.toFixed(0)}/100
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Defect Risk</span>
                <span className="font-medium">
                  {((qualityPred?.prediction?.defect_probability || 0) * 100).toFixed(0)}%
                </span>
              </div>
              <Progress value={qualityPred?.prediction?.quality_score || 0} className="h-2" />
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {qualityPred?.prediction?.inspection_priority || 'normal'} priority
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Safety Prediction */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Safety Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Safety Score</span>
                <span className="font-medium flex items-center gap-1">
                  {safetyPred?.prediction?.safety_score?.toFixed(0)}/100
                  {safetyPred?.prediction?.safety_score > 80 ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-600" />
                  )}
                </span>
              </div>
              <Progress value={safetyPred?.prediction?.safety_score || 0} className="h-2" />
              {safetyPred?.prediction?.risk_areas && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Risk Areas:</p>
                  <div className="flex flex-wrap gap-1">
                    {safetyPred.prediction.risk_areas.map((area: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {schedulePred?.prediction?.efficiency_gain < 0 && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Consider reallocating resources to improve schedule efficiency
                </AlertDescription>
              </Alert>
            )}
            {costPred?.prediction?.overrun_probability > 0.5 && (
              <Alert>
                <DollarSign className="h-4 w-4" />
                <AlertDescription>
                  Review budget allocation and consider contingency planning
                </AlertDescription>
              </Alert>
            )}
            {qualityPred?.prediction?.defect_probability > 0.3 && (
              <Alert>
                <Target className="h-4 w-4" />
                <AlertDescription>
                  Increase quality inspections and review control processes
                </AlertDescription>
              </Alert>
            )}
            {safetyPred?.prediction?.safety_score < 80 && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Enhance safety protocols in identified risk areas
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Memoized prediction card component
const PredictionCard = memo(function PredictionCard({ 
  title, 
  icon, 
  prediction, 
  confidence, 
  children 
}: any) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {children}
        <Progress value={(confidence || 0) * 100} className="h-2 mt-2" />
        <span className="text-xs text-muted-foreground">
          {(confidence || 0) * 100}% confidence
        </span>
      </CardContent>
    </Card>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.confidence === nextProps.confidence &&
    JSON.stringify(prevProps.prediction) === JSON.stringify(nextProps.prediction)
  )
})

// Export memoized component
export default memo(ProjectMLInsights, (prevProps, nextProps) => {
  return (
    prevProps.projectId === nextProps.projectId &&
    prevProps.projectName === nextProps.projectName
  )
})