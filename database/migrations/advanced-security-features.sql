-- Advanced Security Features for 2025
-- AI Threat Prediction, Vulnerability Scanning, Zero-Trust Monitoring

-- AI Threat Predictions
CREATE TABLE IF NOT EXISTS ai_threat_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL,
  threat_category TEXT NOT NULL,
  probability DECIMAL(3,2) CHECK (probability >= 0 AND probability <= 1),
  predicted_impact TEXT CHECK (predicted_impact IN ('low', 'medium', 'high', 'critical')),
  predicted_timeframe TEXT, -- e.g., "next 24 hours", "next week"
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  risk_factors JSONB,
  recommended_actions JSONB,
  model_version TEXT,
  baseline_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  accuracy_feedback BOOLEAN,
  prevented BOOLEAN DEFAULT false
);

-- Vulnerability Scan Results
CREATE TABLE IF NOT EXISTS vulnerability_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL, -- 'infrastructure', 'application', 'dependency', 'configuration'
  target TEXT NOT NULL,
  vulnerabilities_found INTEGER DEFAULT 0,
  critical_count INTEGER DEFAULT 0,
  high_count INTEGER DEFAULT 0,
  medium_count INTEGER DEFAULT 0,
  low_count INTEGER DEFAULT 0,
  scan_duration INTEGER, -- milliseconds
  scanner_version TEXT,
  findings JSONB,
  remediation_status TEXT CHECK (remediation_status IN ('pending', 'in_progress', 'partial', 'complete')),
  auto_patched INTEGER DEFAULT 0,
  manual_review_required INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Zero Trust Access Logs
CREATE TABLE IF NOT EXISTS zero_trust_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  access_level TEXT NOT NULL,
  trust_score DECIMAL(3,2) CHECK (trust_score >= 0 AND trust_score <= 1),
  context_factors JSONB, -- device, location, time, behavior patterns
  risk_indicators JSONB,
  mfa_verified BOOLEAN DEFAULT false,
  device_compliance BOOLEAN DEFAULT false,
  network_zone TEXT,
  access_granted BOOLEAN NOT NULL,
  denial_reason TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quantum Encryption Status
CREATE TABLE IF NOT EXISTS quantum_encryption_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  system_component TEXT NOT NULL,
  encryption_algorithm TEXT NOT NULL,
  quantum_resistant BOOLEAN DEFAULT false,
  key_length INTEGER,
  migration_status TEXT CHECK (migration_status IN ('not_started', 'planning', 'in_progress', 'testing', 'complete')),
  estimated_quantum_vulnerability_date DATE,
  priority_level TEXT CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
  last_rotation TIMESTAMPTZ,
  next_rotation TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Behavioral Analytics
CREATE TABLE IF NOT EXISTS behavioral_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  entity_type TEXT NOT NULL, -- 'user', 'device', 'application', 'network'
  entity_id TEXT NOT NULL,
  baseline_behavior JSONB,
  current_behavior JSONB,
  anomaly_score DECIMAL(3,2) CHECK (anomaly_score >= 0 AND anomaly_score <= 1),
  anomaly_type TEXT,
  ml_model_confidence DECIMAL(3,2),
  risk_classification TEXT CHECK (risk_classification IN ('benign', 'suspicious', 'malicious', 'unknown')),
  investigation_required BOOLEAN DEFAULT false,
  auto_response_taken JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supply Chain Security
CREATE TABLE IF NOT EXISTS supply_chain_security (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  component_name TEXT NOT NULL,
  component_type TEXT NOT NULL, -- 'library', 'service', 'hardware', 'software'
  version TEXT,
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  vulnerabilities JSONB,
  compliance_status TEXT CHECK (compliance_status IN ('compliant', 'non_compliant', 'unknown')),
  last_security_audit TIMESTAMPTZ,
  sbom_available BOOLEAN DEFAULT false, -- Software Bill of Materials
  verified_signature BOOLEAN DEFAULT false,
  license_compliance BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_predictions_tenant ON ai_threat_predictions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_created ON ai_threat_predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vulnerability_scans_tenant ON vulnerability_scans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_zero_trust_tenant ON zero_trust_access(tenant_id);
CREATE INDEX IF NOT EXISTS idx_zero_trust_user ON zero_trust_access(user_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_analytics_user ON behavioral_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_analytics_anomaly ON behavioral_analytics(anomaly_score);

-- Enable RLS
ALTER TABLE ai_threat_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerability_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE zero_trust_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE quantum_encryption_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_chain_security ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant's AI predictions"
  ON ai_threat_predictions FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view their tenant's vulnerability scans"
  ON vulnerability_scans FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view their tenant's zero trust logs"
  ON zero_trust_access FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view their tenant's quantum encryption status"
  ON quantum_encryption_status FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view their tenant's behavioral analytics"
  ON behavioral_analytics FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view their tenant's supply chain security"
  ON supply_chain_security FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

-- Grant permissions
GRANT ALL ON ai_threat_predictions TO anon, authenticated;
GRANT ALL ON vulnerability_scans TO anon, authenticated;
GRANT ALL ON zero_trust_access TO anon, authenticated;
GRANT ALL ON quantum_encryption_status TO anon, authenticated;
GRANT ALL ON behavioral_analytics TO anon, authenticated;
GRANT ALL ON supply_chain_security TO anon, authenticated;