-- Create update_logs table for project updates
CREATE TABLE IF NOT EXISTS update_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    team_member_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Update details
    title TEXT NOT NULL,
    description TEXT,
    date DATE DEFAULT CURRENT_DATE,
    
    -- Weather conditions
    weather JSONB DEFAULT '{}',
    
    -- Tasks and issues
    tasks_completed TEXT[] DEFAULT '{}',
    issues TEXT[] DEFAULT '{}',
    
    -- Photos/attachments
    photos TEXT[] DEFAULT '{}',
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_update_logs_project_id ON update_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_update_logs_team_member_id ON update_logs(team_member_id);
CREATE INDEX IF NOT EXISTS idx_update_logs_tenant_id ON update_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_update_logs_date ON update_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_update_logs_created_at ON update_logs(created_at DESC);

-- Enable RLS
ALTER TABLE update_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view update logs in their tenant" ON update_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_tenants
            WHERE user_tenants.user_id = auth.uid()
            AND user_tenants.tenant_id = update_logs.tenant_id
        )
    );

CREATE POLICY "Users can create update logs in their tenant" ON update_logs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_tenants
            WHERE user_tenants.user_id = auth.uid()
            AND user_tenants.tenant_id = update_logs.tenant_id
        )
    );

CREATE POLICY "Users can update their own update logs" ON update_logs
    FOR UPDATE
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own update logs" ON update_logs
    FOR DELETE
    USING (created_by = auth.uid());

-- Function to automatically set tenant_id and created_by
CREATE OR REPLACE FUNCTION set_update_log_defaults()
RETURNS TRIGGER AS $$
BEGIN
    -- Set created_by if not set
    IF NEW.created_by IS NULL THEN
        NEW.created_by := auth.uid();
    END IF;
    
    -- Set tenant_id from user_tenants if not set
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM user_tenants
        WHERE user_id = auth.uid()
        LIMIT 1;
        
        IF NEW.tenant_id IS NULL THEN
            RAISE EXCEPTION 'User must belong to a tenant';
        END IF;
    END IF;
    
    -- Set created_by_name
    SELECT full_name INTO NEW.created_by_name
    FROM profiles
    WHERE id = auth.uid()
    LIMIT 1;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for defaults
CREATE TRIGGER set_update_log_defaults_trigger
    BEFORE INSERT ON update_logs
    FOR EACH ROW
    EXECUTE FUNCTION set_update_log_defaults();

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_update_logs_updated_at
    BEFORE UPDATE ON update_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (optional - remove in production)
-- This will only work if you have existing projects and profiles
/*
INSERT INTO update_logs (
    project_id,
    team_member_id,
    title,
    description,
    weather,
    tasks_completed,
    issues
)
SELECT 
    p.id,
    prof.id,
    'Initial Site Survey',
    'Completed initial site survey and measurements',
    '{"condition": "Clear", "temperature": 72}'::jsonb,
    ARRAY['Site measurements taken', 'Photos documented', 'Initial plans reviewed'],
    ARRAY[]::text[]
FROM projects p
CROSS JOIN profiles prof
LIMIT 1;
*/