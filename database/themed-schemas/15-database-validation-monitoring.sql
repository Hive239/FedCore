-- ============================================
-- DATABASE VALIDATION & PERFORMANCE MONITORING
-- Comprehensive validation and monitoring utilities  
-- Run AFTER all schemas are applied
-- ============================================

-- Database Schema Validation Function
CREATE OR REPLACE FUNCTION validate_database_schema()
RETURNS TABLE (
  check_category TEXT,
  check_name TEXT,
  status TEXT,
  details TEXT,
  recommendation TEXT
) AS $$
BEGIN
  -- Check for tables without RLS
  RETURN QUERY
  SELECT 
    'Security'::TEXT as check_category,
    'RLS Enabled'::TEXT as check_name,
    CASE WHEN t.rowsecurity THEN 'PASS' ELSE 'FAIL' END::TEXT as status,
    ('Table: ' || t.tablename)::TEXT as details,
    CASE WHEN NOT t.rowsecurity THEN 'Enable RLS: ALTER TABLE ' || t.tablename || ' ENABLE ROW LEVEL SECURITY;' 
         ELSE 'OK' END::TEXT as recommendation
  FROM pg_tables t
  WHERE t.schemaname = 'public'
    AND t.tablename NOT IN ('schema_migrations', 'ar_internal_metadata')
  ORDER BY t.tablename;

  -- Check for missing indexes on foreign keys
  RETURN QUERY
  SELECT 
    'Performance'::TEXT,
    'Foreign Key Indexes'::TEXT,
    CASE WHEN i.indexrelid IS NULL THEN 'WARNING' ELSE 'PASS' END::TEXT,
    ('Foreign key without index: ' || tc.table_name || '.' || kcu.column_name)::TEXT,
    CASE WHEN i.indexrelid IS NULL 
         THEN 'CREATE INDEX idx_' || tc.table_name || '_' || kcu.column_name || ' ON ' || tc.table_name || '(' || kcu.column_name || ');'
         ELSE 'OK' END::TEXT
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  LEFT JOIN pg_class t ON t.relname = tc.table_name
  LEFT JOIN pg_index i ON i.indrelid = t.oid AND i.indkey[0] = (
    SELECT a.attnum FROM pg_attribute a 
    WHERE a.attrelid = t.oid AND a.attname = kcu.column_name
  )
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public';

  -- Check for missing NOT NULL constraints on critical columns
  RETURN QUERY
  SELECT 
    'Data Integrity'::TEXT,
    'Critical NULL Constraints'::TEXT,
    'WARNING'::TEXT,
    ('Missing NOT NULL on: ' || table_name || '.' || column_name)::TEXT,
    ('ALTER TABLE ' || table_name || ' ALTER COLUMN ' || column_name || ' SET NOT NULL;')::TEXT
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND is_nullable = 'YES'
    AND (
      (column_name = 'tenant_id' AND table_name NOT IN ('tenants', 'profiles')) OR
      (column_name LIKE '%_id' AND column_name != 'parent_id' AND table_name NOT LIKE '%_history')
    )
    AND table_name NOT LIKE 'pg_%';

  -- Check table sizes and recommend partitioning
  RETURN QUERY
  SELECT 
    'Performance'::TEXT,
    'Large Tables'::TEXT,
    CASE WHEN pg_total_relation_size(c.oid) > 1073741824 THEN 'WARNING' ELSE 'OK' END::TEXT, -- 1GB
    ('Table ' || c.relname || ' size: ' || pg_size_pretty(pg_total_relation_size(c.oid)))::TEXT,
    CASE WHEN pg_total_relation_size(c.oid) > 1073741824 
         THEN 'Consider partitioning table: ' || c.relname
         ELSE 'OK' END::TEXT
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname NOT LIKE 'pg_%'
  ORDER BY pg_total_relation_size(c.oid) DESC;

END;
$$ LANGUAGE plpgsql;

-- Performance Monitoring Function
CREATE OR REPLACE FUNCTION get_performance_stats()
RETURNS TABLE (
  metric_category TEXT,
  metric_name TEXT,
  current_value TEXT,
  status TEXT,
  recommendation TEXT
) AS $$
BEGIN
  -- Database connection stats
  RETURN QUERY
  SELECT 
    'Connections'::TEXT,
    'Active Connections'::TEXT,
    COUNT(*)::TEXT,
    CASE WHEN COUNT(*) > 80 THEN 'WARNING' 
         WHEN COUNT(*) > 100 THEN 'CRITICAL'
         ELSE 'OK' END::TEXT,
    CASE WHEN COUNT(*) > 80 THEN 'Monitor connection usage, consider connection pooling'
         ELSE 'Normal connection usage' END::TEXT
  FROM pg_stat_activity
  WHERE state = 'active';

  -- Slow queries
  RETURN QUERY
  SELECT 
    'Query Performance'::TEXT,
    'Slow Queries (>1s avg)'::TEXT,
    COUNT(*)::TEXT,
    CASE WHEN COUNT(*) > 5 THEN 'WARNING' ELSE 'OK' END::TEXT,
    CASE WHEN COUNT(*) > 5 THEN 'Review and optimize slow queries'
         ELSE 'Query performance acceptable' END::TEXT
  FROM pg_stat_statements 
  WHERE mean_exec_time > 1000; -- 1 second

  -- Index usage
  RETURN QUERY
  SELECT 
    'Index Efficiency'::TEXT,
    'Unused Indexes'::TEXT,
    COUNT(*)::TEXT,
    CASE WHEN COUNT(*) > 10 THEN 'WARNING' ELSE 'OK' END::TEXT,
    CASE WHEN COUNT(*) > 10 THEN 'Consider dropping unused indexes'
         ELSE 'Index usage is efficient' END::TEXT
  FROM pg_stat_user_indexes
  WHERE idx_scan = 0 AND schemaname = 'public';

  -- Cache hit ratio
  RETURN QUERY
  SELECT 
    'Caching'::TEXT,
    'Buffer Cache Hit Ratio'::TEXT,
    ROUND(
      (sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))) * 100, 2
    )::TEXT || '%',
    CASE WHEN (sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))) < 0.95 
         THEN 'WARNING' ELSE 'GOOD' END::TEXT,
    CASE WHEN (sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))) < 0.95
         THEN 'Consider increasing shared_buffers'
         ELSE 'Cache performance is good' END::TEXT
  FROM pg_statio_user_tables;

END;
$$ LANGUAGE plpgsql;

-- Table Statistics Function
CREATE OR REPLACE FUNCTION get_table_statistics()
RETURNS TABLE (
  table_name TEXT,
  row_count BIGINT,
  table_size TEXT,
  index_size TEXT,
  total_size TEXT,
  last_vacuum TIMESTAMPTZ,
  last_analyze TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.schemaname||'.'||t.tablename as table_name,
    t.n_tup_ins + t.n_tup_upd - t.n_tup_del as row_count,
    pg_size_pretty(pg_relation_size(c.oid)) as table_size,
    pg_size_pretty(pg_indexes_size(c.oid)) as index_size,
    pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
    t.last_vacuum,
    t.last_analyze
  FROM pg_stat_user_tables t
  JOIN pg_class c ON c.relname = t.relname
  WHERE t.schemaname = 'public'
  ORDER BY pg_total_relation_size(c.oid) DESC;
END;
$$ LANGUAGE plpgsql;

-- Data Integrity Check Function
CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE (
  check_type TEXT,
  table_name TEXT,
  issue_count BIGINT,
  sample_issues TEXT
) AS $$
BEGIN
  -- Orphaned records check
  RETURN QUERY
  SELECT 
    'Orphaned Tasks'::TEXT,
    'tasks'::TEXT,
    COUNT(*),
    array_to_string(array_agg(t.id::TEXT), ', ')
  FROM tasks t 
  LEFT JOIN projects p ON t.project_id = p.id 
  WHERE t.project_id IS NOT NULL AND p.id IS NULL;

  -- Cross-tenant data leaks
  RETURN QUERY
  SELECT 
    'Cross-Tenant Tasks'::TEXT,
    'tasks'::TEXT,
    COUNT(*),
    array_to_string(array_agg(t.id::TEXT), ', ')
  FROM tasks t
  JOIN projects p ON t.project_id = p.id
  WHERE t.tenant_id != p.tenant_id;

  -- Missing required data
  RETURN QUERY
  SELECT 
    'Tasks Without Titles'::TEXT,
    'tasks'::TEXT,
    COUNT(*),
    array_to_string(array_agg(t.id::TEXT), ', ')
  FROM tasks t
  WHERE t.title IS NULL OR t.title = '';

  -- Invalid status values
  RETURN QUERY
  SELECT 
    'Invalid Task Status'::TEXT,
    'tasks'::TEXT,
    COUNT(*),
    array_to_string(array_agg(t.id::TEXT), ', ')
  FROM tasks t
  WHERE t.status NOT IN ('pending', 'in-progress', 'review', 'on-hold', 'completed');

END;
$$ LANGUAGE plpgsql;

-- Multi-tenant Security Validation
CREATE OR REPLACE FUNCTION validate_tenant_security()
RETURNS TABLE (
  security_check TEXT,
  table_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check RLS policies exist for multi-tenant tables
  RETURN QUERY
  SELECT 
    'RLS Policy Check'::TEXT,
    t.tablename::TEXT,
    CASE WHEN COUNT(p.policyname) > 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    CASE WHEN COUNT(p.policyname) = 0 
         THEN 'Missing RLS policies for tenant isolation'
         ELSE COUNT(p.policyname)::TEXT || ' policies configured' END::TEXT
  FROM pg_tables t
  LEFT JOIN pg_policies p ON p.tablename = t.tablename
  WHERE t.schemaname = 'public'
    AND t.rowsecurity = true
    AND EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_name = t.tablename 
        AND c.column_name = 'tenant_id'
        AND c.table_schema = 'public'
    )
  GROUP BY t.tablename;

  -- Check for potential data exposure
  RETURN QUERY
  SELECT 
    'Tenant Data Isolation'::TEXT,
    'Overall'::TEXT,
    'INFO'::TEXT,
    'Run data integrity checks to verify tenant isolation'::TEXT;

END;
$$ LANGUAGE plpgsql;

-- Database Health Dashboard Function
CREATE OR REPLACE FUNCTION get_database_health_dashboard()
RETURNS TABLE (
  category TEXT,
  metric TEXT,
  value TEXT,
  status TEXT,
  check_timestamp TIMESTAMPTZ
) AS $$
DECLARE
  db_size BIGINT;
  table_count INTEGER;
  index_count INTEGER;
  connection_count INTEGER;
BEGIN
  -- Database size
  SELECT pg_database_size(current_database()) INTO db_size;
  RETURN QUERY SELECT 'Storage'::TEXT, 'Database Size'::TEXT, pg_size_pretty(db_size)::TEXT, 'INFO'::TEXT, NOW();

  -- Table count
  SELECT COUNT(*) INTO table_count FROM pg_tables WHERE schemaname = 'public';
  RETURN QUERY SELECT 'Schema'::TEXT, 'Table Count'::TEXT, table_count::TEXT, 'INFO'::TEXT, NOW();

  -- Index count
  SELECT COUNT(*) INTO index_count FROM pg_indexes WHERE schemaname = 'public';
  RETURN QUERY SELECT 'Schema'::TEXT, 'Index Count'::TEXT, index_count::TEXT, 'INFO'::TEXT, NOW();

  -- Active connections
  SELECT COUNT(*) INTO connection_count FROM pg_stat_activity WHERE state = 'active';
  RETURN QUERY SELECT 'Performance'::TEXT, 'Active Connections'::TEXT, connection_count::TEXT, 
    CASE WHEN connection_count > 50 THEN 'WARNING' ELSE 'OK' END::TEXT, NOW();

  -- Recent activity
  RETURN QUERY 
  SELECT 
    'Activity'::TEXT,
    'Recent Inserts (24h)'::TEXT,
    SUM(n_tup_ins)::TEXT,
    'INFO'::TEXT,
    NOW()
  FROM pg_stat_user_tables;

END;
$$ LANGUAGE plpgsql;

-- Automated Maintenance Function
CREATE OR REPLACE FUNCTION run_database_maintenance()
RETURNS TEXT AS $$
DECLARE
  result_text TEXT := '';
  table_record RECORD;
BEGIN
  result_text := 'Database maintenance started at ' || NOW() || E'\n';
  
  -- Update table statistics
  FOR table_record IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE 'ANALYZE ' || quote_ident(table_record.tablename);
    result_text := result_text || 'Analyzed table: ' || table_record.tablename || E'\n';
  END LOOP;
  
  -- Vacuum small tables
  FOR table_record IN 
    SELECT tablename FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public' 
      AND pg_total_relation_size(c.oid) < 104857600 -- 100MB
  LOOP
    EXECUTE 'VACUUM ANALYZE ' || quote_ident(table_record.tablename);
    result_text := result_text || 'Vacuumed table: ' || table_record.tablename || E'\n';
  END LOOP;
  
  result_text := result_text || 'Database maintenance completed at ' || NOW();
  RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- Query Performance Monitoring View
-- Drop existing table/view if it exists
DROP TABLE IF EXISTS slow_queries CASCADE;
DROP VIEW IF EXISTS slow_queries CASCADE;
CREATE VIEW slow_queries AS
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE mean_exec_time > 100 -- milliseconds
ORDER BY mean_exec_time DESC;

-- Index Usage Monitoring View  
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
  s.schemaname,
  s.relname as tablename,
  s.indexrelname as indexname,
  s.idx_tup_read,
  s.idx_tup_fetch,
  s.idx_scan,
  CASE 
    WHEN s.idx_scan = 0 THEN 'Never Used'
    WHEN s.idx_scan < 10 THEN 'Rarely Used'
    WHEN s.idx_scan < 100 THEN 'Moderately Used'
    ELSE 'Frequently Used'
  END as usage_category
FROM pg_stat_user_indexes s
ORDER BY s.idx_scan DESC;

-- Table Bloat Estimation View
CREATE OR REPLACE VIEW table_bloat_stats AS
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_stat_get_live_tuples(c.oid) as live_tuples,
  pg_stat_get_dead_tuples(c.oid) as dead_tuples,
  CASE 
    WHEN pg_stat_get_live_tuples(c.oid) > 0 
    THEN round((pg_stat_get_dead_tuples(c.oid)::float / pg_stat_get_live_tuples(c.oid)::float) * 100, 2)
    ELSE 0 
  END as dead_tuple_percent
FROM pg_stat_user_tables s
JOIN pg_class c ON c.relname = s.tablename
WHERE schemaname = 'public'
ORDER BY dead_tuple_percent DESC;

-- Master validation function to run all checks
CREATE OR REPLACE FUNCTION run_complete_database_validation()
RETURNS TABLE (
  validation_summary TEXT
) AS $$
DECLARE
  schema_issues INTEGER;
  performance_warnings INTEGER;
  data_issues INTEGER;
  security_issues INTEGER;
BEGIN
  -- Count issues from each validation category
  SELECT COUNT(*) INTO schema_issues 
  FROM validate_database_schema() WHERE status IN ('FAIL', 'WARNING');
  
  SELECT COUNT(*) INTO performance_warnings
  FROM get_performance_stats() WHERE status IN ('WARNING', 'CRITICAL');
  
  SELECT COUNT(*) INTO data_issues
  FROM check_data_integrity() WHERE issue_count > 0;
  
  SELECT COUNT(*) INTO security_issues
  FROM validate_tenant_security() WHERE status = 'FAIL';
  
  -- Return summary
  RETURN QUERY VALUES (
    'Database validation completed:' || E'\n' ||
    '- Schema issues: ' || schema_issues || E'\n' ||
    '- Performance warnings: ' || performance_warnings || E'\n' ||
    '- Data integrity issues: ' || data_issues || E'\n' ||  
    '- Security issues: ' || security_issues || E'\n' ||
    'Total issues found: ' || (schema_issues + performance_warnings + data_issues + security_issues) || E'\n' ||
    'Run individual validation functions for detailed reports.'
  );
END;
$$ LANGUAGE plpgsql;

-- Create monitoring table for tracking validation history
CREATE TABLE IF NOT EXISTS database_validation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_type VARCHAR(100) NOT NULL,
  issues_found INTEGER DEFAULT 0,
  warnings_found INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'completed',
  details JSONB,
  run_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for validation history
CREATE INDEX IF NOT EXISTS idx_db_validation_history_date ON database_validation_history(run_at);
CREATE INDEX IF NOT EXISTS idx_db_validation_history_type ON database_validation_history(validation_type);