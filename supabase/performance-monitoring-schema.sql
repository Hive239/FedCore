-- ============================================
-- PERFORMANCE MONITORING SYSTEM
-- Custom error tracking and performance monitoring
-- ============================================

-- 1. Error Tracking Table
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  error_type TEXT NOT NULL, -- 'javascript', 'api', 'database', 'network'
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_code TEXT,
  page_url TEXT,
  user_agent TEXT,
  ip_address INET,
  browser_info JSONB,
  device_info JSONB,
  session_id TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  frequency_count INTEGER DEFAULT 1,
  first_occurred_at TIMESTAMPTZ DEFAULT NOW(),
  last_occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Performance Metrics Table
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  session_id TEXT NOT NULL,
  page_url TEXT NOT NULL,
  page_load_time INTEGER, -- milliseconds
  dom_content_loaded INTEGER, -- milliseconds
  first_contentful_paint INTEGER, -- milliseconds
  largest_contentful_paint INTEGER, -- milliseconds
  cumulative_layout_shift DECIMAL(4,3), -- CLS score
  first_input_delay INTEGER, -- milliseconds
  api_response_times JSONB, -- {endpoint: time_ms}
  memory_usage JSONB, -- heap info
  network_info JSONB, -- connection type, speed
  device_info JSONB,
  browser_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User Sessions Table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  session_id TEXT UNIQUE NOT NULL,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  page_views INTEGER DEFAULT 0,
  actions_performed JSONB DEFAULT '[]'::jsonb,
  errors_encountered INTEGER DEFAULT 0,
  device_info JSONB,
  browser_info JSONB,
  ip_address INET,
  referrer TEXT,
  exit_page TEXT,
  bounce_rate BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. API Performance Table
CREATE TABLE IF NOT EXISTS public.api_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL, -- GET, POST, PUT, DELETE
  response_time INTEGER NOT NULL, -- milliseconds
  status_code INTEGER NOT NULL,
  request_size INTEGER, -- bytes
  response_size INTEGER, -- bytes
  user_id UUID REFERENCES public.profiles(id),
  session_id TEXT,
  error_message TEXT,
  query_count INTEGER, -- database queries made
  query_time INTEGER, -- total database time in ms
  cache_hit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. System Health Metrics
CREATE TABLE IF NOT EXISTS public.system_health (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  metric_unit TEXT, -- 'ms', 'mb', 'percent', 'count'
  category TEXT NOT NULL, -- 'database', 'memory', 'cpu', 'network'
  severity TEXT DEFAULT 'normal', -- 'normal', 'warning', 'critical'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Performance Alerts
CREATE TABLE IF NOT EXISTS public.performance_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'error_spike', 'performance_degradation', 'system_down'
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  threshold_value DECIMAL(10,2),
  current_value DECIMAL(10,2),
  related_errors INTEGER DEFAULT 0,
  affected_users INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'acknowledged', 'resolved'
  acknowledged_by UUID REFERENCES public.profiles(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_error_logs_tenant ON public.error_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON public.error_logs(resolved);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_tenant ON public.performance_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON public.performance_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_session ON public.performance_metrics(session_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_tenant ON public.user_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_start_time ON public.user_sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON public.user_sessions(session_id);

CREATE INDEX IF NOT EXISTS idx_api_performance_tenant ON public.api_performance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_performance_endpoint ON public.api_performance(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_performance_created_at ON public.api_performance(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_health_tenant ON public.system_health(tenant_id);
CREATE INDEX IF NOT EXISTS idx_system_health_category ON public.system_health(category);
CREATE INDEX IF NOT EXISTS idx_system_health_created_at ON public.system_health(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_alerts_tenant ON public.performance_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_status ON public.performance_alerts(status);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_severity ON public.performance_alerts(severity);

-- 8. Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_alerts ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS Policies (Admin only access)
CREATE POLICY "performance_admin_access" ON public.error_logs
  FOR ALL USING (
    tenant_id IN (
      SELECT ut.tenant_id FROM public.user_tenants ut
      JOIN public.profiles p ON p.id = ut.user_id
      WHERE ut.user_id = auth.uid() 
      AND p.role = 'admin'
    )
  );

CREATE POLICY "performance_admin_access" ON public.performance_metrics
  FOR ALL USING (
    tenant_id IN (
      SELECT ut.tenant_id FROM public.user_tenants ut
      JOIN public.profiles p ON p.id = ut.user_id
      WHERE ut.user_id = auth.uid() 
      AND p.role = 'admin'
    )
  );

CREATE POLICY "performance_admin_access" ON public.user_sessions
  FOR ALL USING (
    tenant_id IN (
      SELECT ut.tenant_id FROM public.user_tenants ut
      JOIN public.profiles p ON p.id = ut.user_id
      WHERE ut.user_id = auth.uid() 
      AND p.role = 'admin'
    )
  );

CREATE POLICY "performance_admin_access" ON public.api_performance
  FOR ALL USING (
    tenant_id IN (
      SELECT ut.tenant_id FROM public.user_tenants ut
      JOIN public.profiles p ON p.id = ut.user_id
      WHERE ut.user_id = auth.uid() 
      AND p.role = 'admin'
    )
  );

CREATE POLICY "performance_admin_access" ON public.system_health
  FOR ALL USING (
    tenant_id IN (
      SELECT ut.tenant_id FROM public.user_tenants ut
      JOIN public.profiles p ON p.id = ut.user_id
      WHERE ut.user_id = auth.uid() 
      AND p.role = 'admin'
    )
  );

CREATE POLICY "performance_admin_access" ON public.performance_alerts
  FOR ALL USING (
    tenant_id IN (
      SELECT ut.tenant_id FROM public.user_tenants ut
      JOIN public.profiles p ON p.id = ut.user_id
      WHERE ut.user_id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- 10. Create Helper Functions
CREATE OR REPLACE FUNCTION log_error(
  p_error_type TEXT,
  p_error_message TEXT,
  p_error_stack TEXT DEFAULT NULL,
  p_page_url TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'medium'
) RETURNS UUID AS $$
DECLARE
  error_id UUID;
  tenant_uuid UUID;
BEGIN
  -- Get user's tenant
  SELECT tenant_id INTO tenant_uuid
  FROM public.user_tenants 
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  -- Insert or update error log
  INSERT INTO public.error_logs (
    tenant_id, user_id, error_type, error_message, error_stack,
    page_url, session_id, severity
  ) VALUES (
    tenant_uuid, auth.uid(), p_error_type, p_error_message, p_error_stack,
    p_page_url, p_session_id, p_severity
  )
  ON CONFLICT (tenant_id, error_message, page_url) 
  DO UPDATE SET
    frequency_count = error_logs.frequency_count + 1,
    last_occurred_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO error_id;
  
  RETURN error_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION record_performance_metrics(
  p_session_id TEXT,
  p_page_url TEXT,
  p_metrics JSONB
) RETURNS UUID AS $$
DECLARE
  metric_id UUID;
  tenant_uuid UUID;
BEGIN
  -- Get user's tenant
  SELECT tenant_id INTO tenant_uuid
  FROM public.user_tenants 
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  INSERT INTO public.performance_metrics (
    tenant_id, user_id, session_id, page_url,
    page_load_time, dom_content_loaded, first_contentful_paint,
    largest_contentful_paint, cumulative_layout_shift, first_input_delay,
    api_response_times, memory_usage, network_info, device_info, browser_info
  ) VALUES (
    tenant_uuid, auth.uid(), p_session_id, p_page_url,
    (p_metrics->>'page_load_time')::INTEGER,
    (p_metrics->>'dom_content_loaded')::INTEGER,
    (p_metrics->>'first_contentful_paint')::INTEGER,
    (p_metrics->>'largest_contentful_paint')::INTEGER,
    (p_metrics->>'cumulative_layout_shift')::DECIMAL,
    (p_metrics->>'first_input_delay')::INTEGER,
    p_metrics->'api_response_times',
    p_metrics->'memory_usage',
    p_metrics->'network_info',
    p_metrics->'device_info',
    p_metrics->'browser_info'
  ) RETURNING id INTO metric_id;
  
  RETURN metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Grant Permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;