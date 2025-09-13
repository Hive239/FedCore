-- Architecture Analysis System Tables

-- 1. Architecture Analysis Reports
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

-- 2. Security Vulnerabilities
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

-- 3. Compliance Tracking
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_analysis_reports_tenant ON public.architecture_analysis_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_created ON public.architecture_analysis_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_tenant ON public.security_vulnerabilities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_status ON public.security_vulnerabilities(status);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON public.security_vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_compliance_tenant ON public.compliance_tracking(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_framework ON public.compliance_tracking(framework);

-- Enable RLS
ALTER TABLE public.architecture_analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Drop existing and recreate)
DROP POLICY IF EXISTS "tenant_access" ON public.architecture_analysis_reports;
CREATE POLICY "tenant_access" ON public.architecture_analysis_reports
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tenant_access" ON public.security_vulnerabilities;
CREATE POLICY "tenant_access" ON public.security_vulnerabilities
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tenant_access" ON public.compliance_tracking;
CREATE POLICY "tenant_access" ON public.compliance_tracking
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

-- 4. ML Analysis Patterns
CREATE TABLE IF NOT EXISTS public.ml_analysis_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  pattern_type TEXT DEFAULT 'ml_detected',
  frequency INTEGER DEFAULT 0,
  impact TEXT,
  confidence DECIMAL(3,2),
  predictions JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Architecture Metrics
CREATE TABLE IF NOT EXISTS public.architecture_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  modularity_score INTEGER,
  coupling_score INTEGER,
  cohesion_score INTEGER,
  abstraction_score INTEGER,
  stability_score INTEGER,
  scalability_index INTEGER,
  module_count INTEGER,
  avg_module_size INTEGER,
  circular_dependencies INTEGER DEFAULT 0,
  god_classes INTEGER DEFAULT 0,
  code_smells INTEGER DEFAULT 0,
  design_patterns_used TEXT[],
  architectural_violations INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Dependency Analysis
CREATE TABLE IF NOT EXISTS public.dependency_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  current_version TEXT,
  latest_version TEXT,
  is_outdated BOOLEAN DEFAULT false,
  is_unused BOOLEAN DEFAULT false,
  has_vulnerability BOOLEAN DEFAULT false,
  vulnerability_severity TEXT,
  license TEXT,
  license_compatible BOOLEAN DEFAULT true,
  size_kb DECIMAL(10,2),
  dependencies_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ML Predictions
CREATE TABLE IF NOT EXISTS public.ml_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  model_name TEXT,
  prediction_type TEXT,
  metric_name TEXT,
  current_value DECIMAL(10,2),
  predicted_value_30d DECIMAL(10,2),
  predicted_value_90d DECIMAL(10,2),
  confidence DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Anomaly Detections
CREATE TABLE IF NOT EXISTS public.anomaly_detections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  anomaly_type TEXT,
  severity TEXT,
  metric_name TEXT,
  expected_value DECIMAL(10,2),
  actual_value DECIMAL(10,2),
  deviation_percentage DECIMAL(5,2),
  description TEXT,
  suggested_action TEXT,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_ml_patterns_tenant ON public.ml_analysis_patterns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_arch_metrics_tenant ON public.architecture_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dependency_tenant ON public.dependency_analysis(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_tenant ON public.ml_predictions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_tenant ON public.anomaly_detections(tenant_id);

-- Enable RLS for new tables
ALTER TABLE public.ml_analysis_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.architecture_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependency_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomaly_detections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables (Drop existing and recreate)
DROP POLICY IF EXISTS "tenant_access" ON public.ml_analysis_patterns;
CREATE POLICY "tenant_access" ON public.ml_analysis_patterns
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tenant_access" ON public.architecture_metrics;
CREATE POLICY "tenant_access" ON public.architecture_metrics
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tenant_access" ON public.dependency_analysis;
CREATE POLICY "tenant_access" ON public.dependency_analysis
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tenant_access" ON public.ml_predictions;
CREATE POLICY "tenant_access" ON public.ml_predictions
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tenant_access" ON public.anomaly_detections;
CREATE POLICY "tenant_access" ON public.anomaly_detections
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON public.architecture_analysis_reports TO authenticated;
GRANT ALL ON public.security_vulnerabilities TO authenticated;
GRANT ALL ON public.compliance_tracking TO authenticated;
GRANT ALL ON public.ml_analysis_patterns TO authenticated;
GRANT ALL ON public.architecture_metrics TO authenticated;
GRANT ALL ON public.dependency_analysis TO authenticated;
GRANT ALL ON public.ml_predictions TO authenticated;
GRANT ALL ON public.anomaly_detections TO authenticated;