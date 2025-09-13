-- Step 1: First, get the user IDs that were created
-- Run this query in Supabase SQL Editor to see your users:
SELECT id, email, created_at 
FROM auth.users 
WHERE email IN (
  'admin@projectpro.com',
  'john@projectpro.com',
  'jane@projectpro.com',
  'bob@projectpro.com',
  'sarah@projectpro.com',
  'mike@projectpro.com'
)
ORDER BY email;

-- Step 2: Copy the IDs from above and replace the placeholders below
-- Then run this query to link users to the tenant:

-- REPLACE THESE WITH ACTUAL USER IDS FROM STEP 1
INSERT INTO public.user_tenants (user_id, tenant_id, role) VALUES 
  -- Replace 'xxx' with the actual ID for admin@projectpro.com
  ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'd0d0d0d0-0000-0000-0000-000000000001', 'owner'),
  
  -- Replace 'xxx' with the actual ID for john@projectpro.com  
  ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'd0d0d0d0-0000-0000-0000-000000000001', 'admin'),
  
  -- Replace 'xxx' with the actual ID for jane@projectpro.com
  ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'd0d0d0d0-0000-0000-0000-000000000001', 'member'),
  
  -- Replace 'xxx' with the actual ID for bob@projectpro.com
  ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'd0d0d0d0-0000-0000-0000-000000000001', 'member'),
  
  -- Replace 'xxx' with the actual ID for sarah@projectpro.com
  ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'd0d0d0d0-0000-0000-0000-000000000001', 'member'),
  
  -- Replace 'xxx' with the actual ID for mike@projectpro.com
  ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'd0d0d0d0-0000-0000-0000-000000000001', 'member')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- Step 3: Verify the links were created
SELECT 
  u.email,
  ut.role,
  t.name as tenant_name
FROM public.user_tenants ut
JOIN auth.users u ON ut.user_id = u.id
JOIN public.tenants t ON ut.tenant_id = t.id
ORDER BY ut.role, u.email;