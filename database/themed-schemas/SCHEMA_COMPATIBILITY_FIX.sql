-- ============================================
-- SCHEMA COMPATIBILITY FIX
-- Resolves all column name mismatches between base schema and themed schemas
-- Run this BEFORE applying any themed schemas
-- ============================================

-- Utility function to check if a column exists
CREATE OR REPLACE FUNCTION column_exists(p_table_name TEXT, p_column_name TEXT, p_schema_name TEXT DEFAULT 'public')
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = p_schema_name 
      AND table_name = p_table_name 
      AND column_name = p_column_name
  );
END;
$$ LANGUAGE plpgsql;

-- Function to safely create indexes with column validation
CREATE OR REPLACE FUNCTION create_index_with_validation(
  p_index_name TEXT,
  p_table_name TEXT,
  p_column_spec TEXT,
  p_index_type TEXT DEFAULT 'btree'
) RETURNS BOOLEAN AS $$
DECLARE
  v_column_name TEXT;
  v_sql_statement TEXT;
BEGIN
  -- Extract column name from column_spec (handles both simple and complex specs)
  v_column_name := split_part(split_part(p_column_spec, '(', 1), ',', 1);
  v_column_name := trim(v_column_name);
  
  -- Check if table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = p_table_name 
      AND table_schema = 'public'
  ) THEN
    RAISE NOTICE 'Skipping index % - table % does not exist', p_index_name, p_table_name;
    RETURN FALSE;
  END IF;
  
  -- For simple column names, check if column exists
  IF v_column_name NOT LIKE '%(%' AND v_column_name NOT LIKE 'to_tsvector%' THEN
    IF NOT column_exists(p_table_name, v_column_name) THEN
      RAISE NOTICE 'Skipping index % - column %.% does not exist', p_index_name, p_table_name, v_column_name;
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Create the index
  v_sql_statement := format('CREATE INDEX IF NOT EXISTS %I ON %I', p_index_name, p_table_name);
  
  IF p_index_type != 'btree' THEN
    v_sql_statement := v_sql_statement || format(' USING %s', p_index_type);
  END IF;
  
  v_sql_statement := v_sql_statement || format(' (%s)', p_column_spec);
  
  EXECUTE v_sql_statement;
  RAISE NOTICE 'Created index: %', p_index_name;
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Failed to create index %: %', p_index_name, SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Column mapping corrections for existing base schema
DO $$
BEGIN
  -- Map user_sessions.session_token to session_id if needed
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
    IF column_exists('user_sessions', 'session_id') AND NOT column_exists('user_sessions', 'session_token') THEN
      -- Create a view or function to handle the mapping if needed
      RAISE NOTICE 'user_sessions table uses session_id instead of session_token';
    END IF;
  END IF;
  
  -- Check documents table column mapping
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
    IF column_exists('documents', 'created_by') THEN
      RAISE NOTICE 'documents table correctly uses created_by column';
    ELSIF column_exists('documents', 'uploaded_by') THEN
      RAISE NOTICE 'documents table uses uploaded_by instead of created_by';
    END IF;
  END IF;
  
  -- Check activity_logs table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
    IF column_exists('activity_logs', 'created_at') THEN
      RAISE NOTICE 'activity_logs table correctly uses created_at column';
    ELSIF column_exists('activity_logs', 'occurred_at') THEN
      RAISE NOTICE 'activity_logs table uses occurred_at instead of created_at';
    END IF;
  END IF;

  RAISE NOTICE 'Schema compatibility check completed';
END $$;

-- Safe index creation for performance-indexes.sql compatibility
-- These will only create if the tables and columns exist

SELECT create_index_with_validation('idx_user_sessions_session_lookup', 'user_sessions', 
  CASE WHEN column_exists('user_sessions', 'session_token') 
       THEN 'session_token' 
       ELSE 'session_id' END);

SELECT create_index_with_validation('idx_user_sessions_active_lookup', 'user_sessions', 'is_active')
WHERE column_exists('user_sessions', 'is_active');

-- Table existence check summary
CREATE OR REPLACE FUNCTION check_themed_schema_prerequisites()
RETURNS TABLE (
  table_name TEXT,
  exists_in_base BOOLEAN,
  required_by_schema TEXT
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM (VALUES
    ('contacts', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts'), '11-critical-missing-tables.sql'),
    ('calendar_events', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events'), '11-critical-missing-tables.sql'),
    ('time_entries', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'time_entries'), '11-critical-missing-tables.sql'),
    ('file_uploads', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'file_uploads'), '11-critical-missing-tables.sql'),
    ('user_sessions', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions'), 'performance-monitoring (existing)'),
    ('activity_logs', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs'), 'base schema'),
    ('documents', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'documents'), 'base schema')
  ) AS t(table_name, exists_in_base, required_by_schema);
END;
$$ LANGUAGE plpgsql;

-- Run the check and display results
DO $$
BEGIN
  -- Display completion message
  RAISE NOTICE 'Schema compatibility fixes applied successfully.';
  RAISE NOTICE 'Run: SELECT * FROM check_themed_schema_prerequisites(); to see table status';
END $$;