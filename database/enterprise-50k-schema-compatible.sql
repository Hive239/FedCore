-- Enterprise 50K User Schema - COMPATIBLE WITH EXISTING SCHEMA
-- Only adds missing components needed for 50,000 user scale
-- Works with existing ProjectPro database structure

-- ============================================
-- RESOURCE MANAGEMENT (NEW)
-- ============================================

-- Resource usage tracking for billing and quotas (doesn't exist yet)
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

CREATE INDEX idx_usage_tenant ON resource_usage(tenant_id);
CREATE INDEX idx_usage_type ON resource_usage(resource_type);
CREATE INDEX idx_usage_period ON resource_usage(period_start, period_end);

-- ============================================
-- ENHANCE EXISTING TENANTS TABLE
-- ============================================

-- Add resource quota columns to existing tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS max_projects INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_storage_gb INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_api_calls_per_month INTEGER DEFAULT 100000,
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS domain VARCHAR(255);

-- Create slug from name if not exists
UPDATE tenants 
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Add last_active column to user_tenants for activity tracking
ALTER TABLE user_tenants
ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- DATABASE PARTITIONING FOR SCALE
-- ============================================

-- Partition existing activity_logs by month for better performance
-- Note: This requires recreating the table, so we'll create a migration function
CREATE OR REPLACE FUNCTION partition_activity_logs() 
RETURNS void AS $$
DECLARE
  start_date DATE := '2025-01-01';
  end_date DATE;
  partition_name TEXT;
BEGIN
  FOR i IN 0..11 LOOP
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'activity_logs_' || to_char(start_date, 'YYYY_MM');
    
    -- Check if partition exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE tablename = lower(partition_name)
    ) THEN
      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF activity_logs 
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
      );
    END IF;
    
    start_date := end_date;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Partition security_events for scale
CREATE OR REPLACE FUNCTION partition_security_events() 
RETURNS void AS $$
DECLARE
  start_date DATE := '2025-01-01';
  end_date DATE;
  partition_name TEXT;
BEGIN
  FOR i IN 0..11 LOOP
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'security_events_' || to_char(start_date, 'YYYY_MM');
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE tablename = lower(partition_name)
    ) THEN
      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF security_events 
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
      );
    END IF;
    
    start_date := end_date;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HIGH-PERFORMANCE CACHE TABLE (NEW)
-- ============================================

-- Dedicated cache for API responses and query results
CREATE TABLE IF NOT EXISTS performance_cache (
  cache_key VARCHAR(255) PRIMARY KEY,
  cache_value JSONB NOT NULL,
  cache_type VARCHAR(50) NOT NULL, -- 'api', 'query', 'aggregate'
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  hit_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cache_expires ON performance_cache(expires_at);
CREATE INDEX idx_cache_tenant ON performance_cache(tenant_id);
CREATE INDEX idx_cache_type ON performance_cache(cache_type);

-- ============================================
-- ENHANCED MATERIALIZED VIEWS FOR 50K SCALE
-- ============================================

-- Tenant statistics with resource usage
CREATE MATERIALIZED VIEW IF NOT EXISTS tenant_statistics_enhanced AS
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  t.subscription_tier,
  t.settings->>'industry' as industry,
  COUNT(DISTINCT ut.user_id) as user_count,
  COUNT(DISTINCT p.id) as project_count,
  COUNT(DISTINCT tk.id) as task_count,
  COUNT(DISTINCT v.id) as vendor_count,
  COUNT(DISTINCT d.id) as document_count,
  -- Resource usage
  COALESCE(SUM(ru.usage_value) FILTER (WHERE ru.resource_type = 'storage'), 0) as storage_used_gb,
  COALESCE(SUM(ru.usage_value) FILTER (WHERE ru.resource_type = 'api_calls'), 0) as api_calls_month,
  -- Limits
  t.max_users,
  t.max_projects,
  t.max_storage_gb,
  t.max_api_calls_per_month,
  -- Usage percentages
  CASE WHEN t.max_users > 0 
    THEN ROUND((COUNT(DISTINCT ut.user_id)::NUMERIC / t.max_users) * 100, 2)
    ELSE 0 
  END as user_usage_percent,
  CASE WHEN t.max_projects > 0 
    THEN ROUND((COUNT(DISTINCT p.id)::NUMERIC / t.max_projects) * 100, 2)
    ELSE 0 
  END as project_usage_percent,
  -- Activity
  MAX(al.created_at) as last_activity,
  COUNT(DISTINCT al.id) FILTER (WHERE al.created_at >= CURRENT_DATE) as activities_today,
  -- Performance metrics (productivity_metrics doesn't have response_time)
  AVG(pm.productivity_score) as avg_productivity_score,
  COUNT(DISTINCT se.id) FILTER (WHERE se.severity = 'critical') as critical_security_events
FROM tenants t
LEFT JOIN user_tenants ut ON t.id = ut.tenant_id
LEFT JOIN projects p ON t.id = p.tenant_id
LEFT JOIN tasks tk ON p.id = tk.project_id
LEFT JOIN vendors v ON t.id = v.tenant_id
LEFT JOIN documents d ON t.id = d.tenant_id
LEFT JOIN activity_logs al ON t.id = al.tenant_id
LEFT JOIN resource_usage ru ON t.id = ru.tenant_id 
  AND ru.period_start >= date_trunc('month', CURRENT_DATE)
LEFT JOIN productivity_metrics pm ON t.id = pm.tenant_id
  AND pm.date_calculated >= CURRENT_DATE - INTERVAL '1 day'
LEFT JOIN security_events se ON t.id = se.tenant_id
  AND se.created_at >= CURRENT_DATE - INTERVAL '24 hours'
GROUP BY t.id, t.name, t.subscription_tier, t.settings, 
         t.max_users, t.max_projects, t.max_storage_gb, t.max_api_calls_per_month
WITH DATA;

CREATE UNIQUE INDEX idx_tenant_stats_enhanced ON tenant_statistics_enhanced(tenant_id);

-- Global system metrics for 50K users
CREATE MATERIALIZED VIEW IF NOT EXISTS system_metrics_50k AS
SELECT 
  COUNT(DISTINCT t.id) as total_tenants,
  COUNT(DISTINCT t.id) FILTER (WHERE t.subscription_tier = 'enterprise') as enterprise_tenants,
  COUNT(DISTINCT p.id) as total_users,
  COUNT(DISTINCT al.user_id) FILTER (WHERE al.created_at >= CURRENT_DATE - INTERVAL '7 days') as weekly_active_users,
  COUNT(DISTINCT al.user_id) FILTER (WHERE al.created_at >= CURRENT_DATE - INTERVAL '1 day') as daily_active_users,
  COUNT(DISTINCT pr.id) as total_projects,
  COUNT(DISTINCT tk.id) as total_tasks,
  COUNT(DISTINCT tk.id) FILTER (WHERE tk.status = 'completed') as completed_tasks,
  -- Performance (using performance_logs table which has response_time)
  AVG(pl.response_time) as avg_response_time_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pl.response_time) as median_response_time_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY pl.response_time) as p95_response_time_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY pl.response_time) as p99_response_time_ms,
  -- Resource usage
  SUM(ru.usage_value) FILTER (WHERE ru.resource_type = 'storage') as total_storage_gb,
  SUM(ru.usage_value) FILTER (WHERE ru.resource_type = 'api_calls') as total_api_calls,
  -- Security
  COUNT(DISTINCT se.id) FILTER (WHERE se.created_at >= CURRENT_DATE - INTERVAL '24 hours') as security_events_24h,
  COUNT(DISTINCT se.id) FILTER (WHERE se.severity = 'critical' AND se.created_at >= CURRENT_DATE - INTERVAL '24 hours') as critical_events_24h,
  -- System health
  CURRENT_TIMESTAMP as last_updated
FROM tenants t
LEFT JOIN profiles p ON 1=1
LEFT JOIN user_tenants ut ON ut.user_id = p.id
LEFT JOIN projects pr ON pr.tenant_id = t.id
LEFT JOIN tasks tk ON tk.project_id = pr.id
LEFT JOIN activity_logs al ON al.tenant_id = t.id
LEFT JOIN performance_logs pl ON pl.timestamp >= CURRENT_DATE - INTERVAL '1 hour'
LEFT JOIN resource_usage ru ON ru.period_start >= date_trunc('day', CURRENT_DATE)
LEFT JOIN security_events se ON se.created_at >= CURRENT_DATE - INTERVAL '24 hours'
WITH DATA;

CREATE UNIQUE INDEX idx_system_metrics ON system_metrics_50k(last_updated);

-- ============================================
-- FUNCTIONS FOR 50K USER MANAGEMENT
-- ============================================

-- Check tenant resource limits before operations
CREATE OR REPLACE FUNCTION check_resource_limits()
RETURNS TRIGGER AS $$
DECLARE
  v_user_count INTEGER;
  v_project_count INTEGER;
  v_max_users INTEGER;
  v_max_projects INTEGER;
BEGIN
  -- Get tenant limits
  SELECT max_users, max_projects 
  INTO v_max_users, v_max_projects
  FROM tenants 
  WHERE id = NEW.tenant_id;
  
  -- Check user limits for user_tenants inserts
  IF TG_TABLE_NAME = 'user_tenants' THEN
    SELECT COUNT(*) INTO v_user_count
    FROM user_tenants
    WHERE tenant_id = NEW.tenant_id;
    
    IF v_user_count >= v_max_users THEN
      RAISE EXCEPTION 'Tenant has reached maximum user limit (%)', v_max_users;
    END IF;
  END IF;
  
  -- Check project limits for projects inserts
  IF TG_TABLE_NAME = 'projects' THEN
    SELECT COUNT(*) INTO v_project_count
    FROM projects
    WHERE tenant_id = NEW.tenant_id;
    
    IF v_project_count >= v_max_projects THEN
      RAISE EXCEPTION 'Tenant has reached maximum project limit (%)', v_max_projects;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply resource limit checks
CREATE TRIGGER check_user_limits
  BEFORE INSERT ON user_tenants
  FOR EACH ROW
  EXECUTE FUNCTION check_resource_limits();

CREATE TRIGGER check_project_limits
  BEFORE INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION check_resource_limits();

-- Track resource usage automatically
CREATE OR REPLACE FUNCTION track_resource_usage()
RETURNS void AS $$
DECLARE
  v_tenant RECORD;
  v_storage_gb DECIMAL;
  v_api_calls INTEGER;
BEGIN
  FOR v_tenant IN SELECT id FROM tenants LOOP
    -- Calculate storage usage (simplified - would need actual file sizes)
    SELECT COUNT(*) * 0.01 INTO v_storage_gb -- Assume 10MB per document average
    FROM documents 
    WHERE tenant_id = v_tenant.id;
    
    -- Track storage
    INSERT INTO resource_usage (tenant_id, resource_type, usage_value, usage_unit, period_start, period_end)
    VALUES (
      v_tenant.id, 
      'storage', 
      v_storage_gb, 
      'GB',
      date_trunc('day', CURRENT_DATE),
      date_trunc('day', CURRENT_DATE) + INTERVAL '1 day'
    )
    ON CONFLICT DO NOTHING;
    
    -- Track API calls (from activity logs)
    SELECT COUNT(*) INTO v_api_calls
    FROM api_audit_logs
    WHERE tenant_id = v_tenant.id
      AND created_at >= date_trunc('day', CURRENT_DATE);
    
    INSERT INTO resource_usage (tenant_id, resource_type, usage_value, usage_unit, period_start, period_end)
    VALUES (
      v_tenant.id,
      'api_calls',
      v_api_calls,
      'calls',
      date_trunc('day', CURRENT_DATE),
      date_trunc('day', CURRENT_DATE) + INTERVAL '1 day'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PERFORMANCE OPTIMIZATIONS FOR 50K SCALE
-- ============================================

-- BRIN indexes for large time-series tables (more efficient than B-tree for large tables)
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_brin ON activity_logs USING BRIN (created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_created_brin ON security_events USING BRIN (created_at);
CREATE INDEX IF NOT EXISTS idx_api_audit_logs_created_brin ON api_audit_logs USING BRIN (created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_brin ON notifications USING BRIN (created_at);

-- Partial indexes for common queries (smaller and faster)
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(tenant_id, id) WHERE status IN ('new', 'on-track');
CREATE INDEX IF NOT EXISTS idx_tasks_pending ON tasks(project_id, assigned_to) WHERE status IN ('pending', 'in-progress');
-- Index will only work after last_active column is added
CREATE INDEX IF NOT EXISTS idx_users_active ON user_tenants(tenant_id, user_id, last_active);

-- Hash indexes for exact lookups (faster for equality checks)
CREATE INDEX IF NOT EXISTS idx_tenants_slug_hash ON tenants USING HASH (slug);
CREATE INDEX IF NOT EXISTS idx_profiles_email_hash ON profiles USING HASH (email);

-- ============================================
-- CONNECTION POOLING CONFIGURATION
-- ============================================

-- Create connection pool settings table
CREATE TABLE IF NOT EXISTS connection_pool_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_name VARCHAR(50) UNIQUE NOT NULL,
  min_connections INTEGER DEFAULT 10,
  max_connections INTEGER DEFAULT 100,
  connection_lifetime_seconds INTEGER DEFAULT 3600,
  idle_timeout_seconds INTEGER DEFAULT 600,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pool configurations for 50K users
INSERT INTO connection_pool_config (pool_name, min_connections, max_connections) VALUES
  ('default', 50, 500),
  ('read_replica', 100, 1000),
  ('analytics', 10, 100),
  ('admin', 5, 20)
ON CONFLICT (pool_name) DO NOTHING;

-- ============================================
-- AUTOMATED MAINTENANCE
-- ============================================

-- Auto-vacuum settings for large tables
ALTER TABLE activity_logs SET (autovacuum_vacuum_scale_factor = 0.01);
ALTER TABLE security_events SET (autovacuum_vacuum_scale_factor = 0.01);
ALTER TABLE api_audit_logs SET (autovacuum_vacuum_scale_factor = 0.01);
ALTER TABLE notifications SET (autovacuum_vacuum_scale_factor = 0.01);

-- Create maintenance function
CREATE OR REPLACE FUNCTION perform_maintenance()
RETURNS void AS $$
BEGIN
  -- Refresh materialized views
  REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_statistics_enhanced;
  REFRESH MATERIALIZED VIEW CONCURRENTLY system_metrics_50k;
  
  -- Clean up old cache entries
  DELETE FROM performance_cache WHERE expires_at < CURRENT_TIMESTAMP;
  
  -- Clean up old partitions (keep 12 months)
  -- This would need more complex logic to drop old partitions
  
  -- Update statistics
  ANALYZE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MONITORING FUNCTIONS
-- ============================================

-- Get system health metrics
CREATE OR REPLACE FUNCTION get_system_health()
RETURNS TABLE (
  metric_name VARCHAR,
  metric_value NUMERIC,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'total_users'::VARCHAR,
    COUNT(DISTINCT id)::NUMERIC,
    CASE 
      WHEN COUNT(DISTINCT id) > 45000 THEN 'warning'
      WHEN COUNT(DISTINCT id) > 49000 THEN 'critical'
      ELSE 'healthy'
    END
  FROM profiles
  
  UNION ALL
  
  SELECT 
    'active_connections'::VARCHAR,
    COUNT(*)::NUMERIC,
    CASE 
      WHEN COUNT(*) > 4500 THEN 'warning'
      WHEN COUNT(*) > 4900 THEN 'critical'
      ELSE 'healthy'
    END
  FROM pg_stat_activity
  WHERE state = 'active'
  
  UNION ALL
  
  SELECT 
    'database_size_gb'::VARCHAR,
    ROUND((pg_database_size(current_database()) / 1024.0 / 1024.0 / 1024.0)::NUMERIC, 2),
    CASE 
      WHEN pg_database_size(current_database()) > 4000000000000 THEN 'warning' -- 4TB
      WHEN pg_database_size(current_database()) > 4800000000000 THEN 'critical' -- 4.8TB
      ELSE 'healthy'
    END
  
  UNION ALL
  
  SELECT 
    'cache_hit_ratio'::VARCHAR,
    ROUND((sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100)::NUMERIC, 2),
    CASE 
      WHEN sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) < 0.90 THEN 'warning'
      WHEN sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) < 0.80 THEN 'critical'
      ELSE 'healthy'
    END
  FROM pg_statio_user_tables;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INITIAL DATA AND MIGRATION
-- ============================================

-- Update existing tenants with default limits
UPDATE tenants 
SET 
  max_users = COALESCE(max_users, 100),
  max_projects = COALESCE(max_projects, 10),
  max_storage_gb = COALESCE(max_storage_gb, 10),
  max_api_calls_per_month = COALESCE(max_api_calls_per_month, 100000),
  subscription_tier = COALESCE(subscription_tier, 'free')
WHERE max_users IS NULL;

-- Set enterprise limits for existing large tenants
UPDATE tenants 
SET 
  max_users = 10000,
  max_projects = 1000,
  max_storage_gb = 1000,
  max_api_calls_per_month = 10000000,
  subscription_tier = 'enterprise'
WHERE id IN (
  SELECT tenant_id 
  FROM user_tenants 
  GROUP BY tenant_id 
  HAVING COUNT(*) > 50
);

-- Initialize resource tracking
SELECT track_resource_usage();

-- Refresh materialized views
REFRESH MATERIALIZED VIEW tenant_statistics_enhanced;
REFRESH MATERIALIZED VIEW system_metrics_50k;

-- ============================================
-- FINAL OPTIMIZATIONS
-- ============================================

-- Analyze all tables
ANALYZE;

COMMENT ON SCHEMA public IS 'Enterprise 50K user enhancements - Compatible with existing ProjectPro schema. Adds resource management, partitioning, and performance optimizations.';