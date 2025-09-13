-- Create performance monitoring tables and functions

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS log_error(text, text, text, text, text, text);
DROP FUNCTION IF EXISTS record_performance_metrics(text, text, jsonb);

-- Table for error logs
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  error_type TEXT NOT NULL,
  error_message TEXT,
  error_stack TEXT,
  page_url TEXT,
  session_id TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  page_url TEXT,
  metrics JSONB,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for API performance tracking
CREATE TABLE IF NOT EXISTS api_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  response_time INTEGER,
  status_code INTEGER,
  session_id TEXT,
  error_message TEXT,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to log errors
CREATE OR REPLACE FUNCTION log_error(
  p_error_type TEXT,
  p_error_message TEXT,
  p_error_stack TEXT,
  p_page_url TEXT,
  p_session_id TEXT,
  p_severity TEXT
)
RETURNS VOID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Get tenant ID from current user
  SELECT ut.tenant_id INTO v_tenant_id
  FROM user_tenants ut
  WHERE ut.user_id = auth.uid()
  LIMIT 1;

  -- Insert error log
  INSERT INTO error_logs (
    error_type,
    error_message,
    error_stack,
    page_url,
    session_id,
    severity,
    tenant_id
  ) VALUES (
    p_error_type,
    p_error_message,
    p_error_stack,
    p_page_url,
    p_session_id,
    p_severity,
    v_tenant_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record performance metrics
CREATE OR REPLACE FUNCTION record_performance_metrics(
  p_session_id TEXT,
  p_page_url TEXT,
  p_metrics JSONB
)
RETURNS VOID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Get tenant ID from current user
  SELECT ut.tenant_id INTO v_tenant_id
  FROM user_tenants ut
  WHERE ut.user_id = auth.uid()
  LIMIT 1;

  -- Insert performance metrics
  INSERT INTO performance_metrics (
    session_id,
    page_url,
    metrics,
    tenant_id
  ) VALUES (
    p_session_id,
    p_page_url,
    p_metrics,
    v_tenant_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_error_logs_session ON error_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_session ON performance_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created ON performance_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_performance_session ON api_performance(session_id);
CREATE INDEX IF NOT EXISTS idx_api_performance_endpoint ON api_performance(endpoint);

-- Enable Row Level Security
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_performance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their tenant's error logs"
  ON error_logs FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert error logs for their tenant"
  ON error_logs FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view their tenant's performance metrics"
  ON performance_metrics FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert performance metrics for their tenant"
  ON performance_metrics FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view their tenant's API performance"
  ON api_performance FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert API performance for their tenant"
  ON api_performance FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));