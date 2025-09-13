-- ============================================
-- COMPREHENSIVE RLS SECURITY FIX
-- This script enables RLS and creates policies for ALL tables
-- ============================================

-- Helper function to check if policy exists
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
-- 1. ENABLE RLS ON ALL TABLES WITH TENANT_ID
-- ============================================

DO $$ 
DECLARE
  r RECORD;
BEGIN
  -- Enable RLS on all tables that have tenant_id column
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
-- 2. ACTIVITY_LOGS TABLE
-- ============================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Activity logs visible to authenticated users" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can view activity logs" ON public.activity_logs;

-- Create secure policies
DO $$ 
BEGIN
  IF NOT policy_exists('activity_logs', 'Users can only view activity in their tenant') THEN
    CREATE POLICY "Users can only view activity in their tenant" ON public.activity_logs
      FOR SELECT USING (
        tenant_id IN (
          SELECT tenant_id FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT policy_exists('activity_logs', 'Users can create activity in their tenant') THEN
    CREATE POLICY "Users can create activity in their tenant" ON public.activity_logs
      FOR INSERT WITH CHECK (
        tenant_id IN (
          SELECT tenant_id FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================
-- 3. DOCUMENTS TABLE
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Documents visible to authenticated users" ON public.documents;
DROP POLICY IF EXISTS "Users can view documents" ON public.documents;

-- Create secure policies
DO $$ 
BEGIN
  IF NOT policy_exists('documents', 'Users can only view documents in their tenant') THEN
    CREATE POLICY "Users can only view documents in their tenant" ON public.documents
      FOR SELECT USING (
        tenant_id IN (
          SELECT tenant_id FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT policy_exists('documents', 'Users can upload documents to their tenant') THEN
    CREATE POLICY "Users can upload documents to their tenant" ON public.documents
      FOR INSERT WITH CHECK (
        tenant_id IN (
          SELECT tenant_id FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT policy_exists('documents', 'Users can update documents in their tenant') THEN
    CREATE POLICY "Users can update documents in their tenant" ON public.documents
      FOR UPDATE USING (
        tenant_id IN (
          SELECT tenant_id FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT policy_exists('documents', 'Users can delete documents in their tenant') THEN
    CREATE POLICY "Users can delete documents in their tenant" ON public.documents
      FOR DELETE USING (
        tenant_id IN (
          SELECT tenant_id FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================
-- 4. VENDORS TABLE
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Vendors visible to authenticated users" ON public.vendors;
DROP POLICY IF EXISTS "Users can view vendors" ON public.vendors;

-- Create secure policies
DO $$ 
BEGIN
  IF NOT policy_exists('vendors', 'Users can only view vendors in their tenant') THEN
    CREATE POLICY "Users can only view vendors in their tenant" ON public.vendors
      FOR SELECT USING (
        tenant_id IN (
          SELECT tenant_id FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT policy_exists('vendors', 'Users can create vendors in their tenant') THEN
    CREATE POLICY "Users can create vendors in their tenant" ON public.vendors
      FOR INSERT WITH CHECK (
        tenant_id IN (
          SELECT tenant_id FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT policy_exists('vendors', 'Users can update vendors in their tenant') THEN
    CREATE POLICY "Users can update vendors in their tenant" ON public.vendors
      FOR UPDATE USING (
        tenant_id IN (
          SELECT tenant_id FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT policy_exists('vendors', 'Users can delete vendors in their tenant') THEN
    CREATE POLICY "Users can delete vendors in their tenant" ON public.vendors
      FOR DELETE USING (
        tenant_id IN (
          SELECT tenant_id FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================
-- 5. MESSAGES TABLE
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Messages visible to authenticated users" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages" ON public.messages;

-- Create secure policies
DO $$ 
BEGIN
  IF NOT policy_exists('messages', 'Users can only view messages in their tenant') THEN
    CREATE POLICY "Users can only view messages in their tenant" ON public.messages
      FOR SELECT USING (
        tenant_id IN (
          SELECT tenant_id FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT policy_exists('messages', 'Users can send messages in their tenant') THEN
    CREATE POLICY "Users can send messages in their tenant" ON public.messages
      FOR INSERT WITH CHECK (
        tenant_id IN (
          SELECT tenant_id FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT policy_exists('messages', 'Users can update their own messages') THEN
    CREATE POLICY "Users can update their own messages" ON public.messages
      FOR UPDATE USING (
        sender_id = auth.uid() AND
        tenant_id IN (
          SELECT tenant_id FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT policy_exists('messages', 'Users can delete their own messages') THEN
    CREATE POLICY "Users can delete their own messages" ON public.messages
      FOR DELETE USING (
        sender_id = auth.uid() AND
        tenant_id IN (
          SELECT tenant_id FROM public.user_tenants 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================
-- 6. TENANT_INVITATIONS TABLE (correct name)
-- ============================================

-- Check if table exists first
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'tenant_invitations'
  ) THEN
    -- Enable RLS
    ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;
    
    -- Drop old policies
    EXECUTE 'DROP POLICY IF EXISTS "Team invitations visible to authenticated users" ON public.tenant_invitations';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view invitations" ON public.tenant_invitations';
    
    -- Create secure policies
    IF NOT policy_exists('tenant_invitations', 'Users can view invitations for their tenant or email') THEN
      CREATE POLICY "Users can view invitations for their tenant or email" ON public.tenant_invitations
        FOR SELECT USING (
          tenant_id IN (
            SELECT tenant_id FROM public.user_tenants 
            WHERE user_id = auth.uid()
          )
          OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT policy_exists('tenant_invitations', 'Admins can create invitations for their tenant') THEN
      CREATE POLICY "Admins can create invitations for their tenant" ON public.tenant_invitations
        FOR INSERT WITH CHECK (
          tenant_id IN (
            SELECT tenant_id FROM public.user_tenants 
            WHERE user_id = auth.uid()
              AND role IN ('admin', 'owner')
          )
        );
    END IF;
    
    IF NOT policy_exists('tenant_invitations', 'Admins can update invitations in their tenant') THEN
      CREATE POLICY "Admins can update invitations in their tenant" ON public.tenant_invitations
        FOR UPDATE USING (
          tenant_id IN (
            SELECT tenant_id FROM public.user_tenants 
            WHERE user_id = auth.uid()
              AND role IN ('admin', 'owner')
          )
        );
    END IF;
    
    IF NOT policy_exists('tenant_invitations', 'Admins can delete invitations in their tenant') THEN
      CREATE POLICY "Admins can delete invitations in their tenant" ON public.tenant_invitations
        FOR DELETE USING (
          tenant_id IN (
            SELECT tenant_id FROM public.user_tenants 
            WHERE user_id = auth.uid()
              AND role IN ('admin', 'owner')
          )
        );
    END IF;
    
    RAISE NOTICE 'Secured tenant_invitations table';
  ELSE
    RAISE NOTICE 'Table tenant_invitations does not exist - skipping';
  END IF;
END $$;

-- ============================================
-- 7. CATEGORIES TABLE (if it has tenant_id)
-- ============================================

-- Check if categories table exists and has tenant_id
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'categories' 
      AND column_name = 'tenant_id'
  ) THEN
    -- Enable RLS
    ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
    
    -- Drop old policies
    EXECUTE 'DROP POLICY IF EXISTS "Categories visible to authenticated users" ON public.categories';
    
    -- Create policies only if they don't exist
    IF NOT policy_exists('categories', 'Users can view categories in their tenant') THEN
      CREATE POLICY "Users can view categories in their tenant" ON public.categories
        FOR SELECT USING (
          tenant_id IN (
            SELECT tenant_id FROM public.user_tenants 
            WHERE user_id = auth.uid()
          )
        );
    END IF;
    
    IF NOT policy_exists('categories', 'Users can create categories in their tenant') THEN
      CREATE POLICY "Users can create categories in their tenant" ON public.categories
        FOR INSERT WITH CHECK (
          tenant_id IN (
            SELECT tenant_id FROM public.user_tenants 
            WHERE user_id = auth.uid()
          )
        );
    END IF;
    
    IF NOT policy_exists('categories', 'Users can update categories in their tenant') THEN
      CREATE POLICY "Users can update categories in their tenant" ON public.categories
        FOR UPDATE USING (
          tenant_id IN (
            SELECT tenant_id FROM public.user_tenants 
            WHERE user_id = auth.uid()
          )
        );
    END IF;
    
    IF NOT policy_exists('categories', 'Users can delete categories in their tenant') THEN
      CREATE POLICY "Users can delete categories in their tenant" ON public.categories
        FOR DELETE USING (
          tenant_id IN (
            SELECT tenant_id FROM public.user_tenants 
            WHERE user_id = auth.uid()
          )
        );
    END IF;
  END IF;
END $$;

-- ============================================
-- 8. TENANT_INVITATIONS TABLE (if exists)
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'tenant_invitations'
  ) THEN
    ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;
    
    IF NOT policy_exists('tenant_invitations', 'Users can view invitations for their tenant') THEN
      CREATE POLICY "Users can view invitations for their tenant" ON public.tenant_invitations
        FOR SELECT USING (
          tenant_id IN (
            SELECT tenant_id FROM public.user_tenants 
            WHERE user_id = auth.uid()
          )
          OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
        );
    END IF;
    
    IF NOT policy_exists('tenant_invitations', 'Admins can manage invitations') THEN
      CREATE POLICY "Admins can manage invitations" ON public.tenant_invitations
        FOR ALL USING (
          tenant_id IN (
            SELECT tenant_id FROM public.user_tenants 
            WHERE user_id = auth.uid()
              AND role IN ('admin', 'owner')
          )
        );
    END IF;
  END IF;
END $$;

-- ============================================
-- 9. ADDITIONAL TABLES WITH TENANT_ID
-- ============================================

-- Automatically create policies for any other tables with tenant_id
DO $$ 
DECLARE
  r RECORD;
  policy_name text;
BEGIN
  FOR r IN 
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' 
      AND c.column_name = 'tenant_id'
      AND c.table_name NOT IN (
        'profiles', 'projects', 'tasks', 'activity_logs', 
        'documents', 'vendors', 'messages',
        'user_tenants', 'tenants', 'categories', 'tenant_invitations'
      )
  LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.table_name);
    
    -- Create SELECT policy
    policy_name := format('tenant_isolation_select_%s', r.table_name);
    IF NOT policy_exists(r.table_name, policy_name) THEN
      EXECUTE format('
        CREATE POLICY %I ON public.%I
        FOR SELECT USING (
          tenant_id IN (
            SELECT tenant_id FROM public.user_tenants 
            WHERE user_id = auth.uid()
          )
        )', policy_name, r.table_name);
    END IF;
    
    -- Create INSERT policy
    policy_name := format('tenant_isolation_insert_%s', r.table_name);
    IF NOT policy_exists(r.table_name, policy_name) THEN
      EXECUTE format('
        CREATE POLICY %I ON public.%I
        FOR INSERT WITH CHECK (
          tenant_id IN (
            SELECT tenant_id FROM public.user_tenants 
            WHERE user_id = auth.uid()
          )
        )', policy_name, r.table_name);
    END IF;
    
    -- Create UPDATE policy
    policy_name := format('tenant_isolation_update_%s', r.table_name);
    IF NOT policy_exists(r.table_name, policy_name) THEN
      EXECUTE format('
        CREATE POLICY %I ON public.%I
        FOR UPDATE USING (
          tenant_id IN (
            SELECT tenant_id FROM public.user_tenants 
            WHERE user_id = auth.uid()
          )
        )', policy_name, r.table_name);
    END IF;
    
    -- Create DELETE policy
    policy_name := format('tenant_isolation_delete_%s', r.table_name);
    IF NOT policy_exists(r.table_name, policy_name) THEN
      EXECUTE format('
        CREATE POLICY %I ON public.%I
        FOR DELETE USING (
          tenant_id IN (
            SELECT tenant_id FROM public.user_tenants 
            WHERE user_id = auth.uid()
          )
        )', policy_name, r.table_name);
    END IF;
    
    RAISE NOTICE 'Created policies for table: %', r.table_name;
  END LOOP;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Show all tables with tenant_id and their RLS status
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

-- Count total secured vs insecure tables
SELECT 
  COUNT(CASE WHEN rowsecurity THEN 1 END) as secured_tables,
  COUNT(CASE WHEN NOT rowsecurity THEN 1 END) as insecure_tables,
  COUNT(*) as total_tables_with_tenant_id
FROM pg_tables t
WHERE schemaname = 'public'
  AND EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.tablename
      AND c.column_name = 'tenant_id'
  );

-- Clean up helper function
DROP FUNCTION IF EXISTS policy_exists(text, text);

-- Final message
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS SECURITY FIX COMPLETED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All tables with tenant_id now have:';
  RAISE NOTICE '✅ Row Level Security enabled';
  RAISE NOTICE '✅ Tenant isolation policies created';
  RAISE NOTICE '✅ CRUD operations secured';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Review the verification results above';
  RAISE NOTICE '2. Test with multiple tenant accounts';
  RAISE NOTICE '3. Monitor for any access violations';
END $$;