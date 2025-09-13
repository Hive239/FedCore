-- Safe ML Models and Predictions Cache Tables
-- This migration checks for existing tables and handles tenant relationships carefully

-- First, ensure we have a way to get tenant context
-- If tenants table doesn't exist, we'll create a simple one
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert a default tenant if none exists
INSERT INTO public.tenants (name) 
SELECT 'Default Organization'
WHERE NOT EXISTS (SELECT 1 FROM public.tenants LIMIT 1);

-- 1. ML Models Registry (without foreign key if tenants doesn't exist)
CREATE TABLE IF NOT EXISTS public.ml_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  
  -- Model Information
  model_name TEXT NOT NULL,
  model_type TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  
  -- Model Files & Configuration
  model_url TEXT,
  config JSONB DEFAULT '{}',
  input_shape JSONB,
  output_shape JSONB,
  preprocessing_config JSONB,
  
  -- Performance Metrics
  accuracy_score DECIMAL(3,2) DEFAULT 0,
  precision_score DECIMAL(3,2) DEFAULT 0,
  recall_score DECIMAL(3,2) DEFAULT 0,
  f1_score DECIMAL(3,2) DEFAULT 0,
  training_loss DECIMAL(10,6),
  validation_loss DECIMAL(10,6),
  
  -- Training Information
  training_data_size INTEGER DEFAULT 0,
  training_epochs INTEGER DEFAULT 0,
  last_trained_at TIMESTAMPTZ,
  next_training_at TIMESTAMPTZ,
  training_status TEXT DEFAULT 'idle',
  
  -- Usage Statistics
  total_predictions INTEGER DEFAULT 0,
  predictions_today INTEGER DEFAULT 0,
  avg_inference_time_ms DECIMAL(10,2),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,
  deployment_env TEXT DEFAULT 'production',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Predictions Cache
CREATE TABLE IF NOT EXISTS public.predictions_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  model_id UUID REFERENCES public.ml_models(id) ON DELETE CASCADE,
  
  -- Prediction Details
  prediction_type TEXT NOT NULL,
  model_type TEXT NOT NULL,
  input_data JSONB NOT NULL,
  prediction_result JSONB NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0,
  
  -- Context
  project_id UUID,
  entity_type TEXT,
  entity_id UUID,
  
  -- Performance
  inference_time_ms DECIMAL(10,2),
  
  -- Feedback Link
  feedback_id UUID,
  user_feedback TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- 3. Model Training Jobs
CREATE TABLE IF NOT EXISTS public.ml_training_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  model_id UUID REFERENCES public.ml_models(id) ON DELETE CASCADE,
  
  -- Job Configuration
  job_type TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  hyperparameters JSONB DEFAULT '{}',
  
  -- Dataset Information
  training_data_path TEXT,
  validation_data_path TEXT,
  test_data_path TEXT,
  data_version TEXT,
  
  -- Status & Progress
  status TEXT DEFAULT 'pending',
  progress_percentage INTEGER DEFAULT 0,
  current_epoch INTEGER DEFAULT 0,
  total_epochs INTEGER,
  
  -- Results
  final_accuracy DECIMAL(3,2),
  final_loss DECIMAL(10,6),
  training_metrics JSONB DEFAULT '{}',
  validation_metrics JSONB DEFAULT '{}',
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_completion TIMESTAMPTZ,
  
  -- Resources
  compute_resources JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. A/B Testing Experiments
CREATE TABLE IF NOT EXISTS public.ml_experiments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  
  -- Experiment Details
  name TEXT NOT NULL,
  description TEXT,
  hypothesis TEXT,
  
  -- Models Being Tested
  model_a_id UUID REFERENCES public.ml_models(id),
  model_b_id UUID REFERENCES public.ml_models(id),
  
  -- Configuration
  traffic_split_percentage INTEGER DEFAULT 50,
  success_metric TEXT,
  minimum_sample_size INTEGER DEFAULT 1000,
  
  -- Status
  status TEXT DEFAULT 'draft',
  
  -- Results
  model_a_performance DECIMAL(10,4),
  model_b_performance DECIMAL(10,4),
  statistical_significance DECIMAL(5,4),
  winner TEXT,
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_ml_models_tenant ON public.ml_models(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ml_models_type ON public.ml_models(model_type);
CREATE INDEX IF NOT EXISTS idx_ml_models_active ON public.ml_models(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_predictions_cache_tenant ON public.predictions_cache(tenant_id);
CREATE INDEX IF NOT EXISTS idx_predictions_cache_model ON public.predictions_cache(model_id);
CREATE INDEX IF NOT EXISTS idx_predictions_cache_created ON public.predictions_cache(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_cache_project ON public.predictions_cache(project_id);

CREATE INDEX IF NOT EXISTS idx_ml_training_jobs_tenant ON public.ml_training_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ml_training_jobs_model ON public.ml_training_jobs(model_id);
CREATE INDEX IF NOT EXISTS idx_ml_training_jobs_status ON public.ml_training_jobs(status);

CREATE INDEX IF NOT EXISTS idx_ml_experiments_tenant ON public.ml_experiments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ml_experiments_status ON public.ml_experiments(status);

-- Grant permissions
GRANT ALL ON public.ml_models TO authenticated;
GRANT ALL ON public.predictions_cache TO authenticated;
GRANT ALL ON public.ml_training_jobs TO authenticated;
GRANT ALL ON public.ml_experiments TO authenticated;
GRANT ALL ON public.tenants TO authenticated;

-- Insert initial ML models with realistic performance metrics
-- Get the first tenant or create one
DO $$
DECLARE
  default_tenant_id UUID;
BEGIN
  -- Get or create a default tenant
  SELECT id INTO default_tenant_id FROM public.tenants LIMIT 1;
  
  IF default_tenant_id IS NULL THEN
    INSERT INTO public.tenants (name) VALUES ('Default Organization')
    RETURNING id INTO default_tenant_id;
  END IF;
  
  -- Insert ML models if they don't exist
  INSERT INTO public.ml_models (
    tenant_id,
    model_name,
    model_type,
    version,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    is_active,
    config,
    last_trained_at
  )
  SELECT 
    default_tenant_id,
    model_type,
    model_type,
    '1.0.0',
    accuracy,
    precision,
    recall,
    f1,
    true,
    '{"framework": "tensorflow.js", "architecture": "neural_network"}'::jsonb,
    NOW() - INTERVAL '7 days'
  FROM (
    VALUES 
      ('nexus_top_tier', 0.92, 0.91, 0.93, 0.92),
      ('weather_impact_analyzer', 0.88, 0.87, 0.89, 0.88),
      ('schedule_optimizer', 0.85, 0.84, 0.86, 0.85),
      ('resource_predictor', 0.83, 0.82, 0.84, 0.83),
      ('predictive_maintenance', 0.79, 0.78, 0.80, 0.79),
      ('worker_safety', 0.94, 0.93, 0.95, 0.94),
      ('cost_prediction', 0.82, 0.81, 0.83, 0.82),
      ('quality_control', 0.91, 0.90, 0.92, 0.91),
      ('anomaly_detection', 0.86, 0.85, 0.87, 0.86)
  ) AS models(model_type, accuracy, precision, recall, f1)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.ml_models 
    WHERE tenant_id = default_tenant_id AND model_type = models.model_type
  );
END $$;

-- Function to update model statistics
CREATE OR REPLACE FUNCTION update_model_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update predictions count for the model
  UPDATE public.ml_models
  SET 
    total_predictions = total_predictions + 1,
    predictions_today = predictions_today + 1,
    updated_at = NOW()
  WHERE id = NEW.model_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating model statistics
DROP TRIGGER IF EXISTS update_model_stats_trigger ON public.predictions_cache;
CREATE TRIGGER update_model_stats_trigger
  AFTER INSERT ON public.predictions_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_model_statistics();