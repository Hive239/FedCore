-- ============================================
-- ARCHITECTURE & CODE QUALITY SCHEMA
-- Code analysis and architecture monitoring
-- Run AFTER complete-production-setup-fixed.sql
-- ============================================

-- Architecture Analysis Reports
CREATE TABLE IF NOT EXISTS architecture_analysis_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  report_type VARCHAR(100) NOT NULL,
  project_name VARCHAR(255),
  analysis_date TIMESTAMPTZ NOT NULL,
  total_files INTEGER,
  total_lines INTEGER,
  languages JSONB,
  framework_versions JSONB,
  architecture_score DECIMAL(5,2),
  maintainability_index DECIMAL(5,2),
  technical_debt_hours DECIMAL(10,2),
  security_score DECIMAL(5,2),
  performance_score DECIMAL(5,2),
  test_coverage DECIMAL(5,2),
  recommendations JSONB,
  critical_issues INTEGER DEFAULT 0,
  high_issues INTEGER DEFAULT 0,
  medium_issues INTEGER DEFAULT 0,
  low_issues INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Code Patterns Detection
CREATE TABLE IF NOT EXISTS code_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES architecture_analysis_reports(id) ON DELETE CASCADE,
  pattern_type VARCHAR(100) NOT NULL, -- anti_pattern, best_practice, code_smell, design_pattern
  pattern_name VARCHAR(255) NOT NULL,
  severity VARCHAR(20),
  occurrences INTEGER DEFAULT 1,
  file_paths JSONB,
  description TEXT,
  recommendation TEXT,
  auto_fixable BOOLEAN DEFAULT FALSE,
  estimated_fix_time_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metrics History
CREATE TABLE IF NOT EXISTS metrics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  metric_type VARCHAR(100) NOT NULL,
  metric_value DECIMAL(20,4) NOT NULL,
  previous_value DECIMAL(20,4),
  change_percentage DECIMAL(10,2),
  trend VARCHAR(20), -- improving, stable, declining
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, metric_date, metric_type)
);

-- Code Quality Issues
CREATE TABLE IF NOT EXISTS code_quality_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  issue_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  file_path TEXT NOT NULL,
  line_number INTEGER,
  column_number INTEGER,
  rule_id VARCHAR(100),
  message TEXT NOT NULL,
  suggestion TEXT,
  code_snippet TEXT,
  is_fixed BOOLEAN DEFAULT FALSE,
  fixed_at TIMESTAMPTZ,
  fixed_by UUID REFERENCES profiles(id),
  suppressed BOOLEAN DEFAULT FALSE,
  suppression_reason TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test Coverage Metrics
CREATE TABLE IF NOT EXISTS test_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  coverage_date DATE NOT NULL,
  total_statements INTEGER,
  covered_statements INTEGER,
  statement_coverage DECIMAL(5,2),
  total_branches INTEGER,
  covered_branches INTEGER,
  branch_coverage DECIMAL(5,2),
  total_functions INTEGER,
  covered_functions INTEGER,
  function_coverage DECIMAL(5,2),
  total_lines INTEGER,
  covered_lines INTEGER,
  line_coverage DECIMAL(5,2),
  uncovered_files JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, project_id, coverage_date)
);

-- Dependency Analysis
CREATE TABLE IF NOT EXISTS dependency_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  dependency_name VARCHAR(255) NOT NULL,
  current_version VARCHAR(50),
  latest_version VARCHAR(50),
  version_behind INTEGER DEFAULT 0,
  dependency_type VARCHAR(50), -- direct, dev, peer, optional
  license VARCHAR(100),
  is_vulnerable BOOLEAN DEFAULT FALSE,
  vulnerabilities JSONB,
  is_deprecated BOOLEAN DEFAULT FALSE,
  deprecation_reason TEXT,
  alternatives JSONB,
  last_updated DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Architecture Metrics
CREATE TABLE IF NOT EXISTS architecture_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  metric_date DATE NOT NULL,
  coupling_score DECIMAL(5,2),
  cohesion_score DECIMAL(5,2),
  complexity_score DECIMAL(5,2),
  modularity_score DECIMAL(5,2),
  abstraction_score DECIMAL(5,2),
  instability_score DECIMAL(5,2),
  component_count INTEGER,
  dependency_depth INTEGER,
  circular_dependencies INTEGER,
  god_classes INTEGER,
  code_duplication_percentage DECIMAL(5,2),
  average_method_length DECIMAL(10,2),
  average_class_length DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, project_id, metric_date)
);

-- ML Predictions for Architecture
CREATE TABLE IF NOT EXISTS ml_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  prediction_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  predicted_metric VARCHAR(100),
  predicted_value DECIMAL(20,4),
  confidence_score DECIMAL(5,4),
  prediction_date DATE NOT NULL,
  factors JSONB,
  recommendations JSONB,
  actual_value DECIMAL(20,4),
  accuracy_score DECIMAL(5,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refactoring Suggestions
CREATE TABLE IF NOT EXISTS refactoring_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  suggestion_type VARCHAR(100) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  file_path TEXT NOT NULL,
  start_line INTEGER,
  end_line INTEGER,
  current_code TEXT,
  suggested_code TEXT,
  description TEXT NOT NULL,
  benefits JSONB,
  estimated_effort_hours DECIMAL(10,2),
  complexity_reduction DECIMAL(5,2),
  is_applied BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMPTZ,
  applied_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Build Performance
CREATE TABLE IF NOT EXISTS build_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  build_id VARCHAR(255) NOT NULL,
  build_type VARCHAR(50), -- development, production, test
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  status VARCHAR(50) NOT NULL, -- running, success, failure, cancelled
  total_tasks INTEGER,
  cached_tasks INTEGER,
  cache_hit_rate DECIMAL(5,2),
  bundle_size_bytes BIGINT,
  asset_count INTEGER,
  largest_asset_bytes BIGINT,
  error_count INTEGER,
  warning_count INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Code Review Metrics
CREATE TABLE IF NOT EXISTS code_review_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  review_id VARCHAR(255),
  pull_request_id VARCHAR(255),
  reviewer_id UUID REFERENCES profiles(id),
  author_id UUID REFERENCES profiles(id),
  lines_added INTEGER,
  lines_removed INTEGER,
  files_changed INTEGER,
  comments_count INTEGER,
  approval_time_hours DECIMAL(10,2),
  iterations_count INTEGER,
  complexity_score DECIMAL(5,2),
  review_quality_score DECIMAL(5,2),
  issues_found INTEGER,
  issues_fixed INTEGER,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_architecture_reports_tenant ON architecture_analysis_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_architecture_reports_date ON architecture_analysis_reports(analysis_date);
CREATE INDEX IF NOT EXISTS idx_code_patterns_report ON code_patterns(report_id);
CREATE INDEX IF NOT EXISTS idx_code_patterns_type ON code_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_metrics_history_lookup ON metrics_history(tenant_id, metric_date, metric_type);
CREATE INDEX IF NOT EXISTS idx_code_quality_issues_tenant ON code_quality_issues(tenant_id);
CREATE INDEX IF NOT EXISTS idx_code_quality_issues_unfixed ON code_quality_issues(is_fixed);
CREATE INDEX IF NOT EXISTS idx_test_coverage_lookup ON test_coverage(tenant_id, project_id, coverage_date);
CREATE INDEX IF NOT EXISTS idx_dependency_analysis_vulnerable ON dependency_analysis(is_vulnerable);
CREATE INDEX IF NOT EXISTS idx_architecture_metrics_lookup ON architecture_metrics(tenant_id, project_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_tenant ON ml_predictions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_refactoring_suggestions_project ON refactoring_suggestions(project_id);
CREATE INDEX IF NOT EXISTS idx_refactoring_suggestions_unapplied ON refactoring_suggestions(is_applied);
CREATE INDEX IF NOT EXISTS idx_build_performance_project ON build_performance(project_id);
CREATE INDEX IF NOT EXISTS idx_code_review_metrics_project ON code_review_metrics(project_id);

-- RLS Policies
ALTER TABLE architecture_analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_quality_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependency_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refactoring_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_review_metrics ENABLE ROW LEVEL SECURITY;

-- Basic tenant isolation
DO $$ BEGIN
  CREATE POLICY architecture_reports_tenant_policy ON architecture_analysis_reports
    FOR ALL USING (
      tenant_id IS NULL OR 
      tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY code_quality_tenant_policy ON code_quality_issues
    FOR ALL USING (tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY test_coverage_tenant_policy ON test_coverage
    FOR ALL USING (tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;