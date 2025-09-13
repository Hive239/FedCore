# Enterprise ML Analysis Schema - Clean Version

Copy and paste this SQL into your Supabase SQL Editor:

```sql
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
    UNIQUE(model_name, version)
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

-- CREATE INDEXES FOR PERFORMANCE
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

CREATE INDEX IF NOT EXISTS idx_dependencies_tenant ON dependency_analysis(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_outdated ON dependency_analysis(is_outdated);
CREATE INDEX IF NOT EXISTS idx_dependencies_unused ON dependency_analysis(is_unused);
CREATE INDEX IF NOT EXISTS idx_dependencies_vulnerable ON dependency_analysis(has_vulnerability);

CREATE INDEX IF NOT EXISTS idx_arch_metrics_tenant ON architecture_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_arch_metrics_created ON architecture_metrics(created_at);

CREATE INDEX IF NOT EXISTS idx_ml_models_active ON ml_models(is_active);
CREATE INDEX IF NOT EXISTS idx_ml_models_created ON ml_models(created_at);

CREATE INDEX IF NOT EXISTS idx_predictions_tenant ON ml_predictions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_predictions_model ON ml_predictions(model_id);
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

CREATE INDEX IF NOT EXISTS idx_nexus_insights_tenant ON nexus_ai_insights(tenant_id);
CREATE INDEX IF NOT EXISTS idx_nexus_insights_type ON nexus_ai_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_nexus_insights_impact ON nexus_ai_insights(impact_score);
CREATE INDEX IF NOT EXISTS idx_nexus_insights_created ON nexus_ai_insights(created_at);

CREATE INDEX IF NOT EXISTS idx_nexus_feedback_tenant ON nexus_feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_nexus_feedback_insight ON nexus_feedback(insight_id);
CREATE INDEX IF NOT EXISTS idx_nexus_feedback_type ON nexus_feedback(feedback_type);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE architecture_analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_analysis_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE slow_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependency_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_quality_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_feedback ENABLE ROW LEVEL SECURITY;

-- CREATE RLS POLICIES FOR TENANT ISOLATION
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
        'dependency_analysis',
        'architecture_metrics',
        'ml_predictions',
        'anomaly_detections',
        'test_coverage',
        'code_quality_issues',
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

-- CREATE TRIGGERS FOR UPDATED_AT
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

-- CREATE ML MODEL RECORD FOR DEFAULT MODEL
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
```

## Instructions:
1. Open your Supabase Dashboard
2. Go to SQL Editor  
3. Copy and paste the above SQL code
4. Click "Run" to execute

This clean version completely avoids any conflicts with your existing performance_metrics table.