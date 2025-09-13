'use client'

import { useState, useEffect } from 'react'
import { principlesEngine } from '@/lib/construction-principles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { 
  AlertTriangle, CheckCircle, XCircle, Info, Zap, 
  Calendar, Clock, Users, Shield, CloudRain, 
  ArrowRight, Lightbulb, Settings, Trash2, Check,
  Brain, TrendingUp, AlertCircle, ChevronRight
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { analyzeScheduleConflicts, suggestOptimalSchedule, TRADE_DEPENDENCIES, ConflictAnalysis } from '@/lib/construction-logic'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface ConflictManagerProps {
  events: any[]
  onResolveConflict?: (resolution: any) => void
  onClearConflict?: (conflictId: string) => void
  onUpdateEvent?: (eventId: string, updates: any) => void
  weatherData?: any[]
  selectedProjectId?: string
}

export default function ConflictManager({ 
  events, 
  onResolveConflict, 
  onClearConflict,
  onUpdateEvent,
  weatherData,
  selectedProjectId = 'all'
}: ConflictManagerProps) {
  const [analysis, setAnalysis] = useState<ConflictAnalysis | null>(null)
  const [perspective, setPerspective] = useState<'strict' | 'balanced' | 'flexible'>('balanced')
  const [showSettings, setShowSettings] = useState(false)
  const [selectedConflict, setSelectedConflict] = useState<any>(null)
  const [autoResolveMode, setAutoResolveMode] = useState(false)
  const [ignoredConflicts, setIgnoredConflicts] = useState<Set<string>>(new Set())
  
  // Settings
  const [settings, setSettings] = useState({
    checkWeather: true,
    checkInspections: true,
    checkResources: true,
    checkSafety: true,
    autoSuggest: true,
    notifyOnConflict: true
  })

  useEffect(() => {
    if (events && events.length > 0) {
      runAnalysis()
    }
  }, [events, perspective, settings])

  const runAnalysis = () => {
    // Filter events by project first, then remove deleted events
    let filteredEvents = events.filter(e => !e.deleted)
    
    if (selectedProjectId && selectedProjectId !== 'all') {
      filteredEvents = filteredEvents.filter(e => e.project_id === selectedProjectId)
    }
    
    const result = analyzeScheduleConflicts(filteredEvents, perspective, weatherData)
    
    // Filter out ignored conflicts
    result.conflicts = result.conflicts.filter(c => {
      const conflictId = `${c.event1.id}-${c.event2.id}-${c.rule.id}`
      return !ignoredConflicts.has(conflictId)
    })
    
    setAnalysis(result)
    
    // Notify if critical conflicts found
    if (settings.notifyOnConflict && result.conflicts.some(c => c.severity === 'critical')) {
      toast({
        title: 'Critical Scheduling Conflicts Detected',
        description: 'Review the conflicts panel for details and resolutions',
        variant: 'destructive'
      })
    }
  }

  const handleResolveConflict = async (conflict: any) => {
    if (!onUpdateEvent) return
    
    const suggestions = suggestOptimalSchedule([conflict.event1, conflict.event2])
    
    if (suggestions.length > 0) {
      const suggestion = suggestions[0]
      
      // Apply the suggestion
      await onUpdateEvent(suggestion.eventId, {
        start_time: suggestion.suggestedStart.toISOString(),
        end_time: suggestion.suggestedEnd.toISOString()
      })
      
      // Send feedback to ML system
      await sendMLFeedback({
        principleId: conflict.rule.id,
        eventType1: conflict.event1.event_type,
        eventType2: conflict.event2.event_type,
        userAction: 'accepted',
        context: {
          weather: weatherData?.[0]?.condition,
          projectType: 'construction',
          location: conflict.event1.location,
          season: getSeason(new Date())
        },
        timestamp: new Date()
      })
      
      toast({
        title: 'Conflict Resolved',
        description: `${conflict.event1.title} has been rescheduled`,
      })
      
      // Re-run analysis
      runAnalysis()
    }
  }
  
  const sendMLFeedback = async (feedback: any) => {
    try {
      const response = await fetch('/api/nexus/ml/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'construction_principle',
          feedback,
          context: {
            principles: [],
            history: []
          }
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('ML feedback recorded:', result)
        
        // Apply any new recommendations
        if (result.recommendations?.length > 0) {
          toast({
            title: 'AI Recommendation',
            description: result.recommendations[0],
          })
        }
      }
    } catch (error) {
      console.error('Failed to send ML feedback:', error)
    }
  }
  
  const getSeason = (date: Date): string => {
    const month = date.getMonth()
    if (month >= 2 && month <= 4) return 'spring'
    if (month >= 5 && month <= 7) return 'summer'
    if (month >= 8 && month <= 10) return 'fall'
    return 'winter'
  }

  const handleIgnoreConflict = async (conflict: any) => {
    const conflictId = `${conflict.event1.id}-${conflict.event2.id}-${conflict.rule.id}`
    setIgnoredConflicts(prev => new Set(prev).add(conflictId))
    
    // Send rejection feedback to ML system
    await sendMLFeedback({
      principleId: conflict.rule.id,
      eventType1: conflict.event1.event_type,
      eventType2: conflict.event2.event_type,
      userAction: 'rejected',
      context: {
        weather: weatherData?.[0]?.condition,
        projectType: 'construction',
        location: conflict.event1.location,
        season: getSeason(new Date()),
        reason: 'user_ignored_conflict'
      },
      timestamp: new Date()
    })
    
    toast({
      title: 'Conflict Ignored',
      description: 'This conflict will no longer appear in the analysis',
    })
    
    runAnalysis()
  }

  const handleClearAllConflicts = () => {
    setIgnoredConflicts(new Set())
    runAnalysis()
    
    toast({
      title: 'Conflicts Cleared',
      description: 'All ignored conflicts have been restored',
    })
  }

  const handleAutoResolve = async () => {
    if (!onUpdateEvent || !analysis) return
    
    setAutoResolveMode(true)
    
    const suggestions = suggestOptimalSchedule(events, {
      preferredWorkDays: [1, 2, 3, 4, 5], // Monday to Friday
      workHoursStart: 7,
      workHoursEnd: 18
    })
    
    // Apply suggestions
    for (const suggestion of suggestions) {
      await onUpdateEvent(suggestion.eventId, {
        start_time: suggestion.suggestedStart.toISOString(),
        end_time: suggestion.suggestedEnd.toISOString()
      })
    }
    
    toast({
      title: 'Schedule Optimized',
      description: `${suggestions.length} events have been rescheduled`,
    })
    
    setAutoResolveMode(false)
    runAnalysis()
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'medium': return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'low': return <Info className="h-4 w-4 text-blue-600" />
      default: return <Info className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sequence': return <ArrowRight className="h-4 w-4" />
      case 'resource': return <Users className="h-4 w-4" />
      case 'space': return <Calendar className="h-4 w-4" />
      case 'weather': return <CloudRain className="h-4 w-4" />
      case 'inspection': return <Shield className="h-4 w-4" />
      case 'safety': return <AlertTriangle className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Construction Logic Analysis
          </CardTitle>
          <CardDescription>Analyzing schedule for conflicts...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-muted-foreground">Loading analysis...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Intelligent Conflict Analysis
              </CardTitle>
              <CardDescription>
                Construction logic-based scheduling conflicts
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={perspective} onValueChange={(v: any) => setPerspective(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strict">Strict</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Schedule Score */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Schedule Quality Score</span>
              <span className="text-sm font-bold">{analysis.score}%</span>
            </div>
            <Progress value={analysis.score} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {analysis.score >= 80 ? 'Excellent' : 
               analysis.score >= 60 ? 'Good' : 
               analysis.score >= 40 ? 'Fair' : 'Needs Improvement'}
            </p>
          </div>

          {/* Conflict Summary */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
              <div className="text-lg font-bold text-red-600">
                {analysis.conflicts.filter(c => c.severity === 'critical').length}
              </div>
              <div className="text-xs text-muted-foreground">Critical</div>
            </div>
            <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
              <div className="text-lg font-bold text-orange-600">
                {analysis.conflicts.filter(c => c.severity === 'high').length}
              </div>
              <div className="text-xs text-muted-foreground">High</div>
            </div>
            <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
              <div className="text-lg font-bold text-yellow-600">
                {analysis.conflicts.filter(c => c.severity === 'medium').length}
              </div>
              <div className="text-xs text-muted-foreground">Medium</div>
            </div>
            <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
              <div className="text-lg font-bold text-blue-600">
                {analysis.conflicts.filter(c => c.severity === 'low').length}
              </div>
              <div className="text-xs text-muted-foreground">Low</div>
            </div>
          </div>

          <Tabs defaultValue="conflicts" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="conflicts">
                Conflicts ({analysis.conflicts.length})
              </TabsTrigger>
              <TabsTrigger value="suggestions">
                Suggestions
              </TabsTrigger>
              <TabsTrigger value="dependencies">
                Dependencies
              </TabsTrigger>
            </TabsList>

            <TabsContent value="conflicts" className="space-y-2 mt-4">
              {analysis.conflicts.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>No Conflicts Detected</AlertTitle>
                  <AlertDescription>
                    Your schedule follows construction best practices!
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {analysis.conflicts.map((conflict, index) => (
                      <div
                        key={index}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all",
                          getSeverityColor(conflict.severity)
                        )}
                        onClick={() => setSelectedConflict(conflict)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getSeverityIcon(conflict.severity)}
                              {getTypeIcon(conflict.rule.type)}
                              <span className="font-medium text-sm">
                                {conflict.rule.name}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {conflict.description}
                            </p>
                            <div className="flex gap-2 text-xs">
                              <Badge variant="outline" className="text-xs">
                                {format(new Date(conflict.event1.start_time), 'MMM d')}
                              </Badge>
                              <ChevronRight className="h-3 w-3" />
                              <Badge variant="outline" className="text-xs">
                                {format(new Date(conflict.event2.start_time), 'MMM d')}
                              </Badge>
                            </div>
                            {conflict.resolution && (
                              <p className="text-xs mt-2 italic">
                                💡 {conflict.resolution}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleResolveConflict(conflict)
                              }}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleIgnoreConflict(conflict)
                                return false
                              }}
                              className="hover:bg-red-100"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {analysis.conflicts.length > 0 && (
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAutoResolve}
                    disabled={autoResolveMode}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Auto-Resolve All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearAllConflicts}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Ignored
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="suggestions" className="mt-4">
              <div className="space-y-2">
                {analysis.suggestions.map((suggestion, index) => (
                  <Alert key={index}>
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription>{suggestion}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="dependencies" className="mt-4">
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {Object.entries(TRADE_DEPENDENCIES).map(([trade, dep]) => (
                    <div key={trade} className="p-2 border rounded">
                      <div className="font-medium text-sm mb-1 capitalize">
                        {trade.replace('_', ' ')}
                      </div>
                      {dep.dependsOn.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Depends on: {dep.dependsOn.join(', ')}
                        </p>
                      )}
                      {dep.cannotOverlapWith.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Cannot overlap: {dep.cannotOverlapWith.join(', ')}
                        </p>
                      )}
                      <div className="flex gap-2 mt-1">
                        {dep.weatherSensitive && (
                          <Badge variant="outline" className="text-xs">
                            <CloudRain className="h-3 w-3 mr-1" />
                            Weather
                          </Badge>
                        )}
                        {dep.requiresInspection && (
                          <Badge variant="outline" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Inspection
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conflict Detection Settings</DialogTitle>
            <DialogDescription>
              Customize how conflicts are detected and analyzed
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="check-weather">Weather Conflicts</Label>
              <Switch
                id="check-weather"
                checked={settings.checkWeather}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, checkWeather: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="check-inspections">Inspection Requirements</Label>
              <Switch
                id="check-inspections"
                checked={settings.checkInspections}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, checkInspections: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="check-resources">Resource Conflicts</Label>
              <Switch
                id="check-resources"
                checked={settings.checkResources}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, checkResources: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="check-safety">Safety Violations</Label>
              <Switch
                id="check-safety"
                checked={settings.checkSafety}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, checkSafety: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-suggest">Auto-Suggest Resolutions</Label>
              <Switch
                id="auto-suggest"
                checked={settings.autoSuggest}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, autoSuggest: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="notify">Notify on Critical Conflicts</Label>
              <Switch
                id="notify"
                checked={settings.notifyOnConflict}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, notifyOnConflict: checked }))
                }
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conflict Detail Dialog */}
      <Dialog open={!!selectedConflict} onOpenChange={() => setSelectedConflict(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Conflict Details</DialogTitle>
          </DialogHeader>
          {selectedConflict && (
            <div className="space-y-4">
              <Alert className={getSeverityColor(selectedConflict.severity)}>
                <AlertTitle className="flex items-center gap-2">
                  {getSeverityIcon(selectedConflict.severity)}
                  {selectedConflict.rule.name}
                </AlertTitle>
                <AlertDescription>
                  {selectedConflict.rule.description}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Event 1</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{selectedConflict.event1.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedConflict.event1.start_time), 'MMM d, yyyy h:mm a')}
                    </p>
                    <Badge className="mt-2">{selectedConflict.event1.event_type}</Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Event 2</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{selectedConflict.event2.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedConflict.event2.start_time), 'MMM d, yyyy h:mm a')}
                    </p>
                    <Badge className="mt-2">{selectedConflict.event2.event_type}</Badge>
                  </CardContent>
                </Card>
              </div>

              {selectedConflict.resolution && (
                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertTitle>Suggested Resolution</AlertTitle>
                  <AlertDescription>
                    {selectedConflict.resolution}
                  </AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    handleIgnoreConflict(selectedConflict)
                    setSelectedConflict(null)
                  }}
                >
                  Ignore Conflict
                </Button>
                <Button
                  onClick={() => {
                    handleResolveConflict(selectedConflict)
                    setSelectedConflict(null)
                  }}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Auto-Resolve
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}