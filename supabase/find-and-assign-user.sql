-- ============================================
-- Find and Assign User to Meridian Contracting
-- ============================================

DO $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_user_email TEXT;
  v_existing_assignment UUID;
  rec RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 1: Finding all users in the system';
  RAISE NOTICE '========================================';
  
  -- List ALL users to find the correct one
  FOR rec IN 
    SELECT id, email, created_at 
    FROM auth.users 
    ORDER BY created_at DESC
  LOOP
    RAISE NOTICE 'User: % | Email: % | Created: %', 
      rec.id, rec.email, rec.created_at;
    
    -- Check if this might be our user
    IF rec.email ILIKE '%mparish%' OR rec.email ILIKE '%meridian%' THEN
      v_user_id := rec.id;
      v_user_email := rec.email;
      RAISE NOTICE '>>> FOUND POTENTIAL MATCH: %', rec.email;
    END IF;
  END LOOP;

  IF v_user_id IS NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ No user found with mparish or meridian in email';
    RAISE NOTICE 'Please provide the exact email address from the list above.';
    RETURN;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 2: Using user % (%)', v_user_email, v_user_id;
  RAISE NOTICE '========================================';

  -- Check current tenant assignments
  RAISE NOTICE '';
  RAISE NOTICE 'Current tenant assignments for this user:';
  FOR rec IN 
    SELECT ut.*, t.name as tenant_name, t.slug 
    FROM user_tenants ut
    JOIN tenants t ON t.id = ut.tenant_id
    WHERE ut.user_id = v_user_id
  LOOP
    RAISE NOTICE '  - Tenant: % (%) | Role: %', 
      rec.tenant_name, rec.slug, rec.role;
  END LOOP;

  -- Check if Meridian Contracting tenant exists
  RAISE NOTICE '';
  RAISE NOTICE 'Checking for Meridian Contracting tenant...';
  
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE slug = 'meridian-contracting' 
     OR name ILIKE '%meridian%contracting%'
     OR name = 'Meridian Contracting';

  IF v_tenant_id IS NULL THEN
    -- Create Meridian Contracting tenant
    INSERT INTO public.tenants (
      name, 
      slug, 
      settings
    ) VALUES (
      'Meridian Contracting',
      'meridian-contracting',
      jsonb_build_object(
        'company_type', 'General Contractor',
        'industry', 'Construction',
        'timezone', 'America/New_York',
        'currency', 'USD',
        'date_format', 'MM/DD/YYYY',
        'plan', 'professional',
        'subscription_status', 'active',
        'company_email', 'info@meridianswl.com',
        'company_website', 'meridianswl.com'
      )
    ) RETURNING id INTO v_tenant_id;
    
    RAISE NOTICE '✅ Created new tenant: Meridian Contracting (ID: %)', v_tenant_id;
  ELSE
    RAISE NOTICE '✅ Found existing Meridian Contracting tenant (ID: %)', v_tenant_id;
  END IF;

  -- Check if user is already assigned to this tenant
  SELECT id INTO v_existing_assignment
  FROM public.user_tenants
  WHERE user_id = v_user_id 
    AND tenant_id = v_tenant_id;

  IF v_existing_assignment IS NOT NULL THEN
    -- Update to owner role
    UPDATE public.user_tenants
    SET role = 'owner'
    WHERE id = v_existing_assignment;
    
    RAISE NOTICE '✅ Updated existing assignment to owner role';
  ELSE
    -- Create new assignment as owner
    INSERT INTO public.user_tenants (
      user_id,
      tenant_id,
      role
    ) VALUES (
      v_user_id,
      v_tenant_id,
      'owner'
    );
    
    RAISE NOTICE '✅ Created new owner assignment';
  END IF;

  -- Set as default tenant
  UPDATE public.user_tenants
  SET is_default = false
  WHERE user_id = v_user_id;

  UPDATE public.user_tenants
  SET is_default = true
  WHERE user_id = v_user_id 
    AND tenant_id = v_tenant_id;

  -- Update or create profile
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role
  ) VALUES (
    v_user_id,
    v_user_email,
    'Matthew Parish',
    'admin'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    role = 'admin',
    updated_at = NOW();

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SUCCESS! User assigned to Meridian Contracting';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'User Email: %', v_user_email;
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Tenant ID: %', v_tenant_id;
  RAISE NOTICE 'Role: Owner';
  RAISE NOTICE 'Default Tenant: Yes';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    RAISE NOTICE 'SQL State: %', SQLSTATE;
    RAISE;
END $$;