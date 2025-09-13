-- Complete Schema Setup - Run this to set up all tables properly
-- This handles all dependencies in the correct order

-- 1. First, create profiles if not exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  subscription_plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create user_tenants relationship
CREATE TABLE IF NOT EXISTS public.user_tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- 4. Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Now create ML models table with proper references
CREATE TABLE IF NOT EXISTS public.ml_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
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
  last_trained_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create predictions cache
CREATE TABLE IF NOT EXISTS public.predictions_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.ml_models(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  prediction_type TEXT NOT NULL,
  model_type TEXT NOT NULL,
  input_data JSONB NOT NULL,
  prediction_result JSONB NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0,
  inference_time_ms DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create or get default tenant
DO $$
DECLARE
  default_tenant_id UUID;
  first_user_id UUID;
BEGIN
  -- Check if we have any tenants
  SELECT id INTO default_tenant_id FROM public.tenants WHERE slug = 'default-org' LIMIT 1;
  
  IF default_tenant_id IS NULL THEN
    -- Create default tenant
    INSERT INTO public.tenants (name, slug, subscription_plan)
    VALUES ('Default Organization', 'default-org', 'free')
    RETURNING id INTO default_tenant_id;
  END IF;
  
  -- Get first user from profiles if exists
  SELECT id INTO first_user_id FROM public.profiles LIMIT 1;
  
  -- If we have a user and they're not already connected, connect them
  IF first_user_id IS NOT NULL THEN
    INSERT INTO public.user_tenants (user_id, tenant_id, role, status)
    VALUES (first_user_id, default_tenant_id, 'owner', 'active')
    ON CONFLICT (user_id, tenant_id) DO NOTHING;
  END IF;
  
  -- Insert ML models for this tenant if they don't exist
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

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_ml_models_tenant ON public.ml_models(tenant_id);
CREATE INDEX IF NOT EXISTS idx_predictions_cache_tenant ON public.predictions_cache(tenant_id);
CREATE INDEX IF NOT EXISTS idx_predictions_cache_model ON public.predictions_cache(model_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_user ON public.user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant ON public.user_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON public.projects(tenant_id);

-- Grant permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.tenants TO authenticated;
GRANT ALL ON public.user_tenants TO authenticated;
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.ml_models TO authenticated;
GRANT ALL ON public.predictions_cache TO authenticated;