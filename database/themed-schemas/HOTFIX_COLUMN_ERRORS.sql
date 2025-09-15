-- ============================================
-- HOTFIX FOR COLUMN REFERENCE ERRORS
-- Fixes column name mismatches and missing references
-- Run this if you encounter column errors
-- ============================================

-- Check if tables exist before creating indexes
DO $$ 
BEGIN
  -- Only create indexes if tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
    -- Check if session_token column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'user_sessions' AND column_name = 'session_token') THEN
      CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
    END IF;
    
    -- Check if is_active column exists  
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'user_sessions' AND column_name = 'is_active') THEN
      CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
    END IF;
  END IF;

  -- Check documents table columns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
    -- Use created_by instead of uploaded_by
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'documents' AND column_name = 'created_by') THEN
      CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
    END IF;
  END IF;

  -- Check activity_logs table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
    -- Use created_at instead of occurred_at
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'activity_logs' AND column_name = 'created_at') THEN
      CREATE INDEX IF NOT EXISTS idx_activity_logs_time_brin ON activity_logs USING BRIN (created_at);
    END IF;
  END IF;

  -- Check user_sessions table - it might not exist in base schema
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
    -- Check if session_token column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'user_sessions' AND column_name = 'session_token') THEN
      CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
    END IF;
    
    -- Check if is_active column exists  
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'user_sessions' AND column_name = 'is_active') THEN
      CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
    END IF;
  ELSE
    RAISE NOTICE 'Skipping user_sessions indexes - table does not exist (created by 11-critical-missing-tables.sql)';
  END IF;

  -- Handle other potentially missing tables
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_entries') THEN
    RAISE NOTICE 'Skipping time_entries indexes - table does not exist (created by 11-critical-missing-tables.sql)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'file_uploads') THEN  
    RAISE NOTICE 'Skipping file_uploads indexes - table does not exist (created by 11-critical-missing-tables.sql)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
    RAISE NOTICE 'Skipping contacts indexes - table does not exist (created by 11-critical-missing-tables.sql)';
  END IF;

  RAISE NOTICE 'Hotfix applied successfully';
END $$;

-- Function to check what columns actually exist
CREATE OR REPLACE FUNCTION check_table_columns(table_name_param TEXT)
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT,
  is_nullable TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::TEXT,
    c.data_type::TEXT,
    c.is_nullable::TEXT
  FROM information_schema.columns c
  WHERE c.table_name = table_name_param
    AND c.table_schema = 'public'
  ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql;

-- Check specific problematic tables
-- Run these to see actual column names:
-- SELECT * FROM check_table_columns('user_sessions');
-- SELECT * FROM check_table_columns('documents');  
-- SELECT * FROM check_table_columns('activity_logs');
-- SELECT * FROM check_table_columns('vendors');

-- Alternative safe index creation
CREATE OR REPLACE FUNCTION create_index_safely(
  index_name TEXT,
  table_name TEXT,
  column_name TEXT,
  index_type TEXT DEFAULT 'btree'
) RETURNS BOOLEAN AS $$
BEGIN
  -- Check if table and column exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = table_name AND column_name = column_name AND table_schema = 'public'
  ) THEN
    -- Create index
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I USING %s (%I)', 
                   index_name, table_name, index_type, column_name);
    RETURN TRUE;
  ELSE
    RAISE NOTICE 'Skipping index % - column %.% does not exist', index_name, table_name, column_name;
    RETURN FALSE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Failed to create index %: %', index_name, SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Usage examples:
-- SELECT create_index_safely('idx_user_sessions_token', 'user_sessions', 'session_token');
-- SELECT create_index_safely('idx_documents_created_by', 'documents', 'created_by');