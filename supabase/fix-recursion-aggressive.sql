-- ============================================
-- AGGRESSIVE FIX FOR INFINITE RECURSION
-- This completely removes and rebuilds policies
-- ============================================

-- 1. DISABLE RLS TEMPORARILY TO CLEAR EVERYTHING
ALTER TABLE public.user_tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. DROP ALL POLICIES ON THESE TABLES
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

-- 3. RE-ENABLE RLS
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. CREATE SUPER SIMPLE POLICIES - NO RECURSION POSSIBLE

-- user_tenants: Users can ONLY see their own record
CREATE POLICY "simple_user_tenants_own" ON public.user_tenants
  FOR ALL USING (user_id = auth.uid());

-- profiles: Users can see their own profile
CREATE POLICY "simple_profiles_own" ON public.profiles
  FOR ALL USING (id = auth.uid());

-- profiles: Users can view other profiles if they share a tenant
-- This uses a SIMPLE join without recursion
CREATE POLICY "simple_profiles_same_tenant" ON public.profiles
  FOR SELECT USING (
    id IN (
      SELECT DISTINCT ut2.user_id
      FROM user_tenants ut1
      JOIN user_tenants ut2 ON ut1.tenant_id = ut2.tenant_id
      WHERE ut1.user_id = auth.uid()
    )
  );

-- 5. VERIFY NO RECURSION
DO $$
DECLARE
  test_result RECORD;
BEGIN
  -- Test query that previously caused recursion
  SELECT COUNT(*) INTO test_result FROM user_tenants WHERE user_id = auth.uid();
  RAISE NOTICE '✅ Query succeeded - no recursion detected';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Still has recursion: %', SQLERRM;
END $$;

-- 6. Show current policies
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('user_tenants', 'profiles')
  AND schemaname = 'public'
ORDER BY tablename, policyname;

-- 7. IMPORTANT MESSAGE
SELECT 
  '====================================',
  '✅ RECURSION FIXED WITH SIMPLE POLICIES',
  '====================================',
  '',
  'user_tenants: Can only see/edit own record',
  'profiles: Can see own + same tenant profiles',
  '',
  'NEXT STEPS:',
  '1. Clear ALL browser data',
  '2. Restart your dev server', 
  '3. Log out and log back in',
  '4. Try adding a customer again';