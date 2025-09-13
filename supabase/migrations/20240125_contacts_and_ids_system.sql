-- Contacts and ID System Migration
-- Creates proper contact management with unique IDs

-- =====================================================
-- Contacts Table (for external contacts)
-- =====================================================
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Contact Information
    contact_type TEXT NOT NULL CHECK (contact_type IN ('client', 'vendor', 'subcontractor', 'consultant', 'other')),
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    
    -- Address
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    country TEXT DEFAULT 'USA',
    
    -- Additional Info
    notes TEXT,
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique email per tenant
    UNIQUE(tenant_id, email)
);

-- =====================================================
-- Team Members View (internal users with IDs)
-- =====================================================
CREATE OR REPLACE VIEW team_members AS
SELECT 
    u.id as user_id,
    u.email,
    p.id as profile_id,
    p.full_name,
    p.phone,
    p.avatar_url,
    p.company,
    ut.tenant_id,
    ut.role as team_role,
    ut.created_at as joined_at,
    COALESCE(p.full_name, u.email) as display_name,
    'internal' as contact_type
FROM auth.users u
JOIN profiles p ON p.id = u.id
JOIN user_tenants ut ON ut.user_id = u.id;

-- =====================================================
-- Unified Contacts View (combines internal and external)
-- =====================================================
CREATE OR REPLACE VIEW all_contacts AS
-- Internal team members
SELECT 
    user_id as id,
    tenant_id,
    'internal' as source_type,
    'team_member' as contact_type,
    display_name as name,
    company,
    email,
    phone,
    NULL::TEXT as mobile,
    NULL::TEXT as address_line1,
    NULL::TEXT as address_line2,
    NULL::TEXT as city,
    NULL::TEXT as state,
    NULL::TEXT as zip,
    NULL::TEXT as country,
    team_role::TEXT as notes,
    ARRAY['team', team_role::TEXT]::TEXT[] as tags,
    true as is_active,
    joined_at as created_at
FROM team_members

UNION ALL

-- External contacts
SELECT 
    id,
    tenant_id,
    'external' as source_type,
    contact_type,
    name,
    company,
    email,
    phone,
    mobile,
    address_line1,
    address_line2,
    city,
    state,
    zip,
    country,
    notes,
    tags,
    is_active,
    created_at
FROM contacts;

-- =====================================================
-- Update the update_logs table to support contacts
-- =====================================================
ALTER TABLE update_logs 
    ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id),
    ADD COLUMN IF NOT EXISTS contact_type TEXT;

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_is_active ON contacts(is_active);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);

-- =====================================================
-- Row Level Security
-- =====================================================
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Users can view contacts in their tenant
CREATE POLICY "Users can view contacts in their tenant" ON contacts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_tenants
            WHERE user_tenants.user_id = auth.uid()
            AND user_tenants.tenant_id = contacts.tenant_id
        )
    );

-- Users can create contacts in their tenant
CREATE POLICY "Users can create contacts in their tenant" ON contacts
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_tenants
            WHERE user_tenants.user_id = auth.uid()
            AND user_tenants.tenant_id = contacts.tenant_id
        )
    );

-- Users can update contacts in their tenant
CREATE POLICY "Users can update contacts in their tenant" ON contacts
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_tenants
            WHERE user_tenants.user_id = auth.uid()
            AND user_tenants.tenant_id = contacts.tenant_id
        )
    );

-- Users can delete contacts they created
CREATE POLICY "Users can delete contacts they created" ON contacts
    FOR DELETE
    USING (created_by = auth.uid());

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to get or create a contact
CREATE OR REPLACE FUNCTION get_or_create_contact(
    p_tenant_id UUID,
    p_email TEXT,
    p_name TEXT,
    p_type TEXT DEFAULT 'client',
    p_company TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_contact_id UUID;
BEGIN
    -- Try to find existing contact
    SELECT id INTO v_contact_id
    FROM contacts
    WHERE tenant_id = p_tenant_id
    AND email = p_email
    LIMIT 1;
    
    -- Create if not found
    IF v_contact_id IS NULL THEN
        INSERT INTO contacts (tenant_id, email, name, contact_type, company, created_by)
        VALUES (p_tenant_id, p_email, p_name, p_type, p_company, auth.uid())
        RETURNING id INTO v_contact_id;
    END IF;
    
    RETURN v_contact_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search contacts (internal and external)
CREATE OR REPLACE FUNCTION search_contacts(
    p_tenant_id UUID,
    p_search_term TEXT DEFAULT NULL,
    p_contact_type TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    phone TEXT,
    company TEXT,
    contact_type TEXT,
    source_type TEXT,
    tags TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ac.id,
        ac.name,
        ac.email,
        ac.phone,
        ac.company,
        ac.contact_type,
        ac.source_type,
        ac.tags
    FROM all_contacts ac
    WHERE ac.tenant_id = p_tenant_id
    AND ac.is_active = true
    AND (
        p_search_term IS NULL 
        OR ac.name ILIKE '%' || p_search_term || '%'
        OR ac.email ILIKE '%' || p_search_term || '%'
        OR ac.company ILIKE '%' || p_search_term || '%'
    )
    AND (
        p_contact_type IS NULL 
        OR ac.contact_type = p_contact_type
    )
    ORDER BY 
        CASE WHEN ac.source_type = 'internal' THEN 0 ELSE 1 END,
        ac.name
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Sample Data (Optional - Remove in Production)
-- =====================================================
/*
-- Insert sample external contacts
INSERT INTO contacts (tenant_id, contact_type, name, company, email, phone)
SELECT 
    t.id,
    'client',
    'John Smith',
    'ABC Construction Inc.',
    'john.smith@abcconstruction.com',
    '(555) 123-4567'
FROM tenants t
WHERE t.name = 'Default Organization'
LIMIT 1;

INSERT INTO contacts (tenant_id, contact_type, name, company, email, phone)
SELECT 
    t.id,
    'vendor',
    'Sarah Johnson',
    'Quality Materials Supply',
    'sarah@qualitymaterials.com',
    '(555) 987-6543'
FROM tenants t
WHERE t.name = 'Default Organization'
LIMIT 1;
*/