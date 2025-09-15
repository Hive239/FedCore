-- ============================================
-- ENTERPRISE & SCALING FEATURES SCHEMA
-- Adds enterprise features for 50K+ users
-- Run AFTER complete-production-setup-fixed.sql
-- ============================================

-- Resource Usage Tracking
CREATE TABLE IF NOT EXISTS resource_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL, -- storage, api_calls, compute_time, users, projects
  usage_value DECIMAL(20,4) NOT NULL,
  usage_unit VARCHAR(20) NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Connection Pool Configuration
CREATE TABLE IF NOT EXISTS connection_pool_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_name VARCHAR(100) NOT NULL UNIQUE,
  min_connections INTEGER DEFAULT 5,
  max_connections INTEGER DEFAULT 100,
  connection_timeout_ms INTEGER DEFAULT 30000,
  idle_timeout_ms INTEGER DEFAULT 10000,
  max_lifetime_ms INTEGER DEFAULT 1800000,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Cache Layer
CREATE TABLE IF NOT EXISTS performance_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(255) NOT NULL,
  cache_value JSONB NOT NULL,
  cache_type VARCHAR(50) NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cache_key, tenant_id)
);

-- System Metrics for Scale
CREATE TABLE IF NOT EXISTS system_metrics_50k (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_timestamp TIMESTAMPTZ NOT NULL,
  total_users INTEGER,
  active_users_daily INTEGER,
  active_users_weekly INTEGER,
  active_users_monthly INTEGER,
  total_tenants INTEGER,
  active_tenants INTEGER,
  total_projects INTEGER,
  active_projects INTEGER,
  total_tasks INTEGER,
  completed_tasks_daily INTEGER,
  api_calls_per_minute INTEGER,
  avg_response_time_ms DECIMAL(10,2),
  p95_response_time_ms DECIMAL(10,2),
  p99_response_time_ms DECIMAL(10,2),
  database_connections_active INTEGER,
  database_connections_idle INTEGER,
  cache_hit_rate DECIMAL(5,4),
  storage_used_gb DECIMAL(20,2),
  bandwidth_used_gb DECIMAL(20,2),
  error_rate DECIMAL(5,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Archival System
CREATE TABLE IF NOT EXISTS archived_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  record_data JSONB NOT NULL,
  archived_reason VARCHAR(100),
  archived_by UUID REFERENCES profiles(id),
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  restore_before TIMESTAMPTZ,
  is_compressed BOOLEAN DEFAULT FALSE,
  compression_ratio DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant Resource Quotas (Enhancement to tenants table)
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS max_projects INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS max_storage_gb DECIMAL(10,2) DEFAULT 100,
ADD COLUMN IF NOT EXISTS max_api_calls_per_day INTEGER DEFAULT 100000,
ADD COLUMN IF NOT EXISTS current_users INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_projects INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_storage_gb DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS api_calls_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quota_reset_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_enterprise BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255),
ADD COLUMN IF NOT EXISTS sso_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sso_provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS data_retention_days INTEGER DEFAULT 365,
ADD COLUMN IF NOT EXISTS backup_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS backup_frequency VARCHAR(20) DEFAULT 'daily';

-- Distributed Lock Management
CREATE TABLE IF NOT EXISTS distributed_locks (
  lock_name VARCHAR(255) PRIMARY KEY,
  locked_by VARCHAR(255) NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  lock_data JSONB
);

-- Shard Management (for future horizontal scaling)
CREATE TABLE IF NOT EXISTS shard_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shard_key VARCHAR(100) NOT NULL,
  shard_id INTEGER NOT NULL,
  shard_host VARCHAR(255) NOT NULL,
  shard_port INTEGER DEFAULT 5432,
  shard_database VARCHAR(100) NOT NULL,
  weight INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shard_key, shard_id)
);

-- Multi-Region Configuration
CREATE TABLE IF NOT EXISTS region_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_code VARCHAR(20) NOT NULL UNIQUE,
  region_name VARCHAR(100) NOT NULL,
  primary_endpoint VARCHAR(255) NOT NULL,
  replica_endpoints JSONB,
  latency_ms INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant Region Assignment
CREATE TABLE IF NOT EXISTS tenant_regions (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  region_code VARCHAR(20) NOT NULL REFERENCES region_config(region_code),
  is_primary BOOLEAN DEFAULT TRUE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (tenant_id, region_code)
);

-- Create Materialized View for Tenant Statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS tenant_statistics_enhanced AS
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  t.is_enterprise,
  COUNT(DISTINCT ut.user_id) as user_count,
  COUNT(DISTINCT p.id) as project_count,
  COUNT(DISTINCT ta.id) as task_count,
  COUNT(DISTINCT d.id) as document_count,
  SUM(CASE WHEN ta.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
  AVG(EXTRACT(EPOCH FROM (ta.updated_at - ta.created_at))/86400)::DECIMAL(10,2) as avg_task_duration_days,
  MAX(ta.updated_at) as last_activity,
  t.current_storage_gb,
  t.current_users,
  (t.current_users::DECIMAL / NULLIF(t.max_users, 0) * 100)::DECIMAL(5,2) as user_quota_percent,
  (t.current_storage_gb / NULLIF(t.max_storage_gb, 0) * 100)::DECIMAL(5,2) as storage_quota_percent
FROM tenants t
LEFT JOIN user_tenants ut ON t.id = ut.tenant_id
LEFT JOIN projects p ON t.id = p.tenant_id
LEFT JOIN tasks ta ON t.id = ta.tenant_id
LEFT JOIN documents d ON t.id = d.tenant_id
GROUP BY t.id;

-- Create indexes for performance at scale
CREATE INDEX IF NOT EXISTS idx_resource_usage_tenant ON resource_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_resource_usage_type ON resource_usage(resource_type);
CREATE INDEX IF NOT EXISTS idx_resource_usage_period ON resource_usage(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_performance_cache_lookup ON performance_cache(cache_key, tenant_id);
CREATE INDEX IF NOT EXISTS idx_performance_cache_expires ON performance_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics_50k(metric_timestamp);
CREATE INDEX IF NOT EXISTS idx_archived_data_tenant ON archived_data(tenant_id);
CREATE INDEX IF NOT EXISTS idx_archived_data_table ON archived_data(table_name);
CREATE INDEX IF NOT EXISTS idx_distributed_locks_expires ON distributed_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_tenant_regions_lookup ON tenant_regions(tenant_id, is_primary);

-- Create BRIN indexes for large time-series tables
CREATE INDEX IF NOT EXISTS idx_resource_usage_created_brin ON resource_usage USING BRIN (created_at);
CREATE INDEX IF NOT EXISTS idx_system_metrics_created_brin ON system_metrics_50k USING BRIN (created_at);
CREATE INDEX IF NOT EXISTS idx_archived_data_created_brin ON archived_data USING BRIN (created_at);

-- Function for automatic data archival
CREATE OR REPLACE FUNCTION archive_old_data(
  p_table_name TEXT,
  p_days_old INTEGER DEFAULT 90,
  p_tenant_id UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_archived_count INTEGER := 0;
  v_query TEXT;
BEGIN
  -- Build dynamic query based on parameters
  v_query := format(
    'INSERT INTO archived_data (tenant_id, table_name, record_id, record_data, archived_reason)
     SELECT tenant_id, %L, id, to_jsonb(t.*), %L
     FROM %I t
     WHERE created_at < NOW() - INTERVAL %L DAY',
    p_table_name,
    'age_based_archival',
    p_table_name,
    p_days_old
  );
  
  IF p_tenant_id IS NOT NULL THEN
    v_query := v_query || format(' AND tenant_id = %L', p_tenant_id);
  END IF;
  
  EXECUTE v_query;
  GET DIAGNOSTICS v_archived_count = ROW_COUNT;
  
  RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql;

-- Function for connection pool monitoring
CREATE OR REPLACE FUNCTION get_connection_stats()
RETURNS TABLE (
  total_connections INTEGER,
  active_connections INTEGER,
  idle_connections INTEGER,
  waiting_connections INTEGER,
  max_connections INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_connections,
    COUNT(*) FILTER (WHERE state = 'active')::INTEGER as active_connections,
    COUNT(*) FILTER (WHERE state = 'idle')::INTEGER as idle_connections,
    COUNT(*) FILTER (WHERE wait_event_type = 'Client')::INTEGER as waiting_connections,
    current_setting('max_connections')::INTEGER as max_connections
  FROM pg_stat_activity
  WHERE datname = current_database();
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE resource_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_data ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
DO $$ BEGIN
  CREATE POLICY resource_usage_tenant_policy ON resource_usage
    FOR ALL USING (tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY performance_cache_tenant_policy ON performance_cache
    FOR ALL USING (
      tenant_id IS NULL OR 
      tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;