-- ============================================
-- NEXUS SYSTEM & ANALYTICS SCHEMA
-- Adds Nexus intelligence and analytics features
-- Run AFTER complete-production-setup-fixed.sql
-- ============================================

-- Weather Data for Construction Planning
CREATE TABLE IF NOT EXISTS weather_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  location_lat DECIMAL(10,7),
  location_lng DECIMAL(10,7),
  weather_date DATE NOT NULL,
  temperature_high DECIMAL(5,2),
  temperature_low DECIMAL(5,2),
  precipitation_mm DECIMAL(6,2),
  wind_speed_kmh DECIMAL(5,2),
  conditions VARCHAR(100),
  work_impact VARCHAR(50), -- none, minor, moderate, severe
  forecast_confidence DECIMAL(5,4),
  data_source VARCHAR(100),
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schedule Conflicts Detection
CREATE TABLE IF NOT EXISTS schedule_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conflict_type VARCHAR(50) NOT NULL, -- resource, dependency, weather, deadline
  severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
  entity_a_type VARCHAR(50) NOT NULL,
  entity_a_id UUID NOT NULL,
  entity_b_type VARCHAR(50),
  entity_b_id UUID,
  conflict_details JSONB NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolution_details JSONB,
  auto_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nexus Analytics Dashboard
CREATE TABLE IF NOT EXISTS nexus_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  metric_type VARCHAR(100) NOT NULL,
  metric_category VARCHAR(50) NOT NULL, -- productivity, cost, schedule, quality, safety
  metric_value DECIMAL(20,4) NOT NULL,
  metric_unit VARCHAR(50),
  comparison_period VARCHAR(20), -- day, week, month, quarter, year
  comparison_value DECIMAL(20,4),
  trend VARCHAR(20), -- up, down, stable
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, metric_date, metric_type)
);

-- Learned Construction Principles
CREATE TABLE IF NOT EXISTS learned_principles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  principle_category VARCHAR(100) NOT NULL,
  principle_name VARCHAR(255) NOT NULL,
  principle_description TEXT,
  confidence_score DECIMAL(5,4) NOT NULL,
  evidence_count INTEGER DEFAULT 0,
  positive_outcomes INTEGER DEFAULT 0,
  negative_outcomes INTEGER DEFAULT 0,
  conditions JSONB, -- When this principle applies
  recommendations JSONB, -- What to do based on this principle
  first_observed TIMESTAMPTZ DEFAULT NOW(),
  last_validated TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conflict Resolution History
CREATE TABLE IF NOT EXISTS conflict_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conflict_id UUID REFERENCES schedule_conflicts(id) ON DELETE CASCADE,
  resolution_type VARCHAR(100) NOT NULL,
  resolution_method VARCHAR(50) NOT NULL, -- manual, automated, ai_suggested
  resolution_steps JSONB NOT NULL,
  time_to_resolve_hours DECIMAL(10,2),
  cost_impact DECIMAL(15,2),
  schedule_impact_days INTEGER,
  success_rating INTEGER CHECK (success_rating >= 1 AND success_rating <= 5),
  lessons_learned TEXT,
  applied_by UUID REFERENCES profiles(id),
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nexus Predictions
CREATE TABLE IF NOT EXISTS nexus_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  prediction_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  prediction_date DATE NOT NULL,
  predicted_value JSONB NOT NULL,
  confidence_score DECIMAL(5,4),
  factors JSONB, -- Factors influencing the prediction
  actual_value JSONB,
  accuracy_score DECIMAL(5,4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ
);

-- Nexus Recommendations
CREATE TABLE IF NOT EXISTS nexus_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recommendation_type VARCHAR(100) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  entity_type VARCHAR(50),
  entity_id UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  expected_impact JSONB,
  implementation_steps JSONB,
  estimated_effort_hours DECIMAL(10,2),
  estimated_cost DECIMAL(15,2),
  potential_savings DECIMAL(15,2),
  confidence_score DECIMAL(5,4),
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, rejected, implemented
  feedback_rating INTEGER,
  feedback_comments TEXT,
  implemented_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Nexus Performance Metrics
CREATE TABLE IF NOT EXISTS nexus_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  predictions_made INTEGER DEFAULT 0,
  predictions_accurate INTEGER DEFAULT 0,
  recommendations_generated INTEGER DEFAULT 0,
  recommendations_accepted INTEGER DEFAULT 0,
  conflicts_detected INTEGER DEFAULT 0,
  conflicts_auto_resolved INTEGER DEFAULT 0,
  avg_prediction_confidence DECIMAL(5,4),
  avg_recommendation_impact DECIMAL(15,2),
  system_uptime_percent DECIMAL(5,2),
  api_response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, metric_date)
);

-- Nexus Learning History
CREATE TABLE IF NOT EXISTS nexus_learning_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  learning_type VARCHAR(100) NOT NULL,
  learning_source VARCHAR(100) NOT NULL,
  data_points_processed INTEGER,
  patterns_identified INTEGER,
  principles_updated INTEGER,
  model_accuracy_before DECIMAL(5,4),
  model_accuracy_after DECIMAL(5,4),
  processing_time_seconds INTEGER,
  learning_metadata JSONB,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_weather_data_tenant_project ON weather_data(tenant_id, project_id);
CREATE INDEX idx_weather_data_date ON weather_data(weather_date);
CREATE INDEX idx_schedule_conflicts_tenant ON schedule_conflicts(tenant_id);
CREATE INDEX idx_schedule_conflicts_resolved ON schedule_conflicts(resolved);
CREATE INDEX idx_schedule_conflicts_severity ON schedule_conflicts(severity);
CREATE INDEX idx_nexus_analytics_lookup ON nexus_analytics(tenant_id, metric_date, metric_type);
CREATE INDEX idx_nexus_analytics_category ON nexus_analytics(metric_category);
CREATE INDEX idx_learned_principles_tenant ON learned_principles(tenant_id);
CREATE INDEX idx_learned_principles_active ON learned_principles(is_active);
CREATE INDEX idx_nexus_predictions_tenant ON nexus_predictions(tenant_id);
CREATE INDEX idx_nexus_predictions_entity ON nexus_predictions(entity_type, entity_id);
CREATE INDEX idx_nexus_recommendations_tenant ON nexus_recommendations(tenant_id);
CREATE INDEX idx_nexus_recommendations_status ON nexus_recommendations(status);
CREATE INDEX idx_nexus_recommendations_priority ON nexus_recommendations(priority);
CREATE INDEX idx_nexus_performance_lookup ON nexus_performance_metrics(tenant_id, metric_date);

-- RLS Policies
ALTER TABLE weather_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE learned_principles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_learning_history ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (tenant isolation)
CREATE POLICY weather_data_tenant_policy ON weather_data
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY schedule_conflicts_tenant_policy ON schedule_conflicts
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY nexus_analytics_tenant_policy ON nexus_analytics
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY learned_principles_tenant_policy ON learned_principles
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY nexus_predictions_tenant_policy ON nexus_predictions
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY nexus_recommendations_tenant_policy ON nexus_recommendations
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));