"use client"

import { useState, useEffect } from 'react'
import { Sparkles, Plus, X, ChevronRight, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { TaskSuggestion } from '@/lib/types'
import { useCreateTask } from '@/lib/hooks/use-tasks'
import { generateTaskSuggestions } from '@/lib/ai/task-suggestions'

interface TaskSuggestionsProps {
  currentTaskId?: string
  projectId?: string
  onTaskCreated?: (taskId: string) => void
}

export function TaskSuggestions({ 
  currentTaskId, 
  projectId,
  onTaskCreated 
}: TaskSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const createTaskMutation = useCreateTask()
  
  useEffect(() => {
    if (currentTaskId) {
      loadSuggestions()
    }
  }, [currentTaskId])
  
  const loadSuggestions = async () => {
    if (!currentTaskId) return
    
    setIsLoading(true)
    try {
      const newSuggestions = await generateTaskSuggestions(currentTaskId, projectId)
      setSuggestions(newSuggestions)
    } catch (error) {
      console.error('Failed to load task suggestions:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleAcceptSuggestion = async (suggestion: TaskSuggestion) => {
    try {
      const newTask = await createTaskMutation.mutateAsync({
        title: suggestion.suggested_title,
        description: suggestion.suggested_description,
        priority: suggestion.suggested_priority || 'medium',
        project_id: projectId,
        status: 'todo',
        tags: suggestion.suggested_tags,
        contact_tags: suggestion.suggested_contact_tags
      })
      
      // Remove accepted suggestion
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))
      
      if (onTaskCreated) {
        onTaskCreated(newTask.id)
      }
    } catch (error) {
      console.error('Failed to create task from suggestion:', error)
    }
  }
  
  const handleDismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions(prev => new Set(prev).add(suggestionId))
  }
  
  const visibleSuggestions = suggestions.filter(s => !dismissedSuggestions.has(s.id))
  
  if (!currentTaskId || visibleSuggestions.length === 0) {
    return null
  }
  
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI-Suggested Next Tasks
        </CardTitle>
        <CardDescription className="text-xs">
          Based on construction timeline and current task context
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="flex items-center gap-2 py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Analyzing task context...</span>
          </div>
        ) : (
          <>
            {visibleSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="p-3 border rounded-lg bg-background hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium">{suggestion.suggested_title}</h4>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs">
                              {Math.round(suggestion.confidence_score * 100)}% confidence
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs max-w-xs">
                              {suggestion.suggestion_reason || 'Based on typical construction sequence'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    {suggestion.suggested_description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {suggestion.suggested_description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs">
                      {suggestion.construction_phase && (
                        <Badge variant="secondary" className="text-xs">
                          {suggestion.construction_phase}
                        </Badge>
                      )}
                      {suggestion.suggested_duration_days && (
                        <span className="text-muted-foreground">
                          ~{suggestion.suggested_duration_days} days
                        </span>
                      )}
                      {suggestion.suggested_contact_tags && suggestion.suggested_contact_tags.length > 0 && (
                        <span className="text-muted-foreground">
                          Requires: {suggestion.suggested_contact_tags.map(t => t.contact_type).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => handleAcceptSuggestion(suggestion)}
                      disabled={createTaskMutation.isPending}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => handleDismissSuggestion(suggestion.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {visibleSuggestions.length > 0 && (
              <Alert className="border-primary/20 bg-primary/5">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  These suggestions are based on typical construction workflows. 
                  Review and adjust based on your specific project requirements.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}