-- Create security_events table
CREATE TABLE IF NOT EXISTS security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(255) NOT NULL,
  severity VARCHAR(50) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  source_ip INET,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  endpoint VARCHAR(500),
  method VARCHAR(10),
  user_agent TEXT,
  payload JSONB,
  response_status INTEGER,
  response_time INTEGER,
  blocked BOOLEAN DEFAULT FALSE,
  threat_score INTEGER CHECK (threat_score >= 0 AND threat_score <= 100),
  geolocation JSONB,
  device_fingerprint VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT
);

-- Create security_incidents table
CREATE TABLE IF NOT EXISTS security_incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  incident_type VARCHAR(255) NOT NULL,
  severity VARCHAR(50) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(50) CHECK (status IN ('open', 'investigating', 'contained', 'resolved', 'closed')),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  affected_systems TEXT[],
  affected_users UUID[],
  detection_time TIMESTAMPTZ DEFAULT NOW(),
  containment_time TIMESTAMPTZ,
  resolution_time TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  root_cause TEXT,
  lessons_learned TEXT,
  related_events UUID[],
  evidence JSONB,
  timeline JSONB,
  impact_assessment JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create security_alerts table
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type VARCHAR(255) NOT NULL,
  severity VARCHAR(50) CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  title VARCHAR(500) NOT NULL,
  message TEXT,
  source VARCHAR(255),
  triggered_by VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create compliance_records table
CREATE TABLE IF NOT EXISTS compliance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  framework VARCHAR(255) NOT NULL,
  audit_type VARCHAR(255) NOT NULL,
  status VARCHAR(50) CHECK (status IN ('pending', 'in_progress', 'compliant', 'non_compliant', 'remediated')),
  compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100),
  audit_date DATE,
  next_audit_date DATE,
  findings JSONB,
  remediation_plan JSONB,
  evidence_links TEXT[],
  auditor_name VARCHAR(255),
  certificate_number VARCHAR(255),
  certificate_expiry DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ai_threat_predictions table
CREATE TABLE IF NOT EXISTS ai_threat_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  prediction_type VARCHAR(255) NOT NULL,
  threat_category VARCHAR(255) NOT NULL,
  probability DECIMAL(3,2) CHECK (probability >= 0 AND probability <= 1),
  predicted_impact VARCHAR(50) CHECK (predicted_impact IN ('low', 'medium', 'high', 'critical')),
  predicted_timeframe VARCHAR(255),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  risk_factors JSONB,
  recommended_actions JSONB,
  model_version VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  prevented BOOLEAN DEFAULT FALSE
);

-- Create vulnerability_scans table
CREATE TABLE IF NOT EXISTS vulnerability_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_type VARCHAR(255) NOT NULL,
  target VARCHAR(500) NOT NULL,
  vulnerabilities_found INTEGER DEFAULT 0,
  critical_count INTEGER DEFAULT 0,
  high_count INTEGER DEFAULT 0,
  medium_count INTEGER DEFAULT 0,
  low_count INTEGER DEFAULT 0,
  scan_duration INTEGER,
  findings JSONB,
  remediation_status VARCHAR(50),
  auto_patched INTEGER DEFAULT 0,
  scan_tool VARCHAR(255),
  scanner_version VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create zero_trust_access table
CREATE TABLE IF NOT EXISTS zero_trust_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resource_type VARCHAR(255) NOT NULL,
  resource_id VARCHAR(500) NOT NULL,
  access_granted BOOLEAN NOT NULL,
  trust_score DECIMAL(3,2) CHECK (trust_score >= 0 AND trust_score <= 1),
  risk_score DECIMAL(3,2) CHECK (risk_score >= 0 AND risk_score <= 1),
  factors_checked JSONB,
  mfa_verified BOOLEAN DEFAULT FALSE,
  device_compliance BOOLEAN DEFAULT FALSE,
  location_verified BOOLEAN DEFAULT FALSE,
  session_risk VARCHAR(50),
  denial_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create behavioral_analytics table
CREATE TABLE IF NOT EXISTS behavioral_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  behavior_type VARCHAR(255) NOT NULL,
  anomaly_score DECIMAL(3,2) CHECK (anomaly_score >= 0 AND anomaly_score <= 1),
  baseline_deviation DECIMAL(5,2),
  risk_level VARCHAR(50),
  patterns_detected JSONB,
  context_data JSONB,
  ml_model_used VARCHAR(255),
  flagged_for_review BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create supply_chain_security table
CREATE TABLE IF NOT EXISTS supply_chain_security (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  component_name VARCHAR(500) NOT NULL,
  vendor_name VARCHAR(500),
  component_type VARCHAR(255),
  version VARCHAR(100),
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  vulnerabilities JSONB,
  last_security_update DATE,
  sbom_available BOOLEAN DEFAULT FALSE,
  verified_signature BOOLEAN DEFAULT FALSE,
  license_compliance BOOLEAN DEFAULT TRUE,
  dependency_tree JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mobile_device_security table
CREATE TABLE IF NOT EXISTS mobile_device_security (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_id VARCHAR(500) UNIQUE NOT NULL,
  device_type VARCHAR(50),
  device_model VARCHAR(255),
  os_version VARCHAR(100),
  app_version VARCHAR(100),
  security_status VARCHAR(50),
  jailbroken_rooted BOOLEAN DEFAULT FALSE,
  encryption_enabled BOOLEAN DEFAULT TRUE,
  screen_lock_enabled BOOLEAN DEFAULT TRUE,
  remote_wipe_enabled BOOLEAN DEFAULT TRUE,
  last_security_check TIMESTAMPTZ,
  compliance_issues JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quantum_encryption_status table
CREATE TABLE IF NOT EXISTS quantum_encryption_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  system_name VARCHAR(500) NOT NULL,
  encryption_algorithm VARCHAR(255),
  quantum_resistant BOOLEAN DEFAULT FALSE,
  migration_status VARCHAR(50),
  migration_progress INTEGER CHECK (migration_progress >= 0 AND migration_progress <= 100),
  estimated_completion DATE,
  risk_assessment JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create construction_data_access table for construction-specific security
CREATE TABLE IF NOT EXISTS construction_data_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  data_type VARCHAR(255) NOT NULL,
  data_classification VARCHAR(50) CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted')),
  access_type VARCHAR(50) CHECK (access_type IN ('view', 'download', 'edit', 'delete', 'share')),
  access_granted BOOLEAN NOT NULL,
  ip_address INET,
  device_info JSONB,
  location JSONB,
  access_time TIMESTAMPTZ DEFAULT NOW(),
  session_duration INTEGER,
  data_volume INTEGER,
  anomaly_detected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_security_events_tenant_id ON security_events(tenant_id);
CREATE INDEX idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_event_type ON security_events(event_type);

CREATE INDEX idx_security_incidents_tenant_id ON security_incidents(tenant_id);
CREATE INDEX idx_security_incidents_status ON security_incidents(status);
CREATE INDEX idx_security_incidents_severity ON security_incidents(severity);

CREATE INDEX idx_security_alerts_tenant_id ON security_alerts(tenant_id);
CREATE INDEX idx_security_alerts_status ON security_alerts(status);

CREATE INDEX idx_compliance_records_tenant_id ON compliance_records(tenant_id);
CREATE INDEX idx_compliance_records_framework ON compliance_records(framework);

CREATE INDEX idx_ai_threat_predictions_tenant_id ON ai_threat_predictions(tenant_id);
CREATE INDEX idx_vulnerability_scans_tenant_id ON vulnerability_scans(tenant_id);
CREATE INDEX idx_zero_trust_access_tenant_id ON zero_trust_access(tenant_id);
CREATE INDEX idx_zero_trust_access_user_id ON zero_trust_access(user_id);

CREATE INDEX idx_behavioral_analytics_tenant_id ON behavioral_analytics(tenant_id);
CREATE INDEX idx_behavioral_analytics_user_id ON behavioral_analytics(user_id);

CREATE INDEX idx_supply_chain_security_tenant_id ON supply_chain_security(tenant_id);
CREATE INDEX idx_mobile_device_security_tenant_id ON mobile_device_security(tenant_id);
CREATE INDEX idx_mobile_device_security_user_id ON mobile_device_security(user_id);

CREATE INDEX idx_construction_data_access_tenant_id ON construction_data_access(tenant_id);
CREATE INDEX idx_construction_data_access_project_id ON construction_data_access(project_id);
CREATE INDEX idx_construction_data_access_access_time ON construction_data_access(access_time DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_threat_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerability_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE zero_trust_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_chain_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_device_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE quantum_encryption_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_data_access ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own security events" ON security_events
  FOR SELECT USING (auth.uid() = tenant_id OR auth.uid() = user_id);

CREATE POLICY "Users can create security events" ON security_events
  FOR INSERT WITH CHECK (auth.uid() = tenant_id OR auth.uid() = user_id);

CREATE POLICY "Users can view their own incidents" ON security_incidents
  FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Users can view their own alerts" ON security_alerts
  FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Users can view their compliance records" ON compliance_records
  FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Users can view AI predictions" ON ai_threat_predictions
  FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Users can view vulnerability scans" ON vulnerability_scans
  FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Users can view zero trust logs" ON zero_trust_access
  FOR SELECT USING (auth.uid() = tenant_id OR auth.uid() = user_id);

CREATE POLICY "Users can view behavioral analytics" ON behavioral_analytics
  FOR SELECT USING (auth.uid() = tenant_id OR auth.uid() = user_id);

CREATE POLICY "Users can view supply chain security" ON supply_chain_security
  FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Users can view mobile device security" ON mobile_device_security
  FOR SELECT USING (auth.uid() = tenant_id OR auth.uid() = user_id);

CREATE POLICY "Users can view quantum encryption status" ON quantum_encryption_status
  FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Users can view construction data access" ON construction_data_access
  FOR SELECT USING (auth.uid() = tenant_id OR auth.uid() = user_id);