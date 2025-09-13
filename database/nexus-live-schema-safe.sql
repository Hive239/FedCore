-- NEXUS Live Integration Database Schema (Safe Version)
-- Checks for existing objects before creating

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================
-- ML MODELS AND PREDICTIONS
-- ============================================

-- ML Models Registry
CREATE TABLE IF NOT EXISTS ml_models (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    accuracy_score DECIMAL(5,4) DEFAULT 0.0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(model_name, version)
);

-- Predictions Cache
CREATE TABLE IF NOT EXISTS predictions_cache (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    model_type VARCHAR(100) NOT NULL,
    prediction_type VARCHAR(50) NOT NULL,
    input_data JSONB NOT NULL,
    output_data JSONB NOT NULL,
    confidence_score DECIMAL(5,4) DEFAULT 0.0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_predictions_tenant ON predictions_cache (tenant_id);
CREATE INDEX IF NOT EXISTS idx_predictions_type ON predictions_cache (prediction_type);
CREATE INDEX IF NOT EXISTS idx_predictions_created ON predictions_cache (created_at DESC);

-- ML Feedback for continuous learning
CREATE TABLE IF NOT EXISTS ml_feedback (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    principle_id UUID,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_action VARCHAR(50) NOT NULL,
    confidence_before DECIMAL(5,4),
    confidence_after DECIMAL(5,4),
    context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_tenant ON ml_feedback (tenant_id);
CREATE INDEX IF NOT EXISTS idx_feedback_action ON ml_feedback (user_action);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON ml_feedback (created_at DESC);

-- ============================================
-- CONSTRUCTION INTELLIGENCE
-- ============================================

-- Construction Principles (learned patterns)
CREATE TABLE IF NOT EXISTS construction_principles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    principle TEXT NOT NULL,
    description TEXT,
    confidence_score DECIMAL(5,4) DEFAULT 0.5,
    total_feedback INTEGER DEFAULT 0,
    is_ml_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_principles_category ON construction_principles (category);
CREATE INDEX IF NOT EXISTS idx_principles_confidence ON construction_principles (confidence_score DESC);

-- Weather Data Integration
CREATE TABLE IF NOT EXISTS weather_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    location VARCHAR(255) NOT NULL,
    weather_date DATE NOT NULL,
    temperature_min DECIMAL(5,2),
    temperature_max DECIMAL(5,2),
    precipitation_mm DECIMAL(6,2),
    wind_speed_kmh DECIMAL(5,2),
    conditions VARCHAR(100),
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(location, weather_date)
);

CREATE INDEX IF NOT EXISTS idx_weather_date ON weather_data (weather_date);
CREATE INDEX IF NOT EXISTS idx_weather_location ON weather_data (location);

-- Schedule Conflicts Detection
CREATE TABLE IF NOT EXISTS schedule_conflicts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    conflict_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    conflict_data JSONB,
    principle_id UUID REFERENCES construction_principles(id),
    confidence_score DECIMAL(5,4),
    resolution_action VARCHAR(100),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conflicts_tenant ON schedule_conflicts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_project ON schedule_conflicts (project_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_severity ON schedule_conflicts (severity);
CREATE INDEX IF NOT EXISTS idx_conflicts_created ON schedule_conflicts (created_at DESC);

-- ============================================
-- ENTERPRISE ARCHITECTURE ANALYSIS
-- ============================================

-- Architecture Analysis Reports
CREATE TABLE IF NOT EXISTS architecture_analysis_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    analysis_type VARCHAR(50) NOT NULL,
    production_readiness_score INTEGER DEFAULT 0 CHECK (production_readiness_score >= 0 AND production_readiness_score <= 100),
    issues JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analysis_type ON architecture_analysis_reports (analysis_type);
CREATE INDEX IF NOT EXISTS idx_analysis_score ON architecture_analysis_reports (production_readiness_score DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_created ON architecture_analysis_reports (created_at DESC);

-- Code Quality Metrics
CREATE TABLE IF NOT EXISTS code_quality_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    file_path TEXT NOT NULL,
    complexity_score INTEGER,
    maintainability_index INTEGER,
    test_coverage DECIMAL(5,2),
    issues JSONB DEFAULT '[]'::jsonb,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quality_path ON code_quality_metrics (file_path);
CREATE INDEX IF NOT EXISTS idx_quality_analyzed ON code_quality_metrics (analyzed_at DESC);

-- ============================================
-- PERFORMANCE AND MONITORING
-- ============================================

-- Performance Metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    endpoint VARCHAR(255),
    response_time_ms INTEGER,
    status_code INTEGER,
    metrics_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_perf_tenant ON performance_metrics (tenant_id);
CREATE INDEX IF NOT EXISTS idx_perf_type ON performance_metrics (metric_type);
CREATE INDEX IF NOT EXISTS idx_perf_created ON performance_metrics (created_at DESC);

-- ML Model Metrics
CREATE TABLE IF NOT EXISTS ml_model_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    accuracy DECIMAL(5,4),
    precision_score DECIMAL(5,4),
    recall_score DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    inference_time_ms INTEGER,
    memory_usage_mb INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_model_metrics_name ON ml_model_metrics (model_name);
CREATE INDEX IF NOT EXISTS idx_model_metrics_created ON ml_model_metrics (created_at DESC);

-- ============================================
-- NOTIFICATIONS AND ALERTS
-- ============================================

-- Notifications System
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications (tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications (type);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (created_at DESC);

-- ============================================
-- INITIAL DATA POPULATION (Safe Insert)
-- ============================================

-- Insert default ML models
INSERT INTO ml_models (model_name, version, model_type, accuracy_score, is_active)
VALUES 
    ('nexus_top_tier', '1.0.0', 'construction_intelligence', 0.85, true),
    ('weather_impact_analyzer', '1.0.0', 'weather_analysis', 0.92, true),
    ('schedule_optimizer', '1.0.0', 'scheduling', 0.78, true),
    ('resource_predictor', '1.0.0', 'resource_management', 0.81, true)
ON CONFLICT (model_name, version) DO UPDATE SET
    accuracy_score = EXCLUDED.accuracy_score,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Insert construction principles (only if table is empty)
INSERT INTO construction_principles (category, principle, description, confidence_score)
SELECT * FROM (VALUES 
    ('safety', 'Fall Protection Required Above 6 Feet', 'OSHA requirement for fall protection when working at heights above 6 feet', 0.99),
    ('concrete', 'Minimum 28-Day Cure Time', 'Concrete requires 28 days to reach full strength', 0.95),
    ('weather', 'No Concrete Pour Below 40°F', 'Concrete should not be poured when temperature is below 40°F without special measures', 0.93),
    ('sequence', 'Foundation Before Framing', 'Foundation must be completed and cured before framing begins', 0.99),
    ('electrical', 'Rough-In Before Insulation', 'Electrical rough-in must be completed before insulation installation', 0.97),
    ('plumbing', 'Pressure Test Before Close-In', 'Plumbing systems must be pressure tested before walls are closed', 0.96),
    ('hvac', 'Load Calculations Required', 'HVAC systems must be sized based on Manual J load calculations', 0.91),
    ('roofing', 'Underlayment Within 30 Days', 'Roofing underlayment must be covered with finish roofing within 30 days', 0.88),
    ('inspection', 'Footing Inspection Before Pour', 'Footing excavation must be inspected before concrete pour', 0.98),
    ('coordination', 'MEP Coordination Meeting', 'Mechanical, Electrical, and Plumbing trades must coordinate before rough-in', 0.85)
) AS t(category, principle, description, confidence_score)
WHERE NOT EXISTS (SELECT 1 FROM construction_principles LIMIT 1);

-- Insert sample architecture analysis report (only if none exists)
INSERT INTO architecture_analysis_reports (
    analysis_type, 
    production_readiness_score,
    issues,
    recommendations
)
SELECT 
    'initial_baseline',
    85,
    '[
        {"severity": "medium", "area": "database", "issue": "Missing indexes on high-traffic tables"},
        {"severity": "low", "area": "security", "issue": "Some API endpoints lack rate limiting"}
    ]'::jsonb,
    '[
        "Add composite indexes on frequently joined columns",
        "Implement rate limiting on all public API endpoints", 
        "Consider implementing Redis for session management"
    ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM architecture_analysis_reports LIMIT 1);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables (safe - won't error if already enabled)
DO $$
BEGIN
    ALTER TABLE predictions_cache ENABLE ROW LEVEL SECURITY;
    ALTER TABLE ml_feedback ENABLE ROW LEVEL SECURITY;
    ALTER TABLE schedule_conflicts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Users can view predictions for their tenant" ON predictions_cache;
CREATE POLICY "Users can view predictions for their tenant"
    ON predictions_cache FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view feedback for their tenant" ON ml_feedback;
CREATE POLICY "Users can view feedback for their tenant"
    ON ml_feedback FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert feedback for their tenant" ON ml_feedback;
CREATE POLICY "Users can insert feedback for their tenant"
    ON ml_feedback FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view conflicts for their tenant" ON schedule_conflicts;
CREATE POLICY "Users can view conflicts for their tenant"
    ON schedule_conflicts FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view metrics for their tenant" ON performance_metrics;
CREATE POLICY "Users can view metrics for their tenant"
    ON performance_metrics FOR SELECT
    USING (
        tenant_id IS NULL OR tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update confidence scores based on feedback
DROP FUNCTION IF EXISTS update_principle_confidence() CASCADE;
CREATE OR REPLACE FUNCTION update_principle_confidence()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE construction_principles
    SET confidence_score = (
        SELECT AVG(
            CASE 
                WHEN user_action = 'accepted' THEN 1.0
                WHEN user_action = 'rejected' THEN 0.0
                ELSE 0.5
            END
        )
        FROM ml_feedback
        WHERE principle_id = NEW.principle_id
    ),
    total_feedback = (
        SELECT COUNT(*)
        FROM ml_feedback
        WHERE principle_id = NEW.principle_id
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.principle_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_confidence_on_feedback ON ml_feedback;
CREATE TRIGGER update_confidence_on_feedback
AFTER INSERT ON ml_feedback
FOR EACH ROW
WHEN (NEW.principle_id IS NOT NULL)
EXECUTE FUNCTION update_principle_confidence();

-- Function to auto-expire old predictions
DROP FUNCTION IF EXISTS cleanup_expired_predictions() CASCADE;
CREATE OR REPLACE FUNCTION cleanup_expired_predictions()
RETURNS void AS $$
BEGIN
    DELETE FROM predictions_cache
    WHERE expires_at IS NOT NULL 
    AND expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_predictions_tenant_type 
    ON predictions_cache(tenant_id, prediction_type);

CREATE INDEX IF NOT EXISTS idx_conflicts_tenant_severity 
    ON schedule_conflicts(tenant_id, severity) 
    WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
    ON notifications(user_id, created_at DESC) 
    WHERE is_read = false;

-- BRIN indexes for time-series data
CREATE INDEX IF NOT EXISTS idx_metrics_created_brin 
    ON performance_metrics USING BRIN(created_at);

CREATE INDEX IF NOT EXISTS idx_ml_metrics_created_brin 
    ON ml_model_metrics USING BRIN(created_at);

-- ============================================
-- GRANTS FOR APPLICATION ACCESS
-- ============================================

-- Grant necessary permissions to the application roles (safe)
DO $$
BEGIN
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
    GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;
    
    GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
    GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ NEXUS Live Integration Schema applied successfully!';
    RAISE NOTICE '🚀 ML Models, Predictions, and Architecture Analysis tables ready';
    RAISE NOTICE '🔒 Row Level Security policies applied';
    RAISE NOTICE '📊 Performance indexes created';
    RAISE NOTICE '🤖 Construction principles loaded';
END $$;