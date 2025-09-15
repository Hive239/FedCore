-- ============================================
-- ML/AI SYSTEM SCHEMA
-- Adds machine learning and AI capabilities
-- Run AFTER complete-production-setup-fixed.sql
-- ============================================

-- ML Models Management
CREATE TABLE IF NOT EXISTS ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- classification, regression, clustering, etc.
  version VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft', -- draft, training, active, deprecated
  algorithm VARCHAR(100),
  hyperparameters JSONB,
  metrics JSONB, -- accuracy, precision, recall, f1, etc.
  training_data_info JSONB,
  model_path TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deployed_at TIMESTAMPTZ,
  UNIQUE(tenant_id, name, version)
);

-- Model Performance Metrics (Time Series)
CREATE TABLE IF NOT EXISTS ml_model_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES ml_models(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL, -- accuracy, latency, throughput, error_rate
  metric_value DECIMAL(10,6),
  metadata JSONB,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Predictions Cache
CREATE TABLE IF NOT EXISTS predictions_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  model_id UUID REFERENCES ml_models(id) ON DELETE SET NULL,
  input_hash VARCHAR(64) NOT NULL, -- Hash of input for cache lookup
  input_data JSONB NOT NULL,
  prediction JSONB NOT NULL,
  confidence DECIMAL(5,4),
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(tenant_id, model_id, input_hash)
);

-- ML Feedback System
CREATE TABLE IF NOT EXISTS ml_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  model_id UUID REFERENCES ml_models(id) ON DELETE CASCADE,
  prediction_id UUID REFERENCES predictions_cache(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  feedback_type VARCHAR(50) NOT NULL, -- correct, incorrect, helpful, not_helpful
  feedback_value JSONB,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Construction Principles (AI-learned rules)
CREATE TABLE IF NOT EXISTS construction_principles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  principle_type VARCHAR(100) NOT NULL,
  principle_data JSONB NOT NULL,
  confidence_score DECIMAL(5,4),
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,4),
  learned_from JSONB, -- Source data references
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ML Analysis Patterns
CREATE TABLE IF NOT EXISTS ml_analysis_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pattern_type VARCHAR(100) NOT NULL,
  pattern_data JSONB NOT NULL,
  frequency INTEGER DEFAULT 1,
  last_detected TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B Testing for Models
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  model_a_id UUID REFERENCES ml_models(id),
  model_b_id UUID REFERENCES ml_models(id),
  test_type VARCHAR(50), -- accuracy, performance, user_preference
  sample_size INTEGER,
  status VARCHAR(50) DEFAULT 'running', -- planning, running, completed, cancelled
  winner_model_id UUID REFERENCES ml_models(id),
  results JSONB,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B Test Metrics
CREATE TABLE IF NOT EXISTS ab_test_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES ml_models(id),
  metric_type VARCHAR(50) NOT NULL,
  metric_value DECIMAL(10,6),
  sample_count INTEGER,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training Runs
CREATE TABLE IF NOT EXISTS training_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES ml_models(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
  training_config JSONB,
  dataset_info JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training Logs (Epoch-level details)
CREATE TABLE IF NOT EXISTS training_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES training_runs(id) ON DELETE CASCADE,
  epoch INTEGER NOT NULL,
  loss DECIMAL(10,6),
  accuracy DECIMAL(5,4),
  validation_loss DECIMAL(10,6),
  validation_accuracy DECIMAL(5,4),
  learning_rate DECIMAL(10,8),
  metrics JSONB,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training Results
CREATE TABLE IF NOT EXISTS training_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES training_runs(id) ON DELETE CASCADE,
  final_metrics JSONB NOT NULL,
  model_artifacts JSONB,
  best_epoch INTEGER,
  total_epochs INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ML Hyperparameter Tuning
CREATE TABLE IF NOT EXISTS ml_hyperparameter_tuning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES ml_models(id) ON DELETE CASCADE,
  tuning_method VARCHAR(50), -- grid_search, random_search, bayesian
  search_space JSONB NOT NULL,
  best_params JSONB,
  best_score DECIMAL(10,6),
  status VARCHAR(50) DEFAULT 'running',
  iterations_completed INTEGER DEFAULT 0,
  total_iterations INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hyperparameter History
CREATE TABLE IF NOT EXISTS hyperparameter_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tuning_id UUID NOT NULL REFERENCES ml_hyperparameter_tuning(id) ON DELETE CASCADE,
  iteration INTEGER NOT NULL,
  parameters JSONB NOT NULL,
  score DECIMAL(10,6),
  training_time_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ML Resource Usage
CREATE TABLE IF NOT EXISTS ml_resource_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  model_id UUID REFERENCES ml_models(id) ON DELETE SET NULL,
  resource_type VARCHAR(50) NOT NULL, -- cpu, gpu, memory, storage
  usage_value DECIMAL(10,2),
  usage_unit VARCHAR(20),
  cost_estimate DECIMAL(10,2),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ML Events
CREATE TABLE IF NOT EXISTS ml_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  model_id UUID REFERENCES ml_models(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB,
  severity VARCHAR(20) DEFAULT 'info', -- info, warning, error, critical
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Anomaly Detections
CREATE TABLE IF NOT EXISTS anomaly_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  model_id UUID REFERENCES ml_models(id) ON DELETE SET NULL,
  entity_type VARCHAR(50) NOT NULL, -- project, task, cost, schedule
  entity_id UUID,
  anomaly_score DECIMAL(5,4),
  anomaly_type VARCHAR(100),
  details JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nexus AI Insights
CREATE TABLE IF NOT EXISTS nexus_ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  insight_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  insight_content TEXT NOT NULL,
  confidence_score DECIMAL(5,4),
  priority VARCHAR(20) DEFAULT 'medium',
  actionable BOOLEAN DEFAULT TRUE,
  actions_taken JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Nexus Feedback
CREATE TABLE IF NOT EXISTS nexus_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id UUID NOT NULL REFERENCES nexus_ai_insights(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  feedback_type VARCHAR(50) NOT NULL,
  feedback_value INTEGER, -- 1-5 rating
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_ml_models_tenant ON ml_models(tenant_id);
CREATE INDEX idx_ml_models_status ON ml_models(status);
CREATE INDEX idx_ml_model_metrics_model ON ml_model_metrics(model_id);
CREATE INDEX idx_ml_model_metrics_time ON ml_model_metrics(recorded_at);
CREATE INDEX idx_predictions_cache_lookup ON predictions_cache(tenant_id, model_id, input_hash);
CREATE INDEX idx_predictions_cache_expires ON predictions_cache(expires_at);
CREATE INDEX idx_ml_feedback_model ON ml_feedback(model_id);
CREATE INDEX idx_construction_principles_type ON construction_principles(principle_type);
CREATE INDEX idx_ab_tests_tenant ON ab_tests(tenant_id);
CREATE INDEX idx_ab_tests_status ON ab_tests(status);
CREATE INDEX idx_training_runs_model ON training_runs(model_id);
CREATE INDEX idx_training_runs_status ON training_runs(status);
CREATE INDEX idx_anomaly_detections_tenant ON anomaly_detections(tenant_id);
CREATE INDEX idx_anomaly_detections_resolved ON anomaly_detections(resolved);
CREATE INDEX idx_nexus_insights_tenant ON nexus_ai_insights(tenant_id);
CREATE INDEX idx_nexus_insights_type ON nexus_ai_insights(insight_type);

-- RLS Policies
ALTER TABLE ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_model_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_principles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_analysis_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_hyperparameter_tuning ENABLE ROW LEVEL SECURITY;
ALTER TABLE hyperparameter_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_resource_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_feedback ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (tenant isolation)
CREATE POLICY ml_models_tenant_policy ON ml_models
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY predictions_cache_tenant_policy ON predictions_cache
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY ml_feedback_tenant_policy ON ml_feedback
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY construction_principles_tenant_policy ON construction_principles
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY nexus_insights_tenant_policy ON nexus_ai_insights
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));