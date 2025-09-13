-- ============================================
-- PERFORMANCE INFRASTRUCTURE SCHEMA
-- Multi-layer caching, read replicas, and optimization
-- ============================================

-- 1. Cache Management Table
CREATE TABLE IF NOT EXISTS public.cache_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  cache_value JSONB,
  cache_type TEXT CHECK (cache_type IN ('query', 'computation', 'aggregate', 'static')),
  ttl_seconds INTEGER DEFAULT 3600,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, cache_key)
);

-- 2. Read Replica Configuration
CREATE TABLE IF NOT EXISTS public.read_replica_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  replica_endpoint TEXT NOT NULL,
  replica_region TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1,
  latency_ms INTEGER,
  last_health_check TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Connection Pool Metrics
CREATE TABLE IF NOT EXISTS public.connection_pool_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  pool_name TEXT DEFAULT 'default',
  active_connections INTEGER DEFAULT 0,
  idle_connections INTEGER DEFAULT 0,
  waiting_connections INTEGER DEFAULT 0,
  max_connections INTEGER DEFAULT 100,
  avg_wait_time_ms INTEGER,
  total_connections_created BIGINT DEFAULT 0,
  total_connections_closed BIGINT DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Web Worker Jobs Queue
CREATE TABLE IF NOT EXISTS public.worker_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  job_payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 5,
  max_retries INTEGER DEFAULT 3,
  retry_count INTEGER DEFAULT 0,
  worker_id TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. GraphQL Query Cache
CREATE TABLE IF NOT EXISTS public.graphql_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  query_hash TEXT NOT NULL,
  query_text TEXT,
  variables JSONB,
  result JSONB,
  complexity_score INTEGER,
  execution_time_ms INTEGER,
  cache_hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(tenant_id, query_hash)
);

-- 6. Tenant-Specific Optimizations
CREATE TABLE IF NOT EXISTS public.tenant_optimizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  cache_strategy TEXT DEFAULT 'standard' CHECK (cache_strategy IN ('aggressive', 'standard', 'minimal')),
  max_cache_size_mb INTEGER DEFAULT 100,
  query_timeout_ms INTEGER DEFAULT 30000,
  max_concurrent_queries INTEGER DEFAULT 50,
  enable_read_replicas BOOLEAN DEFAULT false,
  enable_edge_caching BOOLEAN DEFAULT false,
  enable_predictive_fetch BOOLEAN DEFAULT false,
  custom_indexes TEXT[],
  partition_strategy TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Edge Function Deployments
CREATE TABLE IF NOT EXISTS public.edge_deployments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL UNIQUE,
  function_code TEXT,
  runtime TEXT DEFAULT 'deno',
  regions TEXT[] DEFAULT ARRAY['us-east-1'],
  environment_vars JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  version TEXT DEFAULT '1.0.0',
  deployed_at TIMESTAMPTZ DEFAULT NOW(),
  deployment_status TEXT DEFAULT 'active'
);

-- 8. Predictive Prefetch Patterns
CREATE TABLE IF NOT EXISTS public.prefetch_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  pattern_type TEXT NOT NULL,
  pattern_data JSONB NOT NULL,
  confidence_score DECIMAL(3,2),
  hit_rate DECIMAL(3,2),
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. DataLoader Batch Queue
CREATE TABLE IF NOT EXISTS public.dataloader_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  batch_key TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_ids TEXT[],
  status TEXT DEFAULT 'pending',
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- 10. Performance Benchmarks
CREATE TABLE IF NOT EXISTS public.performance_benchmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  benchmark_name TEXT NOT NULL,
  metric_value DECIMAL(10,2),
  metric_unit TEXT,
  baseline_value DECIMAL(10,2),
  improvement_percentage DECIMAL(5,2),
  measured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cache_entries_key ON public.cache_entries(tenant_id, cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_entries_expires ON public.cache_entries(expires_at);
CREATE INDEX IF NOT EXISTS idx_worker_jobs_status ON public.worker_jobs(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_worker_jobs_tenant ON public.worker_jobs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_graphql_cache_hash ON public.graphql_cache(tenant_id, query_hash);
CREATE INDEX IF NOT EXISTS idx_prefetch_patterns_user ON public.prefetch_patterns(user_id, pattern_type);

-- Enable RLS
ALTER TABLE public.cache_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.read_replica_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_pool_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graphql_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edge_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prefetch_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataloader_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_benchmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
DECLARE
  table_name TEXT;
  tables TEXT[] := ARRAY[
    'cache_entries',
    'read_replica_config',
    'connection_pool_metrics',
    'worker_jobs',
    'graphql_cache',
    'tenant_optimizations',
    'prefetch_patterns',
    'dataloader_batches',
    'performance_benchmarks'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "tenant_access" ON public.%I', table_name);
    EXECUTE format('
      CREATE POLICY "tenant_access" ON public.%I
      FOR ALL USING (
        tenant_id IN (
          SELECT tenant_id FROM public.user_tenants
          WHERE user_id = auth.uid()
        )
      )', table_name);
  END LOOP;
END $$;

-- Edge deployments have global access for admins only
DROP POLICY IF EXISTS "admin_only" ON public.edge_deployments;
CREATE POLICY "admin_only" ON public.edge_deployments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- Cache cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.cache_entries
  WHERE expires_at < NOW();
  
  DELETE FROM public.graphql_cache
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update cache expiry
CREATE OR REPLACE FUNCTION set_cache_expiry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at := NOW() + (NEW.ttl_seconds || ' seconds')::INTERVAL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_cache_expiry_trigger
  BEFORE INSERT OR UPDATE ON public.cache_entries
  FOR EACH ROW
  EXECUTE FUNCTION set_cache_expiry();

-- Worker job status update trigger
CREATE OR REPLACE FUNCTION update_worker_job_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  IF NEW.status = 'processing' AND OLD.status = 'pending' THEN
    NEW.started_at := NOW();
  ELSIF NEW.status IN ('completed', 'failed') THEN
    NEW.completed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER worker_job_timestamp_trigger
  BEFORE UPDATE ON public.worker_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_worker_job_timestamp();