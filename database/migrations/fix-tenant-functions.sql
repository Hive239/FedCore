-- ============================================
-- FIX: Create missing tenant functions for RLS
-- ============================================

-- Drop existing policies that depend on the function (if they exist)
DROP POLICY IF EXISTS tenant_settings_tenant_isolation ON public.tenant_settings;
DROP POLICY IF EXISTS billing_history_tenant_isolation ON public.billing_history;
DROP POLICY IF EXISTS usage_tracking_tenant_isolation ON public.usage_tracking;

-- Create the get_user_tenant_id function
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Try to get tenant_id from the current user's default tenant
    SELECT ut.tenant_id INTO v_tenant_id
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
    AND ut.is_default = true
    LIMIT 1;
    
    -- If no default tenant, get the first available tenant
    IF v_tenant_id IS NULL THEN
        SELECT ut.tenant_id INTO v_tenant_id
        FROM public.user_tenants ut
        WHERE ut.user_id = auth.uid()
        ORDER BY ut.created_at ASC
        LIMIT 1;
    END IF;
    
    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Alternative function that accepts a user_id parameter (useful for triggers)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Try to get tenant_id from the user's default tenant
    SELECT ut.tenant_id INTO v_tenant_id
    FROM public.user_tenants ut
    WHERE ut.user_id = p_user_id
    AND ut.is_default = true
    LIMIT 1;
    
    -- If no default tenant, get the first available tenant
    IF v_tenant_id IS NULL THEN
        SELECT ut.tenant_id INTO v_tenant_id
        FROM public.user_tenants ut
        WHERE ut.user_id = p_user_id
        ORDER BY ut.created_at ASC
        LIMIT 1;
    END IF;
    
    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if user belongs to a tenant
CREATE OR REPLACE FUNCTION public.user_has_tenant_access(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_tenants
        WHERE user_id = auth.uid()
        AND tenant_id = p_tenant_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to get user's role in a tenant
CREATE OR REPLACE FUNCTION public.get_user_tenant_role(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role
    FROM public.user_tenants
    WHERE user_id = auth.uid()
    AND tenant_id = p_tenant_id
    LIMIT 1;
    
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Now recreate the RLS policies with the proper function
-- Policy for tenant_settings
CREATE POLICY tenant_settings_tenant_isolation ON public.tenant_settings
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id 
            FROM public.user_tenants 
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id 
            FROM public.user_tenants 
            WHERE user_id = auth.uid()
        )
    );

-- Policy for billing_history (only admins and owners can view)
CREATE POLICY billing_history_tenant_isolation ON public.billing_history
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id 
            FROM public.user_tenants 
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY billing_history_tenant_write ON public.billing_history
    FOR INSERT
    USING (false) -- Only system can insert billing records
    WITH CHECK (false);

-- Policy for usage_tracking
CREATE POLICY usage_tracking_tenant_isolation ON public.usage_tracking
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id 
            FROM public.user_tenants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY usage_tracking_tenant_write ON public.usage_tracking
    FOR INSERT
    USING (
        tenant_id IN (
            SELECT tenant_id 
            FROM public.user_tenants 
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id 
            FROM public.user_tenants 
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_tenant_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_role(UUID) TO authenticated;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_default 
    ON public.user_tenants(user_id, is_default) 
    WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_user_tenants_user_tenant 
    ON public.user_tenants(user_id, tenant_id);

-- Add created_at column to user_tenants if it doesn't exist
ALTER TABLE public.user_tenants 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure at least one user_tenant record is marked as default for each user
UPDATE public.user_tenants ut1
SET is_default = true
WHERE NOT EXISTS (
    SELECT 1 
    FROM public.user_tenants ut2 
    WHERE ut2.user_id = ut1.user_id 
    AND ut2.is_default = true
)
AND ut1.created_at = (
    SELECT MIN(created_at) 
    FROM public.user_tenants ut3 
    WHERE ut3.user_id = ut1.user_id
);

-- Completion message
DO $$
BEGIN
    RAISE NOTICE 'Tenant functions and RLS policies fixed successfully!';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '  - get_user_tenant_id() - Gets current user tenant';
    RAISE NOTICE '  - user_has_tenant_access() - Checks tenant access';
    RAISE NOTICE '  - get_user_tenant_role() - Gets user role in tenant';
END $$;