-- NEXUS Live Integration Migration Script
-- Adds missing columns to existing tables

-- ============================================
-- ML FEEDBACK TABLE - Add missing columns
-- ============================================

-- Add user_action column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ml_feedback' 
                   AND column_name = 'user_action') THEN
        ALTER TABLE ml_feedback ADD COLUMN user_action VARCHAR(50) NOT NULL DEFAULT 'unknown';
    END IF;
END $$;

-- Add confidence_before column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ml_feedback' 
                   AND column_name = 'confidence_before') THEN
        ALTER TABLE ml_feedback ADD COLUMN confidence_before DECIMAL(5,4);
    END IF;
END $$;

-- Add confidence_after column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ml_feedback' 
                   AND column_name = 'confidence_after') THEN
        ALTER TABLE ml_feedback ADD COLUMN confidence_after DECIMAL(5,4);
    END IF;
END $$;

-- Add context column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ml_feedback' 
                   AND column_name = 'context') THEN
        ALTER TABLE ml_feedback ADD COLUMN context JSONB;
    END IF;
END $$;

-- ============================================
-- PREDICTIONS CACHE TABLE - Add missing columns
-- ============================================

-- Add model_type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'predictions_cache' 
                   AND column_name = 'model_type') THEN
        ALTER TABLE predictions_cache ADD COLUMN model_type VARCHAR(100) NOT NULL DEFAULT 'nexus_top_tier';
    END IF;
END $$;

-- Add prediction_type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'predictions_cache' 
                   AND column_name = 'prediction_type') THEN
        ALTER TABLE predictions_cache ADD COLUMN prediction_type VARCHAR(50) NOT NULL DEFAULT 'general';
    END IF;
END $$;

-- Add input_data column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'predictions_cache' 
                   AND column_name = 'input_data') THEN
        ALTER TABLE predictions_cache ADD COLUMN input_data JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Add output_data column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'predictions_cache' 
                   AND column_name = 'output_data') THEN
        ALTER TABLE predictions_cache ADD COLUMN output_data JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Add confidence_score column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'predictions_cache' 
                   AND column_name = 'confidence_score') THEN
        ALTER TABLE predictions_cache ADD COLUMN confidence_score DECIMAL(5,4) DEFAULT 0.0;
    END IF;
END $$;

-- Add expires_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'predictions_cache' 
                   AND column_name = 'expires_at') THEN
        ALTER TABLE predictions_cache ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- ============================================
-- CALENDAR EVENTS TABLE - Add work_location
-- ============================================

-- Add work_location column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'calendar_events' 
                   AND column_name = 'work_location') THEN
        ALTER TABLE calendar_events ADD COLUMN work_location VARCHAR(50);
    END IF;
END $$;

-- ============================================
-- CREATE MISSING TABLES
-- ============================================

-- Create ml_models table if it doesn't exist
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

-- Create construction_principles table if it doesn't exist
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

-- Create weather_data table if it doesn't exist
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

-- Create schedule_conflicts table if it doesn't exist
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

-- Create architecture_analysis_reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS architecture_analysis_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    analysis_type VARCHAR(50) NOT NULL,
    production_readiness_score INTEGER DEFAULT 0 CHECK (production_readiness_score >= 0 AND production_readiness_score <= 100),
    issues JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create code_quality_metrics table if it doesn't exist
CREATE TABLE IF NOT EXISTS code_quality_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    file_path TEXT NOT NULL,
    complexity_score INTEGER,
    maintainability_index INTEGER,
    test_coverage DECIMAL(5,2),
    issues JSONB DEFAULT '[]'::jsonb,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create performance_metrics table if it doesn't exist
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

-- Create ml_model_metrics table if it doesn't exist
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

-- Create notifications table if it doesn't exist
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

-- ============================================
-- CREATE INDEXES (Safe)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_feedback_tenant ON ml_feedback (tenant_id);
CREATE INDEX IF NOT EXISTS idx_feedback_action ON ml_feedback (user_action);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON ml_feedback (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_predictions_tenant ON predictions_cache (tenant_id);
CREATE INDEX IF NOT EXISTS idx_predictions_type ON predictions_cache (prediction_type);
CREATE INDEX IF NOT EXISTS idx_predictions_created ON predictions_cache (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_principles_category ON construction_principles (category);
CREATE INDEX IF NOT EXISTS idx_principles_confidence ON construction_principles (confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_weather_date ON weather_data (weather_date);
CREATE INDEX IF NOT EXISTS idx_weather_location ON weather_data (location);

CREATE INDEX IF NOT EXISTS idx_conflicts_tenant ON schedule_conflicts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_project ON schedule_conflicts (project_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_severity ON schedule_conflicts (severity);
CREATE INDEX IF NOT EXISTS idx_conflicts_created ON schedule_conflicts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_type ON architecture_analysis_reports (analysis_type);
CREATE INDEX IF NOT EXISTS idx_analysis_score ON architecture_analysis_reports (production_readiness_score DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_created ON architecture_analysis_reports (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quality_path ON code_quality_metrics (file_path);
CREATE INDEX IF NOT EXISTS idx_quality_analyzed ON code_quality_metrics (analyzed_at DESC);

CREATE INDEX IF NOT EXISTS idx_perf_tenant ON performance_metrics (tenant_id);
CREATE INDEX IF NOT EXISTS idx_perf_type ON performance_metrics (metric_type);
CREATE INDEX IF NOT EXISTS idx_perf_created ON performance_metrics (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_model_metrics_name ON ml_model_metrics (model_name);
CREATE INDEX IF NOT EXISTS idx_model_metrics_created ON ml_model_metrics (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications (tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications (type);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (created_at DESC);

-- ============================================
-- INSERT INITIAL DATA (Safe)
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
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ NEXUS Live Integration Migration completed successfully!';
    RAISE NOTICE '🚀 All missing columns added to existing tables';
    RAISE NOTICE '📊 Missing tables created';
    RAISE NOTICE '🤖 Initial data populated';
END $$;