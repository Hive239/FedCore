-- ============================================
-- SCHEMA UTILITIES
-- Helper functions for safe schema operations
-- Run BEFORE other themed schemas
-- ============================================

-- Function to safely create policies
CREATE OR REPLACE FUNCTION create_policy_if_not_exists(
  policy_name TEXT,
  table_name TEXT,
  policy_definition TEXT
) RETURNS VOID AS $$
BEGIN
  EXECUTE format('CREATE POLICY %I ON %I %s', policy_name, table_name, policy_definition);
EXCEPTION
  WHEN duplicate_object THEN
    -- Policy already exists, do nothing
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to safely create indexes
CREATE OR REPLACE FUNCTION create_index_if_not_exists(
  index_name TEXT,
  table_name TEXT,
  columns TEXT,
  index_type TEXT DEFAULT 'btree'
) RETURNS VOID AS $$
BEGIN
  EXECUTE format('CREATE INDEX %I ON %I USING %s (%s)', index_name, table_name, index_type, columns);
EXCEPTION
  WHEN duplicate_object THEN
    -- Index already exists, do nothing
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to safely add columns to existing tables
CREATE OR REPLACE FUNCTION add_column_if_not_exists(
  table_name TEXT,
  column_name TEXT,
  column_definition TEXT
) RETURNS VOID AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s', table_name, column_name, column_definition);
EXCEPTION
  WHEN duplicate_column THEN
    -- Column already exists, do nothing
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to get table schema information
CREATE OR REPLACE FUNCTION get_table_info()
RETURNS TABLE (
  table_name TEXT,
  column_count BIGINT,
  has_rls BOOLEAN,
  policy_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT,
    COUNT(c.column_name) as column_count,
    t.rowsecurity as has_rls,
    COUNT(pol.policyname) as policy_count
  FROM pg_tables t
  LEFT JOIN information_schema.columns c ON c.table_name = t.tablename
  LEFT JOIN pg_policies pol ON pol.tablename = t.tablename
  WHERE t.schemaname = 'public'
  GROUP BY t.tablename, t.rowsecurity
  ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql;

-- Function to verify schema integrity
CREATE OR REPLACE FUNCTION verify_schema_integrity()
RETURNS TABLE (
  check_type TEXT,
  table_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check for tables without RLS
  RETURN QUERY
  SELECT 
    'RLS Check'::TEXT,
    t.tablename::TEXT,
    CASE WHEN t.rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END::TEXT,
    'Row Level Security status'::TEXT
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;

  -- Check for foreign key constraints
  RETURN QUERY
  SELECT 
    'Foreign Keys'::TEXT,
    tc.table_name::TEXT,
    'VALID'::TEXT,
    (tc.constraint_name || ' -> ' || ccu.table_name)::TEXT
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public';
END;
$$ LANGUAGE plpgsql;