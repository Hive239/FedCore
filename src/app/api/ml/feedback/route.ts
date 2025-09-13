import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { 
      prediction_id,
      user_action, // 'accepted', 'rejected', 'modified'
      feedback_type,
      principle_id,
      context,
      project_id
    } = body

    if (!user_action) {
      return NextResponse.json(
        { error: 'Missing required field: user_action' }, 
        { status: 400 }
      )
    }

    // Validate user_action
    if (!['accepted', 'rejected', 'modified'].includes(user_action)) {
      return NextResponse.json(
        { error: 'Invalid user_action. Must be: accepted, rejected, or modified' }, 
        { status: 400 }
      )
    }

    // Get user's current tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single()

    if (!userTenant) {
      return NextResponse.json({ error: 'No active tenant found' }, { status: 400 })
    }

    // Create feedback record
    const { data: feedbackRecord, error: feedbackError } = await supabase
      .from('ml_feedback')
      .insert({
        user_id: session.user.id,
        tenant_id: userTenant.tenant_id,
        feedback_type: feedback_type || 'prediction_feedback',
        user_action: user_action,
        principle_id: principle_id || null,
        context: context || {},
        project_id: project_id || null,
        project_context: project_id ? { project_id } : {}
      })
      .select()
      .single()

    if (feedbackError) {
      console.error('Failed to save feedback:', feedbackError)
      return NextResponse.json(
        { error: 'Failed to save feedback' }, 
        { status: 500 }
      )
    }

    // Update prediction cache if prediction_id provided
    if (prediction_id) {
      await supabase
        .from('predictions_cache')
        .update({
          user_feedback: user_action,
          feedback_id: feedbackRecord.id
        })
        .eq('id', prediction_id)
    }

    // If rejected, potentially create or update a learned principle
    if (user_action === 'rejected' && context?.reason) {
      await createLearnedPrinciple(supabase, {
        tenant_id: userTenant.tenant_id,
        feedback: feedbackRecord,
        context: context
      })
    }

    return NextResponse.json({
      success: true,
      feedback_id: feedbackRecord.id,
      message: 'Feedback recorded successfully'
    })

  } catch (error) {
    console.error('Feedback error:', error)
    return NextResponse.json(
      { error: 'Failed to record feedback' }, 
      { status: 500 }
    )
  }
}

// Helper function to create learned principles from feedback
async function createLearnedPrinciple(supabase: any, params: any) {
  const { tenant_id, feedback, context } = params
  
  // Generate a principle ID based on the context
  const principleId = `principle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  try {
    // Check if similar principle exists
    const { data: existingPrinciple } = await supabase
      .from('learned_principles')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('category', context.category || 'general')
      .single()

    if (existingPrinciple) {
      // Update existing principle
      await supabase
        .from('learned_principles')
        .update({
          times_rejected: existingPrinciple.times_rejected + 1,
          confidence: Math.max(0.3, existingPrinciple.confidence - 0.05),
          updated_at: new Date().toISOString(),
          examples: [...(existingPrinciple.examples || []), context]
        })
        .eq('id', existingPrinciple.id)
    } else {
      // Create new principle
      await supabase
        .from('learned_principles')
        .insert({
          tenant_id: tenant_id,
          principle_id: principleId,
          name: context.principle_name || 'User Preference',
          description: context.reason || 'Learned from user feedback',
          category: context.category || 'general',
          importance: 5,
          confidence: 0.5,
          conditions: context.conditions || {},
          examples: [context],
          times_applied: 1,
          times_rejected: 1,
          is_active: true
        })
    }
  } catch (error) {
    console.error('Failed to create learned principle:', error)
  }
}

// GET endpoint to fetch feedback
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const feedback_type = searchParams.get('feedback_type')
    const user_action = searchParams.get('user_action')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get user's current tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single()

    if (!userTenant) {
      return NextResponse.json({ error: 'No active tenant found' }, { status: 400 })
    }

    // Build query
    let query = supabase
      .from('ml_feedback')
      .select('*')
      .eq('tenant_id', userTenant.tenant_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (feedback_type) {
      query = query.eq('feedback_type', feedback_type)
    }

    if (user_action) {
      query = query.eq('user_action', user_action)
    }

    const { data: feedback, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate statistics
    const stats = {
      total: feedback?.length || 0,
      accepted: feedback?.filter(f => f.user_action === 'accepted').length || 0,
      rejected: feedback?.filter(f => f.user_action === 'rejected').length || 0,
      modified: feedback?.filter(f => f.user_action === 'modified').length || 0
    }

    return NextResponse.json({
      success: true,
      feedback: feedback || [],
      stats: stats
    })

  } catch (error) {
    console.error('Error fetching feedback:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback' }, 
      { status: 500 }
    )
  }
}