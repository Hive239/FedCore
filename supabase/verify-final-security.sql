-- ============================================
-- FINAL SECURITY VERIFICATION
-- ============================================

-- 1. Check RLS status on all tables with tenant_id
SELECT 
  t.tablename,
  t.rowsecurity as rls_enabled,
  COUNT(p.policyname) as policy_count,
  CASE 
    WHEN t.tablename = 'user_tenants' AND t.rowsecurity AND COUNT(p.policyname) >= 2 THEN '✅ SECURE (Special)'
    WHEN t.tablename = 'tenants' AND t.rowsecurity AND COUNT(p.policyname) >= 2 THEN '✅ SECURE (Special)'
    WHEN t.tablename = 'profiles' AND t.rowsecurity AND COUNT(p.policyname) >= 2 THEN '✅ SECURE (Special)'
    WHEN t.rowsecurity AND COUNT(p.policyname) >= 4 THEN '✅ SECURE'
    WHEN t.rowsecurity AND COUNT(p.policyname) > 0 THEN '⚠️ PARTIAL'
    ELSE '❌ INSECURE'
  END as status
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
  AND EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.tablename
      AND c.column_name = 'tenant_id'
  )
GROUP BY t.tablename, t.rowsecurity
ORDER BY 
  CASE 
    WHEN t.tablename IN ('user_tenants', 'tenants', 'profiles') THEN 1
    ELSE 2
  END,
  t.tablename;

-- 2. Count secured vs insecure
SELECT 
  COUNT(CASE WHEN rowsecurity THEN 1 END) as "✅ Tables with RLS",
  COUNT(CASE WHEN NOT rowsecurity THEN 1 END) as "❌ Tables WITHOUT RLS",
  COUNT(*) as "Total Tables with tenant_id"
FROM pg_tables t
WHERE schemaname = 'public'
  AND EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.tablename
      AND c.column_name = 'tenant_id'
  );

-- 3. Show policies on special tables
SELECT 
  '--- SPECIAL TABLE POLICIES ---' as info;

SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_tenants', 'tenants', 'profiles')
ORDER BY tablename, policyname;

-- 4. Check for any dangerous policies
SELECT 
  '--- CHECKING FOR DANGEROUS POLICIES ---' as info;

SELECT 
  tablename,
  policyname,
  CASE 
    WHEN qual ILIKE '%true%' AND qual NOT ILIKE '%tenant%' THEN '❌ DANGEROUS - Allows all'
    WHEN qual ILIKE '%auth.uid() IS NOT NULL%' AND qual NOT ILIKE '%tenant%' THEN '⚠️ WEAK - No tenant check'
    ELSE '✅ OK'
  END as risk_level,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (qual ILIKE '%true%' AND qual NOT ILIKE '%tenant%')
    OR (qual ILIKE '%auth.uid() IS NOT NULL%' AND qual NOT ILIKE '%tenant%')
  )
ORDER BY 
  CASE 
    WHEN qual ILIKE '%true%' AND qual NOT ILIKE '%tenant%' THEN 1
    WHEN qual ILIKE '%auth.uid() IS NOT NULL%' AND qual NOT ILIKE '%tenant%' THEN 2
    ELSE 3
  END;

-- 5. Final Summary
SELECT 
  '===========================================' as line
UNION ALL
SELECT 
  'SECURITY STATUS SUMMARY' as line
UNION ALL
SELECT 
  '===========================================' as line
UNION ALL
SELECT 
  CASE 
    WHEN COUNT(CASE WHEN NOT rowsecurity THEN 1 END) = 0 
    THEN '🎉 ALL TABLES SECURED - Production Ready!'
    ELSE '⚠️ ' || COUNT(CASE WHEN NOT rowsecurity THEN 1 END) || ' tables still need RLS enabled'
  END as line
FROM pg_tables t
WHERE schemaname = 'public'
  AND EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.tablename
      AND c.column_name = 'tenant_id'
  );

-- Note about special tables:
SELECT 
  '' as line
UNION ALL
SELECT 
  'NOTE: user_tenants, tenants, and profiles tables have' as line
UNION ALL
SELECT 
  'special policies (2 instead of 4) which is correct.' as line
UNION ALL
SELECT 
  'user_tenants: Users see own + admins manage' as line
UNION ALL
SELECT 
  'tenants: Members view + owners update' as line
UNION ALL
SELECT 
  'profiles: View same tenant + update own' as line;