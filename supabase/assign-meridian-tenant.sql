-- ============================================
-- Assign mparish@meridianswl.com to Meridian Contracting
-- ============================================

DO $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_existing_assignment UUID;
BEGIN
  -- Step 1: Find the user (check both possible emails)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email IN ('mparish@meridianswl.com', 'mparish@meridianswfl.com')
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ User not found in auth.users table';
    RAISE NOTICE '';
    RAISE NOTICE 'Checking all existing users...';
    
    -- List all users for debugging
    FOR v_user_id IN 
      SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 10
    LOOP
      RAISE NOTICE 'Found user: % - %', 
        v_user_id, 
        (SELECT email FROM auth.users WHERE id = v_user_id);
    END LOOP;
    
    RAISE NOTICE '';
    RAISE EXCEPTION 'User mparish@meridianswl.com not found. Please check the email address or create the user first.';
  END IF;

  RAISE NOTICE 'Found user: %', v_user_id;

  -- Step 2: Check if Meridian Contracting tenant exists
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE slug = 'meridian-contracting' 
     OR name ILIKE '%meridian%contracting%';

  IF v_tenant_id IS NULL THEN
    -- Create Meridian Contracting tenant
    INSERT INTO public.tenants (
      name, 
      slug, 
      plan, 
      subscription_status,
      settings,
      metadata
    ) VALUES (
      'Meridian Contracting',
      'meridian-contracting',
      'professional', -- Set to professional plan
      'active',
      jsonb_build_object(
        'company_type', 'General Contractor',
        'industry', 'Construction',
        'timezone', 'America/New_York',
        'currency', 'USD',
        'date_format', 'MM/DD/YYYY',
        'features', jsonb_build_object(
          'projects_enabled', true,
          'tasks_enabled', true,
          'calendar_enabled', true,
          'map_enabled', true,
          'reports_enabled', true,
          'ai_enabled', true
        )
      ),
      jsonb_build_object(
        'company_email', 'info@meridianswl.com',
        'company_phone', '',
        'company_website', 'meridianswl.com',
        'employee_count', '10-50',
        'annual_revenue', '1M-10M'
      )
    ) RETURNING id INTO v_tenant_id;
    
    RAISE NOTICE 'Created new tenant: Meridian Contracting (ID: %)', v_tenant_id;
  ELSE
    RAISE NOTICE 'Found existing tenant: % (ID: %)', 
      (SELECT name FROM public.tenants WHERE id = v_tenant_id), v_tenant_id;
  END IF;

  -- Step 3: Check if user is already assigned to this tenant
  SELECT id INTO v_existing_assignment
  FROM public.user_tenants
  WHERE user_id = v_user_id 
    AND tenant_id = v_tenant_id;

  IF v_existing_assignment IS NOT NULL THEN
    -- Update existing assignment to owner role
    UPDATE public.user_tenants
    SET 
      role = 'owner',
      permissions = jsonb_build_object(
        'manage_billing', true,
        'manage_users', true,
        'manage_projects', true,
        'manage_settings', true,
        'delete_tenant', true
      )
    WHERE id = v_existing_assignment;
    
    RAISE NOTICE 'Updated existing assignment to owner role';
  ELSE
    -- Create new assignment as owner
    INSERT INTO public.user_tenants (
      user_id,
      tenant_id,
      role,
      permissions
    ) VALUES (
      v_user_id,
      v_tenant_id,
      'owner',
      jsonb_build_object(
        'manage_billing', true,
        'manage_users', true,
        'manage_projects', true,
        'manage_settings', true,
        'delete_tenant', true
      )
    );
    
    RAISE NOTICE 'Created new owner assignment for user to Meridian Contracting';
  END IF;

  -- Step 4: Ensure user profile exists and is updated
  INSERT INTO public.profiles (
    id,
    email,
    name,
    role,
    phone,
    bio,
    preferences
  ) VALUES (
    v_user_id,
    'mparish@meridianswl.com',
    'Matthew Parish',
    'admin',
    '',
    'Owner at Meridian Contracting',
    jsonb_build_object(
      'default_tenant_id', v_tenant_id,
      'notifications_enabled', true
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    role = 'admin',
    bio = COALESCE(EXCLUDED.bio, profiles.bio),
    preferences = profiles.preferences || jsonb_build_object('default_tenant_id', v_tenant_id),
    updated_at = NOW();

  -- Step 5: Set this as the default tenant for the user
  UPDATE public.user_tenants
  SET is_default = false
  WHERE user_id = v_user_id;

  UPDATE public.user_tenants
  SET is_default = true
  WHERE user_id = v_user_id 
    AND tenant_id = v_tenant_id;

  -- Step 6: Clean up any orphaned data
  -- Remove user from any other tenants where they might be stuck
  DELETE FROM public.user_tenants
  WHERE user_id = v_user_id 
    AND tenant_id != v_tenant_id
    AND tenant_id IN (
      SELECT id FROM public.tenants 
      WHERE name ILIKE '%demo%' 
         OR name ILIKE '%test%'
         OR slug IS NULL
    );

  RAISE NOTICE '';
  RAISE NOTICE '✅ SUCCESS: User mparish@meridianswl.com is now the owner of Meridian Contracting';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - User ID: %', v_user_id;
  RAISE NOTICE '  - Tenant ID: %', v_tenant_id;
  RAISE NOTICE '  - Role: Owner';
  RAISE NOTICE '  - Default Tenant: Yes';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now:';
  RAISE NOTICE '  1. Invite team members to your organization';
  RAISE NOTICE '  2. Create projects and tasks';
  RAISE NOTICE '  3. Manage billing and subscriptions';
  RAISE NOTICE '  4. Configure organization settings';

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error: %', SQLERRM;
END $$;