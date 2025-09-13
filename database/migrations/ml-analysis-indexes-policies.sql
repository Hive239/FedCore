-- Enterprise ML Analysis - Part 2: Indexes, RLS, Policies
-- Run this after ml-analysis-tables.sql

-- CREATE INDEXES
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