-- ============================================
-- FIX: No tenant found for user
-- This assigns users to a default tenant
-- ============================================

-- 1. First, check which users don't have tenant assignments
SELECT 
  u.id as user_id,
  u.email,
  ut.tenant_id,
  CASE 
    WHEN ut.tenant_id IS NULL THEN '❌ NO TENANT'
    ELSE '✅ Has Tenant'
  END as status
FROM auth.users u
LEFT JOIN public.user_tenants ut ON u.id = ut.user_id
ORDER BY status, u.email;

-- 2. Create a default tenant if it doesn't exist
INSERT INTO public.tenants (id, name, slug, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Default Organization',
  'default-org',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 3. Get the default tenant ID
DO $$
DECLARE
  default_tenant_id uuid;
  r RECORD;
BEGIN
  -- Get or create default tenant
  SELECT id INTO default_tenant_id
  FROM public.tenants
  WHERE slug = 'default-org'
  LIMIT 1;
  
  -- If no default tenant exists, create one
  IF default_tenant_id IS NULL THEN
    INSERT INTO public.tenants (name, slug, created_at, updated_at)
    VALUES ('Default Organization', 'default-org', NOW(), NOW())
    RETURNING id INTO default_tenant_id;
  END IF;
  
  -- Assign all users without tenants to the default tenant
  FOR r IN 
    SELECT u.id as user_id, u.email
    FROM auth.users u
    LEFT JOIN public.user_tenants ut ON u.id = ut.user_id
    WHERE ut.tenant_id IS NULL
  LOOP
    INSERT INTO public.user_tenants (user_id, tenant_id, role, created_at)
    VALUES (r.user_id, default_tenant_id, 'admin', NOW())
    ON CONFLICT (user_id, tenant_id) DO NOTHING;
    
    RAISE NOTICE 'Assigned user % to default tenant', r.email;
  END LOOP;
  
  RAISE NOTICE 'Default tenant ID: %', default_tenant_id;
END $$;

-- 4. Verify all users now have tenants
SELECT 
  'VERIFICATION: Users with tenant assignments' as info,
  COUNT(*) as total_users,
  COUNT(ut.tenant_id) as users_with_tenant,
  COUNT(*) - COUNT(ut.tenant_id) as users_without_tenant
FROM auth.users u
LEFT JOIN public.user_tenants ut ON u.id = ut.user_id;

-- 5. Show current user-tenant assignments
SELECT 
  u.email,
  t.name as tenant_name,
  ut.role,
  ut.created_at
FROM auth.users u
JOIN public.user_tenants ut ON u.id = ut.user_id
JOIN public.tenants t ON ut.tenant_id = t.id
ORDER BY u.email;

-- 6. IMPORTANT: Update all existing data to use the default tenant
-- This ensures existing projects, tasks, etc. have the correct tenant_id
DO $$
DECLARE
  default_tenant_id uuid;
  r RECORD;
BEGIN
  -- Get the default tenant
  SELECT id INTO default_tenant_id
  FROM public.tenants
  WHERE slug = 'default-org'
  LIMIT 1;
  
  -- Update tables that have tenant_id but might have NULL values
  -- Only update actual tables, not views
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN pg_tables t ON t.tablename = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'tenant_id'
      AND t.schemaname = 'public'  -- This ensures we only get tables, not views
  LOOP
    -- Update NULL tenant_ids to default tenant
    EXECUTE format('
      UPDATE public.%I 
      SET tenant_id = %L 
      WHERE tenant_id IS NULL',
      r.table_name, default_tenant_id
    );
    
    RAISE NOTICE 'Updated NULL tenant_ids in table %', r.table_name;
  END LOOP;
END $$;

-- Final message
SELECT 
  '✅ TENANT FIX COMPLETE' as status,
  'All users now have tenant assignments' as message,
  'You should be able to access the application now' as next_step;