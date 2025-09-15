-- ============================================
-- COMPREHENSIVE SYSTEM VALIDATION TESTS
-- Tests all database functionality after schema deployment
-- ============================================

-- Test 1: Core Table Count
SELECT 'TABLE_COUNT' as test_name, 
       COUNT(*)::TEXT as result,
       CASE WHEN COUNT(*) >= 50 THEN 'PASS' ELSE 'FAIL' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Test 2: Index Count  
SELECT 'INDEX_COUNT' as test_name,
       COUNT(*)::TEXT as result,
       CASE WHEN COUNT(*) >= 30 THEN 'PASS' ELSE 'FAIL' END as status
FROM pg_indexes 
WHERE schemaname = 'public';

-- Test 3: RLS Policy Count
SELECT 'RLS_POLICY_COUNT' as test_name,
       COUNT(*)::TEXT as result,
       CASE WHEN COUNT(*) >= 20 THEN 'PASS' ELSE 'FAIL' END as status
FROM pg_policies 
WHERE schemaname = 'public';

-- Test 4: Function Count
SELECT 'FUNCTION_COUNT' as test_name,
       COUNT(*)::TEXT as result,
       CASE WHEN COUNT(*) >= 10 THEN 'PASS' ELSE 'FAIL' END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';

-- Test 5: Critical Business Tables Exist
SELECT 'CRITICAL_TABLES' as test_name,
       array_to_string(array_agg(table_name), ', ') as result,
       CASE WHEN COUNT(*) = 8 THEN 'PASS' ELSE 'FAIL' END as status
FROM (
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('projects', 'tasks', 'vendors', 'documents', 'contacts', 'calendar_events', 'time_entries', 'file_uploads')
) t;

-- Test 6: AI/ML Tables Exist
SELECT 'AI_ML_TABLES' as test_name,
       COUNT(*)::TEXT as result,
       CASE WHEN COUNT(*) >= 5 THEN 'PASS' ELSE 'FAIL' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%ml_%' OR table_name LIKE '%ai_%' OR table_name LIKE '%prediction%';

-- Test 7: Messaging System Tables
SELECT 'MESSAGING_TABLES' as test_name,
       COUNT(*)::TEXT as result,
       CASE WHEN COUNT(*) >= 3 THEN 'PASS' ELSE 'FAIL' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%message%' OR table_name LIKE '%conversation%');

-- Test 8: Performance Monitoring Tables
SELECT 'MONITORING_TABLES' as test_name,
       COUNT(*)::TEXT as result,
       CASE WHEN COUNT(*) >= 5 THEN 'PASS' ELSE 'FAIL' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%metrics%' OR table_name LIKE '%performance%' OR table_name LIKE '%monitoring%');

-- Test 9: Billing System Tables
SELECT 'BILLING_TABLES' as test_name,
       COUNT(*)::TEXT as result,
       CASE WHEN COUNT(*) >= 5 THEN 'PASS' ELSE 'FAIL' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%billing%' OR table_name LIKE '%subscription%' OR table_name LIKE '%payment%');

-- Test 10: Enterprise Scaling Tables
SELECT 'ENTERPRISE_TABLES' as test_name,
       COUNT(*)::TEXT as result,
       CASE WHEN COUNT(*) >= 3 THEN 'PASS' ELSE 'FAIL' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%enterprise%' OR table_name LIKE '%scaling%' OR table_name LIKE '%50k%');

-- Test 11: Security & Compliance Tables
SELECT 'SECURITY_TABLES' as test_name,
       COUNT(*)::TEXT as result,
       CASE WHEN COUNT(*) >= 5 THEN 'PASS' ELSE 'FAIL' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%audit%' OR table_name LIKE '%security%' OR table_name LIKE '%compliance%' OR table_name LIKE '%gdpr%');

-- Test 12: Analytics & Reporting Tables
SELECT 'ANALYTICS_TABLES' as test_name,
       COUNT(*)::TEXT as result,
       CASE WHEN COUNT(*) >= 5 THEN 'PASS' ELSE 'FAIL' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%analytics%' OR table_name LIKE '%report%' OR table_name LIKE '%dashboard%' OR table_name LIKE '%kpi%');

-- Test 13: Database Size & Health
SELECT 'DATABASE_SIZE' as test_name,
       pg_size_pretty(pg_database_size(current_database())) as result,
       'INFO' as status;

-- Test 14: Foreign Key Constraints
SELECT 'FOREIGN_KEY_COUNT' as test_name,
       COUNT(*)::TEXT as result,
       CASE WHEN COUNT(*) >= 50 THEN 'PASS' ELSE 'FAIL' END as status
FROM information_schema.table_constraints 
WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY';

-- Test 15: Unique Constraints
SELECT 'UNIQUE_CONSTRAINT_COUNT' as test_name,
       COUNT(*)::TEXT as result,
       CASE WHEN COUNT(*) >= 10 THEN 'PASS' ELSE 'FAIL' END as status
FROM information_schema.table_constraints 
WHERE constraint_schema = 'public' AND constraint_type = 'UNIQUE';

-- Summary
SELECT 
  '=== VALIDATION SUMMARY ===' as test_name,
  'Tests completed - check results above' as result,
  'INFO' as status;