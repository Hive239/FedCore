-- Fix tenant and user_tenants table issues

-- 1. Add is_default column to user_tenants if it doesn't exist
ALTER TABLE public.user_tenants 
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- 2. Ensure tenant_id is optional in projects table (already done but double-check)
ALTER TABLE public.projects 
ALTER COLUMN tenant_id DROP NOT NULL;

-- 3. Create a default tenant if none exists
INSERT INTO public.tenants (name, slug, settings)
VALUES ('Default Organization', 'default-organization', '{}')
ON CONFLICT (slug) DO NOTHING;

-- 4. Check if profiles table exists, create if not
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  company TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create profiles for existing users if they don't have one
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 6. Fix any foreign key issues by updating user_tenants to reference profiles
-- First check if the constraint exists and drop it if needed
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_tenants_user_id_fkey' 
    AND table_name = 'user_tenants'
  ) THEN
    ALTER TABLE public.user_tenants DROP CONSTRAINT user_tenants_user_id_fkey;
  END IF;
END $$;

-- Add the correct foreign key constraint
ALTER TABLE public.user_tenants 
ADD CONSTRAINT user_tenants_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 7. Ensure all authenticated users have a tenant assignment
DO $$
DECLARE
  default_tenant_id UUID;
  user_record RECORD;
BEGIN
  -- Get the default tenant ID
  SELECT id INTO default_tenant_id 
  FROM public.tenants 
  WHERE slug = 'default-organization' 
  LIMIT 1;
  
  -- Assign all users without a tenant to the default tenant
  FOR user_record IN 
    SELECT id FROM auth.users 
    WHERE id NOT IN (SELECT user_id FROM public.user_tenants)
  LOOP
    INSERT INTO public.user_tenants (user_id, tenant_id, role)
    VALUES (user_record.id, default_tenant_id, 'member')
    ON CONFLICT (user_id, tenant_id) DO NOTHING;
  END LOOP;
END $$;

-- 8. Verify the setup
SELECT 
  'Setup complete!' as status,
  (SELECT COUNT(*) FROM public.tenants) as total_tenants,
  (SELECT COUNT(*) FROM public.user_tenants) as total_user_assignments,
  (SELECT COUNT(*) FROM auth.users) as total_users;