-- Fix tenant invitations table - check if it exists and add missing columns

-- Create tenant_invitations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tenant_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  token TEXT DEFAULT gen_random_uuid()::text,
  status TEXT DEFAULT 'pending',
  invited_by UUID,
  accepted_by UUID,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);

-- Add token column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tenant_invitations' 
    AND column_name = 'token'
  ) THEN
    ALTER TABLE public.tenant_invitations ADD COLUMN token TEXT DEFAULT gen_random_uuid()::text;
  END IF;
END $$;

-- Create index on token if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.tenant_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_tenant ON public.tenant_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.tenant_invitations(email);

-- Add unique constraint on token if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_type = 'UNIQUE' 
    AND table_name = 'tenant_invitations' 
    AND constraint_name = 'tenant_invitations_token_key'
  ) THEN
    ALTER TABLE public.tenant_invitations ADD CONSTRAINT tenant_invitations_token_key UNIQUE (token);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

-- Create tenant_activity_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tenant_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for activity log
CREATE INDEX IF NOT EXISTS idx_activity_tenant ON public.tenant_activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON public.tenant_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON public.tenant_activity_log(created_at DESC);

-- Grant permissions
GRANT ALL ON public.tenant_invitations TO authenticated;
GRANT ALL ON public.tenant_activity_log TO authenticated;

-- Helper function to get current tenant
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
DECLARE
  tenant_id UUID;
BEGIN
  SELECT ut.tenant_id INTO tenant_id
  FROM public.user_tenants ut
  WHERE ut.user_id = auth.uid()
  AND ut.status = 'active'
  ORDER BY ut.created_at DESC
  LIMIT 1;
  
  RETURN tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check user role in tenant
CREATE OR REPLACE FUNCTION user_has_role_in_tenant(
  check_tenant_id UUID,
  check_role TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_id = auth.uid()
    AND tenant_id = check_tenant_id
    AND role = check_role
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new tenant with owner
CREATE OR REPLACE FUNCTION create_tenant_with_owner(
  tenant_name TEXT,
  tenant_slug TEXT,
  owner_id UUID
)
RETURNS UUID AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Create the tenant
  INSERT INTO public.tenants (name, slug)
  VALUES (tenant_name, tenant_slug)
  RETURNING id INTO new_tenant_id;
  
  -- Add the owner to user_tenants
  INSERT INTO public.user_tenants (user_id, tenant_id, role, status)
  VALUES (owner_id, new_tenant_id, 'owner', 'active');
  
  -- Log the activity
  INSERT INTO public.tenant_activity_log (tenant_id, user_id, action, metadata)
  VALUES (new_tenant_id, owner_id, 'tenant_created', jsonb_build_object('tenant_name', tenant_name));
  
  RETURN new_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;