-- Complete Tenant Management Setup for ProjectPro
-- This version checks for existing columns and creates them if needed

-- Step 1: Clean up any existing policies
DROP POLICY IF EXISTS "Users can view their tenants" ON user_tenants;
DROP POLICY IF EXISTS "Admins can manage tenant users" ON user_tenants;
DROP POLICY IF EXISTS "Users can view their tenant" ON tenants;
DROP POLICY IF EXISTS "Admins can update tenant" ON tenants;
DROP POLICY IF EXISTS "Users can view their tenant's projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects in their tenant" ON projects;
DROP POLICY IF EXISTS "Users can update their tenant's projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their tenant's projects" ON projects;

-- Step 2: Add role column to user_tenants if it doesn't exist
ALTER TABLE user_tenants ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'member';

-- Step 3: Add columns to tenants table if they don't exist
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 5;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_projects INTEGER DEFAULT 10;

-- Step 4: Create unique index on slug if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug) WHERE slug IS NOT NULL;

-- Step 5: Create invitations table
CREATE TABLE IF NOT EXISTS tenant_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    invited_by UUID REFERENCES auth.users(id),
    invitation_token VARCHAR(255) UNIQUE DEFAULT gen_random_uuid()::text,
    accepted BOOLEAN DEFAULT false,
    accepted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Create or replace the signup handler function
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    invitation_record tenant_invitations;
    new_tenant_id UUID;
    company_name TEXT;
    tenant_slug TEXT;
BEGIN
    -- Check if user already has a tenant (in case trigger runs multiple times)
    PERFORM 1 FROM user_tenants WHERE user_id = NEW.id;
    IF FOUND THEN
        RETURN NEW;
    END IF;

    -- Check if user has a pending invitation
    SELECT * INTO invitation_record
    FROM tenant_invitations
    WHERE email = NEW.email
    AND accepted = false
    AND expires_at > NOW()
    LIMIT 1;

    IF invitation_record.id IS NOT NULL THEN
        -- User has invitation - add them to existing tenant
        INSERT INTO user_tenants (user_id, tenant_id, role, created_at, updated_at)
        VALUES (NEW.id, invitation_record.tenant_id, invitation_record.role, NOW(), NOW())
        ON CONFLICT DO NOTHING;
        
        -- Mark invitation as accepted
        UPDATE tenant_invitations
        SET accepted = true, accepted_at = NOW()
        WHERE id = invitation_record.id;
    ELSE
        -- No invitation - create new tenant for user
        company_name := COALESCE(
            NEW.raw_user_meta_data->>'company_name',
            split_part(NEW.email, '@', 1) || '''s Organization'
        );
        
        -- Generate unique slug
        tenant_slug := lower(regexp_replace(company_name, '[^a-zA-Z0-9]+', '-', 'g'));
        tenant_slug := tenant_slug || '-' || substr(gen_random_uuid()::text, 1, 8);
        
        -- Create new tenant
        INSERT INTO tenants (name, slug, status, created_at, updated_at)
        VALUES (company_name, tenant_slug, 'active', NOW(), NOW())
        RETURNING id INTO new_tenant_id;
        
        -- Make user the owner of the new tenant
        INSERT INTO user_tenants (user_id, tenant_id, role, created_at, updated_at)
        VALUES (NEW.id, new_tenant_id, 'owner', NOW(), NOW())
        ON CONFLICT DO NOTHING;
    END IF;

    -- Create user profile if it doesn't exist
    INSERT INTO profiles (id, email, full_name, avatar_url, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the signup
        RAISE LOG 'Error in handle_new_user_signup: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create or replace trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_signup();

-- Step 8: Create invite function
CREATE OR REPLACE FUNCTION invite_team_member(
    p_tenant_id UUID,
    p_email VARCHAR(255),
    p_role VARCHAR(50),
    p_invited_by UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    invitation_token TEXT
) AS $$
DECLARE
    v_invitation_token TEXT;
    v_existing_user UUID;
BEGIN
    -- Check if user already exists in the tenant
    SELECT ut.user_id INTO v_existing_user
    FROM user_tenants ut
    JOIN auth.users u ON ut.user_id = u.id
    WHERE ut.tenant_id = p_tenant_id AND u.email = p_email;
    
    IF v_existing_user IS NOT NULL THEN
        RETURN QUERY SELECT false, 'User is already a member of this organization', NULL::TEXT;
        RETURN;
    END IF;
    
    -- Generate invitation token
    v_invitation_token := gen_random_uuid()::text;
    
    -- Create invitation
    INSERT INTO tenant_invitations (tenant_id, email, role, invited_by, invitation_token)
    VALUES (p_tenant_id, p_email, p_role, p_invited_by, v_invitation_token);
    
    RETURN QUERY SELECT true, 'Invitation sent successfully', v_invitation_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Assign all existing users to a default tenant
DO $$
DECLARE
    default_tenant_id UUID;
    user_record RECORD;
    tenant_count INTEGER;
BEGIN
    -- Check if we need to create a default tenant
    SELECT COUNT(*) INTO tenant_count FROM tenants WHERE name = 'Default Organization';
    
    IF tenant_count = 0 THEN
        -- Create default tenant
        INSERT INTO tenants (name, slug, status, created_at, updated_at)
        VALUES (
            'Default Organization', 
            'default-org-' || substr(gen_random_uuid()::text, 1, 8), 
            'active', 
            NOW(), 
            NOW()
        )
        RETURNING id INTO default_tenant_id;
    ELSE
        -- Get existing default tenant
        SELECT id INTO default_tenant_id 
        FROM tenants 
        WHERE name = 'Default Organization' 
        LIMIT 1;
    END IF;
    
    -- Process each user without a tenant
    FOR user_record IN 
        SELECT u.id, u.email
        FROM auth.users u
        LEFT JOIN user_tenants ut ON u.id = ut.user_id
        WHERE ut.user_id IS NULL
    LOOP
        -- Assign to default tenant
        INSERT INTO user_tenants (user_id, tenant_id, role, created_at, updated_at)
        VALUES (user_record.id, default_tenant_id, 'member', NOW(), NOW())
        ON CONFLICT DO NOTHING;
        
        -- Create profile if doesn't exist
        INSERT INTO profiles (id, email, full_name, created_at, updated_at)
        VALUES (
            user_record.id,
            user_record.email,
            split_part(user_record.email, '@', 1),
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Assigned user % to default tenant', user_record.email;
    END LOOP;
END $$;

-- Step 10: Enable RLS on tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

-- Step 11: Create basic RLS policies for projects
CREATE POLICY "Users can view their tenant's projects" ON projects
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create projects" ON projects
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin', 'member')
        )
    );

CREATE POLICY "Users can update projects" ON projects
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'member')
        )
    );

CREATE POLICY "Admins can delete projects" ON projects
    FOR DELETE USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- Step 12: Policies for user_tenants
CREATE POLICY "Users can view tenant members" ON user_tenants
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage users" ON user_tenants
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Step 13: Basic policies for other tables
CREATE POLICY "Users can view tasks" ON tasks
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage tasks" ON tasks
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'member')
        )
    );

CREATE POLICY "Users can view events" ON schedule_events
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage events" ON schedule_events
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'member')
        )
    );

-- Simplified vendor policies (vendors may not have tenant_id)
CREATE POLICY "All users can view vendors" ON vendors
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "All users can manage vendors" ON vendors
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Step 14: Add missing columns
ALTER TABLE schedule_events ADD COLUMN IF NOT EXISTS trade TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Step 15: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id ON user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_id ON user_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON tenant_invitations(email);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON tenant_invitations(invitation_token);

-- Step 16: Display results
SELECT 
    u.email as "User Email",
    t.name as "Organization",
    ut.role as "Role",
    CASE 
        WHEN ut.tenant_id IS NULL THEN 'Not Assigned'
        ELSE 'Assigned'
    END as "Status",
    ut.created_at as "Assigned Date"
FROM auth.users u
LEFT JOIN user_tenants ut ON u.id = ut.user_id
LEFT JOIN tenants t ON ut.tenant_id = t.id
ORDER BY u.created_at DESC;