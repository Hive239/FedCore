'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, MessageSquare, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface MLFeedbackProps {
  predictionId?: string
  predictionType: string
  confidence: number
  modelType: string
  tenantId?: string
}

export function MLFeedback({ 
  predictionId, 
  predictionType, 
  confidence, 
  modelType,
  tenantId 
}: MLFeedbackProps) {
  const [feedback, setFeedback] = useState<'accepted' | 'rejected' | null>(null)
  const [comment, setComment] = useState('')
  const [showComment, setShowComment] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const supabase = createClient()

  const handleFeedback = async (action: 'accepted' | 'rejected') => {
    setFeedback(action)
    
    if (action === 'rejected') {
      setShowComment(true)
      return
    }
    
    // Submit positive feedback immediately
    await submitFeedback(action)
  }

  const submitFeedback = async (action: 'accepted' | 'rejected', userComment?: string) => {
    setIsSubmitting(true)
    
    try {
      const { data: user } = await supabase.auth.getUser()
      
      const feedbackData = {
        tenant_id: tenantId,
        principle_id: predictionId,
        user_id: user?.user?.id,
        user_action: action,
        confidence_before: confidence,
        confidence_after: action === 'accepted' ? Math.min(confidence * 1.1, 1) : confidence * 0.9,
        context: {
          prediction_type: predictionType,
          model_type: modelType,
          comment: userComment,
          timestamp: new Date().toISOString()
        }
      }

      const { error } = await supabase
        .from('ml_feedback')
        .insert(feedbackData)

      if (!error) {
        setSubmitted(true)
        
        // Track in performance metrics
        await supabase.from('performance_metrics').insert({
          tenant_id: tenantId,
          metric_type: 'ml_feedback',
          metrics_data: {
            action,
            model: modelType,
            confidence_change: feedbackData.confidence_after - confidence
          }
        })
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <ThumbsUp className="h-4 w-4" />
        Thank you for your feedback!
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Was this helpful?</span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={feedback === 'accepted' ? 'default' : 'outline'}
            onClick={() => handleFeedback('accepted')}
            disabled={isSubmitting}
            className={cn(
              "h-8",
              feedback === 'accepted' && "bg-green-600 hover:bg-green-700"
            )}
          >
            <ThumbsUp className="h-3.5 w-3.5 mr-1" />
            Yes
          </Button>
          <Button
            size="sm"
            variant={feedback === 'rejected' ? 'default' : 'outline'}
            onClick={() => handleFeedback('rejected')}
            disabled={isSubmitting}
            className={cn(
              "h-8",
              feedback === 'rejected' && "bg-red-600 hover:bg-red-700"
            )}
          >
            <ThumbsDown className="h-3.5 w-3.5 mr-1" />
            No
          </Button>
        </div>
      </div>

      {showComment && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="h-4 w-4 text-orange-600" />
              Help us improve
            </div>
            <Textarea
              placeholder="What could be better?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[60px] text-sm"
            />
            <Button
              size="sm"
              onClick={() => submitFeedback('rejected', comment)}
              disabled={isSubmitting || !comment.trim()}
              className="w-full"
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              Submit Feedback
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}