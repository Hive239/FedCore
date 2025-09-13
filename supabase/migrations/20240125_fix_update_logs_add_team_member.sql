-- Fix migration: Add missing team_member_id column to existing update_logs table

-- Add the team_member_id column if it doesn't exist
ALTER TABLE update_logs 
ADD COLUMN IF NOT EXISTS team_member_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Also add any other potentially missing columns from the original migration
ALTER TABLE update_logs 
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id),
ADD COLUMN IF NOT EXISTS contact_type TEXT;

-- Update the set_update_log_defaults function to handle team_member_id
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
    
    -- Set team_member_id to current user if not set
    IF NEW.team_member_id IS NULL THEN
        NEW.team_member_id := auth.uid();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger only if needed (it already exists, so just update the function)