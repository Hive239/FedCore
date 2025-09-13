-- ML Dashboard Schema for NEXUS TOP TIER System
-- This schema supports all ML dashboard components with real data

-- ============================================
-- A/B Testing Tables
-- ============================================

-- A/B Tests table for experiment tracking
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_name VARCHAR(255) NOT NULL,
  model_a_name VARCHAR(255) NOT NULL,
  model_b_name VARCHAR(255) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'paused', 'failed')),
  winner VARCHAR(255),
  model_a_performance DECIMAL(5,4),
  model_b_performance DECIMAL(5,4),
  confidence_threshold DECIMAL(5,4) DEFAULT 0.95,
  significance_level DECIMAL(5,4) DEFAULT 0.05,
  total_predictions_a INTEGER DEFAULT 0,
  total_predictions_b INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- A/B Test Metrics for detailed tracking
CREATE TABLE IF NOT EXISTS ab_test_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  model_a_accuracy DECIMAL(5,4),
  model_b_accuracy DECIMAL(5,4),
  model_a_confidence DECIMAL(5,4),
  model_b_confidence DECIMAL(5,4),
  model_a_latency DECIMAL(10,2), -- in milliseconds
  model_b_latency DECIMAL(10,2),
  sample_size INTEGER,
  p_value DECIMAL(10,8),
  effect_size DECIMAL(5,4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Training Pipeline Tables
-- ============================================

-- Training Runs table
CREATE TABLE IF NOT EXISTS training_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_name VARCHAR(255) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  current_epoch INTEGER DEFAULT 0,
  total_epochs INTEGER NOT NULL,
  best_accuracy DECIMAL(5,4),
  best_loss DECIMAL(10,6),
  current_loss DECIMAL(10,6),
  learning_rate DECIMAL(10,8),
  batch_size INTEGER,
  optimizer VARCHAR(50),
  loss_function VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Training Logs for epoch-level metrics
CREATE TABLE IF NOT EXISTS training_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES training_runs(id) ON DELETE CASCADE,
  model_name VARCHAR(255) NOT NULL,
  epoch INTEGER NOT NULL,
  loss DECIMAL(10,6),
  accuracy DECIMAL(5,4),
  val_loss DECIMAL(10,6),
  val_accuracy DECIMAL(5,4),
  learning_rate DECIMAL(10,8),
  time_taken DECIMAL(10,2), -- in seconds
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Training Results summary
CREATE TABLE IF NOT EXISTS training_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES training_runs(id) ON DELETE CASCADE,
  model_name VARCHAR(255) NOT NULL,
  final_accuracy DECIMAL(5,4),
  final_loss DECIMAL(10,6),
  training_time INTEGER, -- in milliseconds
  epochs INTEGER,
  improved BOOLEAN DEFAULT false,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Hyperparameter Tuning Tables
-- ============================================

-- Hyperparameter Tuning Results
CREATE TABLE IF NOT EXISTS ml_hyperparameter_tuning (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_name VARCHAR(255) NOT NULL,
  optimization_method VARCHAR(50) DEFAULT 'grid_search',
  best_params JSONB NOT NULL,
  best_score DECIMAL(5,4),
  convergence_rate DECIMAL(5,4),
  iterations INTEGER,
  search_space JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Hyperparameter History
CREATE TABLE IF NOT EXISTS hyperparameter_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tuning_id UUID REFERENCES ml_hyperparameter_tuning(id) ON DELETE CASCADE,
  iteration INTEGER,
  params JSONB NOT NULL,
  score DECIMAL(5,4),
  training_time INTEGER, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Model Performance Metrics
-- ============================================

-- Extend ml_models table if needed
ALTER TABLE ml_models ADD COLUMN IF NOT EXISTS last_training_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE ml_models ADD COLUMN IF NOT EXISTS total_predictions INTEGER DEFAULT 0;
ALTER TABLE ml_models ADD COLUMN IF NOT EXISTS avg_confidence DECIMAL(5,4);
ALTER TABLE ml_models ADD COLUMN IF NOT EXISTS feedback_score DECIMAL(5,4);
ALTER TABLE ml_models ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- ML Model Metrics (time-series data)
CREATE TABLE IF NOT EXISTS ml_model_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_name VARCHAR(255) NOT NULL,
  accuracy DECIMAL(5,4),
  precision_score DECIMAL(5,4),
  recall_score DECIMAL(5,4),
  f1_score DECIMAL(5,4),
  predictions_count INTEGER DEFAULT 0,
  avg_latency DECIMAL(10,2), -- in milliseconds
  error_rate DECIMAL(5,4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Resource Usage Tracking
-- ============================================

-- ML Resource Usage
CREATE TABLE IF NOT EXISTS ml_resource_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  cpu_usage DECIMAL(5,2), -- percentage
  memory_usage DECIMAL(10,2), -- in MB
  gpu_usage DECIMAL(5,2), -- percentage
  gpu_memory DECIMAL(10,2), -- in MB
  model_storage DECIMAL(10,2), -- in MB
  cache_size DECIMAL(10,2), -- in MB
  active_models INTEGER,
  running_experiments INTEGER
);

-- ============================================
-- ML Events and Alerts
-- ============================================

-- ML Events Log
CREATE TABLE IF NOT EXISTS ml_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(50) NOT NULL,
  event_name VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(20) DEFAULT 'info',
  model_name VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_start_time ON ab_tests(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_ab_test_metrics_test_id ON ab_test_metrics(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_metrics_timestamp ON ab_test_metrics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_training_runs_model_name ON training_runs(model_name);
CREATE INDEX IF NOT EXISTS idx_training_runs_status ON training_runs(status);
CREATE INDEX IF NOT EXISTS idx_training_logs_run_id ON training_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_training_logs_model_name ON training_logs(model_name);

CREATE INDEX IF NOT EXISTS idx_ml_model_metrics_model_name ON ml_model_metrics(model_name);
CREATE INDEX IF NOT EXISTS idx_ml_model_metrics_created_at ON ml_model_metrics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ml_events_event_type ON ml_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ml_events_created_at ON ml_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_events_model_name ON ml_events(model_name);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_hyperparameter_tuning ENABLE ROW LEVEL SECURITY;
ALTER TABLE hyperparameter_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_model_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_resource_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_events ENABLE ROW LEVEL SECURITY;

-- Admin-only policies (only admins can view/modify ML data)
CREATE POLICY "Admin full access to ab_tests" ON ab_tests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to ab_test_metrics" ON ab_test_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to training_runs" ON training_runs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to training_logs" ON training_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to training_results" ON training_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to ml_hyperparameter_tuning" ON ml_hyperparameter_tuning
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to hyperparameter_history" ON hyperparameter_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to ml_model_metrics" ON ml_model_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to ml_resource_usage" ON ml_resource_usage
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to ml_events" ON ml_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- Sample Data Generation Function
-- ============================================

CREATE OR REPLACE FUNCTION generate_ml_dashboard_sample_data()
RETURNS void AS $$
BEGIN
  -- Insert sample A/B tests
  INSERT INTO ab_tests (test_name, model_a_name, model_b_name, status, total_predictions_a, total_predictions_b)
  VALUES 
    ('Schedule Optimization Test', 'schedule_optimizer_v1', 'schedule_optimizer_v2', 'running', 5432, 5387),
    ('Weather Impact Comparison', 'weather_impact_v1', 'weather_impact_v2', 'completed', 10234, 10456),
    ('Resource Allocation Test', 'resource_predictor_v1', 'resource_predictor_v2', 'running', 3421, 3398);

  -- Insert sample training runs
  INSERT INTO training_runs (model_name, status, current_epoch, total_epochs, best_accuracy, current_loss, learning_rate, batch_size)
  VALUES 
    ('nexus_top_tier', 'running', 42, 100, 0.923, 0.234, 0.001, 32),
    ('weather_impact_analyzer', 'completed', 50, 50, 0.887, 0.312, 0.0005, 64),
    ('schedule_optimizer', 'running', 18, 75, 0.856, 0.445, 0.002, 16);

  -- Insert sample ML events
  INSERT INTO ml_events (event_type, event_name, description, severity, model_name)
  VALUES 
    ('prediction', 'Batch Prediction', 'Processed 47 predictions for construction schedule', 'info', 'nexus_top_tier'),
    ('training', 'Auto-Retrain Triggered', 'Automatic retraining started due to accuracy drop', 'warning', 'resource_predictor'),
    ('alert', 'Anomaly Detected', 'Unusual pattern detected in construction timeline', 'high', 'anomaly_detection'),
    ('optimization', 'Hyperparameter Tuning', 'Completed hyperparameter optimization with 8% improvement', 'info', 'schedule_optimizer');

  -- Insert sample resource usage
  INSERT INTO ml_resource_usage (cpu_usage, memory_usage, gpu_usage, gpu_memory, model_storage, cache_size, active_models, running_experiments)
  VALUES 
    (42.5, 3276.8, 0, 0, 1843.2, 245.6, 9, 2);

END;
$$ LANGUAGE plpgsql;

-- Execute sample data generation (comment out in production)
-- SELECT generate_ml_dashboard_sample_data();

-- ============================================
-- Real-time Data Triggers
-- ============================================

-- Update ml_models statistics when predictions are made
CREATE OR REPLACE FUNCTION update_model_statistics()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ml_models 
  SET 
    total_predictions = total_predictions + 1,
    avg_confidence = (
      SELECT AVG(confidence_score) 
      FROM predictions_cache 
      WHERE model_type = NEW.model_type 
      AND created_at > NOW() - INTERVAL '24 hours'
    ),
    updated_at = NOW()
  WHERE model_name = NEW.model_type;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_model_stats_on_prediction ON predictions_cache;
CREATE TRIGGER update_model_stats_on_prediction
AFTER INSERT ON predictions_cache
FOR EACH ROW EXECUTE FUNCTION update_model_statistics();

-- Log training events
CREATE OR REPLACE FUNCTION log_training_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ml_events (event_type, event_name, description, model_name)
  VALUES (
    'training',
    CASE 
      WHEN NEW.status = 'completed' THEN 'Training Completed'
      WHEN NEW.status = 'failed' THEN 'Training Failed'
      ELSE 'Training Status Changed'
    END,
    'Training run ' || NEW.id || ' status: ' || NEW.status,
    NEW.model_name
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_training_status_change ON training_runs;
CREATE TRIGGER log_training_status_change
AFTER UPDATE OF status ON training_runs
FOR EACH ROW EXECUTE FUNCTION log_training_event();