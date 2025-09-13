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
    version TEXT,
    CONSTRAINT idx_analysis_reports_unique UNIQUE (id)
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
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_code_patterns_tenant (tenant_id),
    INDEX idx_code_patterns_category (pattern_category),
    INDEX idx_code_patterns_frequency (frequency DESC)
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_metrics_history_tenant (tenant_id),
    INDEX idx_metrics_history_created (created_at DESC)
);

-- Performance metrics tracking
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    method TEXT,
    response_time DECIMAL(10,2),
    requests_per_second DECIMAL(10,2),
    error_rate DECIMAL(5,2),
    error_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    p50_latency DECIMAL(10,2),
    p95_latency DECIMAL(10,2),
    p99_latency DECIMAL(10,2),
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    downtime_minutes DECIMAL(10,2) DEFAULT 0,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_perf_metrics_tenant (tenant_id),
    INDEX idx_perf_metrics_endpoint (endpoint),
    INDEX idx_perf_metrics_timestamp (timestamp DESC),
    INDEX idx_perf_metrics_response_time (response_time)
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
    last_seen TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_slow_queries_tenant (tenant_id),
    INDEX idx_slow_queries_duration (duration DESC),
    INDEX idx_slow_queries_hash (query_hash)
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
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_vulnerabilities_tenant (tenant_id),
    INDEX idx_vulnerabilities_severity (severity),
    INDEX idx_vulnerabilities_status (status),
    INDEX idx_vulnerabilities_detected (detected_at DESC)
);

-- Compliance tracking
CREATE TABLE IF NOT EXISTS compliance_status (
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
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_compliance_tenant (tenant_id),
    INDEX idx_compliance_framework (framework),
    INDEX idx_compliance_status (compliant)
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_logs_tenant (tenant_id),
    INDEX idx_audit_logs_user (user_id),
    INDEX idx_audit_logs_action (action),
    INDEX idx_audit_logs_created (created_at DESC),
    INDEX idx_audit_logs_resource (resource_type, resource_id)
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
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dependencies_tenant (tenant_id),
    INDEX idx_dependencies_outdated (is_outdated),
    INDEX idx_dependencies_unused (is_unused),
    INDEX idx_dependencies_vulnerable (has_vulnerability)
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_arch_metrics_tenant (tenant_id),
    INDEX idx_arch_metrics_created (created_at DESC)
);

-- =====================================================
-- ML MODEL & PREDICTION TABLES
-- =====================================================

-- ML model versions and performance
CREATE TABLE IF NOT EXISTS ml_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name TEXT NOT NULL,
    version TEXT NOT NULL,
    accuracy DECIMAL(5,4),
    precision_score DECIMAL(5,4),
    recall DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    training_samples INTEGER,
    training_duration_seconds INTEGER,
    model_size_mb DECIMAL(10,2),
    feature_importance JSONB,
    hyperparameters JSONB,
    validation_metrics JSONB,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deployed_at TIMESTAMPTZ,
    UNIQUE(model_name, version),
    INDEX idx_ml_models_active (is_active),
    INDEX idx_ml_models_created (created_at DESC)
);

-- ML predictions and outcomes
CREATE TABLE IF NOT EXISTS ml_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    model_id UUID REFERENCES ml_models(id),
    prediction_type TEXT NOT NULL,
    metric_name TEXT,
    current_value DECIMAL(10,2),
    predicted_value_30d DECIMAL(10,2),
    predicted_value_90d DECIMAL(10,2),
    confidence DECIMAL(3,2),
    actual_value DECIMAL(10,2),
    prediction_error DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    evaluated_at TIMESTAMPTZ,
    INDEX idx_predictions_tenant (tenant_id),
    INDEX idx_predictions_model (model_id),
    INDEX idx_predictions_type (prediction_type),
    INDEX idx_predictions_created (created_at DESC)
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_anomalies_tenant (tenant_id),
    INDEX idx_anomalies_severity (severity),
    INDEX idx_anomalies_resolved (is_resolved),
    INDEX idx_anomalies_detected (detected_at DESC)
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_test_coverage_tenant (tenant_id),
    INDEX idx_test_coverage_created (created_at DESC),
    INDEX idx_test_coverage_percent (coverage_percent DESC)
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_quality_issues_tenant (tenant_id),
    INDEX idx_quality_issues_severity (severity),
    INDEX idx_quality_issues_fixed (is_fixed),
    INDEX idx_quality_issues_detected (detected_at DESC)
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
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_incident_plan_tenant (tenant_id),
    INDEX idx_incident_plan_active (is_active)
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
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_monitoring_tenant (tenant_id),
    INDEX idx_monitoring_type (metric_type),
    INDEX idx_monitoring_healthy (is_healthy),
    INDEX idx_monitoring_timestamp (timestamp DESC)
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
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_risk_assessments_tenant (tenant_id),
    INDEX idx_risk_assessments_score (risk_score DESC),
    INDEX idx_risk_assessments_status (mitigation_status)
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_asset_inventory_tenant (tenant_id),
    INDEX idx_asset_inventory_type (asset_type),
    INDEX idx_asset_inventory_criticality (criticality)
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_vuln_scans_tenant (tenant_id),
    INDEX idx_vuln_scans_status (scan_status),
    INDEX idx_vuln_scans_created (created_at DESC)
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
    data_export_url TEXT,
    INDEX idx_deletion_requests_user (user_id),
    INDEX idx_deletion_requests_status (status),
    INDEX idx_deletion_requests_scheduled (scheduled_for)
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_consents_user (user_id),
    INDEX idx_user_consents_type (consent_type),
    INDEX idx_user_consents_given (consent_given)
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
    assigned_to UUID[] REFERENCES profiles(id),
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
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_gantt_tenant (tenant_id),
    INDEX idx_gantt_project (project_id),
    INDEX idx_gantt_dates (start_date, end_date),
    INDEX idx_gantt_status (status)
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reports_tenant (tenant_id),
    INDEX idx_reports_type (report_type),
    INDEX idx_reports_generated_by (generated_by),
    INDEX idx_reports_created (created_at DESC)
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nexus_insights_tenant (tenant_id),
    INDEX idx_nexus_insights_type (insight_type),
    INDEX idx_nexus_insights_impact (impact_score DESC),
    INDEX idx_nexus_insights_created (created_at DESC)
);

-- Nexus AI learning feedback
CREATE TABLE IF NOT EXISTS nexus_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    insight_id UUID REFERENCES nexus_ai_insights(id) ON DELETE CASCADE,
    feedback_type TEXT CHECK (feedback_type IN ('helpful', 'not_helpful', 'incorrect', 'partially_correct')),
    feedback_text TEXT,
    user_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nexus_feedback_tenant (tenant_id),
    INDEX idx_nexus_feedback_insight (insight_id),
    INDEX idx_nexus_feedback_type (feedback_type)
);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE architecture_analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_analysis_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE slow_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_status ENABLE ROW LEVEL SECURITY;
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

-- Create policies for tenant isolation
DO $$
DECLARE
    table_name TEXT;
    tables TEXT[] := ARRAY[
        'architecture_analysis_reports',
        'ml_analysis_patterns',
        'code_patterns',
        'metrics_history',
        'performance_metrics',
        'slow_queries',
        'security_vulnerabilities',
        'compliance_status',
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
        -- Drop existing policies if they exist
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'tenant_isolation_select_' || table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'tenant_isolation_insert_' || table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'tenant_isolation_update_' || table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'tenant_isolation_delete_' || table_name, table_name);
        
        -- Create new policies
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
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_ml_patterns_search ON ml_analysis_patterns USING GIN (pattern gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_code_patterns_search ON code_patterns USING GIN (pattern gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_search ON security_vulnerabilities USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_audit_logs_search ON audit_logs USING GIN (action gin_trgm_ops);

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

DO $$
DECLARE
    table_name TEXT;
    tables TEXT[] := ARRAY[
        'architecture_analysis_reports',
        'ml_analysis_patterns',
        'compliance_status',
        'dependency_analysis',
        'incident_response_plan',
        'risk_assessments',
        'gantt_chart_items'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables
    LOOP
        EXECUTE format('
            CREATE TRIGGER update_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
        ', table_name, table_name);
    END LOOP;
END $$;

-- =====================================================
-- INITIAL DATA SEED
-- =====================================================

-- Insert default incident response plan template
INSERT INTO incident_response_plan (
    tenant_id,
    plan_name,
    incident_type,
    severity_levels,
    escalation_matrix,
    response_procedures,
    is_active
) VALUES (
    (SELECT id FROM tenants LIMIT 1),
    'Default Security Incident Response',
    'security_breach',
    '{"low": "Single system affected", "medium": "Multiple systems affected", "high": "Customer data at risk", "critical": "Complete system compromise"}',
    '{"low": ["security_team"], "medium": ["security_team", "engineering_lead"], "high": ["security_team", "engineering_lead", "cto"], "critical": ["security_team", "engineering_lead", "cto", "ceo"]}',
    '{"detection": "Monitor security alerts", "containment": "Isolate affected systems", "eradication": "Remove threat", "recovery": "Restore services", "lessons_learned": "Document and improve"}',
    true
) ON CONFLICT DO NOTHING;

-- Create ML model record for the default model
INSERT INTO ml_models (
    model_name,
    version,
    accuracy,
    is_active
) VALUES (
    'architecture_analyzer',
    '1.0.0',
    0.85,
    true
) ON CONFLICT (model_name, version) DO NOTHING;

COMMENT ON SCHEMA public IS 'Enterprise ML/YOLO Architectural Analysis Schema - Production Ready';