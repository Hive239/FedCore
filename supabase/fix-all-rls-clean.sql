-- ============================================
-- CLEAN RLS SECURITY FIX - Drops all old policies first
-- ============================================

-- Helper function
CREATE OR REPLACE FUNCTION policy_exists(
  table_name text,
  policy_name text
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = table_name 
      AND policyname = policy_name
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DROP ALL EXISTING POLICIES ON TENANT TABLES
-- ============================================

DO $$ 
DECLARE
  r RECORD;
BEGIN
  -- Drop all policies on tables with tenant_id
  FOR r IN 
    SELECT DISTINCT 
      t.tablename,
      p.policyname
    FROM pg_tables t
    JOIN pg_policies p ON t.tablename = p.tablename
    WHERE t.schemaname = 'public'
      AND p.schemaname = 'public'
      AND EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_schema = 'public' 
          AND c.table_name = t.tablename
          AND c.column_name = 'tenant_id'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    RAISE NOTICE 'Dropped policy % on table %', r.policyname, r.tablename;
  END LOOP;
END $$;

-- Also drop specific known policies on profiles table
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in same tenant" ON public.profiles;

-- ============================================
-- ENABLE RLS ON ALL TABLES WITH TENANT_ID
-- ============================================

DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN pg_tables t ON t.tablename = c.table_name
    WHERE c.table_schema = 'public' 
      AND c.column_name = 'tenant_id'
      AND t.schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.table_name);
    RAISE NOTICE 'Enabled RLS on table: %', r.table_name;
  END LOOP;
END $$;

-- ============================================
-- CREATE FRESH POLICIES FOR ALL TABLES
-- ============================================

DO $$ 
DECLARE
  r RECORD;
  policy_name text;
BEGIN
  FOR r IN 
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN pg_tables t ON t.tablename = c.table_name
    WHERE c.table_schema = 'public' 
      AND c.column_name = 'tenant_id'
      AND t.schemaname = 'public'  -- This ensures we only get tables, not views
  LOOP
    -- Create SELECT policy
    policy_name := format('%s_tenant_select', r.table_name);
    EXECUTE format('
      CREATE POLICY %I ON public.%I
      FOR SELECT USING (
        tenant_id IN (
          SELECT tenant_id FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      )', policy_name, r.table_name);
    
    -- Create INSERT policy
    policy_name := format('%s_tenant_insert', r.table_name);
    EXECUTE format('
      CREATE POLICY %I ON public.%I
      FOR INSERT WITH CHECK (
        tenant_id IN (
          SELECT tenant_id FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      )', policy_name, r.table_name);
    
    -- Create UPDATE policy
    policy_name := format('%s_tenant_update', r.table_name);
    EXECUTE format('
      CREATE POLICY %I ON public.%I
      FOR UPDATE USING (
        tenant_id IN (
          SELECT tenant_id FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      )', policy_name, r.table_name);
    
    -- Create DELETE policy
    policy_name := format('%s_tenant_delete', r.table_name);
    EXECUTE format('
      CREATE POLICY %I ON public.%I
      FOR DELETE USING (
        tenant_id IN (
          SELECT tenant_id FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      )', policy_name, r.table_name);
    
    RAISE NOTICE 'Created 4 policies for table: %', r.table_name;
  END LOOP;
END $$;

-- ============================================
-- SPECIAL POLICIES FOR PROFILES TABLE
-- ============================================

-- Profiles table needs special handling
DROP POLICY IF EXISTS "profiles_tenant_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_tenant_update" ON public.profiles;

CREATE POLICY "profiles_view_same_tenant" ON public.profiles
  FOR SELECT USING (
    id IN (
      SELECT ut.user_id 
      FROM public.user_tenants ut
      WHERE ut.tenant_id IN (
        SELECT tenant_id 
        FROM public.user_tenants 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================
-- SPECIAL HANDLING FOR USER_TENANTS AND TENANTS
-- ============================================

-- user_tenants table
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_tenants_tenant_select" ON public.user_tenants;
DROP POLICY IF EXISTS "user_tenants_tenant_insert" ON public.user_tenants;
DROP POLICY IF EXISTS "user_tenants_tenant_update" ON public.user_tenants;
DROP POLICY IF EXISTS "user_tenants_tenant_delete" ON public.user_tenants;

CREATE POLICY "user_tenants_view_own" ON public.user_tenants
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_tenants_admin_manage" ON public.user_tenants
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- tenants table
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_tenant_select" ON public.tenants;
DROP POLICY IF EXISTS "tenants_tenant_insert" ON public.tenants;
DROP POLICY IF EXISTS "tenants_tenant_update" ON public.tenants;
DROP POLICY IF EXISTS "tenants_tenant_delete" ON public.tenants;

CREATE POLICY "tenants_view_member" ON public.tenants
  FOR SELECT USING (
    id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tenants_update_owner" ON public.tenants
  FOR UPDATE USING (
    id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
        AND role = 'owner'
    )
  );

-- ============================================
-- VERIFICATION
-- ============================================

-- Show results
SELECT 
  t.tablename,
  t.rowsecurity as rls_enabled,
  COUNT(p.policyname) as policy_count,
  CASE 
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
ORDER BY status DESC, t.tablename;

-- Clean up
DROP FUNCTION IF EXISTS policy_exists(text, text);

-- Done
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS SECURITY FIX COMPLETED';
  RAISE NOTICE 'All tables with tenant_id are now secured';
END $$;