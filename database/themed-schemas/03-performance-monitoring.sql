-- ============================================
-- PERFORMANCE MONITORING & ANALYTICS SCHEMA
-- Adds comprehensive performance tracking
-- Run AFTER complete-production-setup-fixed.sql
-- ============================================

-- Error Logs
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  error_type VARCHAR(100) NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_code VARCHAR(50),
  severity VARCHAR(20) DEFAULT 'error', -- debug, info, warning, error, critical
  context JSONB,
  url TEXT,
  user_agent TEXT,
  ip_address INET,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  metric_type VARCHAR(100) NOT NULL, -- page_load, api_call, db_query, etc.
  metric_name VARCHAR(255) NOT NULL,
  metric_value DECIMAL(20,4) NOT NULL,
  metric_unit VARCHAR(50) NOT NULL, -- ms, seconds, bytes, etc.
  percentile_p50 DECIMAL(20,4),
  percentile_p95 DECIMAL(20,4),
  percentile_p99 DECIMAL(20,4),
  sample_count INTEGER DEFAULT 1,
  metadata JSONB,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Sessions Analytics
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  session_id VARCHAR(255) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  page_views INTEGER DEFAULT 0,
  actions_count INTEGER DEFAULT 0,
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100),
  screen_resolution VARCHAR(20),
  referrer TEXT,
  entry_page TEXT,
  exit_page TEXT,
  is_bounce BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id)
);

-- API Performance Tracking
CREATE TABLE IF NOT EXISTS api_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  response_time_ms INTEGER NOT NULL,
  status_code INTEGER NOT NULL,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  error_message TEXT,
  request_id VARCHAR(255),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- System Health Metrics
CREATE TABLE IF NOT EXISTS system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(20,4) NOT NULL,
  metric_unit VARCHAR(50),
  component VARCHAR(100) NOT NULL, -- database, api, cache, queue, etc.
  status VARCHAR(20) NOT NULL, -- healthy, degraded, critical
  threshold_warning DECIMAL(20,4),
  threshold_critical DECIMAL(20,4),
  metadata JSONB,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Alerts
CREATE TABLE IF NOT EXISTS performance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL, -- info, warning, critical
  component VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  threshold_value DECIMAL(20,4),
  actual_value DECIMAL(20,4),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  triggered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Slow Query Log
CREATE TABLE IF NOT EXISTS slow_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash VARCHAR(64) NOT NULL,
  query_text TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  rows_examined INTEGER,
  rows_returned INTEGER,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  connection_id VARCHAR(100),
  database_name VARCHAR(100),
  optimization_suggestions JSONB,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Logs
CREATE TABLE IF NOT EXISTS performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_type VARCHAR(50) NOT NULL, -- cache_hit, cache_miss, optimization, etc.
  log_level VARCHAR(20) DEFAULT 'info',
  component VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Productivity Metrics
CREATE TABLE IF NOT EXISTS productivity_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  metric_date DATE NOT NULL,
  tasks_completed INTEGER DEFAULT 0,
  tasks_created INTEGER DEFAULT 0,
  projects_updated INTEGER DEFAULT 0,
  documents_created INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  active_time_minutes INTEGER DEFAULT 0,
  productivity_score DECIMAL(5,2),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, metric_date)
);

-- Cache Performance
CREATE TABLE IF NOT EXISTS cache_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(255) NOT NULL,
  cache_type VARCHAR(50) NOT NULL, -- redis, memory, cdn
  operation VARCHAR(20) NOT NULL, -- get, set, delete, expire
  hit_miss VARCHAR(10), -- hit, miss
  response_time_ms INTEGER,
  size_bytes INTEGER,
  ttl_seconds INTEGER,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Resource Utilization
CREATE TABLE IF NOT EXISTS resource_utilization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type VARCHAR(50) NOT NULL, -- cpu, memory, disk, network
  utilization_percent DECIMAL(5,2),
  available_units DECIMAL(20,4),
  used_units DECIMAL(20,4),
  total_units DECIMAL(20,4),
  unit_type VARCHAR(50),
  server_id VARCHAR(100),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Web Vitals
CREATE TABLE IF NOT EXISTS web_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  page_url TEXT NOT NULL,
  lcp_ms INTEGER, -- Largest Contentful Paint
  fid_ms INTEGER, -- First Input Delay
  cls_score DECIMAL(6,4), -- Cumulative Layout Shift
  ttfb_ms INTEGER, -- Time to First Byte
  fcp_ms INTEGER, -- First Contentful Paint
  inp_ms INTEGER, -- Interaction to Next Paint
  device_type VARCHAR(50),
  connection_type VARCHAR(50),
  measured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_error_logs_tenant ON error_logs(tenant_id);
CREATE INDEX idx_error_logs_type ON error_logs(error_type);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_occurred ON error_logs(occurred_at);
CREATE INDEX idx_performance_metrics_lookup ON performance_metrics(tenant_id, metric_type, recorded_at);
CREATE INDEX idx_user_sessions_tenant ON user_sessions(tenant_id);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_api_performance_endpoint ON api_performance(endpoint, method);
CREATE INDEX idx_api_performance_timestamp ON api_performance(timestamp);
CREATE INDEX idx_system_health_component ON system_health(component);
CREATE INDEX idx_system_health_status ON system_health(status);
CREATE INDEX idx_performance_alerts_tenant ON performance_alerts(tenant_id);
CREATE INDEX idx_performance_alerts_resolved ON performance_alerts(resolved);
CREATE INDEX idx_slow_queries_hash ON slow_queries(query_hash);
CREATE INDEX idx_slow_queries_time ON slow_queries(execution_time_ms);
CREATE INDEX idx_productivity_metrics_lookup ON productivity_metrics(tenant_id, user_id, metric_date);
CREATE INDEX idx_cache_performance_key ON cache_performance(cache_key);
CREATE INDEX idx_web_vitals_page ON web_vitals(page_url);
CREATE INDEX idx_web_vitals_tenant ON web_vitals(tenant_id);

-- RLS Policies
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE slow_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE productivity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_utilization ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_vitals ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (tenant isolation where applicable)
CREATE POLICY error_logs_tenant_policy ON error_logs
  FOR ALL USING (
    tenant_id IS NULL OR 
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
  );

CREATE POLICY performance_metrics_tenant_policy ON performance_metrics
  FOR ALL USING (
    tenant_id IS NULL OR 
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
  );

CREATE POLICY user_sessions_tenant_policy ON user_sessions
  FOR ALL USING (
    tenant_id IS NULL OR 
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
  );

CREATE POLICY productivity_metrics_tenant_policy ON productivity_metrics
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));