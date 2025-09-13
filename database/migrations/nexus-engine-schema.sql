-- Nexus Engine Database Schema
-- ML-powered analytics backend for construction management

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ML Analytics Events Table
-- Stores all events for machine learning processing
CREATE TABLE IF NOT EXISTS nexus_analytics_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'task_completion', 'schedule_change', 'weather_impact', 'resource_allocation'
  event_data JSONB NOT NULL,
  ml_features JSONB, -- Pre-computed features for ML models
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Weather Data Cache Table
-- Caches weather data and construction risk assessments
CREATE TABLE IF NOT EXISTS weather_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  location_hash TEXT NOT NULL, -- Hash of lat/lng for efficient lookup
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  weather_date DATE NOT NULL,
  temperature_high DECIMAL(5,2),
  temperature_low DECIMAL(5,2),
  precipitation DECIMAL(5,2),
  wind_speed DECIMAL(5,2),
  conditions TEXT,
  construction_risk_score INTEGER CHECK (construction_risk_score >= 0 AND construction_risk_score <= 100),
  impact_description TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_hash, weather_date)
);

-- ML Models Registry
-- Tracks ML model versions and performance
CREATE TABLE IF NOT EXISTS ml_models (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  model_name TEXT UNIQUE NOT NULL,
  version TEXT NOT NULL,
  model_type TEXT NOT NULL, -- 'weather_impact', 'conflict_detection', 'productivity', 'timeline_optimizer'
  accuracy_score DECIMAL(5,4),
  training_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT FALSE,
  hyperparameters JSONB,
  performance_metrics JSONB,
  model_artifact_url TEXT, -- S3 or storage URL for model files
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Predictions Cache
-- Caches ML predictions for performance
CREATE TABLE IF NOT EXISTS predictions_cache (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL, -- 'completion_date', 'budget_overrun', 'weather_delay', 'conflict_risk'
  prediction_data JSONB NOT NULL,
  confidence_score DECIMAL(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  model_version TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gantt Chart Configurations
-- Stores Gantt chart settings and cache
CREATE TABLE IF NOT EXISTS gantt_configurations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  chart_settings JSONB NOT NULL DEFAULT '{}',
  chart_data JSONB, -- Cached chart data
  auto_update BOOLEAN DEFAULT TRUE,
  last_generated TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Productivity Metrics
-- Tracks productivity scores for teams and individuals
CREATE TABLE IF NOT EXISTS productivity_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  user_id UUID REFERENCES profiles(id),
  team_id UUID,
  date_calculated DATE NOT NULL,
  task_completion_rate DECIMAL(5,4),
  average_task_duration DECIMAL(10,2), -- in hours
  quality_score DECIMAL(5,4),
  efficiency_score DECIMAL(5,4),
  productivity_score DECIMAL(5,4),
  metrics_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id, date_calculated)
);

-- Schedule Conflicts Detection
-- Stores detected scheduling conflicts and resolutions
CREATE TABLE IF NOT EXISTS schedule_conflicts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL, -- 'resource_overlap', 'dependency_violation', 'weather_risk', 'capacity_exceeded'
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  affected_tasks UUID[] NOT NULL,
  affected_resources TEXT[],
  conflict_data JSONB NOT NULL,
  suggested_resolution JSONB,
  resolution_applied JSONB,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed', 'pending')),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id)
);

-- ML Feedback Loop
-- Stores user feedback for model improvement
CREATE TABLE IF NOT EXISTS ml_feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  prediction_id UUID REFERENCES predictions_cache(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL, -- 'accuracy_rating', 'outcome_actual', 'user_correction', 'false_positive'
  feedback_data JSONB NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report Configurations
-- Stores custom report settings and schedules
CREATE TABLE IF NOT EXISTS report_configurations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  report_name TEXT NOT NULL,
  report_type TEXT NOT NULL, -- 'analytics', 'productivity', 'weather', 'conflicts', 'predictions', 'custom'
  configuration JSONB NOT NULL DEFAULT '{}',
  schedule_cron TEXT, -- Cron expression for scheduled reports
  last_generated TIMESTAMPTZ,
  recipients TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nexus Insights
-- Stores AI-generated insights and recommendations
CREATE TABLE IF NOT EXISTS nexus_insights (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  insight_type TEXT NOT NULL, -- 'efficiency', 'risk', 'opportunity', 'warning', 'recommendation'
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  impact_assessment JSONB,
  recommended_actions JSONB,
  related_entities JSONB, -- Tasks, resources, events affected
  confidence_score DECIMAL(5,4),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'implemented', 'dismissed')),
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Performance Indexes for Nexus Engine
CREATE INDEX idx_analytics_events_tenant_project ON nexus_analytics_events(tenant_id, project_id);
CREATE INDEX idx_analytics_events_created ON nexus_analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_type ON nexus_analytics_events(event_type);

CREATE INDEX idx_weather_location_date ON weather_data(location_hash, weather_date);
CREATE INDEX idx_weather_date ON weather_data(weather_date);
CREATE INDEX idx_weather_risk ON weather_data(construction_risk_score);

CREATE INDEX idx_predictions_cache_project ON predictions_cache(project_id, prediction_type);
CREATE INDEX idx_predictions_cache_expires ON predictions_cache(expires_at);

CREATE INDEX idx_productivity_metrics_project_date ON productivity_metrics(project_id, date_calculated);
CREATE INDEX idx_productivity_metrics_user ON productivity_metrics(user_id, date_calculated);

CREATE INDEX idx_conflicts_project_status ON schedule_conflicts(project_id, status);
CREATE INDEX idx_conflicts_severity ON schedule_conflicts(severity);
CREATE INDEX idx_conflicts_detected ON schedule_conflicts(detected_at DESC);

CREATE INDEX idx_ml_feedback_prediction ON ml_feedback(prediction_id);
CREATE INDEX idx_ml_feedback_user ON ml_feedback(user_id);

CREATE INDEX idx_insights_project_status ON nexus_insights(project_id, status);
CREATE INDEX idx_insights_priority ON nexus_insights(priority);
CREATE INDEX idx_insights_expires ON nexus_insights(expires_at);

-- Row Level Security Policies
ALTER TABLE nexus_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE gantt_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE productivity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant isolation
CREATE POLICY "Users can view their tenant's analytics events"
  ON nexus_analytics_events FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert analytics events for their tenant"
  ON nexus_analytics_events FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view weather data"
  ON weather_data FOR SELECT
  USING (true); -- Weather data is public

CREATE POLICY "Users can view active ML models"
  ON ml_models FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can view their tenant's predictions"
  ON predictions_cache FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their tenant's Gantt configurations"
  ON gantt_configurations FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view their tenant's productivity metrics"
  ON productivity_metrics FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view their tenant's schedule conflicts"
  ON schedule_conflicts FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their tenant's schedule conflicts"
  ON schedule_conflicts FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can provide ML feedback"
  ON ml_feedback FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own ML feedback"
  ON ml_feedback FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their tenant's report configurations"
  ON report_configurations FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view their tenant's insights"
  ON nexus_insights FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their tenant's insights"
  ON nexus_insights FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

-- Trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_weather_data_updated_at BEFORE UPDATE ON weather_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ml_models_updated_at BEFORE UPDATE ON ml_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gantt_configurations_updated_at BEFORE UPDATE ON gantt_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_configurations_updated_at BEFORE UPDATE ON report_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();