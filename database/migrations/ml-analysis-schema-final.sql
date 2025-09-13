-- Enterprise ML/YOLO Architectural Analysis Database Schemas
-- Complete enterprise-grade database structure for continuous learning and analysis

-- =====================================================
-- CORE ANALYSIS TABLES
-- =====================================================

-- Main architecture analysis reports
CREATE TABLE IF NOT EXISTS architecture_analysis_reports (
    id TEXT PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    production_readiness_score INTEGER NOT NULL CHECK (production_readiness_score >= 0 AND production_readiness_score <= 100),
    report_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    analyzed_by TEXT,
    environment TEXT DEFAULT 'production',
    version TEXT
);

-- ML analysis patterns detected
CREATE TABLE IF NOT EXISTS ml_analysis_patterns (
    id TEXT PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    pattern TEXT NOT NULL,
    pattern_type TEXT NOT NULL,
    frequency INTEGER DEFAULT 0,
    impact TEXT CHECK (impact IN ('positive', 'negative', 'neutral')),
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    last_seen TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    predictions JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Code patterns for ML training
CREATE TABLE IF NOT EXISTS code_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    pattern TEXT NOT NULL,
    pattern_category TEXT NOT NULL,
    file_path TEXT,
    line_number INTEGER,
    frequency INTEGER DEFAULT 1,
    impact TEXT,
    confidence DECIMAL(3,2),
    last_seen TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- METRICS TRACKING TABLES
-- =====================================================

-- Historical metrics for trend analysis
CREATE TABLE IF NOT EXISTS metrics_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    complexity DECIMAL(10,2),
    cognitive_complexity DECIMAL(10,2),
    performance DECIMAL(5,2),
    security DECIMAL(5,2),
    maintainability DECIMAL(5,2),
    test_coverage DECIMAL(5,2),
    documentation_coverage DECIMAL(5,2),
    technical_debt_hours DECIMAL(10,2),
    lines_of_code INTEGER,
    cyclomatic_complexity DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Slow query tracking
CREATE TABLE IF NOT EXISTS slow_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    query_hash TEXT,
    duration DECIMAL(10,2) NOT NULL,
    execution_count INTEGER DEFAULT 1,
    avg_duration DECIMAL(10,2),
    max_duration DECIMAL(10,2),
    table_names TEXT[],
    query_plan JSONB,
    suggested_indexes TEXT[],
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SECURITY & COMPLIANCE TABLES
-- =====================================================

-- Security vulnerability tracking
CREATE TABLE IF NOT EXISTS security_vulnerabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    vulnerability_type TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    cwe_id TEXT,
    owasp_category TEXT,
    file_path TEXT NOT NULL,
    line_number INTEGER,
    description TEXT NOT NULL,
    remediation TEXT,
    exploitability_score DECIMAL(3,1) CHECK (exploitability_score >= 0 AND exploitability_score <= 10),
    impact_score DECIMAL(3,1) CHECK (impact_score >= 0 AND impact_score <= 10),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'accepted', 'false_positive')),
    detected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Compliance tracking
CREATE TABLE IF NOT EXISTS compliance_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    framework TEXT NOT NULL CHECK (framework IN ('SOC2', 'HIPAA', 'GDPR', 'ISO27001', 'PCI_DSS')),
    compliant BOOLEAN DEFAULT FALSE,
    last_assessment TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    next_assessment TIMESTAMPTZ,
    controls_passed INTEGER DEFAULT 0,
    controls_failed INTEGER DEFAULT 0,
    controls_total INTEGER DEFAULT 0,
    compliance_percentage DECIMAL(5,2),
    findings JSONB,
    remediation_plan JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs for compliance
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    ip_address INET,
    user_agent TEXT,
    request_method TEXT,
    request_path TEXT,
    request_body JSONB,
    response_status INTEGER,
    response_body JSONB,
    duration_ms INTEGER,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- DEPENDENCY & ARCHITECTURE TABLES
-- =====================================================

-- Dependency tracking
CREATE TABLE IF NOT EXISTS dependency_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    package_name TEXT NOT NULL,
    current_version TEXT,
    latest_version TEXT,
    is_outdated BOOLEAN DEFAULT FALSE,
    is_unused BOOLEAN DEFAULT FALSE,
    has_vulnerability BOOLEAN DEFAULT FALSE,
    vulnerability_severity TEXT,
    license TEXT,
    license_compatible BOOLEAN DEFAULT TRUE,
    size_kb DECIMAL(10,2),
    dependencies_count INTEGER,
    last_updated TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Architecture metrics
CREATE TABLE IF NOT EXISTS architecture_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    modularity_score DECIMAL(5,2),
    coupling_score DECIMAL(5,2),
    cohesion_score DECIMAL(5,2),
    abstraction_score DECIMAL(5,2),
    stability_score DECIMAL(5,2),
    scalability_index DECIMAL(5,2),
    module_count INTEGER,
    avg_module_size INTEGER,
    circular_dependencies INTEGER,
    god_classes INTEGER,
    code_smells INTEGER,
    design_patterns_used TEXT[],
    architectural_violations INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ML MODEL & PREDICTION TABLES
-- =====================================================

-- ML predictions and outcomes
CREATE TABLE IF NOT EXISTS ml_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    prediction_type TEXT NOT NULL,
    metric_name TEXT,
    current_value DECIMAL(10,2),
    predicted_value_30d DECIMAL(10,2),
    predicted_value_90d DECIMAL(10,2),
    confidence DECIMAL(3,2),
    actual_value DECIMAL(10,2),
    prediction_error DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    evaluated_at TIMESTAMPTZ
);

-- Anomaly detection
CREATE TABLE IF NOT EXISTS anomaly_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    anomaly_type TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    metric_name TEXT,
    expected_value DECIMAL(10,2),
    actual_value DECIMAL(10,2),
    deviation_percentage DECIMAL(10,2),
    description TEXT,
    suggested_action TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    detected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TESTING & QUALITY TABLES
-- =====================================================

-- Test coverage tracking
CREATE TABLE IF NOT EXISTS test_coverage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    coverage_percent DECIMAL(5,2),
    lines_covered INTEGER,
    lines_total INTEGER,
    branches_covered INTEGER,
    branches_total INTEGER,
    functions_covered INTEGER,
    functions_total INTEGER,
    statements_covered INTEGER,
    statements_total INTEGER,
    uncovered_files TEXT[],
    test_suite_duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Code quality issues
CREATE TABLE IF NOT EXISTS code_quality_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    issue_type TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('error', 'warning', 'info')),
    file_path TEXT NOT NULL,
    line_number INTEGER,
    column_number INTEGER,
    rule_id TEXT,
    message TEXT NOT NULL,
    suggestion TEXT,
    is_fixed BOOLEAN DEFAULT FALSE,
    detected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fixed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INCIDENT & RESPONSE TABLES
-- =====================================================

-- Incident response plan
CREATE TABLE IF NOT EXISTS incident_response_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    incident_type TEXT NOT NULL,
    severity_levels JSONB,
    escalation_matrix JSONB,
    response_procedures JSONB,
    contact_list JSONB,
    recovery_procedures JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    last_tested TIMESTAMPTZ,
    next_test_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- System monitoring
CREATE TABLE IF NOT EXISTS system_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL,
    metric_value DECIMAL(10,2),
    threshold_warning DECIMAL(10,2),
    threshold_critical DECIMAL(10,2),
    is_healthy BOOLEAN DEFAULT TRUE,
    alert_sent BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ENTERPRISE FEATURES TABLES
-- =====================================================

-- Risk assessments
CREATE TABLE IF NOT EXISTS risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    risk_category TEXT NOT NULL,
    risk_description TEXT,
    likelihood TEXT CHECK (likelihood IN ('very_low', 'low', 'medium', 'high', 'very_high')),
    impact TEXT CHECK (impact IN ('negligible', 'minor', 'moderate', 'major', 'severe')),
    risk_score DECIMAL(5,2),
    mitigation_strategy TEXT,
    mitigation_status TEXT DEFAULT 'pending',
    owner_id UUID REFERENCES profiles(id),
    review_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Asset inventory
CREATE TABLE IF NOT EXISTS asset_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL,
    asset_name TEXT NOT NULL,
    asset_version TEXT,
    criticality TEXT CHECK (criticality IN ('low', 'medium', 'high', 'critical')),
    owner_id UUID REFERENCES profiles(id),
    location TEXT,
    configuration JSONB,
    dependencies TEXT[],
    security_classification TEXT,
    last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Vulnerability scans
CREATE TABLE IF NOT EXISTS vulnerability_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    scan_type TEXT NOT NULL,
    scanner_name TEXT,
    scan_status TEXT DEFAULT 'pending',
    vulnerabilities_found INTEGER DEFAULT 0,
    critical_count INTEGER DEFAULT 0,
    high_count INTEGER DEFAULT 0,
    medium_count INTEGER DEFAULT 0,
    low_count INTEGER DEFAULT 0,
    scan_results JSONB,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- User deletion requests (GDPR)
CREATE TABLE IF NOT EXISTS user_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    scheduled_for TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending',
    verification_token TEXT,
    deletion_reason TEXT,
    data_export_url TEXT
);

-- User consents (GDPR)
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL,
    consent_given BOOLEAN DEFAULT FALSE,
    consent_text TEXT,
    version TEXT,
    ip_address INET,
    user_agent TEXT,
    given_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- GANTT CHART & PROJECT INTEGRATION
-- =====================================================

-- Gantt chart data linked to real calendar events
CREATE TABLE IF NOT EXISTS gantt_chart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES gantt_chart_items(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    progress DECIMAL(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    dependencies UUID[],
    assigned_to UUID[],
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT DEFAULT 'planned',
    color TEXT,
    is_milestone BOOLEAN DEFAULT FALSE,
    is_critical_path BOOLEAN DEFAULT FALSE,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    estimated_hours DECIMAL(10,2),
    actual_hours DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Reports generated from real data
CREATE TABLE IF NOT EXISTS generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL,
    report_name TEXT NOT NULL,
    report_format TEXT CHECK (report_format IN ('pdf', 'excel', 'csv', 'json', 'html')),
    report_data JSONB NOT NULL,
    file_url TEXT,
    file_size_kb DECIMAL(10,2),
    parameters JSONB,
    generated_by UUID REFERENCES profiles(id),
    generation_duration_ms INTEGER,
    is_scheduled BOOLEAN DEFAULT FALSE,
    schedule_cron TEXT,
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- NEXUS AI ENHANCEMENTS
-- =====================================================

-- Nexus AI insights and recommendations
CREATE TABLE IF NOT EXISTS nexus_ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    impact_score DECIMAL(5,2),
    confidence DECIMAL(3,2),
    data_points JSONB,
    recommendations TEXT[],
    action_items JSONB,
    is_actionable BOOLEAN DEFAULT TRUE,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES profiles(id),
    acknowledged_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Nexus AI learning feedback
CREATE TABLE IF NOT EXISTS nexus_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    insight_id UUID REFERENCES nexus_ai_insights(id) ON DELETE CASCADE,
    feedback_type TEXT CHECK (feedback_type IN ('helpful', 'not_helpful', 'incorrect', 'partially_correct')),
    feedback_text TEXT,
    user_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_analysis_reports_tenant ON architecture_analysis_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_created ON architecture_analysis_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_score ON architecture_analysis_reports(production_readiness_score);

CREATE INDEX IF NOT EXISTS idx_patterns_tenant ON ml_analysis_patterns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patterns_frequency ON ml_analysis_patterns(frequency);
CREATE INDEX IF NOT EXISTS idx_patterns_impact ON ml_analysis_patterns(impact);
CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON ml_analysis_patterns(confidence);

CREATE INDEX IF NOT EXISTS idx_code_patterns_tenant ON code_patterns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_code_patterns_category ON code_patterns(pattern_category);
CREATE INDEX IF NOT EXISTS idx_code_patterns_frequency ON code_patterns(frequency);

CREATE INDEX IF NOT EXISTS idx_metrics_history_tenant ON metrics_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_metrics_history_created ON metrics_history(created_at);

CREATE INDEX IF NOT EXISTS idx_slow_queries_tenant ON slow_queries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_slow_queries_duration ON slow_queries(duration);
CREATE INDEX IF NOT EXISTS idx_slow_queries_hash ON slow_queries(query_hash);

CREATE INDEX IF NOT EXISTS idx_vulnerabilities_tenant ON security_vulnerabilities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON security_vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_status ON security_vulnerabilities(status);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_detected ON security_vulnerabilities(detected_at);

CREATE INDEX IF NOT EXISTS idx_compliance_tenant ON compliance_tracking(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_framework ON compliance_tracking(framework);
CREATE INDEX IF NOT EXISTS idx_compliance_status ON compliance_tracking(compliant);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_dependencies_tenant ON dependency_analysis(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_outdated ON dependency_analysis(is_outdated);
CREATE INDEX IF NOT EXISTS idx_dependencies_unused ON dependency_analysis(is_unused);
CREATE INDEX IF NOT EXISTS idx_dependencies_vulnerable ON dependency_analysis(has_vulnerability);

CREATE INDEX IF NOT EXISTS idx_arch_metrics_tenant ON architecture_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_arch_metrics_created ON architecture_metrics(created_at);

CREATE INDEX IF NOT EXISTS idx_predictions_tenant ON ml_predictions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_predictions_type ON ml_predictions(prediction_type);
CREATE INDEX IF NOT EXISTS idx_predictions_created ON ml_predictions(created_at);

CREATE INDEX IF NOT EXISTS idx_anomalies_tenant ON anomaly_detections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomaly_detections(severity);
CREATE INDEX IF NOT EXISTS idx_anomalies_resolved ON anomaly_detections(is_resolved);
CREATE INDEX IF NOT EXISTS idx_anomalies_detected ON anomaly_detections(detected_at);

CREATE INDEX IF NOT EXISTS idx_test_coverage_tenant ON test_coverage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_test_coverage_created ON test_coverage(created_at);
CREATE INDEX IF NOT EXISTS idx_test_coverage_percent ON test_coverage(coverage_percent);

CREATE INDEX IF NOT EXISTS idx_quality_issues_tenant ON code_quality_issues(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quality_issues_severity ON code_quality_issues(severity);
CREATE INDEX IF NOT EXISTS idx_quality_issues_fixed ON code_quality_issues(is_fixed);
CREATE INDEX IF NOT EXISTS idx_quality_issues_detected ON code_quality_issues(detected_at);

CREATE INDEX IF NOT EXISTS idx_incident_plan_tenant ON incident_response_plan(tenant_id);
CREATE INDEX IF NOT EXISTS idx_incident_plan_active ON incident_response_plan(is_active);

CREATE INDEX IF NOT EXISTS idx_monitoring_tenant ON system_monitoring(tenant_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_type ON system_monitoring(metric_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_healthy ON system_monitoring(is_healthy);
CREATE INDEX IF NOT EXISTS idx_monitoring_timestamp ON system_monitoring(timestamp);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_tenant ON risk_assessments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_score ON risk_assessments(risk_score);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_status ON risk_assessments(mitigation_status);

CREATE INDEX IF NOT EXISTS idx_asset_inventory_tenant ON asset_inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_inventory_type ON asset_inventory(asset_type);
CREATE INDEX IF NOT EXISTS idx_asset_inventory_criticality ON asset_inventory(criticality);

CREATE INDEX IF NOT EXISTS idx_vuln_scans_tenant ON vulnerability_scans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vuln_scans_status ON vulnerability_scans(scan_status);
CREATE INDEX IF NOT EXISTS idx_vuln_scans_created ON vulnerability_scans(created_at);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_user ON user_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON user_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_scheduled ON user_deletion_requests(scheduled_for);

CREATE INDEX IF NOT EXISTS idx_user_consents_user ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON user_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_user_consents_given ON user_consents(consent_given);

CREATE INDEX IF NOT EXISTS idx_gantt_tenant ON gantt_chart_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gantt_project ON gantt_chart_items(project_id);
CREATE INDEX IF NOT EXISTS idx_gantt_dates ON gantt_chart_items(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_gantt_status ON gantt_chart_items(status);

CREATE INDEX IF NOT EXISTS idx_reports_tenant ON generated_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON generated_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_generated_by ON generated_reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_reports_created ON generated_reports(created_at);

CREATE INDEX IF NOT EXISTS idx_nexus_insights_tenant ON nexus_ai_insights(tenant_id);
CREATE INDEX IF NOT EXISTS idx_nexus_insights_type ON nexus_ai_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_nexus_insights_impact ON nexus_ai_insights(impact_score);
CREATE INDEX IF NOT EXISTS idx_nexus_insights_created ON nexus_ai_insights(created_at);

CREATE INDEX IF NOT EXISTS idx_nexus_feedback_tenant ON nexus_feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_nexus_feedback_insight ON nexus_feedback(insight_id);
CREATE INDEX IF NOT EXISTS idx_nexus_feedback_type ON nexus_feedback(feedback_type);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE architecture_analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_analysis_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE slow_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependency_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_quality_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_response_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerability_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE gantt_chart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_feedback ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE RLS POLICIES
-- =====================================================

DO $$
DECLARE
    table_name TEXT;
    tables TEXT[] := ARRAY[
        'architecture_analysis_reports',
        'ml_analysis_patterns',
        'code_patterns',
        'metrics_history',
        'slow_queries',
        'security_vulnerabilities',
        'compliance_tracking',
        'audit_logs',
        'dependency_analysis',
        'architecture_metrics',
        'ml_predictions',
        'anomaly_detections',
        'test_coverage',
        'code_quality_issues',
        'incident_response_plan',
        'system_monitoring',
        'risk_assessments',
        'asset_inventory',
        'vulnerability_scans',
        'gantt_chart_items',
        'generated_reports',
        'nexus_ai_insights',
        'nexus_feedback'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'tenant_isolation_select_' || table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'tenant_isolation_insert_' || table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'tenant_isolation_update_' || table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'tenant_isolation_delete_' || table_name, table_name);
        
        EXECUTE format('
            CREATE POLICY %I ON %I
            FOR SELECT
            USING (tenant_id = (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() LIMIT 1))
        ', 'tenant_isolation_select_' || table_name, table_name);
        
        EXECUTE format('
            CREATE POLICY %I ON %I
            FOR INSERT
            WITH CHECK (tenant_id = (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() LIMIT 1))
        ', 'tenant_isolation_insert_' || table_name, table_name);
        
        EXECUTE format('
            CREATE POLICY %I ON %I
            FOR UPDATE
            USING (tenant_id = (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() LIMIT 1))
        ', 'tenant_isolation_update_' || table_name, table_name);
        
        EXECUTE format('
            CREATE POLICY %I ON %I
            FOR DELETE
            USING (tenant_id = (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() LIMIT 1))
        ', 'tenant_isolation_delete_' || table_name, table_name);
    END LOOP;
END $$;

-- =====================================================
-- CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_architecture_analysis_reports_updated_at
BEFORE UPDATE ON architecture_analysis_reports
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ml_analysis_patterns_updated_at
BEFORE UPDATE ON ml_analysis_patterns
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_tracking_updated_at
BEFORE UPDATE ON compliance_tracking
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dependency_analysis_updated_at
BEFORE UPDATE ON dependency_analysis
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incident_response_plan_updated_at
BEFORE UPDATE ON incident_response_plan
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_assessments_updated_at
BEFORE UPDATE ON risk_assessments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gantt_chart_items_updated_at
BEFORE UPDATE ON gantt_chart_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();