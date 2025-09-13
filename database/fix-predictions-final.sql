-- Fix predictions_cache table - handle existing structure

-- First, let's see what columns actually exist
DO $$
DECLARE
    col_record RECORD;
BEGIN
    RAISE NOTICE 'Current columns in predictions_cache:';
    FOR col_record IN 
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'predictions_cache'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  - %: % (nullable: %)', col_record.column_name, col_record.data_type, col_record.is_nullable;
    END LOOP;
END $$;

-- Now fix the table structure
DO $$
BEGIN
    -- Check if prediction_data column exists (old structure)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'predictions_cache' 
              AND column_name = 'prediction_data') THEN
        
        -- Table has old structure, we need to migrate it
        -- First, make prediction_data nullable if it isn't
        ALTER TABLE predictions_cache ALTER COLUMN prediction_data DROP NOT NULL;
        
        -- Add new columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'predictions_cache' 
                      AND column_name = 'model_type') THEN
            ALTER TABLE predictions_cache ADD COLUMN model_type VARCHAR(100) DEFAULT 'nexus_top_tier';
        END IF;
        
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
        
        -- Migrate data from prediction_data to new columns if needed
        UPDATE predictions_cache 
        SET 
            input_data = CASE 
                WHEN prediction_data IS NOT NULL AND prediction_data::jsonb ? 'input' 
                THEN (prediction_data::jsonb)->>'input'::jsonb 
                ELSE '{}'::jsonb 
            END,
            output_data = CASE 
                WHEN prediction_data IS NOT NULL AND prediction_data::jsonb ? 'output' 
                THEN (prediction_data::jsonb)->>'output'::jsonb 
                ELSE prediction_data 
            END
        WHERE input_data IS NULL OR output_data IS NULL;
        
        -- Now we can safely drop the old column if we want
        -- ALTER TABLE predictions_cache DROP COLUMN prediction_data;
        
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_predictions_tenant ON predictions_cache (tenant_id);
CREATE INDEX IF NOT EXISTS idx_predictions_type ON predictions_cache (prediction_type) 
    WHERE prediction_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_predictions_created ON predictions_cache (created_at DESC);

-- Insert a sample prediction using the correct columns
DO $$
DECLARE
    tenant_uuid UUID;
BEGIN
    -- Get the first tenant ID
    SELECT id INTO tenant_uuid FROM tenants LIMIT 1;
    
    IF tenant_uuid IS NOT NULL THEN
        -- Check which columns exist and insert accordingly
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'predictions_cache' 
                  AND column_name = 'prediction_data') THEN
            -- Old structure - insert with prediction_data
            INSERT INTO predictions_cache (
                tenant_id,
                prediction_data,
                confidence_score,
                expires_at,
                model_type,
                prediction_type,
                input_data,
                output_data
            )
            SELECT
                tenant_uuid,
                '{"input": {"location": "site_1", "date": "2025-08-27"}, "output": {"risk": "low", "recommendation": "Proceed as planned"}}'::jsonb,
                0.92,
                CURRENT_TIMESTAMP + INTERVAL '7 days',
                'nexus_top_tier',
                'weather_impact',
                '{"location": "site_1", "date": "2025-08-27"}'::jsonb,
                '{"risk": "low", "recommendation": "Proceed as planned"}'::jsonb
            WHERE NOT EXISTS (
                SELECT 1 FROM predictions_cache 
                WHERE tenant_id = tenant_uuid 
                AND prediction_type = 'weather_impact'
                LIMIT 1
            );
        ELSE
            -- New structure - insert without prediction_data
            INSERT INTO predictions_cache (
                tenant_id,
                model_type,
                prediction_type,
                input_data,
                output_data,
                confidence_score,
                expires_at
            )
            SELECT
                tenant_uuid,
                'nexus_top_tier',
                'weather_impact',
                '{"location": "site_1", "date": "2025-08-27"}'::jsonb,
                '{"risk": "low", "recommendation": "Proceed as planned"}'::jsonb,
                0.92,
                CURRENT_TIMESTAMP + INTERVAL '7 days'
            WHERE NOT EXISTS (
                SELECT 1 FROM predictions_cache 
                WHERE tenant_id = tenant_uuid 
                AND prediction_type = 'weather_impact'
                LIMIT 1
            );
        END IF;
        
        RAISE NOTICE '✅ Sample prediction inserted successfully';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not insert sample prediction: %', SQLERRM;
END $$;

-- Final check
DO $$
DECLARE
    pred_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO pred_count FROM predictions_cache;
    RAISE NOTICE '✅ Predictions cache table ready with % predictions', pred_count;
END $$;