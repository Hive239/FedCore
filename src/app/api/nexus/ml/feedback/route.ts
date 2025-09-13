import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { principlesEngine } from '@/lib/construction-principles'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, feedback, context } = body

    // First check if the table exists, if not, store in a simpler format
    let feedbackError = null
    try {
      // Try to store in ml_feedback table if it exists
      const { data: feedbackData, error } = await supabase
        .from('ml_feedback')
        .insert({
          user_id: user.id,
          feedback_type: type,
          event_type_1: feedback.eventType1 || feedback.event1?.event_type || 'unknown',
          event_type_2: feedback.eventType2 || feedback.event2?.event_type || 'unknown',
          user_action: feedback.userAction || 'accepted',
          principle_id: feedback.principleId || null,
          context: feedback.context || {},
          project_context: context || {},
          created_at: new Date().toISOString()
        })
        .select()
        .single()
        
      feedbackError = error
      if (feedbackError) {
        console.log('ML feedback table not ready, using fallback:', feedbackError.message)
        // Fallback: Store in a generic logs table or just process in memory
      }
    } catch (err) {
      console.log('ML feedback storage skipped - table may not exist yet:', err)
    }

    if (feedbackError) {
      console.error('Error storing feedback:', feedbackError)
    }

    // Analyze patterns in recent feedback (if table exists)
    let recentFeedback: any[] = []
    try {
      const { data } = await supabase
        .from('ml_feedback')
        .select('*')
        .eq('feedback_type', type)
        .order('created_at', { ascending: false })
        .limit(100)
      
      recentFeedback = data || []
    } catch (err) {
      console.log('ML feedback query skipped - table may not exist yet')
    }

    // Process feedback patterns
    const patterns = analyzePatterns(recentFeedback || [])
    
    // Generate new principles if patterns are strong
    const newPrinciples = generateNewPrinciples(patterns)
    
    // Update confidence scores based on feedback
    const updatedPrinciples = updatePrincipleConfidence(context.principles, recentFeedback || [])

    // Store learned principles
    if (newPrinciples.length > 0) {
      const { error: principleError } = await supabase
        .from('learned_principles')
        .insert(newPrinciples.map(p => ({
          principle_id: p.id,
          name: p.name,
          description: p.description,
          category: p.category,
          importance: p.importance,
          confidence: p.confidence,
          conditions: p.conditions,
          learned_from_project: user.id,
          created_at: new Date().toISOString()
        })))

      if (principleError) {
        console.error('Error storing learned principles:', principleError)
      }
    }

    // Return ML recommendations
    return NextResponse.json({
      success: true,
      updatedPrinciples,
      newPrinciples,
      patterns,
      recommendations: generateRecommendations(patterns, context)
    })

  } catch (error) {
    console.error('Nexus ML feedback error:', error)
    return NextResponse.json(
      { error: 'Failed to process feedback' },
      { status: 500 }
    )
  }
}

function analyzePatterns(feedback: any[]): any {
  const patterns: Map<string, any> = new Map()
  
  // Group feedback by event type pairs
  feedback.forEach(fb => {
    const key = `${fb.event_type_1}-${fb.event_type_2}`
    if (!patterns.has(key)) {
      patterns.set(key, {
        pair: key,
        total: 0,
        accepted: 0,
        rejected: 0,
        modified: 0,
        contexts: []
      })
    }
    
    const pattern = patterns.get(key)!
    pattern.total++
    pattern[fb.user_action]++
    pattern.contexts.push(fb.context)
  })

  // Calculate confidence scores
  const analyzedPatterns = Array.from(patterns.values()).map(p => ({
    ...p,
    acceptanceRate: p.accepted / p.total,
    rejectionRate: p.rejected / p.total,
    modificationRate: p.modified / p.total,
    confidence: calculateConfidence(p)
  }))

  return analyzedPatterns.filter(p => p.total >= 3) // Only patterns with enough data
}

function calculateConfidence(pattern: any): number {
  // Higher confidence if consistent behavior
  const consistency = Math.max(
    pattern.acceptanceRate,
    pattern.rejectionRate,
    pattern.modificationRate
  )
  
  // More data points = higher confidence
  const dataConfidence = Math.min(1, pattern.total / 20)
  
  return consistency * 0.7 + dataConfidence * 0.3
}

function generateNewPrinciples(patterns: any[]): any[] {
  const newPrinciples: any[] = []
  
  patterns.forEach(pattern => {
    // High rejection rate suggests a new principle is needed
    if (pattern.rejectionRate > 0.7 && pattern.confidence > 0.6) {
      const [type1, type2] = pattern.pair.split('-')
      
      newPrinciples.push({
        id: `learned_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        category: 'sequencing',
        name: `${type1} and ${type2} Compatibility`,
        description: `User preference: ${type1} should not overlap with ${type2} (${Math.round(pattern.rejectionRate * 100)}% rejection rate)`,
        importance: Math.round(5 + pattern.confidence * 5),
        conditions: [
          `Based on ${pattern.total} user decisions`,
          `${Math.round(pattern.rejectionRate * 100)}% rejection rate`,
          `Confidence: ${Math.round(pattern.confidence * 100)}%`
        ],
        learned: true,
        confidence: pattern.confidence
      })
    }
    
    // High modification rate suggests timing adjustments
    if (pattern.modificationRate > 0.5 && pattern.confidence > 0.5) {
      const [type1, type2] = pattern.pair.split('-')
      
      newPrinciples.push({
        id: `learned_timing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        category: 'efficiency',
        name: `${type1} to ${type2} Timing`,
        description: `User preference: Specific timing requirements between ${type1} and ${type2}`,
        importance: Math.round(4 + pattern.confidence * 4),
        conditions: [
          `Users frequently modify timing`,
          `${Math.round(pattern.modificationRate * 100)}% modification rate`
        ],
        learned: true,
        confidence: pattern.confidence * 0.8
      })
    }
  })
  
  return newPrinciples
}

function updatePrincipleConfidence(principles: any[], feedback: any[]): any[] {
  const principleMap = new Map(principles.map(p => [p.id, { ...p }]))
  
  feedback.forEach(fb => {
    if (fb.principle_id && principleMap.has(fb.principle_id)) {
      const principle = principleMap.get(fb.principle_id)!
      
      // Adjust confidence based on user action
      if (fb.user_action === 'accepted') {
        principle.confidence = Math.min(1, principle.confidence + 0.02)
      } else if (fb.user_action === 'rejected') {
        principle.confidence = Math.max(0.3, principle.confidence - 0.05)
      } else if (fb.user_action === 'modified') {
        principle.confidence = Math.max(0.4, principle.confidence - 0.02)
      }
    }
  })
  
  return Array.from(principleMap.values())
}

function generateRecommendations(patterns: any[], context: any): string[] {
  const recommendations: string[] = []
  
  // Analyze patterns for recommendations
  patterns.forEach(pattern => {
    if (pattern.rejectionRate > 0.6) {
      const [type1, type2] = pattern.pair.split('-')
      recommendations.push(
        `Consider avoiding scheduling ${type1} and ${type2} on the same day or overlapping times`
      )
    }
    
    if (pattern.modificationRate > 0.5) {
      const [type1, type2] = pattern.pair.split('-')
      recommendations.push(
        `Review timing requirements between ${type1} and ${type2} - users frequently adjust these`
      )
    }
    
    if (pattern.acceptanceRate > 0.8) {
      const [type1, type2] = pattern.pair.split('-')
      recommendations.push(
        `${type1} and ${type2} work well together - consider grouping them`
      )
    }
  })
  
  // Weather-based recommendations
  if (context.history?.some((h: any) => h.context?.weather === 'rain')) {
    recommendations.push(
      'Consider weather protection for outdoor trades during rainy periods'
    )
  }
  
  return recommendations.slice(0, 5) // Top 5 recommendations
}