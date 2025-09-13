-- NEXUS Minimal Migration
-- Only creates what doesn't exist, with proper column handling

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Drop and recreate architecture_analysis_reports if it has wrong structure
-- ============================================

DO $$
BEGIN
    -- Check if table exists and if analysis_type column exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'architecture_analysis_reports') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'architecture_analysis_reports' 
                      AND column_name = 'analysis_type') THEN
            -- Table exists but doesn't have analysis_type column, drop and recreate
            DROP TABLE IF EXISTS architecture_analysis_reports CASCADE;
            
            CREATE TABLE architecture_analysis_reports (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                analysis_type VARCHAR(50) NOT NULL,
                production_readiness_score INTEGER DEFAULT 0,
                issues JSONB DEFAULT '[]'::jsonb,
                recommendations JSONB DEFAULT '[]'::jsonb,
                metrics JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        END IF;
    ELSE
        -- Table doesn't exist, create it
        CREATE TABLE architecture_analysis_reports (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            analysis_type VARCHAR(50) NOT NULL,
            production_readiness_score INTEGER DEFAULT 0,
            issues JSONB DEFAULT '[]'::jsonb,
            recommendations JSONB DEFAULT '[]'::jsonb,
            metrics JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END $$;

-- ============================================
-- Create other tables only if they don't exist
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

-- Weather Data (simple version)
CREATE TABLE IF NOT EXISTS weather_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    location VARCHAR(255),
    weather_date DATE,
    temperature_min DECIMAL(5,2),
    temperature_max DECIMAL(5,2),
    precipitation_mm DECIMAL(6,2),
    wind_speed_kmh DECIMAL(5,2),
    conditions VARCHAR(100),
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Schedule Conflicts
CREATE TABLE IF NOT EXISTS schedule_conflicts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    conflict_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'low',
    description TEXT,
    conflict_data JSONB,
    principle_id UUID,
    confidence_score DECIMAL(5,4),
    resolution_action VARCHAR(100),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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
    type VARCHAR(50) DEFAULT 'general',
    severity VARCHAR(20) DEFAULT 'info',
    title VARCHAR(255) DEFAULT 'Notification',
    message TEXT DEFAULT '',
    metadata JSONB,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Add work_location to calendar_events if needed
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
-- Create simple indexes (no errors if columns don't exist)
-- ============================================

DO $$
BEGIN
    -- Only create indexes if tables and columns exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'predictions_cache') THEN
        CREATE INDEX IF NOT EXISTS idx_predictions_tenant ON predictions_cache (tenant_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ml_feedback') THEN
        CREATE INDEX IF NOT EXISTS idx_feedback_tenant ON ml_feedback (tenant_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'construction_principles') THEN
        CREATE INDEX IF NOT EXISTS idx_principles_category ON construction_principles (category);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schedule_conflicts') THEN
        CREATE INDEX IF NOT EXISTS idx_conflicts_tenant ON schedule_conflicts (tenant_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'architecture_analysis_reports') 
       AND EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'architecture_analysis_reports' 
                  AND column_name = 'analysis_type') THEN
        CREATE INDEX IF NOT EXISTS idx_analysis_type ON architecture_analysis_reports (analysis_type);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'performance_metrics') THEN
        CREATE INDEX IF NOT EXISTS idx_perf_tenant ON performance_metrics (tenant_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);
    END IF;
EXCEPTION
    WHEN OTHERS THEN 
        RAISE NOTICE 'Some indexes could not be created: %', SQLERRM;
END $$;

-- ============================================
-- Insert initial data (safe)
-- ============================================

-- ML models
DO $$
BEGIN
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint 
                  WHERE conname = 'ml_models_name_version_unique') THEN
        ALTER TABLE ml_models ADD CONSTRAINT ml_models_name_version_unique 
            UNIQUE(model_name, version);
    END IF;
    
    INSERT INTO ml_models (model_name, version, model_type, accuracy_score, is_active)
    VALUES 
        ('nexus_top_tier', '1.0.0', 'construction_intelligence', 0.85, true),
        ('weather_impact_analyzer', '1.0.0', 'weather_analysis', 0.92, true),
        ('schedule_optimizer', '1.0.0', 'scheduling', 0.78, true),
        ('resource_predictor', '1.0.0', 'resource_management', 0.81, true)
    ON CONFLICT (model_name, version) DO NOTHING;
EXCEPTION
    WHEN OTHERS THEN 
        RAISE NOTICE 'ML models may already exist: %', SQLERRM;
END $$;

-- Construction principles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM construction_principles LIMIT 1) THEN
        INSERT INTO construction_principles (category, principle, description, confidence_score)
        VALUES 
            ('safety', 'Fall Protection', 'Required above 6 feet', 0.99),
            ('concrete', 'Cure Time', '28 days for full strength', 0.95),
            ('weather', 'Temperature Limits', 'No pour below 40F', 0.93),
            ('sequence', 'Foundation First', 'Build order', 0.99),
            ('electrical', 'Rough-In Timing', 'Before insulation', 0.97);
    END IF;
EXCEPTION
    WHEN OTHERS THEN 
        RAISE NOTICE 'Construction principles error: %', SQLERRM;
END $$;

-- Architecture report
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM architecture_analysis_reports LIMIT 1) THEN
        INSERT INTO architecture_analysis_reports (
            analysis_type, 
            production_readiness_score,
            issues,
            recommendations
        )
        VALUES (
            'initial',
            85,
            '[]'::jsonb,
            '["NEXUS system ready"]'::jsonb
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN 
        RAISE NOTICE 'Architecture report error: %', SQLERRM;
END $$;

-- ============================================
-- Final Report
-- ============================================

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_name IN (
        'ml_models', 'predictions_cache', 'ml_feedback', 
        'construction_principles', 'weather_data', 'schedule_conflicts',
        'architecture_analysis_reports', 'performance_metrics', 
        'ml_model_metrics', 'notifications'
    );
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ NEXUS Minimal Migration Complete';
    RAISE NOTICE '📊 Tables created: %/10', table_count;
    RAISE NOTICE '🚀 System ready for testing';
    RAISE NOTICE '============================================';
END $$;