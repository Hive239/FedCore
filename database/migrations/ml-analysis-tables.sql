-- Enterprise ML Analysis - Part 1: Tables Only
-- Run this first

-- Architecture analysis reports
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