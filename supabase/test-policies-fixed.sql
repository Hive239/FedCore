-- ============================================
-- TEST CURRENT POLICIES FOR ISSUES (FIXED)
-- Run this to diagnose the exact problem
-- ============================================

-- 1. Show current user_tenants policies
SELECT 
  'USER_TENANTS POLICIES' as table_name,
  policyname,
  cmd,
  qual::text as policy_definition
FROM pg_policies
WHERE tablename = 'user_tenants'
  AND schemaname = 'public'
ORDER BY policyname;

-- 2. Show current vendors policies
SELECT 
  'VENDORS POLICIES' as table_name,
  policyname,
  cmd,
  qual::text as policy_definition
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

-- 5. Check for circular references in policies (simplified)
SELECT 
  'POLICY ANALYSIS' as check_type,
  tablename,
  policyname,
  CASE 
    WHEN qual::text LIKE '%user_tenants%' AND tablename = 'user_tenants' 
    THEN '⚠️ SELF-REFERENCE DETECTED'
    WHEN qual::text LIKE '%profiles%' AND tablename = 'profiles'
    THEN '⚠️ SELF-REFERENCE DETECTED'
    ELSE '✅ OK'
  END as recursion_risk
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_tenants', 'profiles', 'vendors')
ORDER BY tablename, policyname;

-- 6. Count policies per table
SELECT 
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_tenants', 'profiles', 'vendors')
GROUP BY tablename
ORDER BY tablename;

-- 7. Show if any policies might cause recursion
SELECT 
  'RECURSION CHECK' as analysis,
  tablename,
  policyname,
  SUBSTRING(qual::text, 1, 100) || '...' as policy_snippet
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_tenants'
  AND (
    qual::text LIKE '%user_tenants%user_tenants%' 
    OR qual::text LIKE '%SELECT%FROM%user_tenants%FROM%user_tenants%'
  );

-- 8. Final diagnosis
SELECT 
  '',
  '====================================',
  'DIAGNOSIS COMPLETE',
  '====================================',
  '',
  'If you see any of these issues:',
  '1. SELF-REFERENCE DETECTED - Likely cause of recursion',
  '2. No tenant assignment for current user - Need to assign tenant',
  '3. RLS disabled on vendors - Need to enable RLS',
  '',
  'TO FIX ALL ISSUES:',
  'Run the fix-all-policies-final.sql script',
  '',
  'This will completely rebuild all policies',
  'with simple, non-recursive logic.';