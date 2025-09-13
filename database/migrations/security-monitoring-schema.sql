-- Network Security Monitoring Schema for ProjectPro
-- Enterprise-grade security monitoring and threat detection

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Security event types enum
CREATE TYPE security_event_type AS ENUM (
    'authentication_failure',
    'brute_force_attempt',
    'suspicious_api_activity',
    'data_exfiltration_attempt',
    'privilege_escalation',
    'sql_injection_attempt',
    'xss_attempt',
    'csrf_attempt',
    'rate_limit_exceeded',
    'unauthorized_access',
    'malicious_file_upload',
    'data_breach_attempt',
    'insider_threat',
    'compliance_violation',
    'network_intrusion',
    'anomalous_behavior'
);

-- Security severity levels
CREATE TYPE security_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Security audit levels
CREATE TYPE security_audit_level AS ENUM ('minimal', 'standard', 'enhanced', 'forensic');

-- Compliance status
CREATE TYPE compliance_status AS ENUM ('pending', 'in_progress', 'compliant', 'non_compliant', 'remediated');

-- Security events master table
CREATE TABLE IF NOT EXISTS security_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    event_type security_event_type NOT NULL,
    severity security_severity DEFAULT 'medium' NOT NULL,
    source_ip INET NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    session_id TEXT,
    endpoint TEXT,
    method TEXT,
    user_agent TEXT,
    payload JSONB,
    response_status INTEGER,
    response_time INTEGER,
    blocked BOOLEAN DEFAULT FALSE,
    threat_score INTEGER CHECK (threat_score >= 0 AND threat_score <= 100),
    geolocation JSONB, -- {country, city, region}
    device_fingerprint TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolution_notes TEXT
);

-- Threat intelligence table
CREATE TABLE IF NOT EXISTS threat_intelligence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    threat_type TEXT NOT NULL,
    indicator_type TEXT NOT NULL, -- ip, domain, hash, pattern
    indicator_value TEXT NOT NULL,
    threat_score INTEGER CHECK (threat_score >= 0 AND threat_score <= 100),
    source TEXT DEFAULT 'internal', -- internal, external_feed, manual
    description TEXT,
    tags TEXT[],
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    active BOOLEAN DEFAULT TRUE,
    confidence_level INTEGER CHECK (confidence_level >= 0 AND confidence_level <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(indicator_type, indicator_value)
);

-- User access patterns for behavioral analysis
CREATE TABLE IF NOT EXISTS user_access_patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    access_time TIMESTAMPTZ DEFAULT NOW(),
    source_ip INET NOT NULL,
    location_country TEXT,
    location_city TEXT,
    location_coordinates POINT,
    device_fingerprint TEXT,
    browser_fingerprint TEXT,
    access_duration INTEGER, -- in seconds
    pages_accessed TEXT[],
    actions_performed JSONB,
    data_accessed JSONB, -- What sensitive data was accessed
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    anomaly_flags TEXT[],
    baseline_deviation NUMERIC, -- Statistical deviation from user baseline
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API audit trails
CREATE TABLE IF NOT EXISTS api_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    session_id TEXT,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    request_headers JSONB,
    request_body_hash TEXT, -- Hash of request body for privacy
    response_status INTEGER,
    response_headers JSONB,
    response_body_hash TEXT, -- Hash of response for sensitive data
    source_ip INET,
    user_agent TEXT,
    execution_time INTEGER, -- milliseconds
    database_queries INTEGER,
    cache_hits INTEGER,
    rate_limit_remaining INTEGER,
    data_classification TEXT, -- public, internal, confidential, restricted
    sensitive_data_accessed BOOLEAN DEFAULT FALSE,
    compliance_relevant BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security configurations per tenant
CREATE TABLE IF NOT EXISTS security_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    rate_limits JSONB DEFAULT '{}', -- endpoint-specific rate limits
    ip_whitelist INET[],
    ip_blacklist INET[],
    allowed_countries TEXT[],
    blocked_countries TEXT[],
    session_timeout INTEGER DEFAULT 3600, -- seconds
    max_login_attempts INTEGER DEFAULT 5,
    lockout_duration INTEGER DEFAULT 900, -- 15 minutes in seconds
    require_2fa BOOLEAN DEFAULT FALSE,
    password_policy JSONB DEFAULT '{"min_length": 8, "require_uppercase": true, "require_lowercase": true, "require_numbers": true, "require_symbols": false}',
    allowed_file_types TEXT[],
    max_file_size INTEGER DEFAULT 52428800, -- 50MB in bytes
    encryption_required BOOLEAN DEFAULT TRUE,
    audit_level security_audit_level DEFAULT 'standard',
    compliance_frameworks TEXT[], -- GDPR, SOX, HIPAA, etc.
    notification_settings JSONB DEFAULT '{"email_alerts": true, "sms_alerts": false, "webhook_url": null}',
    auto_response_enabled BOOLEAN DEFAULT TRUE,
    threat_response_rules JSONB DEFAULT '{}',
    data_retention_days INTEGER DEFAULT 2555, -- 7 years for compliance
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Real-time security metrics aggregation
CREATE TABLE IF NOT EXISTS security_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_metadata JSONB,
    time_bucket TIMESTAMPTZ NOT NULL, -- For time-series aggregation
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, metric_name, time_bucket)
);

-- Compliance audit records
CREATE TABLE IF NOT EXISTS compliance_audit_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    framework TEXT NOT NULL, -- GDPR, SOX, HIPAA, CCPA
    audit_type TEXT NOT NULL, -- internal, external, automated
    status compliance_status DEFAULT 'pending',
    findings JSONB,
    recommendations JSONB,
    evidence_files TEXT[], -- File paths or references
    auditor_id UUID REFERENCES profiles(id),
    audit_date DATE DEFAULT CURRENT_DATE,
    next_audit_date DATE,
    compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100),
    risk_assessment JSONB,
    remediation_plan JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security incidents management
CREATE TABLE IF NOT EXISTS security_incidents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    incident_type TEXT NOT NULL,
    severity security_severity NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'contained', 'resolved', 'closed')),
    title TEXT NOT NULL,
    description TEXT,
    affected_systems TEXT[],
    affected_users UUID[],
    detection_time TIMESTAMPTZ DEFAULT NOW(),
    containment_time TIMESTAMPTZ,
    resolution_time TIMESTAMPTZ,
    assigned_to UUID REFERENCES profiles(id),
    root_cause TEXT,
    lessons_learned TEXT,
    related_events UUID[], -- References to security_events
    evidence JSONB,
    timeline JSONB, -- Array of timeline events
    impact_assessment JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Construction industry specific security tracking
CREATE TABLE IF NOT EXISTS construction_data_access (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    client_id UUID, -- Reference to customer
    data_type TEXT NOT NULL, -- financial, contracts, bids, blueprints, reports
    access_type TEXT NOT NULL, -- view, download, edit, delete, share
    data_classification TEXT NOT NULL, -- public, internal, confidential, restricted
    justification TEXT,
    approved_by UUID REFERENCES profiles(id),
    approval_required BOOLEAN DEFAULT FALSE,
    approved_at TIMESTAMPTZ,
    access_time TIMESTAMPTZ DEFAULT NOW(),
    source_ip INET,
    device_info JSONB,
    location_info JSONB,
    document_ids TEXT[], -- Specific documents accessed
    field_access BOOLEAN DEFAULT FALSE, -- Mobile/field access
    compliance_notes TEXT
);

-- Mobile device security tracking
CREATE TABLE IF NOT EXISTS mobile_device_security (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_fingerprint TEXT UNIQUE NOT NULL,
    device_type TEXT, -- ios, android, windows
    device_model TEXT,
    os_version TEXT,
    app_version TEXT,
    last_security_check TIMESTAMPTZ,
    security_status TEXT DEFAULT 'unknown' CHECK (security_status IN ('secure', 'warning', 'compromised', 'unknown')),
    jailbroken_rooted BOOLEAN DEFAULT FALSE,
    encryption_enabled BOOLEAN DEFAULT FALSE,
    screen_lock_enabled BOOLEAN DEFAULT FALSE,
    remote_wipe_enabled BOOLEAN DEFAULT FALSE,
    last_location POINT,
    trusted_networks TEXT[],
    security_violations JSONB,
    compliance_status JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security alerts and notifications
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    severity security_severity NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    affected_resources JSONB,
    detection_rules JSONB,
    automated_response JSONB,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES profiles(id),
    acknowledged_at TIMESTAMPTZ,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    false_positive BOOLEAN DEFAULT FALSE,
    correlation_id UUID, -- Link related alerts
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Performance indexes for enterprise scale
CREATE INDEX idx_security_events_tenant_time ON security_events(tenant_id, created_at DESC);
CREATE INDEX idx_security_events_type_severity ON security_events(event_type, severity);
CREATE INDEX idx_security_events_source_ip ON security_events(source_ip);
CREATE INDEX idx_security_events_user_time ON security_events(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_security_events_threat_score ON security_events(threat_score DESC);

CREATE INDEX idx_threat_intelligence_indicator ON threat_intelligence(indicator_type, indicator_value);
CREATE INDEX idx_threat_intelligence_active ON threat_intelligence(active) WHERE active = true;
CREATE INDEX idx_threat_intelligence_score ON threat_intelligence(threat_score DESC);

CREATE INDEX idx_user_access_patterns_user_time ON user_access_patterns(user_id, access_time DESC);
CREATE INDEX idx_user_access_patterns_risk ON user_access_patterns(risk_score DESC);
CREATE INDEX idx_user_access_patterns_anomaly ON user_access_patterns USING GIN(anomaly_flags);

CREATE INDEX idx_api_audit_logs_tenant_time ON api_audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_api_audit_logs_endpoint ON api_audit_logs(endpoint);
CREATE INDEX idx_api_audit_logs_sensitive ON api_audit_logs(sensitive_data_accessed) WHERE sensitive_data_accessed = true;
CREATE INDEX idx_api_audit_logs_compliance ON api_audit_logs(compliance_relevant) WHERE compliance_relevant = true;

CREATE INDEX idx_security_metrics_tenant_name_time ON security_metrics(tenant_id, metric_name, time_bucket DESC);

CREATE INDEX idx_compliance_audit_framework ON compliance_audit_records(framework, status);
CREATE INDEX idx_compliance_audit_tenant_date ON compliance_audit_records(tenant_id, audit_date DESC);

CREATE INDEX idx_security_incidents_tenant_status ON security_incidents(tenant_id, status);
CREATE INDEX idx_security_incidents_severity ON security_incidents(severity, detection_time DESC);

CREATE INDEX idx_construction_data_access_project ON construction_data_access(project_id, access_time DESC);
CREATE INDEX idx_construction_data_access_user ON construction_data_access(user_id, access_time DESC);
CREATE INDEX idx_construction_data_access_classification ON construction_data_access(data_classification, access_time DESC);

CREATE INDEX idx_mobile_device_security_user ON mobile_device_security(user_id, updated_at DESC);
CREATE INDEX idx_mobile_device_security_status ON mobile_device_security(security_status);

CREATE INDEX idx_security_alerts_tenant_severity ON security_alerts(tenant_id, severity, created_at DESC);
CREATE INDEX idx_security_alerts_unacknowledged ON security_alerts(acknowledged, created_at DESC) WHERE acknowledged = false;

-- Row Level Security Policies
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_access_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_audit_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_data_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_device_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant's security events"
  ON security_events FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert security events for their tenant"
  ON security_events FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage security events"
  ON security_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      JOIN profiles p ON p.id = ut.user_id
      WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = security_events.tenant_id
      AND p.role IN ('admin', 'security_admin')
    )
  );

-- Threat intelligence is readable by all authenticated users
CREATE POLICY "Users can view active threat intelligence"
  ON threat_intelligence FOR SELECT
  USING (active = true);

-- User access patterns - users can only see their own
CREATE POLICY "Users can view their own access patterns"
  ON user_access_patterns FOR SELECT
  USING (
    user_id = auth.uid() OR
    user_access_patterns.tenant_id IN (
      SELECT ut.tenant_id FROM user_tenants ut
      JOIN profiles p ON p.id = ut.user_id
      WHERE ut.user_id = auth.uid()
      AND p.role IN ('admin', 'security_admin')
    )
  );

-- API audit logs - tenant-based access
CREATE POLICY "Users can view their tenant's API audit logs"
  ON api_audit_logs FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

-- Security configurations - admin only
CREATE POLICY "Admins can manage security configurations"
  ON security_configurations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      JOIN profiles p ON p.id = ut.user_id
      WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = security_configurations.tenant_id
      AND p.role IN ('admin', 'security_admin')
    )
  );

-- Similar policies for other tables...
CREATE POLICY "Users can view their tenant's security metrics"
  ON security_metrics FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view their tenant's compliance records"
  ON compliance_audit_records FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view their tenant's security incidents"
  ON security_incidents FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view construction data access logs"
  ON construction_data_access FOR SELECT
  USING (
    user_id = auth.uid() OR
    construction_data_access.tenant_id IN (
      SELECT ut.tenant_id FROM user_tenants ut
      JOIN profiles p ON p.id = ut.user_id
      WHERE ut.user_id = auth.uid()
      AND p.role IN ('admin', 'security_admin')
    )
  );

CREATE POLICY "Users can manage their mobile device security"
  ON mobile_device_security FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users can view their tenant's security alerts"
  ON security_alerts FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

-- Functions for automated security metrics
CREATE OR REPLACE FUNCTION calculate_security_risk_score(tenant_uuid UUID, time_range INTERVAL)
RETURNS INTEGER AS $$
DECLARE
    risk_score INTEGER := 0;
    threat_events INTEGER;
    failed_logins INTEGER;
    anomalous_access INTEGER;
BEGIN
    -- Count threat events
    SELECT COUNT(*) INTO threat_events
    FROM security_events
    WHERE tenant_id = tenant_uuid
    AND created_at > NOW() - time_range
    AND threat_score > 50;
    
    -- Count failed authentication
    SELECT COUNT(*) INTO failed_logins
    FROM security_events
    WHERE tenant_id = tenant_uuid
    AND created_at > NOW() - time_range
    AND event_type = 'authentication_failure';
    
    -- Count anomalous access patterns
    SELECT COUNT(*) INTO anomalous_access
    FROM user_access_patterns
    WHERE tenant_id = tenant_uuid
    AND access_time > NOW() - time_range
    AND risk_score > 70;
    
    -- Calculate composite risk score
    risk_score := LEAST(100, 
        (threat_events * 10) + 
        (failed_logins * 5) + 
        (anomalous_access * 15)
    );
    
    RETURN risk_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect brute force attempts
CREATE OR REPLACE FUNCTION detect_brute_force_attempts()
RETURNS TRIGGER AS $$
DECLARE
    recent_failures INTEGER;
    config_row RECORD;
BEGIN
    -- Only check for authentication failures
    IF NEW.event_type = 'authentication_failure' THEN
        -- Get tenant security configuration
        SELECT * INTO config_row
        FROM security_configurations
        WHERE tenant_id = NEW.tenant_id;
        
        -- Count recent failures from same IP
        SELECT COUNT(*) INTO recent_failures
        FROM security_events
        WHERE tenant_id = NEW.tenant_id
        AND event_type = 'authentication_failure'
        AND source_ip = NEW.source_ip
        AND created_at > NOW() - INTERVAL '15 minutes';
        
        -- If exceeds threshold, log brute force attempt
        IF recent_failures >= COALESCE(config_row.max_login_attempts, 5) THEN
            INSERT INTO security_events (
                tenant_id, event_type, severity, source_ip,
                user_agent, threat_score, blocked,
                payload
            ) VALUES (
                NEW.tenant_id, 'brute_force_attempt', 'high', NEW.source_ip,
                NEW.user_agent, 85, true,
                jsonb_build_object(
                    'failure_count', recent_failures,
                    'detection_rule', 'brute_force_detector',
                    'original_event_id', NEW.id
                )
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for brute force detection
CREATE TRIGGER trigger_detect_brute_force
AFTER INSERT ON security_events
FOR EACH ROW EXECUTE FUNCTION detect_brute_force_attempts();

-- Function to update security metrics
CREATE OR REPLACE FUNCTION update_security_metrics()
RETURNS VOID AS $$
DECLARE
    tenant_record RECORD;
    current_hour TIMESTAMPTZ;
BEGIN
    current_hour := date_trunc('hour', NOW());
    
    -- Update metrics for each tenant
    FOR tenant_record IN SELECT id FROM tenants LOOP
        -- Threat events per hour
        INSERT INTO security_metrics (tenant_id, metric_name, metric_value, time_bucket)
        SELECT 
            tenant_record.id,
            'threat_events_hourly',
            COUNT(*),
            current_hour
        FROM security_events
        WHERE tenant_id = tenant_record.id
        AND created_at >= current_hour
        AND created_at < current_hour + INTERVAL '1 hour'
        ON CONFLICT (tenant_id, metric_name, time_bucket)
        DO UPDATE SET metric_value = EXCLUDED.metric_value;
        
        -- Average threat score per hour
        INSERT INTO security_metrics (tenant_id, metric_name, metric_value, time_bucket)
        SELECT 
            tenant_record.id,
            'avg_threat_score_hourly',
            COALESCE(AVG(threat_score), 0),
            current_hour
        FROM security_events
        WHERE tenant_id = tenant_record.id
        AND created_at >= current_hour
        AND created_at < current_hour + INTERVAL '1 hour'
        AND threat_score IS NOT NULL
        ON CONFLICT (tenant_id, metric_name, time_bucket)
        DO UPDATE SET metric_value = EXCLUDED.metric_value;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_threat_intelligence_updated_at 
    BEFORE UPDATE ON threat_intelligence
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_configurations_updated_at 
    BEFORE UPDATE ON security_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_audit_records_updated_at 
    BEFORE UPDATE ON compliance_audit_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_incidents_updated_at 
    BEFORE UPDATE ON security_incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mobile_device_security_updated_at 
    BEFORE UPDATE ON mobile_device_security
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();