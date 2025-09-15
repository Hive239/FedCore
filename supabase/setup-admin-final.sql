-- ============================================
-- FINAL ADMIN SETUP SCRIPT
-- ============================================
-- Run this AFTER creating the user in Supabase Dashboard
-- 
-- PREREQUISITES:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" > "Create new user"
-- 3. Enter:
--    - Email: admin@fedcore.com
--    - Password: [Your secure password]
--    - Auto Confirm Email: CHECKED ✓
-- 4. Click "Create User"
-- 5. THEN run this SQL script
-- ============================================

DO $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_email TEXT := 'admin@fedcore.com';
BEGIN
  -- ============================================
  -- STEP 1: Verify user exists
  -- ============================================
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION E'\n\n❌ ERROR: Admin user not found!\n\nPlease complete these steps first:\n1. Go to Supabase Dashboard > Authentication > Users\n2. Click "Add User" > "Create new user"\n3. Enter email: admin@fedcore.com\n4. Enter your chosen password\n5. Check "Auto Confirm Email"\n6. Click "Create User"\n7. Then run this SQL again\n\n';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✓ User found with ID: %', v_user_id;
  
  -- ============================================
  -- STEP 2: Create or update profile
  -- ============================================
  INSERT INTO public.profiles (id, email, full_name, company, phone)
  VALUES (
    v_user_id, 
    v_email, 
    'Admin User', 
    'FEDCORE Admin',
    NULL
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    company = EXCLUDED.company,
    updated_at = NOW();
  
  RAISE NOTICE '✓ Profile created/updated';

  -- ============================================
  -- STEP 3: Create admin tenant (organization)
  -- ============================================
  -- Check if tenant already exists
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE slug = 'project-pro-admin';

  IF v_tenant_id IS NULL THEN
    -- Create new tenant
    INSERT INTO public.tenants (name, slug, settings)
    VALUES (
      'FEDCORE Admin',
      'project-pro-admin',
      jsonb_build_object(
        'notifications', true,
        'email_updates', true,
        'theme', 'light',
        'timezone', 'America/New_York',
        'business_hours', jsonb_build_object(
          'start', '09:00',
          'end', '17:00',
          'days', ARRAY['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
        )
      )
    )
    RETURNING id INTO v_tenant_id;
    
    RAISE NOTICE '✓ Tenant created with ID: %', v_tenant_id;
  ELSE
    RAISE NOTICE '✓ Using existing tenant with ID: %', v_tenant_id;
  END IF;

  -- ============================================
  -- STEP 4: Link admin to tenant as owner
  -- ============================================
  INSERT INTO public.user_tenants (user_id, tenant_id, role, is_default)
  VALUES (v_user_id, v_tenant_id, 'owner', true)
  ON CONFLICT (user_id, tenant_id) DO UPDATE
  SET 
    role = 'owner',
    is_default = true;
  
  RAISE NOTICE '✓ User linked to tenant as owner';

  -- ============================================
  -- STEP 5: Create default categories
  -- ============================================
  -- Project categories
  INSERT INTO public.categories (tenant_id, name, type, color, icon)
  VALUES 
    (v_tenant_id, 'Residential', 'project', '#10B981', 'home'),
    (v_tenant_id, 'Commercial', 'project', '#3B82F6', 'building'),
    (v_tenant_id, 'Industrial', 'project', '#8B5CF6', 'factory'),
    (v_tenant_id, 'Renovation', 'project', '#F59E0B', 'hammer')
  ON CONFLICT DO NOTHING;

  -- Task categories
  INSERT INTO public.categories (tenant_id, name, type, color, icon)
  VALUES 
    (v_tenant_id, 'Urgent', 'task', '#EF4444', 'alert'),
    (v_tenant_id, 'Planning', 'task', '#7C3AED', 'clipboard'),
    (v_tenant_id, 'In Progress', 'task', '#06B6D4', 'clock'),
    (v_tenant_id, 'Review', 'task', '#10B981', 'check')
  ON CONFLICT DO NOTHING;

  -- Vendor categories
  INSERT INTO public.categories (tenant_id, name, type, color, icon)
  VALUES 
    (v_tenant_id, 'Electrical', 'vendor', '#FBBF24', 'zap'),
    (v_tenant_id, 'Plumbing', 'vendor', '#06B6D4', 'droplet'),
    (v_tenant_id, 'HVAC', 'vendor', '#8B5CF6', 'wind'),
    (v_tenant_id, 'General Contractor', 'vendor', '#10B981', 'tool')
  ON CONFLICT DO NOTHING;

  -- Document categories
  INSERT INTO public.categories (tenant_id, name, type, color)
  VALUES 
    (v_tenant_id, 'Contracts', 'document', '#EF4444'),
    (v_tenant_id, 'Permits', 'document', '#3B82F6'),
    (v_tenant_id, 'Invoices', 'document', '#10B981'),
    (v_tenant_id, 'Plans', 'document', '#F59E0B')
  ON CONFLICT DO NOTHING;

  -- Event categories
  INSERT INTO public.categories (tenant_id, name, type, color)
  VALUES 
    (v_tenant_id, 'Site Visit', 'event', '#3B82F6'),
    (v_tenant_id, 'Client Meeting', 'event', '#10B981'),
    (v_tenant_id, 'Inspection', 'event', '#EF4444'),
    (v_tenant_id, 'Delivery', 'event', '#F59E0B')
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE '✓ Default categories created';

  -- ============================================
  -- STEP 6: Create welcome notification
  -- ============================================
  INSERT INTO public.notifications (
    user_id, 
    tenant_id, 
    title, 
    message, 
    type, 
    is_read
  ) VALUES (
    v_user_id,
    v_tenant_id,
    'Welcome to FEDCORE!',
    'Your admin account has been successfully set up. Start by creating your first project or inviting team members.',
    'success',
    false
  );
  
  RAISE NOTICE '✓ Welcome notification created';

  -- ============================================
  -- STEP 7: Log the setup activity
  -- ============================================
  INSERT INTO public.activity_logs (
    tenant_id,
    user_id,
    action,
    entity_type,
    entity_id,
    entity_name,
    details
  ) VALUES (
    v_tenant_id,
    v_user_id,
    'created',
    'admin_account',
    v_user_id,
    'Admin Account Setup',
    jsonb_build_object(
      'email', v_email,
      'tenant', 'FEDCORE Admin',
      'role', 'owner',
      'setup_date', NOW()
    )
  );
  
  RAISE NOTICE '✓ Activity logged';

  -- ============================================
  -- SUCCESS MESSAGE
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 ADMIN SETUP COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Admin Email: %', v_email;
  RAISE NOTICE 'Tenant: FEDCORE Admin';
  RAISE NOTICE 'Role: Owner (Full Access)';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now login at:';
  RAISE NOTICE 'http://localhost:3000/login';
  RAISE NOTICE '';
  RAISE NOTICE 'Use the email and password you set in';
  RAISE NOTICE 'the Supabase Dashboard.';
  RAISE NOTICE '========================================';

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION E'\n\n❌ Setup failed: %\n\nMake sure you created the user first in:\nSupabase Dashboard > Authentication > Users\n\n', SQLERRM;
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify the setup worked:

SELECT 
  u.id,
  u.email,
  u.created_at as user_created,
  p.full_name,
  p.company,
  t.name as tenant_name,
  t.slug as tenant_slug,
  ut.role,
  ut.is_default,
  COUNT(DISTINCT c.id) as category_count
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_tenants ut ON u.id = ut.user_id
LEFT JOIN public.tenants t ON ut.tenant_id = t.id
LEFT JOIN public.categories c ON t.id = c.tenant_id
WHERE u.email = 'admin@projectpro.com'
GROUP BY u.id, u.email, u.created_at, p.full_name, p.company, 
         t.name, t.slug, ut.role, ut.is_default;