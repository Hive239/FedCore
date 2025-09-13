-- SECURITY VERIFICATION QUERIES
-- Run these in Supabase SQL Editor to verify tenant isolation

-- 1. Check RLS is enabled on all critical tables
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'projects', 'tasks', 'documents', 
    'vendors', 'messages', 'team_invitations',
    'user_tenants', 'tenants', 'activity_logs'
  )
ORDER BY tablename;

-- 2. Check all security policies
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'projects', 'tasks', 'documents', 
    'vendors', 'messages', 'team_invitations',
    'user_tenants', 'tenants'
  )
ORDER BY tablename, policyname;

-- 3. Count policies per table
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 4. Check for dangerous policies (those that might allow cross-tenant access)
SELECT 
  tablename,
  policyname,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual ILIKE '%true%' 
    OR qual ILIKE '%auth.uid() IS NOT NULL%'
  )
  AND qual NOT ILIKE '%tenant_id%'
ORDER BY tablename;

-- 5. Verify the get_user_tenant_id() function exists
SELECT 
  proname,
  prosrc
FROM pg_proc
WHERE proname = 'get_user_tenant_id';

-- 6. Check if any tables have tenant_id column but no RLS
SELECT 
  t.tablename,
  CASE WHEN t.rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status,
  COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
  AND EXISTS (
    SELECT 1 
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.tablename
      AND c.column_name = 'tenant_id'
  )
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.rowsecurity, t.tablename;

-- 7. Summary Report
SELECT 'SECURITY VERIFICATION SUMMARY' as report;

SELECT 
  'Tables with RLS enabled' as metric,
  COUNT(*) as value
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true;

SELECT 
  'Total security policies' as metric,
  COUNT(*) as value
FROM pg_policies
WHERE schemaname = 'public';

SELECT 
  'Tables with tenant_id but no RLS' as metric,
  COUNT(*) as value
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.rowsecurity = false
  AND EXISTS (
    SELECT 1 
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.tablename
      AND c.column_name = 'tenant_id'
  );