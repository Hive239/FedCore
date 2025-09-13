-- Complete Tenant Management System for ProjectPro (FIXED VERSION)
-- This handles the policy dependency issue

-- Step 1: Drop existing policies that depend on the role column
DROP POLICY IF EXISTS "Users can view their tenants" ON user_tenants;
DROP POLICY IF EXISTS "Admins can manage tenant users" ON user_tenants;
DROP POLICY IF EXISTS "Users can view their tenant" ON tenants;
DROP POLICY IF EXISTS "Admins can update tenant" ON tenants;
DROP POLICY IF EXISTS "Users can view their tenant's projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects in their tenant" ON projects;
DROP POLICY IF EXISTS "Users can update their tenant's projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their tenant's projects" ON projects;

-- Step 2: Add new columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 5;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_projects INTEGER DEFAULT 10;

-- Step 3: Create invitations table for team member invites
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

-- Step 4: Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    invitation_record tenant_invitations;
    new_tenant_id UUID;
    company_name TEXT;
BEGIN
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
        
        -- Create new tenant
        INSERT INTO tenants (name, slug, status, created_at, updated_at)
        VALUES (
            company_name,
            lower(regexp_replace(company_name, '[^a-zA-Z0-9]+', '-', 'g')),
            'active',
            NOW(),
            NOW()
        )
        ON CONFLICT (slug) DO UPDATE SET slug = tenants.slug || '-' || substr(gen_random_uuid()::text, 1, 8)
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create or replace trigger for new user signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_signup();

-- Step 6: Create function to invite team members
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
    VALUES (p_tenant_id, p_email, p_role, p_invited_by, v_invitation_token)
    ON CONFLICT DO NOTHING;
    
    RETURN QUERY SELECT true, 'Invitation sent successfully', v_invitation_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

-- Step 8: Create new RLS policies for projects
CREATE POLICY "Users can view their tenant's projects" ON projects
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create projects in their tenant" ON projects
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin', 'manager', 'member')
        )
    );

CREATE POLICY "Users can update their tenant's projects" ON projects
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'manager', 'member')
        )
    );

CREATE POLICY "Users can delete their tenant's projects" ON projects
    FOR DELETE USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- Step 9: Create RLS policies for user_tenants
CREATE POLICY "Users can view their tenant members" ON user_tenants
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage tenant users" ON user_tenants
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Step 10: Create RLS policies for tenant_invitations
CREATE POLICY "Users can view their tenant's invitations" ON tenant_invitations
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can create invitations" ON tenant_invitations
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Step 11: Similar policies for other tables
-- Tasks
CREATE POLICY "Users can view their tenant's tasks" ON tasks
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their tenant's tasks" ON tasks
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'manager', 'member')
        )
    );

-- Schedule Events
CREATE POLICY "Users can view their tenant's events" ON schedule_events
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their tenant's events" ON schedule_events
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'manager', 'member')
        )
    );

-- Vendors
CREATE POLICY "Users can view their tenant's vendors" ON vendors
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
        OR created_by = auth.uid()
    );

CREATE POLICY "Users can manage vendors" ON vendors
    FOR ALL USING (
        created_by = auth.uid()
        OR tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'manager', 'member')
        )
    );

-- Step 12: Function to check user permissions
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_tenant_id UUID,
    p_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_value TEXT;
BEGIN
    SELECT role INTO user_role_value
    FROM user_tenants
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;
    
    IF user_role_value IS NULL THEN
        RETURN false;
    END IF;
    
    -- Define permission matrix
    CASE p_permission
        WHEN 'view' THEN
            RETURN true; -- All roles can view
        WHEN 'create' THEN
            RETURN user_role_value IN ('owner', 'admin', 'manager', 'member');
        WHEN 'edit' THEN
            RETURN user_role_value IN ('owner', 'admin', 'manager', 'member');
        WHEN 'delete' THEN
            RETURN user_role_value IN ('owner', 'admin');
        WHEN 'manage_users' THEN
            RETURN user_role_value IN ('owner', 'admin');
        WHEN 'manage_billing' THEN
            RETURN user_role_value = 'owner';
        ELSE
            RETURN false;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 13: Assign existing users to default tenant
DO $$
DECLARE
    default_tenant_id UUID;
BEGIN
    -- Create default tenant if not exists
    INSERT INTO tenants (name, slug, status, created_at, updated_at)
    VALUES ('Default Organization', 'default-organization', 'active', NOW(), NOW())
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO default_tenant_id;
    
    -- If insert didn't return (already exists), get the ID
    IF default_tenant_id IS NULL THEN
        SELECT id INTO default_tenant_id FROM tenants WHERE slug = 'default-organization';
    END IF;
    
    -- Assign all unassigned users to default tenant
    INSERT INTO user_tenants (user_id, tenant_id, role, created_at, updated_at)
    SELECT 
        u.id,
        default_tenant_id,
        'member',
        NOW(),
        NOW()
    FROM auth.users u
    LEFT JOIN user_tenants ut ON u.id = ut.user_id
    WHERE ut.user_id IS NULL
    ON CONFLICT DO NOTHING;
    
    -- Create profiles for users without them
    INSERT INTO profiles (id, email, full_name, created_at, updated_at)
    SELECT 
        u.id,
        u.email,
        COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
        NOW(),
        NOW()
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE p.id IS NULL
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Step 14: Add trade column to schedule_events if it doesn't exist
ALTER TABLE schedule_events ADD COLUMN IF NOT EXISTS trade TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id ON user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_id ON user_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON tenant_invitations(email);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON tenant_invitations(invitation_token);

-- Show results
SELECT 
    u.email,
    t.name as tenant_name,
    ut.role,
    ut.created_at as assigned_at
FROM auth.users u
LEFT JOIN user_tenants ut ON u.id = ut.user_id
LEFT JOIN tenants t ON ut.tenant_id = t.id
ORDER BY u.created_at DESC;