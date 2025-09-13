-- ============================================
-- Fix Architecture Analysis Tables
-- Ensure all required tables exist with correct structure
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Fix performance_logs table to match what the page expects
-- Drop and recreate with correct structure
DROP TABLE IF EXISTS public.performance_logs;

CREATE TABLE public.performance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  endpoint TEXT,
  method TEXT DEFAULT 'GET',
  response_time INTEGER, -- milliseconds
  status_code INTEGER DEFAULT 200,
  error_message TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure error_logs table exists with correct structure
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  page_url TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Architecture Analysis Reports (ensure it exists)
CREATE TABLE IF NOT EXISTS public.architecture_analysis_reports (
  id TEXT PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  production_readiness_score INTEGER DEFAULT 0,
  report_data JSONB DEFAULT '{}'::jsonb,
  analyzed_by TEXT,
  environment TEXT DEFAULT 'production',
  version TEXT DEFAULT '1.0.0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- 4. Security Vulnerabilities 
CREATE TABLE IF NOT EXISTS public.security_vulnerabilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  vulnerability_type TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'false_positive')),
  description TEXT,
  file_path TEXT,
  line_number INTEGER,
  cwe_id TEXT,
  owasp_category TEXT,
  remediation TEXT,
  exploitability_score DECIMAL(3,1),
  impact_score DECIMAL(3,1),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Compliance Tracking
CREATE TABLE IF NOT EXISTS public.compliance_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  framework TEXT NOT NULL,
  compliant BOOLEAN DEFAULT false,
  compliance_percentage INTEGER DEFAULT 0,
  controls_passed INTEGER DEFAULT 0,
  controls_total INTEGER DEFAULT 0,
  last_audit_date TIMESTAMPTZ,
  next_audit_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_performance_logs_tenant ON public.performance_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_performance_logs_timestamp ON public.performance_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_tenant ON public.error_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_tenant ON public.architecture_analysis_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_created ON public.architecture_analysis_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_tenant ON public.security_vulnerabilities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_status ON public.security_vulnerabilities(status);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON public.security_vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_compliance_tenant ON public.compliance_tracking(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_framework ON public.compliance_tracking(framework);

-- Enable RLS
ALTER TABLE public.performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.architecture_analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Performance Logs
DROP POLICY IF EXISTS "tenant_access" ON public.performance_logs;
CREATE POLICY "tenant_access" ON public.performance_logs
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

-- Error Logs
DROP POLICY IF EXISTS "tenant_access" ON public.error_logs;
CREATE POLICY "tenant_access" ON public.error_logs
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

-- Architecture Analysis Reports
DROP POLICY IF EXISTS "tenant_access" ON public.architecture_analysis_reports;
CREATE POLICY "tenant_access" ON public.architecture_analysis_reports
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

-- Security Vulnerabilities
DROP POLICY IF EXISTS "tenant_access" ON public.security_vulnerabilities;
CREATE POLICY "tenant_access" ON public.security_vulnerabilities
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

-- Compliance Tracking
DROP POLICY IF EXISTS "tenant_access" ON public.compliance_tracking;
CREATE POLICY "tenant_access" ON public.compliance_tracking
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON public.performance_logs TO authenticated;
GRANT ALL ON public.error_logs TO authenticated;
GRANT ALL ON public.architecture_analysis_reports TO authenticated;
GRANT ALL ON public.security_vulnerabilities TO authenticated;
GRANT ALL ON public.compliance_tracking TO authenticated;

-- Create helper function to get tenant ID for current user
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
DECLARE
  tenant_uuid UUID;
BEGIN
  SELECT tenant_id INTO tenant_uuid
  FROM public.user_tenants
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN tenant_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_tenant_id() TO authenticated;