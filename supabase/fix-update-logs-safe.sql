-- ============================================
-- SAFE UPDATE LOGS TABLE SETUP
-- Handles existing objects gracefully
-- ============================================

-- 1. Create table only if it doesn't exist
CREATE TABLE IF NOT EXISTS public.update_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  photos TEXT[], -- Array of photo URLs
  team_members UUID[], -- Array of team member IDs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create or replace the function (safe to run multiple times)
CREATE OR REPLACE FUNCTION public.set_update_log_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Set tenant_id from user's tenant if not provided
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO NEW.tenant_id 
    FROM user_tenants 
    WHERE user_id = auth.uid() 
    LIMIT 1;
  END IF;
  
  -- Set user_id if not provided
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Drop and recreate trigger to ensure it's up to date
DROP TRIGGER IF EXISTS set_update_log_defaults_trigger ON public.update_logs;
CREATE TRIGGER set_update_log_defaults_trigger
  BEFORE INSERT OR UPDATE ON public.update_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_update_log_defaults();

-- 4. Enable RLS if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'update_logs' 
    AND schemaname = 'public'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.update_logs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 5. Drop existing policies and recreate (safe approach)
DROP POLICY IF EXISTS "Users can view update logs in their tenant" ON public.update_logs;
DROP POLICY IF EXISTS "Users can insert update logs in their tenant" ON public.update_logs;
DROP POLICY IF EXISTS "Users can update update logs in their tenant" ON public.update_logs;
DROP POLICY IF EXISTS "Users can delete update logs in their tenant" ON public.update_logs;

-- 6. Create RLS policies
CREATE POLICY "Users can view update logs in their tenant" ON public.update_logs
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert update logs in their tenant" ON public.update_logs
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update update logs in their tenant" ON public.update_logs
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete update logs in their tenant" ON public.update_logs
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- 7. Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-photos', 'project-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 8. Storage policies (drop and recreate)
DROP POLICY IF EXISTS "Public can view project photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload project photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own project photos" ON storage.objects;

CREATE POLICY "Public can view project photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-photos');

CREATE POLICY "Users can upload project photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-photos' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete own project photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 9. Verification
SELECT 
  '✅ UPDATE LOGS SETUP COMPLETE' as status,
  COUNT(*) as total_update_logs
FROM update_logs;

SELECT 
  'Storage bucket: ' || id as bucket_status
FROM storage.buckets 
WHERE id = 'project-photos';

-- 10. Show all policies
SELECT 
  'POLICIES CREATED:' as info,
  tablename,
  policyname
FROM pg_policies 
WHERE tablename = 'update_logs' 
  AND schemaname = 'public'
ORDER BY policyname;