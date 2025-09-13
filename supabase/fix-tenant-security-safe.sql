-- SAFE TENANT SECURITY FIX: Checks for existing policies before creating
-- Run this in Supabase Dashboard > SQL Editor

-- ============================================
-- HELPER FUNCTION: Check if policy exists
-- ============================================
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
-- 1. FIX PROFILES TABLE POLICIES
-- ============================================

-- Drop old insecure policies if they exist
DO $$ 
BEGIN
  IF policy_exists('profiles', 'Users can view profiles') THEN
    DROP POLICY "Users can view profiles" ON public.profiles;
  END IF;
  
  IF policy_exists('profiles', 'Profiles are viewable by users') THEN
    DROP POLICY "Profiles are viewable by users" ON public.profiles;
  END IF;
END $$;

-- Create new secure policies only if they don't exist
DO $$ 
BEGIN
  IF NOT policy_exists('profiles', 'Users can view profiles in same tenant') THEN
    CREATE POLICY "Users can view profiles in same tenant" ON public.profiles
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
  END IF;
  
  IF NOT policy_exists('profiles', 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON public.profiles
      FOR UPDATE USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- ============================================
-- 2. PROJECTS TABLE POLICIES
-- ============================================

-- Drop old policies if they exist
DO $$ 
BEGIN
  IF policy_exists('projects', 'Projects visible to authenticated users') THEN
    DROP POLICY "Projects visible to authenticated users" ON public.projects;
  END IF;
  
  IF policy_exists('projects', 'Users can view projects') THEN
    DROP POLICY "Users can view projects" ON public.projects;
  END IF;
END $$;

-- Create new policies only if they don't exist
DO $$ 
BEGIN
  IF NOT policy_exists('projects', 'Users can only view projects in their tenant') THEN
    CREATE POLICY "Users can only view projects in their tenant" ON public.projects
      FOR SELECT USING (
        tenant_id IN (
          SELECT tenant_id 
          FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT policy_exists('projects', 'Users can create projects in their tenant') THEN
    CREATE POLICY "Users can create projects in their tenant" ON public.projects
      FOR INSERT WITH CHECK (
        tenant_id IN (
          SELECT tenant_id 
          FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT policy_exists('projects', 'Users can update projects in their tenant') THEN
    CREATE POLICY "Users can update projects in their tenant" ON public.projects
      FOR UPDATE USING (
        tenant_id IN (
          SELECT tenant_id 
          FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT policy_exists('projects', 'Users can delete projects in their tenant') THEN
    CREATE POLICY "Users can delete projects in their tenant" ON public.projects
      FOR DELETE USING (
        tenant_id IN (
          SELECT tenant_id 
          FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================
-- 3. TASKS TABLE POLICIES
-- ============================================

-- Drop old policies if they exist
DO $$ 
BEGIN
  IF policy_exists('tasks', 'Tasks visible to authenticated users') THEN
    DROP POLICY "Tasks visible to authenticated users" ON public.tasks;
  END IF;
  
  IF policy_exists('tasks', 'Users can view tasks') THEN
    DROP POLICY "Users can view tasks" ON public.tasks;
  END IF;
END $$;

-- Create new policies only if they don't exist
DO $$ 
BEGIN
  IF NOT policy_exists('tasks', 'Users can only view tasks in their tenant') THEN
    CREATE POLICY "Users can only view tasks in their tenant" ON public.tasks
      FOR SELECT USING (
        tenant_id IN (
          SELECT tenant_id 
          FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT policy_exists('tasks', 'Users can create tasks in their tenant') THEN
    CREATE POLICY "Users can create tasks in their tenant" ON public.tasks
      FOR INSERT WITH CHECK (
        tenant_id IN (
          SELECT tenant_id 
          FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT policy_exists('tasks', 'Users can update tasks in their tenant') THEN
    CREATE POLICY "Users can update tasks in their tenant" ON public.tasks
      FOR UPDATE USING (
        tenant_id IN (
          SELECT tenant_id 
          FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT policy_exists('tasks', 'Users can delete tasks in their tenant') THEN
    CREATE POLICY "Users can delete tasks in their tenant" ON public.tasks
      FOR DELETE USING (
        tenant_id IN (
          SELECT tenant_id 
          FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================
-- 4. ENABLE RLS ON ALL CRITICAL TABLES
-- ============================================

-- Only enable if not already enabled
DO $$ 
BEGIN
  -- Check and enable RLS for each table
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
  
  -- Enable on other tables if they exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_logs') THEN
    ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') THEN
    ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendors') THEN
    ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_invitations') THEN
    ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_tenants') THEN
    ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
    ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================
-- 5. CREATE SECURE TENANT FUNCTION (if not exists)
-- ============================================

CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT tenant_id 
    FROM public.user_tenants 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. USER_TENANTS TABLE POLICIES
-- ============================================

DO $$ 
BEGIN
  IF NOT policy_exists('user_tenants', 'Users can view their own tenant assignments') THEN
    CREATE POLICY "Users can view their own tenant assignments" ON public.user_tenants
      FOR SELECT USING (user_id = auth.uid());
  END IF;
  
  IF NOT policy_exists('user_tenants', 'Admins can manage tenant assignments') THEN
    CREATE POLICY "Admins can manage tenant assignments" ON public.user_tenants
      FOR ALL USING (
        tenant_id IN (
          SELECT tenant_id 
          FROM public.user_tenants 
          WHERE user_id = auth.uid()
            AND role IN ('admin', 'owner')
        )
      );
  END IF;
END $$;

-- ============================================
-- 7. TENANTS TABLE POLICIES
-- ============================================

DO $$ 
BEGIN
  IF NOT policy_exists('tenants', 'Users can view tenants they belong to') THEN
    CREATE POLICY "Users can view tenants they belong to" ON public.tenants
      FOR SELECT USING (
        id IN (
          SELECT tenant_id 
          FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT policy_exists('tenants', 'Only owners can update tenant info') THEN
    CREATE POLICY "Only owners can update tenant info" ON public.tenants
      FOR UPDATE USING (
        id IN (
          SELECT tenant_id 
          FROM public.user_tenants 
          WHERE user_id = auth.uid()
            AND role = 'owner'
        )
      );
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Show all policies after migration
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Show RLS status for all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'projects', 'tasks', 'activity_logs', 
    'documents', 'vendors', 'messages', 'team_invitations',
    'user_tenants', 'tenants'
  )
ORDER BY tablename;

-- Clean up helper function
DROP FUNCTION IF EXISTS policy_exists(text, text);