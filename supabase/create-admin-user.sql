-- ============================================
-- ADMIN USER CREATION SCRIPT
-- ============================================
-- This script creates an admin user and sets up their tenant
-- Replace the email and password with your desired credentials

-- IMPORTANT: Run this AFTER running complete-production-setup.sql

-- Step 1: Create the admin user in auth.users
-- You'll need to replace 'your-password-here' with your actual password
-- The password will be hashed automatically by Supabase

DO $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Create a new tenant for the admin
  INSERT INTO public.tenants (name, slug, settings)
  VALUES (
    'Project Pro Admin Company',
    'project-pro-admin',
    jsonb_build_object(
      'notifications', true,
      'email_updates', true,
      'theme', 'light',
      'timezone', 'America/New_York'
    )
  )
  RETURNING id INTO v_tenant_id;

  -- Note: The auth.users insert needs to be done through Supabase Auth
  -- You can either:
  -- 1. Use the Supabase Dashboard to create the user
  -- 2. Use the Supabase JS client to sign up
  -- 3. Use the SQL below if you have service role access

  -- Get the user ID (assuming the user was created via signup)
  -- Replace 'admin@projectpro.com' with your email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'admin@projectpro.com'
  LIMIT 1;

  -- If user exists, set them up as admin
  IF v_user_id IS NOT NULL THEN
    -- Ensure profile exists
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
      company = EXCLUDED.company;

    -- Link user to tenant as owner
    INSERT INTO public.user_tenants (user_id, tenant_id, role, is_default)
    VALUES (v_user_id, v_tenant_id, 'owner', true)
    ON CONFLICT (user_id, tenant_id) DO UPDATE
    SET role = 'owner', is_default = true;

    RAISE NOTICE 'Admin user setup completed successfully';
  ELSE
    RAISE NOTICE 'User not found. Please create the user first through Supabase Auth';
  END IF;
END $$;

-- ============================================
-- ALTERNATIVE: Direct user creation (requires service role)
-- ============================================
-- Uncomment and modify this section if you want to create the user directly
-- WARNING: This requires service_role access and should only be used in development

/*
-- Create admin user with specific UUID
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, -- Fixed UUID for admin
  '00000000-0000-0000-0000-000000000000'::uuid,
  'admin@projectpro.com',
  crypt('Admin123!@#', gen_salt('bf')), -- Change this password!
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Admin User"}',
  false,
  'authenticated'
);

-- Create profile for admin
INSERT INTO public.profiles (id, email, full_name, company)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'admin@projectpro.com',
  'Admin User',
  'Project Pro Admin'
);

-- Create tenant
INSERT INTO public.tenants (id, name, slug)
VALUES (
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'Project Pro Admin Company',
  'project-pro-admin'
);

-- Link admin to tenant
INSERT INTO public.user_tenants (user_id, tenant_id, role, is_default)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'owner',
  true
);
*/

-- ============================================
-- QUICK SETUP INSTRUCTIONS
-- ============================================
-- 1. First, create a user through Supabase Dashboard or your app's signup
--    Email: admin@projectpro.com (or your preferred email)
--    Password: [Your secure password]
--
-- 2. Then run this SQL to make them an admin:

/*
DO $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID := 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
BEGIN
  -- Get the user ID by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'admin@projectpro.com'; -- Change to your email

  IF v_user_id IS NOT NULL THEN
    -- Create/update profile
    INSERT INTO public.profiles (id, email, full_name, company)
    VALUES (v_user_id, 'admin@projectpro.com', 'Admin User', 'Project Pro')
    ON CONFLICT (id) DO UPDATE
    SET full_name = 'Admin User', company = 'Project Pro';

    -- Create tenant if not exists
    INSERT INTO public.tenants (id, name, slug)
    VALUES (v_tenant_id, 'Project Pro Admin', 'project-pro-admin')
    ON CONFLICT (id) DO NOTHING;

    -- Make user owner of tenant
    INSERT INTO public.user_tenants (user_id, tenant_id, role, is_default)
    VALUES (v_user_id, v_tenant_id, 'owner', true)
    ON CONFLICT (user_id, tenant_id) DO UPDATE
    SET role = 'owner', is_default = true;

    RAISE NOTICE 'Admin setup complete for user ID: %', v_user_id;
  ELSE
    RAISE EXCEPTION 'User not found. Please sign up first.';
  END IF;
END $$;
*/