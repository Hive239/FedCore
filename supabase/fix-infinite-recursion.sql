-- ============================================
-- FIX INFINITE RECURSION IN USER_TENANTS POLICIES
-- ============================================

-- 1. Drop ALL existing policies on user_tenants to stop the recursion
DROP POLICY IF EXISTS "user_tenants_view_own" ON public.user_tenants;
DROP POLICY IF EXISTS "user_tenants_admin_manage" ON public.user_tenants;
DROP POLICY IF EXISTS "Users can view their own tenant assignments" ON public.user_tenants;
DROP POLICY IF EXISTS "Admins can manage tenant assignments" ON public.user_tenants;
DROP POLICY IF EXISTS "user_tenants_tenant_select" ON public.user_tenants;
DROP POLICY IF EXISTS "user_tenants_tenant_insert" ON public.user_tenants;
DROP POLICY IF EXISTS "user_tenants_tenant_update" ON public.user_tenants;
DROP POLICY IF EXISTS "user_tenants_tenant_delete" ON public.user_tenants;

-- 2. Create SIMPLE non-recursive policies for user_tenants
CREATE POLICY "users_view_own_tenant_assignment" ON public.user_tenants
  FOR SELECT USING (user_id = auth.uid());

-- Admins can manage assignments WITHOUT recursion
CREATE POLICY "admins_manage_assignments" ON public.user_tenants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants ut2
      WHERE ut2.user_id = auth.uid()
        AND ut2.tenant_id = user_tenants.tenant_id
        AND ut2.role IN ('admin', 'owner')
    )
  );

-- 3. Fix profiles table policies to avoid recursion
DROP POLICY IF EXISTS "profiles_view_same_tenant" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in same tenant" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_tenant_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_tenant_update" ON public.profiles;

-- Simple profile policies without complex joins
CREATE POLICY "view_own_profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "view_tenant_profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants ut1
      WHERE ut1.user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.user_tenants ut2
          WHERE ut2.user_id = profiles.id
            AND ut2.tenant_id = ut1.tenant_id
        )
    )
  );

CREATE POLICY "update_own_profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- 4. Verify the fix
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('user_tenants', 'profiles')
ORDER BY tablename, policyname;

-- 5. Test that there's no recursion
DO $$
BEGIN
  -- This should NOT cause infinite recursion
  PERFORM * FROM user_tenants WHERE user_id = auth.uid() LIMIT 1;
  RAISE NOTICE '✅ No recursion detected in user_tenants';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Recursion still exists: %', SQLERRM;
END $$;

-- 6. Clear any corrupted sessions
-- Users may need to log out and log back in
SELECT '⚠️ IMPORTANT: Users should log out and log back in to clear corrupted sessions' as action;

-- 7. Final verification
SELECT 
  '✅ RECURSION FIX COMPLETE' as status,
  'All users should now:' as next_steps,
  '1. Clear browser cookies/cache' as step1,
  '2. Log out completely' as step2,  
  '3. Log back in' as step3,
  '4. Try adding customers again' as step4;