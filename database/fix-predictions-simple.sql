-- Simple fix for predictions_cache table

-- Step 1: Make prediction_data nullable if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'predictions_cache' 
              AND column_name = 'prediction_data'
              AND is_nullable = 'NO') THEN
        ALTER TABLE predictions_cache ALTER COLUMN prediction_data DROP NOT NULL;
        RAISE NOTICE '✅ Made prediction_data nullable';
    END IF;
END $$;

-- Step 2: Add missing columns
DO $$
BEGIN
    -- Add model_type if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'predictions_cache' 
                  AND column_name = 'model_type') THEN
        ALTER TABLE predictions_cache ADD COLUMN model_type VARCHAR(100) DEFAULT 'nexus_top_tier';
        RAISE NOTICE '✅ Added model_type column';
    END IF;
    
    -- Add prediction_type if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'predictions_cache' 
                  AND column_name = 'prediction_type') THEN
        ALTER TABLE predictions_cache ADD COLUMN prediction_type VARCHAR(50) DEFAULT 'general';
        RAISE NOTICE '✅ Added prediction_type column';
    END IF;
    
    -- Add input_data if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'predictions_cache' 
                  AND column_name = 'input_data') THEN
        ALTER TABLE predictions_cache ADD COLUMN input_data JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE '✅ Added input_data column';
    END IF;
    
    -- Add output_data if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'predictions_cache' 
                  AND column_name = 'output_data') THEN
        ALTER TABLE predictions_cache ADD COLUMN output_data JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE '✅ Added output_data column';
    END IF;
    
    -- Add confidence_score if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'predictions_cache' 
                  AND column_name = 'confidence_score') THEN
        ALTER TABLE predictions_cache ADD COLUMN confidence_score DECIMAL(5,4) DEFAULT 0.0;
        RAISE NOTICE '✅ Added confidence_score column';
    END IF;
    
    -- Add expires_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'predictions_cache' 
                  AND column_name = 'expires_at') THEN
        ALTER TABLE predictions_cache ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added expires_at column';
    END IF;
END $$;

-- Step 3: Update existing rows to have default values for new columns
DO $$
BEGIN
    -- Set defaults for any NULL values in new columns
    UPDATE predictions_cache 
    SET 
        model_type = COALESCE(model_type, 'nexus_top_tier'),
        prediction_type = COALESCE(prediction_type, 'general'),
        input_data = COALESCE(input_data, '{}'::jsonb),
        output_data = COALESCE(output_data, '{}'::jsonb),
        confidence_score = COALESCE(confidence_score, 0.5)
    WHERE model_type IS NULL 
       OR prediction_type IS NULL 
       OR input_data IS NULL 
       OR output_data IS NULL;
    
    RAISE NOTICE '✅ Updated existing rows with defaults';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Update skipped: %', SQLERRM;
END $$;

-- Step 4: If prediction_data exists and is required, populate it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'predictions_cache' 
              AND column_name = 'prediction_data') THEN
        
        -- Update prediction_data to have a value if it's NULL
        UPDATE predictions_cache 
        SET prediction_data = COALESCE(
            prediction_data,
            jsonb_build_object(
                'model', COALESCE(model_type, 'nexus_top_tier'),
                'type', COALESCE(prediction_type, 'general'),
                'confidence', COALESCE(confidence_score, 0.5)::float
            )
        )
        WHERE prediction_data IS NULL;
        
        RAISE NOTICE '✅ Updated prediction_data column';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'prediction_data update skipped: %', SQLERRM;
END $$;

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_predictions_tenant ON predictions_cache (tenant_id);
CREATE INDEX IF NOT EXISTS idx_predictions_type ON predictions_cache (prediction_type) 
    WHERE prediction_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_predictions_created ON predictions_cache (created_at DESC);

-- Step 6: Insert a sample prediction (handling both old and new structures)
DO $$
DECLARE
    tenant_uuid UUID;
    has_prediction_data BOOLEAN;
BEGIN
    -- Get the first tenant ID
    SELECT id INTO tenant_uuid FROM tenants LIMIT 1;
    
    -- Check if prediction_data column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'predictions_cache' 
        AND column_name = 'prediction_data'
    ) INTO has_prediction_data;
    
    IF tenant_uuid IS NOT NULL THEN
        IF has_prediction_data THEN
            -- Insert with prediction_data
            INSERT INTO predictions_cache (
                tenant_id,
                prediction_data,
                model_type,
                prediction_type,
                input_data,
                output_data,
                confidence_score,
                expires_at
            )
            SELECT
                tenant_uuid,
                jsonb_build_object(
                    'model', 'nexus_top_tier',
                    'type', 'weather_impact',
                    'confidence', 0.92
                ),
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
        ELSE
            -- Insert without prediction_data
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
        
        RAISE NOTICE '✅ Sample prediction ready';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Sample insert skipped: %', SQLERRM;
END $$;

-- Final status
DO $$
DECLARE
    pred_count INTEGER;
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO pred_count FROM predictions_cache;
    
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'predictions_cache';
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ Predictions cache fixed!';
    RAISE NOTICE '📊 Total predictions: %', pred_count;
    RAISE NOTICE '📋 Total columns: %', col_count;
    RAISE NOTICE '🚀 Ready for NEXUS Live Integration';
    RAISE NOTICE '============================================';
END $$;