-- NEXUS Safe Migration Script
-- Handles existing tables with different structures

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: Create core tables that don't exist
-- ============================================

-- ML Models
CREATE TABLE IF NOT EXISTS ml_models (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    accuracy_score DECIMAL(5,4) DEFAULT 0.0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint safely
DO $$
BEGIN
    ALTER TABLE ml_models ADD CONSTRAINT ml_models_model_name_version_key UNIQUE(model_name, version);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
END $$;

-- Predictions Cache
CREATE TABLE IF NOT EXISTS predictions_cache (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    model_type VARCHAR(100) DEFAULT 'nexus_top_tier',
    prediction_type VARCHAR(50) DEFAULT 'general',
    input_data JSONB DEFAULT '{}'::jsonb,
    output_data JSONB DEFAULT '{}'::jsonb,
    confidence_score DECIMAL(5,4) DEFAULT 0.0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ML Feedback
CREATE TABLE IF NOT EXISTS ml_feedback (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    principle_id UUID,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_action VARCHAR(50) DEFAULT 'unknown',
    confidence_before DECIMAL(5,4),
    confidence_after DECIMAL(5,4),
    context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Construction Principles
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

-- Weather Data - Check if table exists first
DO $$
BEGIN
    -- Check if weather_data table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'weather_data') THEN
        -- Create new table
        CREATE TABLE weather_data (
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
    ELSE
        -- Table exists, check what columns it has
        -- Add location column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'weather_data' AND column_name = 'location') THEN
            -- Check if weather_location exists instead
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'weather_data' AND column_name = 'weather_location') THEN
                -- Add location column
                ALTER TABLE weather_data ADD COLUMN location VARCHAR(255);
            END IF;
        END IF;
        
        -- Add other missing columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'weather_data' AND column_name = 'weather_date') THEN
            ALTER TABLE weather_data ADD COLUMN weather_date DATE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'weather_data' AND column_name = 'temperature_min') THEN
            ALTER TABLE weather_data ADD COLUMN temperature_min DECIMAL(5,2);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'weather_data' AND column_name = 'temperature_max') THEN
            ALTER TABLE weather_data ADD COLUMN temperature_max DECIMAL(5,2);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'weather_data' AND column_name = 'precipitation_mm') THEN
            ALTER TABLE weather_data ADD COLUMN precipitation_mm DECIMAL(6,2);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'weather_data' AND column_name = 'wind_speed_kmh') THEN
            ALTER TABLE weather_data ADD COLUMN wind_speed_kmh DECIMAL(5,2);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'weather_data' AND column_name = 'conditions') THEN
            ALTER TABLE weather_data ADD COLUMN conditions VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'weather_data' AND column_name = 'raw_data') THEN
            ALTER TABLE weather_data ADD COLUMN raw_data JSONB;
        END IF;
    END IF;
END $$;

-- Schedule Conflicts
CREATE TABLE IF NOT EXISTS schedule_conflicts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    conflict_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'low',
    description TEXT NOT NULL,
    conflict_data JSONB,
    principle_id UUID,
    confidence_score DECIMAL(5,4),
    resolution_action VARCHAR(100),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add severity constraint safely
DO $$
BEGIN
    ALTER TABLE schedule_conflicts DROP CONSTRAINT IF EXISTS schedule_conflicts_severity_check;
    ALTER TABLE schedule_conflicts ADD CONSTRAINT schedule_conflicts_severity_check 
        CHECK (severity IN ('low', 'medium', 'high', 'critical'));
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN duplicate_object THEN NULL;
END $$;

-- Architecture Analysis Reports
CREATE TABLE IF NOT EXISTS architecture_analysis_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    analysis_type VARCHAR(50) NOT NULL,
    production_readiness_score INTEGER DEFAULT 0,
    issues JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add score constraint safely
DO $$
BEGIN
    ALTER TABLE architecture_analysis_reports DROP CONSTRAINT IF EXISTS architecture_analysis_reports_score_check;
    ALTER TABLE architecture_analysis_reports ADD CONSTRAINT architecture_analysis_reports_score_check 
        CHECK (production_readiness_score >= 0 AND production_readiness_score <= 100);
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN duplicate_object THEN NULL;
END $$;

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

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add severity constraint safely
DO $$
BEGIN
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_severity_check;
    ALTER TABLE notifications ADD CONSTRAINT notifications_severity_check 
        CHECK (severity IN ('info', 'warning', 'error', 'critical'));
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- STEP 2: Add work_location to calendar_events
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'calendar_events' AND column_name = 'work_location') THEN
            ALTER TABLE calendar_events ADD COLUMN work_location VARCHAR(50);
        END IF;
    END IF;
END $$;

-- ============================================
-- STEP 3: Create all indexes safely
-- ============================================

-- Create indexes only if tables exist
DO $$
BEGIN
    -- Predictions cache indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'predictions_cache') THEN
        CREATE INDEX IF NOT EXISTS idx_predictions_tenant ON predictions_cache (tenant_id);
        CREATE INDEX IF NOT EXISTS idx_predictions_type ON predictions_cache (prediction_type);
        CREATE INDEX IF NOT EXISTS idx_predictions_created ON predictions_cache (created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_predictions_tenant_type ON predictions_cache(tenant_id, prediction_type);
    END IF;
    
    -- ML feedback indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ml_feedback') THEN
        CREATE INDEX IF NOT EXISTS idx_feedback_tenant ON ml_feedback (tenant_id);
        CREATE INDEX IF NOT EXISTS idx_feedback_action ON ml_feedback (user_action);
        CREATE INDEX IF NOT EXISTS idx_feedback_created ON ml_feedback (created_at DESC);
    END IF;
    
    -- Construction principles indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'construction_principles') THEN
        CREATE INDEX IF NOT EXISTS idx_principles_category ON construction_principles (category);
        CREATE INDEX IF NOT EXISTS idx_principles_confidence ON construction_principles (confidence_score DESC);
    END IF;
    
    -- Weather data indexes - handle both location and weather_location columns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'weather_data') THEN
        CREATE INDEX IF NOT EXISTS idx_weather_date ON weather_data (weather_date);
        
        -- Create index on whichever location column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'weather_data' AND column_name = 'location') THEN
            CREATE INDEX IF NOT EXISTS idx_weather_location ON weather_data (location);
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'weather_data' AND column_name = 'weather_location') THEN
            CREATE INDEX IF NOT EXISTS idx_weather_location ON weather_data (weather_location);
        END IF;
    END IF;
    
    -- Schedule conflicts indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schedule_conflicts') THEN
        CREATE INDEX IF NOT EXISTS idx_conflicts_tenant ON schedule_conflicts (tenant_id);
        CREATE INDEX IF NOT EXISTS idx_conflicts_project ON schedule_conflicts (project_id);
        CREATE INDEX IF NOT EXISTS idx_conflicts_severity ON schedule_conflicts (severity);
        CREATE INDEX IF NOT EXISTS idx_conflicts_created ON schedule_conflicts (created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_conflicts_tenant_severity ON schedule_conflicts(tenant_id, severity) 
            WHERE resolved_at IS NULL;
    END IF;
    
    -- Other table indexes...
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'architecture_analysis_reports') THEN
        CREATE INDEX IF NOT EXISTS idx_analysis_type ON architecture_analysis_reports (analysis_type);
        CREATE INDEX IF NOT EXISTS idx_analysis_score ON architecture_analysis_reports (production_readiness_score DESC);
        CREATE INDEX IF NOT EXISTS idx_analysis_created ON architecture_analysis_reports (created_at DESC);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'performance_metrics') THEN
        CREATE INDEX IF NOT EXISTS idx_perf_tenant ON performance_metrics (tenant_id);
        CREATE INDEX IF NOT EXISTS idx_perf_type ON performance_metrics (metric_type);
        CREATE INDEX IF NOT EXISTS idx_perf_created ON performance_metrics (created_at DESC);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications (tenant_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications (type);
        CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id, is_read) 
            WHERE is_read = false;
        CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (created_at DESC);
    END IF;
END $$;

-- ============================================
-- STEP 4: Populate initial data safely
-- ============================================

-- Insert ML models
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

-- Insert construction principles only if table is empty
INSERT INTO construction_principles (category, principle, description, confidence_score)
SELECT * FROM (VALUES 
    ('safety', 'Fall Protection Required Above 6 Feet', 'OSHA requirement', 0.99),
    ('concrete', 'Minimum 28-Day Cure Time', 'Concrete strength requirement', 0.95),
    ('weather', 'No Concrete Pour Below 40°F', 'Temperature restriction', 0.93),
    ('sequence', 'Foundation Before Framing', 'Construction sequence', 0.99),
    ('electrical', 'Rough-In Before Insulation', 'Electrical timing', 0.97),
    ('plumbing', 'Pressure Test Before Close-In', 'Plumbing requirement', 0.96),
    ('hvac', 'Load Calculations Required', 'HVAC sizing', 0.91),
    ('roofing', 'Underlayment Within 30 Days', 'Roofing timeline', 0.88),
    ('inspection', 'Footing Inspection Before Pour', 'Inspection timing', 0.98),
    ('coordination', 'MEP Coordination Meeting', 'Trade coordination', 0.85)
) AS t(category, principle, description, confidence_score)
WHERE NOT EXISTS (SELECT 1 FROM construction_principles LIMIT 1);

-- Insert initial architecture report only if none exists
INSERT INTO architecture_analysis_reports (
    analysis_type, 
    production_readiness_score,
    issues,
    recommendations
)
SELECT 
    'initial_baseline',
    85,
    '[{"severity": "medium", "area": "database", "issue": "Optimization needed"}]'::jsonb,
    '["Add indexes", "Implement caching", "Enable monitoring"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM architecture_analysis_reports LIMIT 1);

-- ============================================
-- SUCCESS
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ NEXUS Safe Migration completed!';
    RAISE NOTICE '📊 All tables verified or created';
    RAISE NOTICE '🔍 Indexes created where needed';
    RAISE NOTICE '🤖 Initial data populated';
END $$;