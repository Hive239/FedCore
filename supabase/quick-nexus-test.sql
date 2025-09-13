-- Quick test to verify Nexus AI tables and insert sample data
-- Run this in Supabase SQL Editor

-- First, check if tables exist
DO $$
BEGIN
  -- Check if nexus_analytics table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nexus_analytics') THEN
    RAISE NOTICE '✓ nexus_analytics table exists';
    
    -- Get count of existing records
    DECLARE
      v_count INTEGER;
      v_tenant_id UUID;
      v_project_id UUID;
    BEGIN
      SELECT COUNT(*) INTO v_count FROM public.nexus_analytics;
      RAISE NOTICE '  Current records: %', v_count;
      
      -- Get a tenant and project to use
      SELECT id INTO v_tenant_id FROM public.tenants LIMIT 1;
      SELECT id INTO v_project_id FROM public.projects WHERE tenant_id = v_tenant_id LIMIT 1;
      
      IF v_tenant_id IS NOT NULL AND v_project_id IS NOT NULL THEN
        -- Insert a test record for today
        INSERT INTO public.nexus_analytics (
          tenant_id,
          project_id,
          productivity_score,
          schedule_accuracy,
          conflicts_detected,
          ml_confidence,
          resource_utilization,
          performance_trend,
          created_at,
          updated_at
        ) VALUES (
          v_tenant_id,
          v_project_id,
          92,  -- High productivity score
          88,  -- Good schedule accuracy
          1,   -- One conflict
          95,  -- High ML confidence
          78,  -- Good resource utilization
          'up',
          NOW(),
          NOW()
        );
        
        RAISE NOTICE '✓ Inserted test analytics record';
        RAISE NOTICE '  Tenant ID: %', v_tenant_id;
        RAISE NOTICE '  Project ID: %', v_project_id;
        
        -- Verify insertion
        SELECT COUNT(*) INTO v_count FROM public.nexus_analytics WHERE tenant_id = v_tenant_id;
        RAISE NOTICE '  Records for this tenant: %', v_count;
      ELSE
        RAISE NOTICE '❌ No tenant or project found to insert data';
      END IF;
    END;
  ELSE
    RAISE NOTICE '❌ nexus_analytics table does not exist!';
    RAISE NOTICE 'Creating table now...';
    
    -- Create the table
    CREATE TABLE public.nexus_analytics (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
      project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
      productivity_score INTEGER DEFAULT 0,
      schedule_accuracy INTEGER DEFAULT 0,
      conflicts_detected INTEGER DEFAULT 0,
      ml_confidence INTEGER DEFAULT 0,
      resource_utilization INTEGER DEFAULT 0,
      performance_trend VARCHAR(20) DEFAULT 'stable' CHECK (performance_trend IN ('up', 'down', 'stable')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX idx_nexus_analytics_tenant ON nexus_analytics(tenant_id);
    CREATE INDEX idx_nexus_analytics_project ON nexus_analytics(project_id);
    CREATE INDEX idx_nexus_analytics_created ON nexus_analytics(created_at DESC);
    
    RAISE NOTICE '✓ Created nexus_analytics table';
  END IF;
  
  -- Check productivity_metrics table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'productivity_metrics') THEN
    RAISE NOTICE '✓ productivity_metrics table exists';
  ELSE
    RAISE NOTICE 'Creating productivity_metrics table...';
    
    CREATE TABLE public.productivity_metrics (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      tasks_completed INTEGER DEFAULT 0,
      hours_worked DECIMAL(10, 2) DEFAULT 0,
      productivity_score INTEGER DEFAULT 0,
      avg_task_duration DECIMAL(10, 2),
      quality_rating INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX idx_productivity_metrics_tenant ON productivity_metrics(tenant_id);
    CREATE INDEX idx_productivity_metrics_user ON productivity_metrics(user_id);
    CREATE INDEX idx_productivity_metrics_date ON productivity_metrics(date DESC);
    
    RAISE NOTICE '✓ Created productivity_metrics table';
  END IF;
  
  -- Check weather_risks table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'weather_risks') THEN
    RAISE NOTICE '✓ weather_risks table exists';
  ELSE
    RAISE NOTICE 'Creating weather_risks table...';
    
    CREATE TABLE public.weather_risks (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
      project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high')),
      impact_description TEXT,
      tasks_affected INTEGER DEFAULT 0,
      weather_condition VARCHAR(100),
      temperature_range VARCHAR(50),
      precipitation_chance INTEGER,
      wind_speed INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX idx_weather_risks_tenant ON weather_risks(tenant_id);
    CREATE INDEX idx_weather_risks_project ON weather_risks(project_id);
    CREATE INDEX idx_weather_risks_date ON weather_risks(date);
    
    RAISE NOTICE '✓ Created weather_risks table';
  END IF;
  
END $$;

-- Enable RLS on the tables
ALTER TABLE nexus_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE productivity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_risks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their tenant analytics" 
  ON nexus_analytics FOR SELECT 
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view their tenant productivity" 
  ON productivity_metrics FOR SELECT 
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view their tenant weather risks" 
  ON weather_risks FOR SELECT 
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

-- Final check
SELECT 
  'nexus_analytics' as table_name,
  COUNT(*) as record_count
FROM public.nexus_analytics
UNION ALL
SELECT 
  'productivity_metrics' as table_name,
  COUNT(*) as record_count
FROM public.productivity_metrics
UNION ALL
SELECT 
  'weather_risks' as table_name,
  COUNT(*) as record_count
FROM public.weather_risks;