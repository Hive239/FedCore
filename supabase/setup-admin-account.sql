-- Set up ADMIN@PROJECTPRO.COM as the system administrator
-- This script grants admin access to the Performance monitoring page

-- First, update any existing user to have admin role
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'ADMIN@PROJECTPRO.COM' 
   OR email = 'admin@projectpro.com'
   OR id IN (SELECT id FROM auth.users WHERE email ILIKE '%admin@projectpro%');

-- Also update the current logged in user to have admin role
-- Since you're the only user, this ensures you have access
UPDATE public.profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users LIMIT 1);

-- Verify the update
SELECT id, email, role, full_name 
FROM public.profiles 
WHERE role = 'admin';