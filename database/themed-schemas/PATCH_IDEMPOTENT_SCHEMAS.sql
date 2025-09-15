-- ============================================
-- PATCH FOR IDEMPOTENT SCHEMAS
-- Fixes duplicate index and policy errors
-- Run this to make all schemas re-runnable
-- ============================================

-- This patch addresses the common errors:
-- - relation "idx_xxx" already exists  
-- - policy "xxx_policy" for table "xxx" already exists

-- The schemas have been updated with:
-- 1. CREATE INDEX IF NOT EXISTS for indexes
-- 2. DO $$ BEGIN ... EXCEPTION WHEN duplicate_object blocks for policies

-- If you're still getting duplicate errors, you can:

-- Option 1: Drop existing conflicting objects first
-- (Replace 'your_index_name' and 'your_table_name' with actual names from error)

-- DROP INDEX IF EXISTS your_index_name;
-- DROP POLICY IF EXISTS your_policy_name ON your_table_name;

-- Option 2: Use this helper to drop all indexes with a pattern
CREATE OR REPLACE FUNCTION drop_indexes_by_pattern(pattern TEXT) 
RETURNS VOID AS $$
DECLARE
  index_name TEXT;
BEGIN
  FOR index_name IN 
    SELECT indexname FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname LIKE pattern
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', index_name);
    RAISE NOTICE 'Dropped index: %', index_name;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Option 3: Use this helper to drop all policies with a pattern
CREATE OR REPLACE FUNCTION drop_policies_by_pattern(pattern TEXT) 
RETURNS VOID AS $$
DECLARE
  policy_rec RECORD;
BEGIN
  FOR policy_rec IN 
    SELECT policyname, tablename FROM pg_policies 
    WHERE schemaname = 'public' 
    AND policyname LIKE pattern
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_rec.policyname, policy_rec.tablename);
    RAISE NOTICE 'Dropped policy: % on %', policy_rec.policyname, policy_rec.tablename;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Example usage to clean up before re-running schemas:
-- SELECT drop_indexes_by_pattern('idx_resource_usage%');
-- SELECT drop_policies_by_pattern('%tenant_policy%');

-- Check current schema state
CREATE OR REPLACE FUNCTION check_schema_conflicts()
RETURNS TABLE (
  conflict_type TEXT,
  object_name TEXT,
  table_name TEXT
) AS $$
BEGIN
  -- Show existing indexes that might conflict
  RETURN QUERY
  SELECT 
    'INDEX'::TEXT,
    indexname::TEXT,
    tablename::TEXT
  FROM pg_indexes 
  WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_resource_usage%' OR
    indexname LIKE 'idx_ml_%' OR  
    indexname LIKE 'idx_nexus_%' OR
    indexname LIKE 'idx_performance_%' OR
    indexname LIKE 'idx_security_%' OR
    indexname LIKE 'idx_billing_%'
  )
  ORDER BY indexname;

  -- Show existing policies that might conflict  
  RETURN QUERY
  SELECT 
    'POLICY'::TEXT,
    policyname::TEXT,
    tablename::TEXT
  FROM pg_policies 
  WHERE schemaname = 'public'
  AND policyname LIKE '%tenant_policy%'
  ORDER BY policyname;
END;
$$ LANGUAGE plpgsql;

-- Run this to see potential conflicts:
-- SELECT * FROM check_schema_conflicts();

-- Note: All schema files have been updated to handle duplicates gracefully.
-- You should not need to manually drop objects unless you have specific conflicts.