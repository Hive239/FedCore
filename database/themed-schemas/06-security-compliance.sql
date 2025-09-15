-- ============================================
-- SECURITY & COMPLIANCE SCHEMA
-- Adds comprehensive security and compliance features
-- Run AFTER complete-production-setup-fixed.sql
-- ============================================

-- Security Events
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL, -- login, logout, permission_change, data_access, etc.
  severity VARCHAR(20) NOT NULL, -- info, low, medium, high, critical
  user_id UUID REFERENCES profiles(id),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  resource_type VARCHAR(100),
  resource_id UUID,
  action VARCHAR(100),
  result VARCHAR(50), -- success, failure, blocked
  details JSONB,
  threat_indicators JSONB,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security Incidents
CREATE TABLE IF NOT EXISTS security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
  status VARCHAR(50) NOT NULL DEFAULT 'open', -- open, investigating, contained, resolved, closed
  incident_type VARCHAR(100) NOT NULL,
  affected_tenants UUID[],
  affected_users UUID[],
  detected_at TIMESTAMPTZ NOT NULL,
  contained_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  response_team JSONB,
  root_cause TEXT,
  lessons_learned TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security Alerts
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  threat_score DECIMAL(5,2),
  indicators JSONB,
  recommended_actions JSONB,
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  triggered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance Records
CREATE TABLE IF NOT EXISTS compliance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  compliance_type VARCHAR(100) NOT NULL, -- GDPR, CCPA, HIPAA, SOC2, etc.
  requirement VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL, -- compliant, non_compliant, partial, pending
  evidence JSONB,
  last_audit_date DATE,
  next_audit_date DATE,
  auditor VARCHAR(255),
  findings TEXT,
  remediation_plan TEXT,
  remediation_deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Threat Predictions
CREATE TABLE IF NOT EXISTS ai_threat_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_type VARCHAR(100) NOT NULL,
  threat_category VARCHAR(100) NOT NULL,
  confidence_score DECIMAL(5,4) NOT NULL,
  risk_level VARCHAR(20) NOT NULL, -- low, medium, high, critical
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  predicted_attack_vector VARCHAR(255),
  predicted_impact JSONB,
  recommended_mitigations JSONB,
  time_to_threat_hours DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  actual_outcome VARCHAR(100),
  accuracy_rating DECIMAL(5,4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ
);

-- Vulnerability Scans
CREATE TABLE IF NOT EXISTS vulnerability_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_type VARCHAR(50) NOT NULL, -- network, application, database, infrastructure
  scan_target VARCHAR(255) NOT NULL,
  scanner_name VARCHAR(100),
  vulnerabilities_found INTEGER DEFAULT 0,
  critical_count INTEGER DEFAULT 0,
  high_count INTEGER DEFAULT 0,
  medium_count INTEGER DEFAULT 0,
  low_count INTEGER DEFAULT 0,
  scan_results JSONB,
  remediation_status VARCHAR(50) DEFAULT 'pending',
  scan_started_at TIMESTAMPTZ NOT NULL,
  scan_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Zero Trust Access Control
CREATE TABLE IF NOT EXISTS zero_trust_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID NOT NULL,
  trust_score DECIMAL(5,4) NOT NULL,
  access_decision VARCHAR(50) NOT NULL, -- allow, deny, challenge
  factors_evaluated JSONB NOT NULL,
  risk_factors JSONB,
  session_id VARCHAR(255),
  valid_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Behavioral Analytics
CREATE TABLE IF NOT EXISTS behavioral_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  behavior_type VARCHAR(100) NOT NULL,
  normal_pattern JSONB NOT NULL,
  current_pattern JSONB NOT NULL,
  deviation_score DECIMAL(5,4),
  is_anomaly BOOLEAN DEFAULT FALSE,
  anomaly_type VARCHAR(100),
  risk_score DECIMAL(5,2),
  analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supply Chain Security
CREATE TABLE IF NOT EXISTS supply_chain_security (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name VARCHAR(255) NOT NULL,
  component_type VARCHAR(100) NOT NULL, -- library, service, api, infrastructure
  component_name VARCHAR(255) NOT NULL,
  version VARCHAR(50),
  risk_score DECIMAL(5,2),
  vulnerabilities_known INTEGER DEFAULT 0,
  last_security_review DATE,
  certification_status VARCHAR(100),
  certifications JSONB,
  is_approved BOOLEAN DEFAULT TRUE,
  approval_expires DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mobile Device Security
CREATE TABLE IF NOT EXISTS mobile_device_security (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  device_id VARCHAR(255) NOT NULL,
  device_type VARCHAR(50) NOT NULL,
  os_version VARCHAR(50),
  app_version VARCHAR(50),
  is_jailbroken BOOLEAN DEFAULT FALSE,
  is_encrypted BOOLEAN DEFAULT TRUE,
  last_security_check TIMESTAMPTZ,
  compliance_status VARCHAR(50) DEFAULT 'compliant',
  risk_factors JSONB,
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- Quantum Encryption Status
CREATE TABLE IF NOT EXISTS quantum_encryption_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_component VARCHAR(100) NOT NULL,
  current_algorithm VARCHAR(100) NOT NULL,
  is_quantum_resistant BOOLEAN DEFAULT FALSE,
  migration_status VARCHAR(50) DEFAULT 'not_started', -- not_started, planning, in_progress, completed
  target_algorithm VARCHAR(100),
  migration_deadline DATE,
  risk_assessment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Construction Data Access Logs
CREATE TABLE IF NOT EXISTS construction_data_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  data_category VARCHAR(100) NOT NULL, -- blueprints, contracts, schedules, costs, personnel
  operation VARCHAR(50) NOT NULL, -- view, download, edit, delete, share
  resource_id UUID,
  resource_name VARCHAR(255),
  ip_address INET,
  location JSONB,
  access_granted BOOLEAN NOT NULL,
  denial_reason VARCHAR(255),
  sensitivity_level VARCHAR(50), -- public, internal, confidential, restricted
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security Vulnerabilities
CREATE TABLE IF NOT EXISTS security_vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cve_id VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(20) NOT NULL,
  cvss_score DECIMAL(3,1),
  affected_components JSONB,
  exploit_available BOOLEAN DEFAULT FALSE,
  patch_available BOOLEAN DEFAULT FALSE,
  patch_url TEXT,
  workaround TEXT,
  discovered_date DATE,
  disclosed_date DATE,
  patched_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs (Enhanced)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  request_id VARCHAR(255),
  duration_ms INTEGER,
  status VARCHAR(50) NOT NULL, -- success, failure, error
  error_message TEXT,
  metadata JSONB,
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- GDPR Data Processing
CREATE TABLE IF NOT EXISTS user_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ NOT NULL,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, cancelled
  processed_at TIMESTAMPTZ,
  data_retained JSONB, -- Legal retention requirements
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Consent Tracking
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  consent_type VARCHAR(100) NOT NULL, -- terms, privacy, marketing, cookies, data_processing
  consent_given BOOLEAN NOT NULL,
  consent_version VARCHAR(50) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  given_at TIMESTAMPTZ DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ,
  UNIQUE(user_id, consent_type, consent_version)
);

-- Create indexes for performance
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_user ON security_events(user_id);
CREATE INDEX idx_security_events_occurred ON security_events(occurred_at);
CREATE INDEX idx_security_incidents_status ON security_incidents(status);
CREATE INDEX idx_security_incidents_severity ON security_incidents(severity);
CREATE INDEX idx_security_alerts_tenant ON security_alerts(tenant_id);
CREATE INDEX idx_security_alerts_unresolved ON security_alerts(is_resolved);
CREATE INDEX idx_compliance_records_tenant ON compliance_records(tenant_id);
CREATE INDEX idx_compliance_records_status ON compliance_records(status);
CREATE INDEX idx_ai_threat_predictions_active ON ai_threat_predictions(is_active);
CREATE INDEX idx_vulnerability_scans_completed ON vulnerability_scans(scan_completed_at);
CREATE INDEX idx_zero_trust_user ON zero_trust_access(user_id);
CREATE INDEX idx_behavioral_analytics_user ON behavioral_analytics(user_id);
CREATE INDEX idx_behavioral_analytics_anomaly ON behavioral_analytics(is_anomaly);
CREATE INDEX idx_mobile_device_user ON mobile_device_security(user_id);
CREATE INDEX idx_construction_data_access_user ON construction_data_access(user_id);
CREATE INDEX idx_construction_data_access_time ON construction_data_access(accessed_at);
CREATE INDEX idx_audit_logs_tenant_time ON audit_logs(tenant_id, performed_at);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_user_deletion_status ON user_deletion_requests(status);
CREATE INDEX idx_user_consents_user ON user_consents(user_id);

-- RLS Policies
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_threat_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE zero_trust_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_device_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_data_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- Security policies - admin only for most tables
CREATE POLICY security_events_admin_policy ON security_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_tenants 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY audit_logs_tenant_policy ON audit_logs
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY user_consents_own_policy ON user_consents
  FOR ALL USING (user_id = auth.uid());