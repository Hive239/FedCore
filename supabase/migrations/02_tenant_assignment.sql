-- Tenant Assignment for All Users
-- Run this AFTER 01_fix_tenants_table.sql

-- Step 1: Create invitations table
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

-- Step 2: Assign all existing users to default tenant
DO $$
DECLARE
    default_tenant_id UUID;
    user_record RECORD;
    assigned_count INTEGER := 0;
BEGIN
    -- Create or get default tenant
    SELECT id INTO default_tenant_id FROM tenants WHERE name = 'Default Organization' LIMIT 1;
    
    IF default_tenant_id IS NULL THEN
        -- Create default tenant with all required fields
        INSERT INTO tenants (
            name, 
            slug, 
            status, 
            subscription_tier,
            max_users,
            max_projects,
            settings,
            created_at, 
            updated_at
        )
        VALUES (
            'Default Organization', 
            'default-org-' || substr(gen_random_uuid()::text, 1, 8), 
            'active',
            'free',
            100,  -- Allow many users for default org
            100,  -- Allow many projects for default org
            '{}',
            NOW(), 
            NOW()
        )
        RETURNING id INTO default_tenant_id;
        
        RAISE NOTICE 'Created default tenant with ID: %', default_tenant_id;
    ELSE
        RAISE NOTICE 'Using existing default tenant with ID: %', default_tenant_id;
    END IF;
    
    -- Assign each user without a tenant
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
        
        assigned_count := assigned_count + 1;
        RAISE NOTICE 'Assigned user % to default tenant', user_record.email;
        
        -- Create profile if doesn't exist
        INSERT INTO profiles (id, email, full_name, created_at, updated_at)
        VALUES (
            user_record.id,
            user_record.email,
            COALESCE(
                user_record.email::text,
                split_part(user_record.email, '@', 1)
            ),
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Successfully assigned % users to default tenant', assigned_count;
END $$;

-- Step 3: Create function for new user signups
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    invitation_record tenant_invitations;
    new_tenant_id UUID;
    company_name TEXT;
    tenant_slug TEXT;
BEGIN
    -- Check if user already has a tenant
    PERFORM 1 FROM user_tenants WHERE user_id = NEW.id;
    IF FOUND THEN
        RETURN NEW;
    END IF;

    -- Check for invitation
    SELECT * INTO invitation_record
    FROM tenant_invitations
    WHERE email = NEW.email
    AND accepted = false
    AND expires_at > NOW()
    LIMIT 1;

    IF invitation_record.id IS NOT NULL THEN
        -- Add to existing tenant
        INSERT INTO user_tenants (user_id, tenant_id, role, created_at, updated_at)
        VALUES (NEW.id, invitation_record.tenant_id, invitation_record.role, NOW(), NOW())
        ON CONFLICT DO NOTHING;
        
        -- Mark invitation as accepted
        UPDATE tenant_invitations
        SET accepted = true, accepted_at = NOW()
        WHERE id = invitation_record.id;
    ELSE
        -- Create new tenant
        company_name := COALESCE(
            NEW.raw_user_meta_data->>'company_name',
            split_part(NEW.email, '@', 1) || '''s Organization'
        );
        
        tenant_slug := lower(regexp_replace(company_name, '[^a-zA-Z0-9]+', '-', 'g'));
        tenant_slug := tenant_slug || '-' || substr(gen_random_uuid()::text, 1, 8);
        
        INSERT INTO tenants (
            name, 
            slug, 
            status, 
            subscription_tier,
            max_users,
            max_projects,
            created_at, 
            updated_at
        )
        VALUES (
            company_name, 
            tenant_slug, 
            'active',
            'free',
            5,
            10,
            NOW(), 
            NOW()
        )
        RETURNING id INTO new_tenant_id;
        
        -- Make user the owner
        INSERT INTO user_tenants (user_id, tenant_id, role, created_at, updated_at)
        VALUES (NEW.id, new_tenant_id, 'owner', NOW(), NOW())
        ON CONFLICT DO NOTHING;
    END IF;

    -- Create profile
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
        RAISE LOG 'Error in handle_new_user_signup: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_signup();

-- Step 5: Create invite function
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
    -- Check if user already in tenant
    SELECT ut.user_id INTO v_existing_user
    FROM user_tenants ut
    JOIN auth.users u ON ut.user_id = u.id
    WHERE ut.tenant_id = p_tenant_id AND u.email = p_email;
    
    IF v_existing_user IS NOT NULL THEN
        RETURN QUERY SELECT false, 'User is already a member', NULL::TEXT;
        RETURN;
    END IF;
    
    v_invitation_token := gen_random_uuid()::text;
    
    INSERT INTO tenant_invitations (tenant_id, email, role, invited_by, invitation_token)
    VALUES (p_tenant_id, p_email, p_role, p_invited_by, v_invitation_token);
    
    RETURN QUERY SELECT true, 'Invitation sent', v_invitation_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Add missing columns to other tables
ALTER TABLE schedule_events ADD COLUMN IF NOT EXISTS trade TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Step 7: Create indexes
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id ON user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_id ON user_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON tenant_invitations(email);

-- Step 8: Show final results
SELECT 
    u.email as "User Email",
    t.name as "Organization",
    ut.role as "Role",
    ut.created_at::date as "Joined Date"
FROM auth.users u
LEFT JOIN user_tenants ut ON u.id = ut.user_id
LEFT JOIN tenants t ON ut.tenant_id = t.id
ORDER BY u.created_at DESC;