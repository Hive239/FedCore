'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Brain,
  Play,
  Pause,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'

interface TrainingJob {
  id: string
  model_id: string
  model_type: string
  status: string
  progress_percentage: number
  current_epoch: number
  total_epochs: number
  final_accuracy?: number
  started_at?: string
  completed_at?: string
}

interface MLModel {
  id: string
  model_name: string
  model_type: string
  accuracy_score: number
  training_status: string
  last_trained_at?: string
  is_active: boolean
}

export function MLTrainingInterface() {
  const [models, setModels] = useState<MLModel[]>([])
  const [trainingJobs, setTrainingJobs] = useState<TrainingJob[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [epochs, setEpochs] = useState<number>(50)
  const [batchSize, setBatchSize] = useState<number>(32)
  const [isTraining, setIsTraining] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  // Load models and training jobs
  const loadData = async () => {
    setLoading(true)
    try {
      // Fetch active models
      const { data: modelsData } = await supabase
        .from('ml_models')
        .select('*')
        .eq('is_active', true)
        .order('accuracy_score', { ascending: false })

      if (modelsData) {
        setModels(modelsData)
      }

      // Note: ml_training_jobs table doesn't exist in current schema
      // Setting empty array for now
      setTrainingJobs([])
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load training data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Start training
  const startTraining = async () => {
    if (!selectedModel) {
      toast({
        title: 'Error',
        description: 'Please select a model to train',
        variant: 'destructive'
      })
      return
    }

    setIsTraining(true)
    try {
      const response = await fetch('/api/ml/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model_id: selectedModel,
          model_type: models.find(m => m.id === selectedModel)?.model_type,
          epochs: epochs,
          batch_size: batchSize
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Training Started',
          description: `Model training initiated with ${epochs} epochs`
        })
        
        // Refresh data to show new training job
        loadData()
        
        // Monitor training progress
        monitorTrainingProgress(result.job_id)
      } else {
        throw new Error(result.error || 'Training failed')
      }
    } catch (error) {
      console.error('Training error:', error)
      toast({
        title: 'Training Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      })
    } finally {
      setIsTraining(false)
    }
  }

  // Monitor training progress
  const monitorTrainingProgress = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const { data: job } = await supabase
          .from('ml_training_jobs')
          .select('*')
          .eq('id', jobId)
          .single()

        if (job) {
          setTrainingJobs(prev => 
            prev.map(j => j.id === jobId ? job : j)
          )

          // Stop monitoring if completed
          if (job.status === 'completed' || job.status === 'failed') {
            clearInterval(interval)
            loadData() // Refresh models to show updated accuracy
            
            if (job.status === 'completed') {
              toast({
                title: 'Training Complete',
                description: `Final accuracy: ${(job.final_accuracy * 100).toFixed(1)}%`
              })
            }
          }
        }
      } catch (error) {
        console.error('Error monitoring training:', error)
        clearInterval(interval)
      }
    }, 3000) // Check every 3 seconds

    // Clean up after 10 minutes
    setTimeout(() => clearInterval(interval), 10 * 60 * 1000)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Training Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            ML Model Training
          </CardTitle>
          <CardDescription>
            Train neural network models with custom parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="model-select">Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model to train" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{model.model_name}</span>
                        <Badge variant="outline" className="ml-2">
                          {(model.accuracy_score * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="epochs">Epochs</Label>
              <Input
                id="epochs"
                type="number"
                min="10"
                max="200"
                value={epochs}
                onChange={(e) => setEpochs(parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch-size">Batch Size</Label>
              <Input
                id="batch-size"
                type="number"
                min="8"
                max="128"
                step="8"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value))}
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={startTraining}
                disabled={isTraining || !selectedModel || loading}
                className="w-full"
              >
                {isTraining ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Training...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Training
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Training Jobs</span>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
          <CardDescription>
            Monitor active and recent training sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trainingJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No training jobs found
            </div>
          ) : (
            <div className="space-y-3">
              {trainingJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <p className="font-medium">{job.model_type}</p>
                      <p className="text-sm text-muted-foreground">
                        {job.current_epoch}/{job.total_epochs} epochs
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {job.status === 'running' && (
                      <div className="flex items-center gap-2">
                        <Progress value={job.progress_percentage} className="w-24" />
                        <span className="text-sm">{job.progress_percentage}%</span>
                      </div>
                    )}
                    
                    {job.final_accuracy && (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">
                          {(job.final_accuracy * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                    
                    <Badge className={getStatusColor(job.status)}>
                      {job.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Model Performance</CardTitle>
          <CardDescription>
            Current accuracy scores for all models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {models.map((model) => (
              <div
                key={model.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{model.model_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {model.last_trained_at 
                      ? `Trained ${new Date(model.last_trained_at).toLocaleDateString()}`
                      : 'Never trained'
                    }
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {(model.accuracy_score * 100).toFixed(1)}%
                  </div>
                  <Badge 
                    variant={model.training_status === 'training' ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    {model.training_status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}