-- Fix predictions_cache table structure

-- Check if predictions_cache exists and fix it
DO $$
BEGIN
    -- If table exists but has wrong structure, drop and recreate
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'predictions_cache') THEN
        -- Check if model_type column exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'predictions_cache' 
                      AND column_name = 'model_type') THEN
            -- Try to add the column
            BEGIN
                ALTER TABLE predictions_cache ADD COLUMN model_type VARCHAR(100) DEFAULT 'nexus_top_tier';
            EXCEPTION
                WHEN OTHERS THEN
                    -- If we can't add it, drop and recreate the table
                    DROP TABLE IF EXISTS predictions_cache CASCADE;
                    
                    CREATE TABLE predictions_cache (
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
            END;
        END IF;
        
        -- Add other missing columns if needed
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'predictions_cache' 
                      AND column_name = 'prediction_type') THEN
            ALTER TABLE predictions_cache ADD COLUMN prediction_type VARCHAR(50) DEFAULT 'general';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'predictions_cache' 
                      AND column_name = 'input_data') THEN
            ALTER TABLE predictions_cache ADD COLUMN input_data JSONB DEFAULT '{}'::jsonb;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'predictions_cache' 
                      AND column_name = 'output_data') THEN
            ALTER TABLE predictions_cache ADD COLUMN output_data JSONB DEFAULT '{}'::jsonb;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'predictions_cache' 
                      AND column_name = 'confidence_score') THEN
            ALTER TABLE predictions_cache ADD COLUMN confidence_score DECIMAL(5,4) DEFAULT 0.0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'predictions_cache' 
                      AND column_name = 'expires_at') THEN
            ALTER TABLE predictions_cache ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
        END IF;
    ELSE
        -- Table doesn't exist, create it
        CREATE TABLE predictions_cache (
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
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_predictions_tenant ON predictions_cache (tenant_id);
CREATE INDEX IF NOT EXISTS idx_predictions_type ON predictions_cache (prediction_type);
CREATE INDEX IF NOT EXISTS idx_predictions_created ON predictions_cache (created_at DESC);

-- Insert a sample prediction for testing
DO $$
DECLARE
    tenant_uuid UUID;
BEGIN
    -- Get the first tenant ID
    SELECT id INTO tenant_uuid FROM tenants LIMIT 1;
    
    IF tenant_uuid IS NOT NULL THEN
        INSERT INTO predictions_cache (
            tenant_id,
            model_type,
            prediction_type,
            input_data,
            output_data,
            confidence_score,
            expires_at
        )
        VALUES (
            tenant_uuid,
            'nexus_top_tier',
            'weather_impact',
            '{"location": "site_1", "date": "2025-08-27"}'::jsonb,
            '{"risk": "low", "recommendation": "Proceed as planned"}'::jsonb,
            0.92,
            CURRENT_TIMESTAMP + INTERVAL '7 days'
        )
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE '✅ Predictions cache table fixed and ready!';
END $$;