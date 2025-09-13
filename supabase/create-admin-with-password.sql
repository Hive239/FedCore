-- ============================================
-- CREATE ADMIN USER WITH PASSWORD
-- ============================================
-- Replace 'YourSecurePassword123!' with your actual password

DO $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_email TEXT := 'admin@projectpro.com';
  v_password TEXT := 'YourSecurePassword123!'; -- CHANGE THIS PASSWORD!
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;

  IF v_user_id IS NOT NULL THEN
    RAISE NOTICE 'User already exists with ID: %', v_user_id;
    RAISE NOTICE 'To reset password, use Supabase Dashboard > Authentication > Users';
  ELSE
    -- Create new admin user (requires service role key)
    -- This approach works if you have database access
    
    -- First, let's create the user profile entry
    -- The actual auth user should be created via Supabase Dashboard
    
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'ADMIN USER SETUP INSTRUCTIONS';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE '1. Go to Supabase Dashboard > Authentication > Users';
    RAISE NOTICE '2. Click "Add User" > "Create new user"';
    RAISE NOTICE '3. Enter:';
    RAISE NOTICE '   Email: admin@projectpro.com';
    RAISE NOTICE '   Password: [Your secure password]';
    RAISE NOTICE '   Auto Confirm Email: CHECKED';
    RAISE NOTICE '4. Click "Create User"';
    RAISE NOTICE '';
    RAISE NOTICE '5. After creating, come back and run this SQL:';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
  END IF;
END $$;

-- ============================================
-- AFTER CREATING USER IN DASHBOARD, RUN THIS:
-- ============================================

DO $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Get the admin user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'admin@projectpro.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Admin user not found. Please create the user first in Supabase Dashboard.';
  END IF;

  -- Create or update profile
  INSERT INTO public.profiles (id, email, full_name, company)
  VALUES (
    v_user_id, 
    'admin@projectpro.com', 
    'Admin User', 
    'Project Pro Admin'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    company = EXCLUDED.company,
    updated_at = NOW();

  -- Check if tenant exists
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE slug = 'project-pro-admin';

  IF v_tenant_id IS NULL THEN
    -- Create admin tenant
    INSERT INTO public.tenants (name, slug, settings)
    VALUES (
      'Project Pro Admin',
      'project-pro-admin',
      jsonb_build_object(
        'notifications', true,
        'email_updates', true,
        'theme', 'light'
      )
    )
    RETURNING id INTO v_tenant_id;
  END IF;

  -- Link admin to tenant as owner
  INSERT INTO public.user_tenants (user_id, tenant_id, role, is_default)
  VALUES (v_user_id, v_tenant_id, 'owner', true)
  ON CONFLICT (user_id, tenant_id) DO UPDATE
  SET 
    role = 'owner',
    is_default = true;

  -- Add some initial categories for the admin tenant
  INSERT INTO public.categories (tenant_id, name, type, color)
  VALUES 
    (v_tenant_id, 'General', 'project', '#3B82F6'),
    (v_tenant_id, 'Urgent', 'task', '#EF4444'),
    (v_tenant_id, 'Maintenance', 'task', '#F59E0B')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '';
  RAISE NOTICE '✅ SUCCESS! Admin setup complete!';
  RAISE NOTICE 'Email: admin@projectpro.com';
  RAISE NOTICE 'Tenant: Project Pro Admin';
  RAISE NOTICE 'Role: Owner';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now login at http://localhost:3000/login';
  RAISE NOTICE '';
END $$;