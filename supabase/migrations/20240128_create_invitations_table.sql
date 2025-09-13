-- Create tenant_invitations table if it doesn't exist
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_tenant_id ON tenant_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON tenant_invitations(email);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON tenant_invitations(invitation_token);

-- Enable RLS
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "tenant_invitations_select_policy" ON tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_insert_policy" ON tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_update_policy" ON tenant_invitations;

-- Create simple RLS policies
CREATE POLICY "tenant_invitations_select_policy" ON tenant_invitations
    FOR SELECT USING (true); -- Allow all authenticated users to read invitations (we'll filter in app)

CREATE POLICY "tenant_invitations_insert_policy" ON tenant_invitations
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM user_tenants 
            WHERE tenant_id = tenant_invitations.tenant_id 
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "tenant_invitations_update_policy" ON tenant_invitations
    FOR UPDATE USING (true); -- Allow updates (for accepting invitations)

-- Grant permissions
GRANT ALL ON tenant_invitations TO authenticated;
GRANT ALL ON tenant_invitations TO anon; -- For signup flow