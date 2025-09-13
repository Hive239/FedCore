import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Initial ML models data - matching actual database schema
const initialModels = [
  {
    model_name: 'Project Completion Predictor',
    model_type: 'classification',
    version: '1.0.0',
    accuracy_score: 0.92,
    is_active: true
  },
  {
    model_name: 'Budget Forecaster',
    model_type: 'regression',
    version: '1.0.0',
    accuracy_score: 0.88,
    is_active: true
  },
  {
    model_name: 'Performance Anomaly Detector',
    model_type: 'anomaly_detection',
    version: '2.1.0',
    accuracy_score: 0.94,
    is_active: true
  },
  {
    model_name: 'Resource Utilization Optimizer',
    model_type: 'optimization',
    version: '1.2.0',
    accuracy_score: 0.85,
    is_active: true
  },
  {
    model_name: 'Task Priority Classifier',
    model_type: 'classification',
    version: '1.0.0',
    accuracy_score: 0.90,
    is_active: true
  },
  {
    model_name: 'Deadline Risk Predictor',
    model_type: 'classification',
    version: '1.1.0',
    accuracy_score: 0.87,
    is_active: true
  },
  {
    model_name: 'Team Collaboration Scorer',
    model_type: 'regression',
    version: '1.0.0',
    accuracy_score: 0.79,
    is_active: true
  }
]

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if models already exist
    const { data: existingModels, error: checkError } = await supabase
      .from('ml_models')
      .select('id')
      .limit(1)

    if (checkError) {
      console.error('Error checking models:', checkError)
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    // If models already exist, return success
    if (existingModels && existingModels.length > 0) {
      const { data: allModels } = await supabase
        .from('ml_models')
        .select('*')
        .eq('is_active', true)
        .order('accuracy_score', { ascending: false })

      return NextResponse.json({ 
        message: 'Models already initialized',
        models: allModels,
        count: allModels?.length || 0
      })
    }

    // Initialize models - no need for timestamp as it's not in the schema
    const { data: insertedModels, error: insertError } = await supabase
      .from('ml_models')
      .insert(initialModels)
      .select()

    if (insertError) {
      console.error('Error inserting models:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Note: ml_training_jobs table doesn't exist in current schema
    // Skipping training jobs creation

    return NextResponse.json({ 
      message: 'ML models initialized successfully',
      models: insertedModels,
      count: insertedModels?.length || 0
    })
  } catch (error) {
    console.error('Error initializing ML models:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to initialize models' 
    }, { status: 500 })
  }
}

export async function POST() {
  // Same as GET for convenience
  return GET()
}