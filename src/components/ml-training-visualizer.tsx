'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts'
import {
  Brain,
  TrendingUp,
  Activity,
  Zap,
  Target,
  Layers,
  GitBranch,
  Clock,
  Cpu,
  HardDrive,
  Gauge,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface TrainingRun {
  id: string
  model_name: string
  start_time: string
  end_time?: string
  status: 'running' | 'completed' | 'failed'
  current_epoch: number
  total_epochs: number
  best_accuracy: number
  current_loss: number
  learning_rate: number
  batch_size: number
}

interface EpochMetrics {
  epoch: number
  train_loss: number
  val_loss: number
  train_accuracy: number
  val_accuracy: number
  learning_rate: number
  time_taken: number
}

interface HyperparameterMetrics {
  param_name: string
  value: number
  accuracy_impact: number
  convergence_speed: number
  stability: number
}

interface ModelArchitecture {
  layer_name: string
  layer_type: string
  parameters: number
  output_shape: string
  activation: string
}

export function MLTrainingVisualizer() {
  const [activeRuns, setActiveRuns] = useState<TrainingRun[]>([])
  const [selectedRun, setSelectedRun] = useState<TrainingRun | null>(null)
  const [epochMetrics, setEpochMetrics] = useState<EpochMetrics[]>([])
  const [hyperparamMetrics, setHyperparamMetrics] = useState<HyperparameterMetrics[]>([])
  const [architecture, setArchitecture] = useState<ModelArchitecture[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadTrainingRuns()
    if (autoRefresh) {
      const interval = setInterval(loadTrainingRuns, 5000) // Refresh every 5 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  useEffect(() => {
    if (selectedRun) {
      loadRunMetrics(selectedRun.id)
    }
  }, [selectedRun])

  async function loadTrainingRuns() {
    try {
      // Load real training runs from database
      const { data: realRuns } = await supabase
        .from('training_runs')
        .select('*')
        .order('start_time', { ascending: false })
        .limit(10)

      if (realRuns && realRuns.length > 0) {
        const formattedRuns: TrainingRun[] = realRuns.map(run => ({
          id: run.id,
          model_name: run.model_name,
          start_time: run.start_time,
          end_time: run.end_time,
          status: run.status,
          current_epoch: run.current_epoch || 0,
          total_epochs: run.total_epochs,
          best_accuracy: run.best_accuracy || 0,
          current_loss: run.current_loss || 0,
          learning_rate: run.learning_rate || 0.001,
          batch_size: run.batch_size || 32
        }))
        setActiveRuns(formattedRuns)
        if (!selectedRun && formattedRuns.length > 0) {
          setSelectedRun(formattedRuns[0])
        }
      } else {
        // Fall back to demo data if no real runs exist
        const demoRuns: TrainingRun[] = [
      {
        id: '1',
        model_name: 'nexus_top_tier',
        start_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        status: 'running',
        current_epoch: 42,
        total_epochs: 100,
        best_accuracy: 0.923,
        current_loss: 0.234,
        learning_rate: 0.001,
        batch_size: 32
      },
      {
        id: '2',
        model_name: 'weather_impact_analyzer',
        start_time: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        status: 'completed',
        current_epoch: 50,
        total_epochs: 50,
        best_accuracy: 0.887,
        current_loss: 0.312,
        learning_rate: 0.0005,
        batch_size: 64
      },
      {
        id: '3',
        model_name: 'schedule_optimizer',
        start_time: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        status: 'running',
        current_epoch: 18,
        total_epochs: 75,
        best_accuracy: 0.856,
        current_loss: 0.445,
        learning_rate: 0.002,
        batch_size: 16
      }
    ]

        setActiveRuns(demoRuns)
        if (!selectedRun && demoRuns.length > 0) {
          setSelectedRun(demoRuns[0])
        }
      }
      setLoading(false)
    } catch (error) {
      console.error('Error loading training runs:', error)
      setLoading(false)
    }
  }

  async function loadRunMetrics(runId: string) {
    try {
      // Try to load real training logs from database
      const { data: realLogs } = await supabase
        .from('training_logs')
        .select('*')
        .eq('run_id', runId)
        .order('epoch', { ascending: true })

      if (realLogs && realLogs.length > 0) {
        const formattedMetrics: EpochMetrics[] = realLogs.map(log => ({
          epoch: log.epoch,
          train_loss: log.loss || 0,
          val_loss: log.val_loss || 0,
          train_accuracy: log.accuracy || 0,
          val_accuracy: log.val_accuracy || 0,
          learning_rate: log.learning_rate || 0.001,
          time_taken: log.time_taken || 30
        }))
        setEpochMetrics(formattedMetrics)
      } else {
        // Fall back to demo metrics
        const epochs = selectedRun?.current_epoch || 50
        const demoEpochMetrics: EpochMetrics[] = []
    
        for (let i = 1; i <= epochs; i++) {
          demoEpochMetrics.push({
        epoch: i,
        train_loss: Math.max(0.1, 1.5 * Math.exp(-i * 0.05) + Math.random() * 0.1),
        val_loss: Math.max(0.15, 1.6 * Math.exp(-i * 0.045) + Math.random() * 0.15),
        train_accuracy: Math.min(0.99, 0.5 + 0.4 * (1 - Math.exp(-i * 0.08)) + Math.random() * 0.05),
        val_accuracy: Math.min(0.95, 0.45 + 0.4 * (1 - Math.exp(-i * 0.075)) + Math.random() * 0.08),
        learning_rate: selectedRun?.learning_rate || 0.001,
        time_taken: 30 + Math.random() * 20
      })
        }
        setEpochMetrics(demoEpochMetrics)
      }

    // Generate mock hyperparameter metrics
    const mockHyperparams: HyperparameterMetrics[] = [
      { param_name: 'Learning Rate', value: 0.001, accuracy_impact: 0.85, convergence_speed: 0.72, stability: 0.90 },
      { param_name: 'Batch Size', value: 32, accuracy_impact: 0.78, convergence_speed: 0.88, stability: 0.75 },
      { param_name: 'Dropout', value: 0.3, accuracy_impact: 0.65, convergence_speed: 0.60, stability: 0.92 },
      { param_name: 'Weight Decay', value: 0.0001, accuracy_impact: 0.70, convergence_speed: 0.65, stability: 0.85 },
      { param_name: 'Momentum', value: 0.9, accuracy_impact: 0.75, convergence_speed: 0.82, stability: 0.78 }
    ]
    setHyperparamMetrics(mockHyperparams)

    // Generate mock architecture
    const mockArchitecture: ModelArchitecture[] = [
      { layer_name: 'Input', layer_type: 'Dense', parameters: 1024, output_shape: '(None, 512)', activation: 'relu' },
      { layer_name: 'Hidden 1', layer_type: 'Dense', parameters: 262656, output_shape: '(None, 256)', activation: 'relu' },
      { layer_name: 'Dropout 1', layer_type: 'Dropout', parameters: 0, output_shape: '(None, 256)', activation: 'none' },
      { layer_name: 'Hidden 2', layer_type: 'Dense', parameters: 32896, output_shape: '(None, 128)', activation: 'relu' },
      { layer_name: 'Hidden 3', layer_type: 'Dense', parameters: 8256, output_shape: '(None, 64)', activation: 'relu' },
      { layer_name: 'Output', layer_type: 'Dense', parameters: 650, output_shape: '(None, 10)', activation: 'softmax' }
    ]
      setArchitecture(mockArchitecture)
    } catch (error) {
      console.error('Error loading run metrics:', error)
    }
  }

  function stopTraining(runId: string) {
    console.log('Stopping training for run:', runId)
    // Implementation would stop the actual training process
  }

  function exportMetrics(runId: string) {
    console.log('Exporting metrics for run:', runId)
    // Implementation would export training metrics to CSV/JSON
  }

  const radarData = hyperparamMetrics.map(metric => ({
    parameter: metric.param_name,
    impact: metric.accuracy_impact * 100,
    speed: metric.convergence_speed * 100,
    stability: metric.stability * 100
  }))

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Training Visualizer
          </CardTitle>
          <CardDescription>Loading training runs...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Active Training Runs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Active Training Runs
              </CardTitle>
              <CardDescription>
                Monitor real-time training progress and metrics
              </CardDescription>
            </div>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeRuns.map((run) => (
              <div
                key={run.id}
                className={cn(
                  "flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all",
                  selectedRun?.id === run.id && "ring-2 ring-primary",
                  "hover:bg-gray-50"
                )}
                onClick={() => setSelectedRun(run)}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={cn(
                    "p-2 rounded-lg",
                    run.status === 'running' ? "bg-blue-100" :
                    run.status === 'completed' ? "bg-green-100" :
                    "bg-red-100"
                  )}>
                    <Cpu className={cn(
                      "h-5 w-5",
                      run.status === 'running' ? "text-blue-600 animate-pulse" :
                      run.status === 'completed' ? "text-green-600" :
                      "text-red-600"
                    )} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{run.model_name}</h4>
                      <Badge variant={run.status === 'running' ? 'default' : 'secondary'}>
                        {run.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Epoch {run.current_epoch}/{run.total_epochs}</span>
                      <span>Loss: {run.current_loss.toFixed(3)}</span>
                      <span>Best Acc: {(run.best_accuracy * 100).toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={(run.current_epoch / run.total_epochs) * 100}
                      className="mt-2 h-2"
                    />
                  </div>
                </div>
                {run.status === 'running' && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      stopTraining(run.id)
                    }}
                  >
                    Stop
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      {selectedRun && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedRun.model_name} Training Metrics</CardTitle>
                <CardDescription>
                  Detailed analysis of training run started {new Date(selectedRun.start_time).toLocaleString()}
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => exportMetrics(selectedRun.id)}>
                Export Metrics
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="loss">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="loss">Loss Curves</TabsTrigger>
                <TabsTrigger value="accuracy">Accuracy</TabsTrigger>
                <TabsTrigger value="hyperparams">Hyperparameters</TabsTrigger>
                <TabsTrigger value="architecture">Architecture</TabsTrigger>
              </TabsList>

              <TabsContent value="loss" className="space-y-4">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={epochMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="epoch" label={{ value: 'Epoch', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Loss', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="train_loss"
                      stroke="#8b5cf6"
                      name="Training Loss"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="val_loss"
                      stroke="#ec4899"
                      name="Validation Loss"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                
                {/* Overfitting Detection */}
                {epochMetrics.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Training Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {epochMetrics[epochMetrics.length - 1].val_loss > 
                         epochMetrics[epochMetrics.length - 1].train_loss * 1.2 ? (
                          <div className="flex items-center gap-2 text-yellow-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">Possible overfitting detected</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm">Model generalizing well</span>
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          Gap between train and val loss: {
                            Math.abs(
                              epochMetrics[epochMetrics.length - 1].val_loss - 
                              epochMetrics[epochMetrics.length - 1].train_loss
                            ).toFixed(3)
                          }
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="accuracy" className="space-y-4">
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={epochMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="epoch" label={{ value: 'Epoch', position: 'insideBottom', offset: -5 }} />
                    <YAxis 
                      domain={[0, 1]}
                      tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                      label={{ value: 'Accuracy', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="train_accuracy"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.3}
                      name="Training Accuracy"
                    />
                    <Area
                      type="monotone"
                      dataKey="val_accuracy"
                      stroke="#06b6d4"
                      fill="#06b6d4"
                      fillOpacity={0.3}
                      name="Validation Accuracy"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="hyperparams" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Parameter Impact Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <RadarChart data={radarData}>
                          <PolarGrid strokeDasharray="3 3" />
                          <PolarAngleAxis dataKey="parameter" className="text-xs" />
                          <PolarRadiusAxis domain={[0, 100]} />
                          <Radar
                            name="Accuracy Impact"
                            dataKey="impact"
                            stroke="#8b5cf6"
                            fill="#8b5cf6"
                            fillOpacity={0.6}
                          />
                          <Radar
                            name="Convergence Speed"
                            dataKey="speed"
                            stroke="#10b981"
                            fill="#10b981"
                            fillOpacity={0.6}
                          />
                          <Radar
                            name="Stability"
                            dataKey="stability"
                            stroke="#f59e0b"
                            fill="#f59e0b"
                            fillOpacity={0.6}
                          />
                          <Legend />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Current Configuration</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Learning Rate</span>
                          <Badge variant="outline">{selectedRun.learning_rate}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Batch Size</span>
                          <Badge variant="outline">{selectedRun.batch_size}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Optimizer</span>
                          <Badge variant="outline">Adam</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Loss Function</span>
                          <Badge variant="outline">CrossEntropy</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Regularization</span>
                          <Badge variant="outline">L2 (0.0001)</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="architecture" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Model Architecture</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {architecture.map((layer, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded">
                              <Layers className="h-3 w-3 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{layer.layer_name}</p>
                              <p className="text-xs text-muted-foreground">{layer.layer_type}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-mono">{layer.output_shape}</p>
                            <p className="text-xs text-muted-foreground">
                              {layer.parameters.toLocaleString()} params
                            </p>
                          </div>
                          {layer.activation !== 'none' && (
                            <Badge variant="secondary" className="ml-2">
                              {layer.activation}
                            </Badge>
                          )}
                        </div>
                      ))}
                      <div className="pt-3 border-t">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Total Parameters:</span>
                          <span className="font-mono">
                            {architecture.reduce((sum, l) => sum + l.parameters, 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Resource Usage */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              GPU Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current</span>
                <span className="font-medium">78%</span>
              </div>
              <Progress value={78} className="h-2" />
              <p className="text-xs text-muted-foreground">NVIDIA RTX 4090 • 24GB VRAM</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current</span>
                <span className="font-medium">14.2 GB / 24 GB</span>
              </div>
              <Progress value={(14.2 / 24) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">Available: 9.8 GB</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Training Speed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Throughput</span>
                <span className="font-medium">1,250 samples/sec</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Time/Epoch</span>
                <span className="font-medium">~45 seconds</span>
              </div>
              <p className="text-xs text-muted-foreground">ETA: 32 minutes</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}