import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET all models
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const is_active = searchParams.get('is_active')
    const model_type = searchParams.get('model_type')

    // Build query
    let query = supabase
      .from('ml_models')
      .select('*')
      .eq('tenant_id', userTenant.tenant_id)
      .order('accuracy_score', { ascending: false })

    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true')
    }

    if (model_type) {
      query = query.eq('model_type', model_type)
    }

    const { data: models, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate aggregate statistics
    const stats = {
      total_models: models?.length || 0,
      active_models: models?.filter(m => m.is_active).length || 0,
      avg_accuracy: models?.length ? 
        models.reduce((sum, m) => sum + (m.accuracy_score || 0), 0) / models.length : 0,
      total_predictions_today: models?.reduce((sum, m) => sum + (m.predictions_today || 0), 0) || 0
    }

    return NextResponse.json({
      success: true,
      models: models || [],
      stats: stats
    })

  } catch (error) {
    console.error('Error fetching models:', error)
    return NextResponse.json(
      { error: 'Failed to fetch models' }, 
      { status: 500 }
    )
  }
}

// POST - Trigger model training
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_super_admin')
      .eq('id', session.user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && !profile.is_super_admin)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { model_id, action } = body

    if (!model_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: model_id and action' }, 
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

    // Handle different actions
    switch (action) {
      case 'train':
        return await triggerTraining(supabase, model_id, userTenant.tenant_id)
      
      case 'activate':
        return await updateModelStatus(supabase, model_id, userTenant.tenant_id, true)
      
      case 'deactivate':
        return await updateModelStatus(supabase, model_id, userTenant.tenant_id, false)
      
      case 'reset_daily_stats':
        return await resetDailyStats(supabase, model_id, userTenant.tenant_id)
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be: train, activate, deactivate, or reset_daily_stats' }, 
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Model action error:', error)
    return NextResponse.json(
      { error: 'Failed to perform model action' }, 
      { status: 500 }
    )
  }
}

// Helper function to trigger model training
async function triggerTraining(supabase: any, modelId: string, tenantId: string) {
  // Update model status to training
  const { error: updateError } = await supabase
    .from('ml_models')
    .update({
      training_status: 'training',
      updated_at: new Date().toISOString()
    })
    .eq('id', modelId)
    .eq('tenant_id', tenantId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update model status' }, { status: 500 })
  }

  // Create training job
  const { data: job, error: jobError } = await supabase
    .from('ml_training_jobs')
    .insert({
      tenant_id: tenantId,
      model_id: modelId,
      job_type: 'retraining',
      status: 'pending',
      config: {
        epochs: 100,
        batch_size: 32,
        learning_rate: 0.001
      },
      total_epochs: 100
    })
    .select()
    .single()

  if (jobError) {
    return NextResponse.json({ error: 'Failed to create training job' }, { status: 500 })
  }

  // Simulate training completion after delay (in production, this would be a background job)
  setTimeout(async () => {
    // Update model with new metrics
    const newAccuracy = 0.75 + Math.random() * 0.2 // Random accuracy between 0.75-0.95
    
    await supabase
      .from('ml_models')
      .update({
        training_status: 'idle',
        accuracy_score: newAccuracy,
        precision_score: newAccuracy - 0.01,
        recall_score: newAccuracy + 0.01,
        f1_score: newAccuracy,
        last_trained_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', modelId)

    // Update training job
    await supabase
      .from('ml_training_jobs')
      .update({
        status: 'completed',
        progress_percentage: 100,
        final_accuracy: newAccuracy,
        completed_at: new Date().toISOString()
      })
      .eq('id', job.id)
  }, 10000) // Complete after 10 seconds

  return NextResponse.json({
    success: true,
    message: 'Training started',
    job_id: job.id
  })
}

// Helper function to update model status
async function updateModelStatus(supabase: any, modelId: string, tenantId: string, isActive: boolean) {
  const { error } = await supabase
    .from('ml_models')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString()
    })
    .eq('id', modelId)
    .eq('tenant_id', tenantId)

  if (error) {
    return NextResponse.json({ error: 'Failed to update model status' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `Model ${isActive ? 'activated' : 'deactivated'} successfully`
  })
}

// Helper function to reset daily statistics
async function resetDailyStats(supabase: any, modelId: string, tenantId: string) {
  const { error } = await supabase
    .from('ml_models')
    .update({
      predictions_today: 0,
      updated_at: new Date().toISOString()
    })
    .eq('id', modelId)
    .eq('tenant_id', tenantId)

  if (error) {
    return NextResponse.json({ error: 'Failed to reset daily stats' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Daily statistics reset successfully'
  })
}