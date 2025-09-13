-- ============================================
-- TEST CURRENT POLICIES FOR ISSUES
-- Run this to diagnose the exact problem
-- ============================================

-- 1. Show current user_tenants policies
SELECT 
  'USER_TENANTS POLICIES' as table_name,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_tenants'
  AND schemaname = 'public'
ORDER BY policyname;

-- 2. Show current vendors policies
SELECT 
  'VENDORS POLICIES' as table_name,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'vendors'
  AND schemaname = 'public'
ORDER BY policyname;

-- 3. Test if current user has a tenant assignment
SELECT 
  'CURRENT USER TENANT' as check_type,
  user_id,
  tenant_id,
  role
FROM user_tenants
WHERE user_id = auth.uid();

-- 4. Check if vendors table has RLS enabled
SELECT 
  'VENDORS RLS STATUS' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'vendors'
  AND schemaname = 'public';

-- 5. Try to identify the exact recursion loop
WITH RECURSIVE policy_deps AS (
  -- Start with user_tenants policies
  SELECT 
    'user_tenants' as from_table,
    regexp_replace(qual::text, '.*FROM\s+(\w+).*', '\1', 'g') as to_table,
    policyname,
    qual,
    1 as depth
  FROM pg_policies
  WHERE tablename = 'user_tenants'
    AND schemaname = 'public'
    AND qual::text LIKE '%FROM%'
  
  UNION ALL
  
  -- Recursively find dependencies
  SELECT 
    pd.to_table as from_table,
    regexp_replace(p.qual::text, '.*FROM\s+(\w+).*', '\1', 'g') as to_table,
    p.policyname,
    p.qual,
    pd.depth + 1
  FROM policy_deps pd
  JOIN pg_policies p 
    ON p.tablename = pd.to_table
    AND p.schemaname = 'public'
    AND p.qual::text LIKE '%FROM%'
  WHERE pd.depth < 5
)
SELECT 
  'POTENTIAL RECURSION' as issue,
  from_table || ' -> ' || to_table as dependency,
  policyname,
  depth
FROM policy_deps
WHERE from_table = 'user_tenants' 
  AND to_table = 'user_tenants'
ORDER BY depth;

-- 6. Show exact error when trying to insert a vendor
-- This will help identify the specific policy causing issues
SELECT 
  '',
  '====================================',
  'DIAGNOSIS COMPLETE',
  '====================================',
  'Run the fix-all-policies-final.sql script to resolve all issues',
  'The script will:',
  '1. Remove ALL recursive policies',
  '2. Create simple, non-recursive policies',
  '3. Fix the vendors table RLS',
  '4. Ensure all tables are properly secured';