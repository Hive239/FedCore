-- Set admin role for Matthew Parish (mparish@meridianswfl.com)
-- This grants access to the Performance monitoring page

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'mparish@meridianswfl.com';

-- If the email doesn't exist, you can update by user ID instead
-- Find your user ID from the Supabase dashboard Auth section
-- Then uncomment and run:
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE id = 'YOUR-USER-ID-HERE';