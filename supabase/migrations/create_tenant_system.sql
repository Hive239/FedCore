-- Complete Tenant Management System
-- This creates the foundation for multi-tenancy across the application

-- 1. Tenants table (organizations/companies)
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  
  -- Organization details
  industry TEXT,
  company_size TEXT CHECK (company_size IN ('small', 'medium', 'large', 'enterprise')),
  website TEXT,
  logo_url TEXT,
  
  -- Contact information
  primary_contact_email TEXT,
  primary_contact_name TEXT,
  phone TEXT,
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'USA',
  postal_code TEXT,
  
  -- Subscription & Billing
  subscription_plan TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'suspended', 'cancelled')),
  trial_ends_at TIMESTAMPTZ,
  
  -- Settings & Preferences
  settings JSONB DEFAULT '{}',
  features JSONB DEFAULT '{}',
  
  -- Limits
  max_users INTEGER DEFAULT 5,
  max_projects INTEGER DEFAULT 10,
  max_storage_gb INTEGER DEFAULT 10,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 2. User-Tenant relationships (which users belong to which tenants)
CREATE TABLE IF NOT EXISTS public.user_tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- User role within the tenant
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer')),
  
  -- Permissions
  permissions JSONB DEFAULT '{}',
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
  
  -- Invitation details (if user was invited)
  invited_by UUID,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure a user can only have one role per tenant
  UNIQUE(user_id, tenant_id)
);

-- 3. Tenant invitations (for inviting new users)
CREATE TABLE IF NOT EXISTS public.tenant_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Invitation details
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member', 'viewer')),
  
  -- Token for invitation link
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  
  -- Metadata
  invited_by UUID,
  accepted_by UUID,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  
  -- Prevent duplicate pending invitations
  UNIQUE(tenant_id, email, status)
);

-- 4. Tenant activity log
CREATE TABLE IF NOT EXISTS public.tenant_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID,
  
  -- Activity details
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  
  -- Additional context
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription ON public.tenants(subscription_status);
CREATE INDEX IF NOT EXISTS idx_user_tenants_user ON public.user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant ON public.user_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_role ON public.user_tenants(role);
CREATE INDEX IF NOT EXISTS idx_invitations_tenant ON public.tenant_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.tenant_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.tenant_invitations(email);
CREATE INDEX IF NOT EXISTS idx_activity_tenant ON public.tenant_activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON public.tenant_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON public.tenant_activity_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Tenants: Users can only see tenants they belong to
DROP POLICY IF EXISTS "Users can view their tenants" ON public.tenants;
CREATE POLICY "Users can view their tenants" ON public.tenants
  FOR SELECT USING (
    id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Tenants: Only owners and admins can update
DROP POLICY IF EXISTS "Admins can update tenants" ON public.tenants;
CREATE POLICY "Admins can update tenants" ON public.tenants
  FOR UPDATE USING (
    id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- User-Tenants: Users can see their own relationships
DROP POLICY IF EXISTS "Users can view their tenant relationships" ON public.user_tenants;
CREATE POLICY "Users can view their tenant relationships" ON public.user_tenants
  FOR SELECT USING (
    user_id = auth.uid() OR
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid() 
      AND ut.role IN ('owner', 'admin')
      AND ut.status = 'active'
    )
  );

-- User-Tenants: Only admins can insert/update/delete
DROP POLICY IF EXISTS "Admins can manage user tenants" ON public.user_tenants;
CREATE POLICY "Admins can manage user tenants" ON public.user_tenants
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- Invitations: Admins can manage invitations for their tenants
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.tenant_invitations;
CREATE POLICY "Admins can manage invitations" ON public.tenant_invitations
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- Activity log: Users can view activity for their tenants
DROP POLICY IF EXISTS "Users can view tenant activity" ON public.tenant_activity_log;
CREATE POLICY "Users can view tenant activity" ON public.tenant_activity_log
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Grant permissions
GRANT ALL ON public.tenants TO authenticated;
GRANT ALL ON public.user_tenants TO authenticated;
GRANT ALL ON public.tenant_invitations TO authenticated;
GRANT ALL ON public.tenant_activity_log TO authenticated;

-- Helper function to get user's current tenant
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

-- Helper function to check if user has role in tenant
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

-- Insert a default tenant and associate with first user (if exists)
DO $$
DECLARE
  default_tenant_id UUID;
  first_user_id UUID;
BEGIN
  -- Check if tenants table is empty
  IF NOT EXISTS (SELECT 1 FROM public.tenants LIMIT 1) THEN
    -- Create default tenant
    INSERT INTO public.tenants (name, slug, subscription_plan)
    VALUES ('Default Organization', 'default-org', 'free')
    RETURNING id INTO default_tenant_id;
    
    -- Get first user from profiles if exists
    SELECT id INTO first_user_id FROM public.profiles LIMIT 1;
    
    -- If we have a user, make them the owner
    IF first_user_id IS NOT NULL THEN
      INSERT INTO public.user_tenants (user_id, tenant_id, role, status, accepted_at)
      VALUES (first_user_id, default_tenant_id, 'owner', 'active', NOW());
    END IF;
  END IF;
END $$;