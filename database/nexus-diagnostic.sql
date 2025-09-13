-- NEXUS Diagnostic Script
-- Check what tables and columns exist

-- ============================================
-- Check existing NEXUS tables
-- ============================================

DO $$
DECLARE
    table_record RECORD;
    column_record RECORD;
    table_exists BOOLEAN;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'NEXUS Tables Diagnostic Report';
    RAISE NOTICE '============================================';
    
    -- Check ml_models
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ml_models') INTO table_exists;
    RAISE NOTICE 'ml_models table exists: %', table_exists;
    
    -- Check predictions_cache  
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'predictions_cache') INTO table_exists;
    RAISE NOTICE 'predictions_cache table exists: %', table_exists;
    
    -- Check ml_feedback
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ml_feedback') INTO table_exists;
    RAISE NOTICE 'ml_feedback table exists: %', table_exists;
    
    -- Check construction_principles
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'construction_principles') INTO table_exists;
    RAISE NOTICE 'construction_principles table exists: %', table_exists;
    
    -- Check weather_data
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'weather_data') INTO table_exists;
    RAISE NOTICE 'weather_data table exists: %', table_exists;
    IF table_exists THEN
        -- Check which location column exists
        FOR column_record IN 
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'weather_data' 
            AND column_name IN ('location', 'weather_location')
        LOOP
            RAISE NOTICE '  - weather_data has column: %', column_record.column_name;
        END LOOP;
    END IF;
    
    -- Check schedule_conflicts
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schedule_conflicts') INTO table_exists;
    RAISE NOTICE 'schedule_conflicts table exists: %', table_exists;
    
    -- Check architecture_analysis_reports
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'architecture_analysis_reports') INTO table_exists;
    RAISE NOTICE 'architecture_analysis_reports table exists: %', table_exists;
    IF table_exists THEN
        -- List columns
        RAISE NOTICE '  Columns in architecture_analysis_reports:';
        FOR column_record IN 
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'architecture_analysis_reports'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '    - %: %', column_record.column_name, column_record.data_type;
        END LOOP;
    END IF;
    
    -- Check performance_metrics
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'performance_metrics') INTO table_exists;
    RAISE NOTICE 'performance_metrics table exists: %', table_exists;
    
    -- Check notifications
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') INTO table_exists;
    RAISE NOTICE 'notifications table exists: %', table_exists;
    
    -- Check calendar_events
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events') INTO table_exists;
    RAISE NOTICE 'calendar_events table exists: %', table_exists;
    IF table_exists THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'calendar_events' AND column_name = 'work_location'
        ) INTO table_exists;
        RAISE NOTICE '  - has work_location column: %', table_exists;
    END IF;
    
    RAISE NOTICE '============================================';
END $$;