-- CRITICAL SECURITY FIX: Comprehensive tenant isolation policies
-- This fixes all cross-tenant data access vulnerabilities

-- ============================================
-- 1. FIX PROFILES TABLE - CRITICAL VULNERABILITY
-- ============================================

-- Drop the insecure policy that allows viewing ALL profiles
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by users" ON public.profiles;

-- Create secure tenant-based profile policies
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

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================
-- 2. PROJECTS TABLE - Add tenant isolation
-- ============================================

DROP POLICY IF EXISTS "Projects visible to authenticated users" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects" ON public.projects;

CREATE POLICY "Users can only view projects in their tenant" ON public.projects
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create projects in their tenant" ON public.projects
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update projects in their tenant" ON public.projects
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete projects in their tenant" ON public.projects
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 3. TASKS TABLE - Add tenant isolation
-- ============================================

DROP POLICY IF EXISTS "Tasks visible to authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;

CREATE POLICY "Users can only view tasks in their tenant" ON public.tasks
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks in their tenant" ON public.tasks
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks in their tenant" ON public.tasks
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tasks in their tenant" ON public.tasks
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 4. ACTIVITY_LOGS TABLE - Add tenant isolation
-- ============================================

DROP POLICY IF EXISTS "Activity logs visible to authenticated users" ON public.activity_logs;

CREATE POLICY "Users can only view activity logs in their tenant" ON public.activity_logs
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create activity logs in their tenant" ON public.activity_logs
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 5. DOCUMENTS TABLE - Add tenant isolation
-- ============================================

DROP POLICY IF EXISTS "Documents visible to authenticated users" ON public.documents;

CREATE POLICY "Users can only view documents in their tenant" ON public.documents
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload documents to their tenant" ON public.documents
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update documents in their tenant" ON public.documents
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete documents in their tenant" ON public.documents
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 6. VENDORS/CONTACTS TABLE - Add tenant isolation
-- ============================================

DROP POLICY IF EXISTS "Vendors visible to authenticated users" ON public.vendors;

CREATE POLICY "Users can only view vendors in their tenant" ON public.vendors
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create vendors in their tenant" ON public.vendors
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update vendors in their tenant" ON public.vendors
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete vendors in their tenant" ON public.vendors
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 7. MESSAGES TABLE - Add tenant isolation
-- ============================================

DROP POLICY IF EXISTS "Messages visible to authenticated users" ON public.messages;

CREATE POLICY "Users can only view messages in their tenant" ON public.messages
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their tenant" ON public.messages
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 8. TEAM_INVITATIONS TABLE - Add tenant isolation
-- ============================================

DROP POLICY IF EXISTS "Team invitations visible to authenticated users" ON public.team_invitations;

CREATE POLICY "Users can only view invitations for their tenant" ON public.team_invitations
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can create invitations for their tenant" ON public.team_invitations
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- ============================================
-- 9. CREATE FUNCTION FOR SECURE TENANT ACCESS
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
-- 10. CREATE AUDIT LOG FOR SECURITY
-- ============================================

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  tenant_id uuid REFERENCES public.tenants(id),
  action text NOT NULL,
  table_name text,
  record_id uuid,
  attempted_tenant_id uuid,
  success boolean DEFAULT false,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs for their tenant
CREATE POLICY "Admins can view audit logs" ON public.security_audit_log
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- ============================================
-- 11. CREATE TRIGGER FOR CROSS-TENANT ACCESS ATTEMPTS
-- ============================================

CREATE OR REPLACE FUNCTION log_cross_tenant_access_attempt()
RETURNS trigger AS $$
BEGIN
  -- Check if user is trying to access data from another tenant
  IF NEW.tenant_id NOT IN (
    SELECT tenant_id 
    FROM public.user_tenants 
    WHERE user_id = auth.uid()
  ) THEN
    -- Log the attempted access
    INSERT INTO public.security_audit_log (
      user_id,
      tenant_id,
      action,
      table_name,
      record_id,
      attempted_tenant_id,
      success,
      error_message
    ) VALUES (
      auth.uid(),
      (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid() LIMIT 1),
      TG_OP,
      TG_TABLE_NAME,
      NEW.id,
      NEW.tenant_id,
      false,
      'Cross-tenant access attempt blocked'
    );
    
    -- Raise exception to block the operation
    RAISE EXCEPTION 'Unauthorized cross-tenant access attempt';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to critical tables
CREATE TRIGGER check_tenant_access_projects
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION log_cross_tenant_access_attempt();

CREATE TRIGGER check_tenant_access_tasks
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_cross_tenant_access_attempt();

-- ============================================
-- 12. VERIFY POLICIES ARE ENABLED
-- ============================================

-- Ensure RLS is enabled on all critical tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 13. USER_TENANTS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view their tenant assignments" ON public.user_tenants;

CREATE POLICY "Users can view their own tenant assignments" ON public.user_tenants
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage tenant assignments" ON public.user_tenants
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- ============================================
-- 14. TENANTS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view their tenants" ON public.tenants;

CREATE POLICY "Users can view tenants they belong to" ON public.tenants
  FOR SELECT USING (
    id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Only owners can update tenant info" ON public.tenants
  FOR UPDATE USING (
    id IN (
      SELECT tenant_id 
      FROM public.user_tenants 
      WHERE user_id = auth.uid()
        AND role = 'owner'
    )
  );

-- ============================================
-- VERIFICATION QUERY - Run this to check policies
-- ============================================

/*
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
*/

-- ============================================
-- IMPORTANT: Run this SQL in Supabase Dashboard
-- ============================================
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Paste this entire file
-- 3. Click "Run" to apply all security fixes
-- This will immediately secure your multi-tenant system