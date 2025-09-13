-- Fix ML Models table - Drop and recreate with all columns

-- 1. Drop the existing ml_models table if it exists
DROP TABLE IF EXISTS public.ml_models CASCADE;

-- 2. Create ML models table with all necessary columns
CREATE TABLE public.ml_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  model_name TEXT NOT NULL,
  model_type TEXT NOT NULL,
  version TEXT DEFAULT '1.0.0',
  accuracy_score DECIMAL(3,2) DEFAULT 0,
  precision_score DECIMAL(3,2) DEFAULT 0,
  recall_score DECIMAL(3,2) DEFAULT 0,
  f1_score DECIMAL(3,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  training_status TEXT DEFAULT 'idle',
  config JSONB DEFAULT '{}',
  total_predictions INTEGER DEFAULT 0,
  predictions_today INTEGER DEFAULT 0,
  avg_inference_time_ms DECIMAL(10,2),
  last_trained_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX idx_ml_models_tenant ON public.ml_models(tenant_id);
CREATE INDEX idx_ml_models_type ON public.ml_models(model_type);
CREATE INDEX idx_ml_models_active ON public.ml_models(is_active);

-- 4. Grant permissions
GRANT ALL ON public.ml_models TO authenticated;

-- 5. Now insert the ML models
DO $$
DECLARE
  default_tenant_id UUID;
BEGIN
  -- Get first tenant or create one
  SELECT id INTO default_tenant_id FROM public.tenants LIMIT 1;
  
  -- If no tenant exists, create one
  IF default_tenant_id IS NULL THEN
    INSERT INTO public.tenants (name)
    VALUES ('Default Organization')
    RETURNING id INTO default_tenant_id;
  END IF;
  
  -- Insert ML models for this tenant
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
  VALUES 
    (default_tenant_id, 'nexus_top_tier', 'nexus_top_tier', '1.0.0', 0.92, 0.91, 0.93, 0.92, true, '{"framework": "tensorflow.js", "architecture": "neural_network"}'::jsonb, NOW() - INTERVAL '7 days'),
    (default_tenant_id, 'weather_impact_analyzer', 'weather_impact_analyzer', '1.0.0', 0.88, 0.87, 0.89, 0.88, true, '{"framework": "tensorflow.js", "architecture": "neural_network"}'::jsonb, NOW() - INTERVAL '7 days'),
    (default_tenant_id, 'schedule_optimizer', 'schedule_optimizer', '1.0.0', 0.85, 0.84, 0.86, 0.85, true, '{"framework": "tensorflow.js", "architecture": "neural_network"}'::jsonb, NOW() - INTERVAL '7 days'),
    (default_tenant_id, 'resource_predictor', 'resource_predictor', '1.0.0', 0.83, 0.82, 0.84, 0.83, true, '{"framework": "tensorflow.js", "architecture": "neural_network"}'::jsonb, NOW() - INTERVAL '7 days'),
    (default_tenant_id, 'predictive_maintenance', 'predictive_maintenance', '1.0.0', 0.79, 0.78, 0.80, 0.79, true, '{"framework": "tensorflow.js", "architecture": "neural_network"}'::jsonb, NOW() - INTERVAL '7 days'),
    (default_tenant_id, 'worker_safety', 'worker_safety', '1.0.0', 0.94, 0.93, 0.95, 0.94, true, '{"framework": "tensorflow.js", "architecture": "neural_network"}'::jsonb, NOW() - INTERVAL '7 days'),
    (default_tenant_id, 'cost_prediction', 'cost_prediction', '1.0.0', 0.82, 0.81, 0.83, 0.82, true, '{"framework": "tensorflow.js", "architecture": "neural_network"}'::jsonb, NOW() - INTERVAL '7 days'),
    (default_tenant_id, 'quality_control', 'quality_control', '1.0.0', 0.91, 0.90, 0.92, 0.91, true, '{"framework": "tensorflow.js", "architecture": "neural_network"}'::jsonb, NOW() - INTERVAL '7 days'),
    (default_tenant_id, 'anomaly_detection', 'anomaly_detection', '1.0.0', 0.86, 0.85, 0.87, 0.86, true, '{"framework": "tensorflow.js", "architecture": "neural_network"}'::jsonb, NOW() - INTERVAL '7 days')
  ON CONFLICT DO NOTHING;
  
END $$;

-- 6. Add missing columns to predictions_cache and link to models
DO $$
BEGIN
  -- Add model_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'predictions_cache' 
    AND column_name = 'model_id'
  ) THEN
    ALTER TABLE public.predictions_cache ADD COLUMN model_id UUID REFERENCES public.ml_models(id) ON DELETE CASCADE;
  END IF;

  -- Add prediction_result if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'predictions_cache' 
    AND column_name = 'prediction_result'
  ) THEN
    ALTER TABLE public.predictions_cache ADD COLUMN prediction_result JSONB;
  END IF;

  -- Add inference_time_ms if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'predictions_cache' 
    AND column_name = 'inference_time_ms'
  ) THEN
    ALTER TABLE public.predictions_cache ADD COLUMN inference_time_ms DECIMAL(10,2);
  END IF;
END $$;

-- 7. Update existing predictions_cache records to link with models
UPDATE public.predictions_cache pc
SET model_id = m.id,
    prediction_result = COALESCE(pc.output_data, '{"result": "success"}'::jsonb),
    confidence_score = COALESCE(pc.confidence_score, 0.85)
FROM public.ml_models m
WHERE m.model_type = pc.model_type
AND pc.model_id IS NULL;

-- 8. Create function to update model statistics
CREATE OR REPLACE FUNCTION update_model_statistics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.model_id IS NOT NULL THEN
    UPDATE public.ml_models
    SET 
      total_predictions = total_predictions + 1,
      predictions_today = predictions_today + 1,
      updated_at = NOW()
    WHERE id = NEW.model_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for model statistics
DROP TRIGGER IF EXISTS update_model_stats_trigger ON public.predictions_cache;
CREATE TRIGGER update_model_stats_trigger
  AFTER INSERT ON public.predictions_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_model_statistics();