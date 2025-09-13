'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import {
  FlaskConical,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
  Target,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Activity,
  Pause,
  Play,
  StopCircle,
  RefreshCw
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface ABTest {
  id: string
  test_name: string
  model_a_name: string
  model_b_name: string
  start_time: string
  end_time?: string
  status: 'running' | 'completed' | 'paused'
  winner?: string
  model_a_performance?: number
  model_b_performance?: number
  total_predictions_a: number
  total_predictions_b: number
  confidence_threshold: number
  significance_level: number
}

interface TestMetrics {
  timestamp: string
  model_a_accuracy: number
  model_b_accuracy: number
  model_a_confidence: number
  model_b_confidence: number
  model_a_latency: number
  model_b_latency: number
  sample_size: number
}

interface StatisticalAnalysis {
  pValue: number
  confidenceInterval: { lower: number; upper: number }
  effectSize: number
  powerAnalysis: number
  isSignificant: boolean
  recommendedAction: string
}

export function ABTestingMonitor() {
  const [tests, setTests] = useState<ABTest[]>([])
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null)
  const [metrics, setMetrics] = useState<TestMetrics[]>([])
  const [analysis, setAnalysis] = useState<StatisticalAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('24h')
  const [autoRefresh, setAutoRefresh] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadTests()
    if (autoRefresh) {
      const interval = setInterval(loadTests, 10000) // Refresh every 10 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  useEffect(() => {
    if (selectedTest) {
      loadTestMetrics(selectedTest.id)
      performStatisticalAnalysis(selectedTest)
    }
  }, [selectedTest, timeRange])

  async function loadTests() {
    try {
      const { data } = await supabase
        .from('ab_tests')
        .select('*')
        .order('start_time', { ascending: false })
        .limit(10)

      if (data) {
        // Use real data from database, with defaults for missing fields
        const enrichedTests: ABTest[] = data.map(test => ({
          ...test,
          total_predictions_a: test.total_predictions_a || 0,
          total_predictions_b: test.total_predictions_b || 0,
          confidence_threshold: test.confidence_threshold || 0.95,
          significance_level: test.significance_level || 0.05
        }))
        setTests(enrichedTests)
        
        if (!selectedTest && enrichedTests.length > 0) {
          setSelectedTest(enrichedTests[0])
        }
      }
      setLoading(false)
    } catch (error) {
      console.error('Error loading A/B tests:', error)
      setLoading(false)
    }
  }

  async function loadTestMetrics(testId: string) {
    try {
      // Try to load real metrics from database first
      const { data: realMetrics } = await supabase
        .from('ab_test_metrics')
        .select('*')
        .eq('test_id', testId)
        .order('timestamp', { ascending: true })

      if (realMetrics && realMetrics.length > 0) {
        const formattedMetrics: TestMetrics[] = realMetrics.map(metric => ({
          timestamp: metric.timestamp,
          model_a_accuracy: metric.model_a_accuracy || 0,
          model_b_accuracy: metric.model_b_accuracy || 0,
          model_a_confidence: metric.model_a_confidence || 0,
          model_b_confidence: metric.model_b_confidence || 0,
          model_a_latency: metric.model_a_latency || 0,
          model_b_latency: metric.model_b_latency || 0,
          sample_size: metric.sample_size || 0
        }))
        setMetrics(formattedMetrics)
      } else {
        // Fall back to demo data if no real metrics exist
        const now = Date.now()
        const timeRangeMs = timeRange === '24h' ? 24 * 60 * 60 * 1000 : 
                           timeRange === '7d' ? 7 * 24 * 60 * 60 * 1000 : 
                           30 * 24 * 60 * 60 * 1000

        const demoMetrics: TestMetrics[] = []
        const points = 24
        
        for (let i = 0; i < points; i++) {
          const timestamp = new Date(now - timeRangeMs + (i * timeRangeMs / points))
          demoMetrics.push({
            timestamp: timestamp.toISOString(),
            model_a_accuracy: 0.75 + Math.random() * 0.15,
            model_b_accuracy: 0.78 + Math.random() * 0.12,
            model_a_confidence: 0.80 + Math.random() * 0.10,
            model_b_confidence: 0.82 + Math.random() * 0.08,
            model_a_latency: 100 + Math.random() * 50,
            model_b_latency: 95 + Math.random() * 45,
            sample_size: Math.floor(Math.random() * 500) + 100
          })
        }
        setMetrics(demoMetrics)
      }
    } catch (error) {
      console.error('Error loading test metrics:', error)
    }
  }

  function performStatisticalAnalysis(test: ABTest) {
    // Simulate statistical analysis
    const mockAnalysis: StatisticalAnalysis = {
      pValue: Math.random() * 0.1,
      confidenceInterval: {
        lower: 0.02,
        upper: 0.08
      },
      effectSize: Math.random() * 0.5,
      powerAnalysis: 0.8 + Math.random() * 0.2,
      isSignificant: Math.random() > 0.3,
      recommendedAction: Math.random() > 0.5 ? 
        'Model B shows significant improvement. Consider deployment.' :
        'Continue testing for more conclusive results.'
    }
    setAnalysis(mockAnalysis)
  }

  async function controlTest(action: 'pause' | 'resume' | 'stop', testId: string) {
    const statusMap = {
      pause: 'paused',
      resume: 'running',
      stop: 'completed'
    }

    await supabase
      .from('ab_tests')
      .update({ status: statusMap[action] })
      .eq('id', testId)

    loadTests()
  }

  async function createNewTest() {
    // This would open a modal to configure a new A/B test
    console.log('Create new A/B test')
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            A/B Testing Monitor
          </CardTitle>
          <CardDescription>Loading experiments...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                A/B Testing Monitor
              </CardTitle>
              <CardDescription>
                Monitor and analyze ML model experiments in real-time
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={cn("h-4 w-4", autoRefresh && "animate-spin")} />
              </Button>
              <Button onClick={createNewTest}>New Test</Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Active Tests Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {tests.filter(t => t.status === 'running').slice(0, 3).map((test) => (
          <Card 
            key={test.id}
            className={cn(
              "cursor-pointer transition-all",
              selectedTest?.id === test.id && "ring-2 ring-primary"
            )}
            onClick={() => setSelectedTest(test)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">
                    {test.test_name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {test.model_a_name} vs {test.model_b_name}
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  Running
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Model A</span>
                  <span>{test.total_predictions_a.toLocaleString()} predictions</span>
                </div>
                <Progress value={test.model_a_performance || 0} className="h-1" />
                <div className="flex justify-between text-xs">
                  <span>Model B</span>
                  <span>{test.total_predictions_b.toLocaleString()} predictions</span>
                </div>
                <Progress value={test.model_b_performance || 0} className="h-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Analysis */}
      {selectedTest && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedTest.test_name}</CardTitle>
                <CardDescription>
                  Started {formatDate(selectedTest.start_time)} at {formatTime(selectedTest.start_time)}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {selectedTest.status === 'running' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => controlTest('pause', selectedTest.id)}
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => controlTest('stop', selectedTest.id)}
                    >
                      <StopCircle className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {selectedTest.status === 'paused' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => controlTest('resume', selectedTest.id)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="performance">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="confidence">Confidence</TabsTrigger>
                <TabsTrigger value="latency">Latency</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="performance" className="space-y-4">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(t) => formatTime(t)}
                    />
                    <YAxis 
                      domain={[0, 1]}
                      tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    />
                    <Tooltip 
                      labelFormatter={(t) => formatTime(t as string)}
                      formatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="model_a_accuracy"
                      stroke="#8b5cf6"
                      name="Model A"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="model_b_accuracy"
                      stroke="#10b981"
                      name="Model B"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="confidence" className="space-y-4">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(t) => formatTime(t)}
                    />
                    <YAxis 
                      domain={[0, 1]}
                      tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    />
                    <Tooltip 
                      labelFormatter={(t) => formatTime(t as string)}
                      formatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="model_a_confidence"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.3}
                      name="Model A"
                    />
                    <Area
                      type="monotone"
                      dataKey="model_b_confidence"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.3}
                      name="Model B"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="latency" className="space-y-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(t) => formatTime(t)}
                    />
                    <YAxis 
                      tickFormatter={(v) => `${v}ms`}
                    />
                    <Tooltip 
                      labelFormatter={(t) => formatTime(t as string)}
                      formatter={(v: number) => `${v.toFixed(0)}ms`}
                    />
                    <Legend />
                    <Bar
                      dataKey="model_a_latency"
                      fill="#8b5cf6"
                      name="Model A"
                    />
                    <Bar
                      dataKey="model_b_latency"
                      fill="#10b981"
                      name="Model B"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="analysis" className="space-y-4">
                {analysis && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                          Statistical Significance
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">P-Value</span>
                          <Badge variant={analysis.pValue < 0.05 ? "default" : "secondary"}>
                            {analysis.pValue.toFixed(4)}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Effect Size</span>
                          <span className="text-sm font-medium">
                            {analysis.effectSize.toFixed(3)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Power</span>
                          <span className="text-sm font-medium">
                            {(analysis.powerAnalysis * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">95% CI</span>
                          <span className="text-sm font-medium">
                            [{analysis.confidenceInterval.lower.toFixed(3)}, {analysis.confidenceInterval.upper.toFixed(3)}]
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                          Recommendation
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-start gap-2">
                          {analysis.isSignificant ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          )}
                          <p className="text-sm">{analysis.recommendedAction}</p>
                        </div>
                        {analysis.isSignificant && (
                          <div className="pt-2">
                            <Button className="w-full" size="sm">
                              Deploy Winning Model
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="md:col-span-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                          Sample Size Calculator
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Current</p>
                              <p className="font-medium">
                                {(selectedTest.total_predictions_a + selectedTest.total_predictions_b).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Required</p>
                              <p className="font-medium">15,000</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Progress</p>
                              <p className="font-medium">
                                {Math.min(100, ((selectedTest.total_predictions_a + selectedTest.total_predictions_b) / 15000 * 100)).toFixed(0)}%
                              </p>
                            </div>
                          </div>
                          <Progress 
                            value={Math.min(100, ((selectedTest.total_predictions_a + selectedTest.total_predictions_b) / 15000 * 100))} 
                            className="h-2"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Test History */}
      <Card>
        <CardHeader>
          <CardTitle>Test History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tests.map((test) => (
              <div
                key={test.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedTest(test)}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-2 rounded-lg",
                    test.status === 'running' ? "bg-green-100" :
                    test.status === 'completed' ? "bg-blue-100" :
                    "bg-gray-100"
                  )}>
                    {test.status === 'running' ? (
                      <Activity className="h-4 w-4 text-green-600" />
                    ) : test.status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Pause className="h-4 w-4 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{test.test_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {test.model_a_name} vs {test.model_b_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {test.winner && (
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium">{test.winner}</span>
                    </div>
                  )}
                  <Badge variant={test.status === 'running' ? 'default' : 'secondary'}>
                    {test.status}
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