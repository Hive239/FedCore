-- Performance Monitoring Database Schema
-- Complete setup for real-time performance tracking

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- 1. Error Logs Table
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  error_type TEXT NOT NULL, -- 'javascript', 'network', 'api', 'database'
  error_message TEXT NOT NULL,
  error_stack TEXT,
  page_url TEXT NOT NULL,
  browser_info JSONB,
  device_info JSONB,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  frequency_count INTEGER DEFAULT 1,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for error_logs
CREATE INDEX IF NOT EXISTS idx_error_logs_tenant_id ON error_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_session_id ON error_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_page_url ON error_logs(page_url);

-- 2. Performance Metrics Table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  page_url TEXT NOT NULL,
  
  -- Core Web Vitals
  page_load_time INTEGER, -- milliseconds
  dom_content_loaded INTEGER,
  first_contentful_paint NUMERIC,
  largest_contentful_paint NUMERIC,
  cumulative_layout_shift NUMERIC,
  first_input_delay NUMERIC,
  time_to_interactive NUMERIC,
  total_blocking_time NUMERIC,
  
  -- Additional metrics
  api_response_times JSONB,
  memory_usage JSONB,
  network_info JSONB,
  device_info JSONB,
  browser_info JSONB,
  
  -- New performance features
  cache_metrics JSONB, -- hits, misses, hitRate, size
  websocket_metrics JSONB, -- connected, channels, reconnectAttempts
  service_worker_metrics JSONB, -- registered, cachedResources, state
  cdn_metrics JSONB, -- resourceCount, avgLoadTime, totalSize, cacheHits
  react_query_metrics JSONB, -- totalQueries, cachedData, staleQueries, fetchingQueries
  ab_testing_metrics JSONB, -- activeExperiments, exposures, conversions
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance_metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_tenant_id ON performance_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_session_id ON performance_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_page_url ON performance_metrics(page_url);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at DESC);

-- 3. API Performance Table
CREATE TABLE IF NOT EXISTS api_performance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  response_time INTEGER NOT NULL, -- milliseconds
  status_code INTEGER NOT NULL,
  error_message TEXT,
  request_size INTEGER,
  response_size INTEGER,
  cache_hit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for api_performance
CREATE INDEX idx_api_performance_tenant_id ON api_performance(tenant_id);
CREATE INDEX idx_api_performance_endpoint ON api_performance(endpoint);
CREATE INDEX idx_api_performance_method ON api_performance(method);
CREATE INDEX idx_api_performance_status_code ON api_performance(status_code);
CREATE INDEX idx_api_performance_created_at ON api_performance(created_at DESC);

-- 4. Performance Alerts Table
CREATE TABLE IF NOT EXISTS performance_alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'performance', 'error_rate', 'api_latency', 'memory', 'cache'
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('active', 'acknowledged', 'resolved')) DEFAULT 'active',
  threshold_value NUMERIC,
  current_value NUMERIC,
  affected_users INTEGER DEFAULT 0,
  page_url TEXT,
  metadata JSONB,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance_alerts
CREATE INDEX idx_performance_alerts_tenant_id ON performance_alerts(tenant_id);
CREATE INDEX idx_performance_alerts_status ON performance_alerts(status);
CREATE INDEX idx_performance_alerts_severity ON performance_alerts(severity);
CREATE INDEX idx_performance_alerts_created_at ON performance_alerts(created_at DESC);

-- 5. Cache Statistics Table (for tracking cache performance over time)
CREATE TABLE IF NOT EXISTS cache_statistics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  cache_type TEXT NOT NULL, -- 'memory', 'redis', 'cdn'
  hits BIGINT DEFAULT 0,
  misses BIGINT DEFAULT 0,
  hit_rate NUMERIC(5,2),
  size_bytes BIGINT,
  evictions BIGINT DEFAULT 0,
  avg_response_time NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for cache_statistics
CREATE INDEX idx_cache_statistics_tenant_id ON cache_statistics(tenant_id);
CREATE INDEX idx_cache_statistics_cache_type ON cache_statistics(cache_type);
CREATE INDEX idx_cache_statistics_created_at ON cache_statistics(created_at DESC);

-- 6. WebSocket Events Table
CREATE TABLE IF NOT EXISTS websocket_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'connection', 'disconnection', 'channel_join', 'channel_leave', 'message'
  channel_name TEXT,
  payload JSONB,
  connection_status TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for websocket_events
CREATE INDEX idx_websocket_events_tenant_id ON websocket_events(tenant_id);
CREATE INDEX idx_websocket_events_user_id ON websocket_events(user_id);
CREATE INDEX idx_websocket_events_event_type ON websocket_events(event_type);
CREATE INDEX idx_websocket_events_created_at ON websocket_events(created_at DESC);

-- 7. A/B Testing Experiments Table
CREATE TABLE IF NOT EXISTS ab_experiments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  experiment_id TEXT NOT NULL UNIQUE,
  experiment_name TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  exposure_type TEXT CHECK (exposure_type IN ('exposure', 'conversion')) NOT NULL,
  metric_name TEXT,
  metric_value NUMERIC,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for ab_experiments
CREATE INDEX idx_ab_experiments_tenant_id ON ab_experiments(tenant_id);
CREATE INDEX idx_ab_experiments_experiment_id ON ab_experiments(experiment_id);
CREATE INDEX idx_ab_experiments_user_id ON ab_experiments(user_id);
CREATE INDEX idx_ab_experiments_exposure_type ON ab_experiments(exposure_type);
CREATE INDEX idx_ab_experiments_created_at ON ab_experiments(created_at DESC);

-- 8. Service Worker Cache Table
CREATE TABLE IF NOT EXISTS service_worker_cache (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  cache_name TEXT NOT NULL,
  resource_url TEXT NOT NULL,
  resource_type TEXT, -- 'script', 'style', 'image', 'font', 'document'
  cache_strategy TEXT, -- 'cache-first', 'network-first', 'stale-while-revalidate'
  size_bytes BIGINT,
  hit_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for service_worker_cache
CREATE INDEX idx_service_worker_cache_tenant_id ON service_worker_cache(tenant_id);
CREATE INDEX idx_service_worker_cache_resource_url ON service_worker_cache(resource_url);
CREATE INDEX idx_service_worker_cache_last_accessed ON service_worker_cache(last_accessed DESC);

-- RPC Functions for easier data insertion

-- Function to log errors with automatic tenant resolution
CREATE OR REPLACE FUNCTION log_error(
  p_error_type TEXT,
  p_error_message TEXT,
  p_error_stack TEXT DEFAULT NULL,
  p_page_url TEXT DEFAULT '/',
  p_session_id TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'medium'
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_error_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Get user's tenant
  IF v_user_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant_id
    FROM user_tenants
    WHERE user_id = v_user_id
    LIMIT 1;
  END IF;
  
  -- Insert error log
  INSERT INTO error_logs (
    tenant_id,
    user_id,
    session_id,
    error_type,
    error_message,
    error_stack,
    page_url,
    severity
  ) VALUES (
    v_tenant_id,
    v_user_id,
    COALESCE(p_session_id, 'unknown'),
    p_error_type,
    p_error_message,
    p_error_stack,
    p_page_url,
    p_severity
  ) RETURNING id INTO v_error_id;
  
  RETURN v_error_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record performance metrics
CREATE OR REPLACE FUNCTION record_performance_metrics(
  p_session_id TEXT,
  p_page_url TEXT,
  p_metrics JSONB
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_metric_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Get user's tenant
  IF v_user_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant_id
    FROM user_tenants
    WHERE user_id = v_user_id
    LIMIT 1;
  END IF;
  
  -- Insert performance metrics
  INSERT INTO performance_metrics (
    tenant_id,
    user_id,
    session_id,
    page_url,
    page_load_time,
    dom_content_loaded,
    first_contentful_paint,
    largest_contentful_paint,
    cumulative_layout_shift,
    first_input_delay,
    api_response_times,
    memory_usage,
    network_info,
    device_info,
    browser_info,
    cache_metrics,
    websocket_metrics,
    service_worker_metrics,
    cdn_metrics,
    react_query_metrics,
    ab_testing_metrics
  ) VALUES (
    v_tenant_id,
    v_user_id,
    p_session_id,
    p_page_url,
    (p_metrics->>'pageLoadTime')::INTEGER,
    (p_metrics->>'domContentLoaded')::INTEGER,
    (p_metrics->>'firstContentfulPaint')::NUMERIC,
    (p_metrics->>'largestContentfulPaint')::NUMERIC,
    (p_metrics->>'cumulativeLayoutShift')::NUMERIC,
    (p_metrics->>'firstInputDelay')::NUMERIC,
    p_metrics->'apiResponseTimes',
    p_metrics->'memoryUsage',
    p_metrics->'networkInfo',
    p_metrics->'deviceInfo',
    p_metrics->'browserInfo',
    p_metrics->'cacheMetrics',
    p_metrics->'websocketMetrics',
    p_metrics->'serviceWorkerMetrics',
    p_metrics->'cdnMetrics',
    p_metrics->'reactQueryMetrics',
    p_metrics->'abTestingMetrics'
  ) RETURNING id INTO v_metric_id;
  
  RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE websocket_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_worker_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for error_logs
CREATE POLICY "Users can view their tenant's error logs"
  ON error_logs FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert error logs for their tenant"
  ON error_logs FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    ) OR tenant_id IS NULL
  );

CREATE POLICY "Users can update their tenant's error logs"
  ON error_logs FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- Similar policies for other tables (following same pattern)
CREATE POLICY "Users can view their tenant's performance metrics"
  ON performance_metrics FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert performance metrics"
  ON performance_metrics FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    ) OR tenant_id IS NULL
  );

-- Grant necessary permissions
GRANT ALL ON error_logs TO authenticated;
GRANT ALL ON performance_metrics TO authenticated;
GRANT ALL ON api_performance TO authenticated;
GRANT ALL ON performance_alerts TO authenticated;
GRANT ALL ON cache_statistics TO authenticated;
GRANT ALL ON websocket_events TO authenticated;
GRANT ALL ON ab_experiments TO authenticated;
GRANT ALL ON service_worker_cache TO authenticated;

GRANT EXECUTE ON FUNCTION log_error TO authenticated;
GRANT EXECUTE ON FUNCTION record_performance_metrics TO authenticated;

-- Create views for aggregated data

-- Error summary view
CREATE OR REPLACE VIEW error_summary AS
SELECT 
  tenant_id,
  DATE_TRUNC('hour', created_at) as hour,
  error_type,
  severity,
  COUNT(*) as error_count,
  COUNT(DISTINCT user_id) as affected_users,
  COUNT(DISTINCT page_url) as affected_pages
FROM error_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY tenant_id, hour, error_type, severity;

-- Performance summary view
CREATE OR REPLACE VIEW performance_summary AS
SELECT 
  tenant_id,
  page_url,
  DATE_TRUNC('hour', created_at) as hour,
  AVG(page_load_time) as avg_page_load,
  AVG(first_contentful_paint) as avg_fcp,
  AVG(largest_contentful_paint) as avg_lcp,
  AVG(cumulative_layout_shift) as avg_cls,
  COUNT(*) as sample_count
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY tenant_id, page_url, hour;

-- Grant view permissions
GRANT SELECT ON error_summary TO authenticated;
GRANT SELECT ON performance_summary TO authenticated;