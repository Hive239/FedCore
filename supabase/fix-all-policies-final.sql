-- ============================================
-- COMPLETE FIX FOR ALL RLS POLICIES
-- Fixes recursion and vendors table issues
-- ============================================

-- PART 1: FIX USER_TENANTS AND PROFILES RECURSION
-- ================================================

-- 1. Temporarily disable RLS to clean up
ALTER TABLE public.user_tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies on these tables
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all policies on user_tenants
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'user_tenants' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_tenants', r.policyname);
    RAISE NOTICE 'Dropped policy: % on user_tenants', r.policyname;
  END LOOP;
  
  -- Drop all policies on profiles
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
    RAISE NOTICE 'Dropped policy: % on profiles', r.policyname;
  END LOOP;
END $$;

-- 3. Re-enable RLS
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create ULTRA-SIMPLE policies for user_tenants (NO RECURSION POSSIBLE)
CREATE POLICY "user_can_see_own_record" ON public.user_tenants
  FOR ALL USING (user_id = auth.uid());

-- 5. Create simple policies for profiles
CREATE POLICY "user_can_see_own_profile" ON public.profiles
  FOR ALL USING (id = auth.uid());

-- Allow users to see profiles of users in their tenant (without recursion)
CREATE POLICY "user_can_see_tenant_profiles" ON public.profiles
  FOR SELECT USING (
    id IN (
      SELECT ut2.user_id
      FROM user_tenants ut1
      INNER JOIN user_tenants ut2 ON ut1.tenant_id = ut2.tenant_id
      WHERE ut1.user_id = auth.uid()
    )
  );

-- PART 2: FIX VENDORS TABLE RLS
-- ==============================

-- 1. Check if RLS is enabled on vendors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'vendors' 
    AND schemaname = 'public'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on vendors table';
  END IF;
END $$;

-- 2. Drop existing vendor policies and recreate
DROP POLICY IF EXISTS "Users can view vendors in their tenant" ON public.vendors;
DROP POLICY IF EXISTS "Users can insert vendors in their tenant" ON public.vendors;
DROP POLICY IF EXISTS "Users can update vendors in their tenant" ON public.vendors;
DROP POLICY IF EXISTS "Users can delete vendors in their tenant" ON public.vendors;
DROP POLICY IF EXISTS "vendors_tenant_select" ON public.vendors;
DROP POLICY IF EXISTS "vendors_tenant_insert" ON public.vendors;
DROP POLICY IF EXISTS "vendors_tenant_update" ON public.vendors;
DROP POLICY IF EXISTS "vendors_tenant_delete" ON public.vendors;

-- 3. Create proper vendor policies
-- Allow users to view vendors in their tenant
CREATE POLICY "vendors_select_policy" ON public.vendors
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- Allow users to insert vendors in their tenant
CREATE POLICY "vendors_insert_policy" ON public.vendors
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- Allow users to update vendors in their tenant
CREATE POLICY "vendors_update_policy" ON public.vendors
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- Allow users to delete vendors in their tenant
CREATE POLICY "vendors_delete_policy" ON public.vendors
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- PART 3: ENSURE ALL TABLES WITH TENANT_ID HAVE PROPER RLS
-- =========================================================

DO $$
DECLARE
  r RECORD;
  policy_exists BOOLEAN;
BEGIN
  FOR r IN 
    SELECT t.tablename
    FROM pg_tables t
    JOIN information_schema.columns c 
      ON c.table_name = t.tablename 
      AND c.table_schema = t.schemaname
    WHERE t.schemaname = 'public'
      AND c.column_name = 'tenant_id'
      AND t.tablename NOT IN ('user_tenants', 'profiles', 'vendors') -- Already handled above
  LOOP
    -- Enable RLS if not already enabled
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE tablename = r.tablename 
      AND schemaname = 'public'
      AND rowsecurity = true
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
      RAISE NOTICE 'Enabled RLS on %', r.tablename;
    END IF;
    
    -- Check and create SELECT policy
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.tablename || '_select_policy', r.tablename);
    EXECUTE format('
      CREATE POLICY %I ON public.%I
      FOR SELECT USING (
        tenant_id IN (
          SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
      )', r.tablename || '_select_policy', r.tablename);
    
    -- Check and create INSERT policy
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.tablename || '_insert_policy', r.tablename);
    EXECUTE format('
      CREATE POLICY %I ON public.%I
      FOR INSERT WITH CHECK (
        tenant_id IN (
          SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
      )', r.tablename || '_insert_policy', r.tablename);
    
    -- Check and create UPDATE policy
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.tablename || '_update_policy', r.tablename);
    EXECUTE format('
      CREATE POLICY %I ON public.%I
      FOR UPDATE USING (
        tenant_id IN (
          SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
      )', r.tablename || '_update_policy', r.tablename);
    
    -- Check and create DELETE policy
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.tablename || '_delete_policy', r.tablename);
    EXECUTE format('
      CREATE POLICY %I ON public.%I
      FOR DELETE USING (
        tenant_id IN (
          SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
      )', r.tablename || '_delete_policy', r.tablename);
    
    RAISE NOTICE 'Created/updated policies for %', r.tablename;
  END LOOP;
END $$;

-- PART 4: VERIFY AND REPORT
-- =========================

-- Check all tables with tenant_id have RLS enabled
SELECT 
  t.tablename,
  CASE 
    WHEN t.rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as rls_status,
  COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
JOIN information_schema.columns c 
  ON c.table_name = t.tablename 
  AND c.table_schema = t.schemaname
WHERE t.schemaname = 'public'
  AND c.column_name = 'tenant_id'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- Final status message
SELECT 
  '====================================',
  '✅ ALL POLICIES FIXED',
  '====================================',
  '',
  'FIXED:',
  '1. user_tenants - No more recursion',
  '2. profiles - Simple non-recursive policies',
  '3. vendors - Proper RLS policies',
  '4. All other tables with tenant_id - RLS enabled',
  '',
  'NEXT STEPS:',
  '1. Clear ALL browser data (cookies, cache, local storage)',
  '2. Restart your dev server (npm run dev)',
  '3. Log out and log back in',
  '4. Try adding a customer/vendor again',
  '',
  'If you still see errors, check the browser console',
  'and Supabase logs for more details.';