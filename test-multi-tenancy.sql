-- ============================================
-- COMPREHENSIVE MULTI-TENANCY TEST
-- This will find any potential security issues
-- ============================================

-- 1. CHECK FOR TABLES WITHOUT RLS
SELECT 
  '❌ CRITICAL: Tables WITHOUT Row Level Security' as issue_type,
  t.tablename,
  'This table has tenant_id but RLS is DISABLED' as problem
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.rowsecurity = false
  AND EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.tablename
      AND c.column_name = 'tenant_id'
  );

-- 2. CHECK FOR WEAK POLICIES
SELECT 
  '⚠️ WEAK POLICY DETECTED' as issue_type,
  tablename,
  policyname,
  qual as policy_definition
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    -- Policies that allow everything
    qual = 'true'
    -- Policies that only check if user is logged in
    OR qual = '(auth.uid() IS NOT NULL)'
    OR qual = '((auth.uid() IS NOT NULL))'
    -- Policies without tenant checks
    OR (qual NOT LIKE '%tenant%' AND tablename IN (
      SELECT table_name FROM information_schema.columns 
      WHERE column_name = 'tenant_id' AND table_schema = 'public'
    ))
  );

-- 3. CHECK FOR MISSING POLICIES
WITH expected_policies AS (
  SELECT 
    c.table_name,
    COUNT(DISTINCT p.cmd) as policy_count,
    ARRAY_AGG(DISTINCT p.cmd ORDER BY p.cmd) as commands
  FROM information_schema.columns c
  LEFT JOIN pg_policies p ON p.tablename = c.table_name AND p.schemaname = 'public'
  WHERE c.table_schema = 'public' 
    AND c.column_name = 'tenant_id'
    AND c.table_name NOT IN ('user_tenants', 'tenants', 'profiles') -- These have special handling
  GROUP BY c.table_name
)
SELECT 
  '⚠️ INCOMPLETE POLICIES' as issue_type,
  table_name,
  policy_count || ' policies (need 4)' as current_status,
  'Missing: ' || 
    CASE 
      WHEN NOT ('SELECT' = ANY(commands)) THEN 'SELECT ' ELSE ''
    END ||
    CASE 
      WHEN NOT ('INSERT' = ANY(commands)) THEN 'INSERT ' ELSE ''
    END ||
    CASE 
      WHEN NOT ('UPDATE' = ANY(commands)) THEN 'UPDATE ' ELSE ''
    END ||
    CASE 
      WHEN NOT ('DELETE' = ANY(commands)) THEN 'DELETE ' ELSE ''
    END as missing_policies
FROM expected_policies
WHERE policy_count < 4;

-- 4. CHECK FOR CROSS-TENANT FOREIGN KEYS
SELECT 
  '🔍 FOREIGN KEY CHECK' as issue_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  'Verify this relationship respects tenant boundaries' as action
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = tc.table_name 
      AND column_name = 'tenant_id'
      AND table_schema = 'public'
  )
  AND ccu.table_name != 'tenants'
  AND ccu.table_name != 'user_tenants';

-- 5. CHECK FOR NULL TENANT_IDS
DO $$
DECLARE
  r RECORD;
  null_count INTEGER;
  total_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '5. CHECKING FOR NULL TENANT_IDs...';
  RAISE NOTICE '====================================';
  
  FOR r IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN pg_tables t ON t.tablename = c.table_name
    WHERE c.table_schema = 'public' 
      AND c.column_name = 'tenant_id'
      AND t.schemaname = 'public'
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM public.%I WHERE tenant_id IS NULL', r.table_name) INTO null_count;
    EXECUTE format('SELECT COUNT(*) FROM public.%I', r.table_name) INTO total_count;
    
    IF null_count > 0 THEN
      RAISE NOTICE '❌ % has % NULL tenant_ids out of % total rows', r.table_name, null_count, total_count;
    ELSIF total_count > 0 THEN
      RAISE NOTICE '✅ % is clean (% rows, all have tenant_id)', r.table_name, total_count;
    END IF;
  END LOOP;
END $$;

-- 6. TEST ACTUAL TENANT ISOLATION
DO $$
DECLARE
  tenant1_id uuid;
  tenant2_id uuid;
  test_project_id uuid;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '6. TESTING ACTUAL TENANT ISOLATION...';
  RAISE NOTICE '=====================================';
  
  -- Get two different tenants if they exist
  SELECT id INTO tenant1_id FROM public.tenants LIMIT 1;
  SELECT id INTO tenant2_id FROM public.tenants WHERE id != tenant1_id LIMIT 1;
  
  IF tenant2_id IS NULL THEN
    -- Create a second test tenant
    INSERT INTO public.tenants (name, slug) 
    VALUES ('Test Tenant 2', 'test-tenant-2')
    RETURNING id INTO tenant2_id;
  END IF;
  
  -- Try to create a project in tenant1
  INSERT INTO public.projects (name, tenant_id, status)
  VALUES ('Test Isolation Project', tenant1_id, 'new')
  RETURNING id INTO test_project_id;
  
  RAISE NOTICE 'Created test project % in tenant %', test_project_id, tenant1_id;
  
  -- Clean up
  DELETE FROM public.projects WHERE id = test_project_id;
  
  RAISE NOTICE '✅ Tenant isolation test completed';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Tenant isolation test failed: %', SQLERRM;
END $$;

-- 7. CHECK FOR DIRECT TABLE ACCESS WITHOUT TENANT FILTER
SELECT 
  '⚠️ POTENTIAL VULNERABILITY' as issue_type,
  'Views without tenant filter' as category,
  viewname as view_name,
  'This view might expose cross-tenant data' as risk
FROM pg_views
WHERE schemaname = 'public'
  AND definition NOT LIKE '%tenant_id%'
  AND viewname IN (
    SELECT DISTINCT viewname 
    FROM pg_views v
    WHERE EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_name IN (
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      )
      AND c.column_name = 'tenant_id'
      AND v.definition LIKE '%' || c.table_name || '%'
    )
  );

-- 8. FINAL SECURITY SCORE
WITH security_metrics AS (
  SELECT 
    (SELECT COUNT(*) FROM pg_tables t 
     WHERE schemaname = 'public' AND rowsecurity = true
     AND EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = t.tablename AND column_name = 'tenant_id')) as secured_tables,
    (SELECT COUNT(*) FROM pg_tables t 
     WHERE schemaname = 'public' AND rowsecurity = false
     AND EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = t.tablename AND column_name = 'tenant_id')) as insecure_tables,
    (SELECT COUNT(*) FROM pg_policies 
     WHERE schemaname = 'public' 
     AND qual LIKE '%tenant_id%') as tenant_policies,
    (SELECT COUNT(*) FROM pg_policies 
     WHERE schemaname = 'public' 
     AND (qual = 'true' OR qual LIKE '%IS NOT NULL%' AND qual NOT LIKE '%tenant%')) as weak_policies
)
SELECT 
  '',
  '========================================',
  'MULTI-TENANCY SECURITY SCORE',
  '========================================',
  'Secured Tables: ' || secured_tables,
  'Insecure Tables: ' || CASE WHEN insecure_tables = 0 THEN '0 ✅' ELSE insecure_tables || ' ❌' END,
  'Tenant Policies: ' || tenant_policies,
  'Weak Policies: ' || CASE WHEN weak_policies = 0 THEN '0 ✅' ELSE weak_policies || ' ⚠️' END,
  '',
  'OVERALL STATUS: ' || 
    CASE 
      WHEN insecure_tables = 0 AND weak_policies = 0 THEN '✅ SECURE'
      WHEN insecure_tables > 0 THEN '❌ CRITICAL ISSUES FOUND'
      ELSE '⚠️ NEEDS REVIEW'
    END,
  'Security Score: ' || 
    ROUND(
      CASE 
        WHEN secured_tables + insecure_tables = 0 THEN 100
        ELSE (secured_tables::numeric / (secured_tables + insecure_tables)) * 100
      END
    ) || '/100'
FROM security_metrics;