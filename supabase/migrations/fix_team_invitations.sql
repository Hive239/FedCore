-- Fix team invitations functionality
-- Add RLS policies for tenant_invitations table

-- Enable RLS if not already enabled
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view invitations for their tenant" ON tenant_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON tenant_invitations;
DROP POLICY IF EXISTS "Users can accept their own invitations" ON tenant_invitations;

-- Create RLS policies for tenant_invitations
CREATE POLICY "Users can view invitations for their tenant" ON tenant_invitations
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

CREATE POLICY "Users can accept their own invitations" ON tenant_invitations
    FOR UPDATE USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON tenant_invitations TO authenticated;

-- Ensure the invite_team_member function has proper permissions
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
    v_can_invite BOOLEAN := false;
BEGIN
    -- Check if the inviting user can invite (owner/admin)
    SELECT EXISTS(
        SELECT 1 FROM user_tenants 
        WHERE user_id = p_invited_by 
        AND tenant_id = p_tenant_id 
        AND role IN ('owner', 'admin')
    ) INTO v_can_invite;
    
    IF NOT v_can_invite THEN
        RETURN QUERY SELECT false, 'You do not have permission to invite team members', NULL::TEXT;
        RETURN;
    END IF;
    
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
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, SQLERRM, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION invite_team_member TO authenticated;