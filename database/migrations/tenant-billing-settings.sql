-- ============================================
-- TENANT BILLING AND SETTINGS TABLES
-- ============================================

-- Add subscription tier to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'professional', 'enterprise', 'enterprise_plus')),
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'paused')),
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS billing_email TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Tenant Settings Table
CREATE TABLE IF NOT EXISTS public.tenant_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Contact Information
    contact_email TEXT,
    contact_phone TEXT,
    support_email TEXT,
    website TEXT,
    
    -- Address
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'US',
    
    -- Business Information
    tax_id TEXT,
    business_type TEXT,
    industry TEXT,
    employee_count TEXT,
    
    -- Feature Flags
    features JSONB DEFAULT '{
        "projects_enabled": true,
        "tasks_enabled": true,
        "invoicing_enabled": true,
        "documents_enabled": true,
        "messaging_enabled": true,
        "calendar_enabled": true,
        "reports_enabled": true,
        "ai_features_enabled": true
    }'::jsonb,
    
    -- Preferences
    preferences JSONB DEFAULT '{
        "timezone": "America/New_York",
        "date_format": "MM/DD/YYYY",
        "currency": "USD",
        "language": "en",
        "fiscal_year_start": 1,
        "week_starts_on": 0
    }'::jsonb,
    
    -- Usage Limits (based on subscription)
    limits JSONB DEFAULT '{
        "max_users": 10,
        "max_projects": 25,
        "max_storage_gb": 10,
        "max_api_calls_per_month": 5000
    }'::jsonb,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id)
);

-- Billing History Table
CREATE TABLE IF NOT EXISTS public.billing_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Invoice Details
    invoice_number TEXT NOT NULL,
    stripe_invoice_id TEXT,
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT NOT NULL CHECK (status IN ('draft', 'pending', 'paid', 'failed', 'refunded', 'canceled')),
    
    -- Billing Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Payment Details
    payment_method TEXT,
    paid_at TIMESTAMPTZ,
    
    -- Line Items
    line_items JSONB,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage Tracking Table (for billing calculations)
CREATE TABLE IF NOT EXISTS public.usage_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Usage Metrics
    metric_type TEXT NOT NULL CHECK (metric_type IN ('users', 'projects', 'storage_gb', 'api_calls', 'ai_requests')),
    quantity DECIMAL(10, 2) NOT NULL,
    
    -- Time Period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Metadata
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription Plans Table (for reference)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('starter', 'professional', 'enterprise', 'enterprise_plus')),
    
    -- Pricing
    monthly_price_cents INTEGER NOT NULL,
    annual_price_cents INTEGER NOT NULL,
    per_user BOOLEAN DEFAULT true,
    
    -- Features and Limits
    features JSONB NOT NULL,
    limits JSONB NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (plan_id, name, tier, monthly_price_cents, annual_price_cents, features, limits) VALUES
('starter_monthly', 'Starter', 'starter', 2900, 27900, 
    '{"users": 10, "projects": 25, "storage": 10, "api_calls": 5000, "support": "Email", "analytics": "Basic", "integrations": "Standard", "custom_fields": false, "sso": false}'::jsonb,
    '{"max_users": 10, "max_projects": 25, "max_storage_gb": 10, "max_api_calls_per_month": 5000}'::jsonb),
('professional_monthly', 'Professional', 'professional', 5900, 56600,
    '{"users": 50, "projects": -1, "storage": 100, "api_calls": 10000, "support": "Priority", "analytics": "Advanced", "integrations": "All", "custom_fields": true, "sso": false}'::jsonb,
    '{"max_users": 50, "max_projects": -1, "max_storage_gb": 100, "max_api_calls_per_month": 10000}'::jsonb),
('enterprise_monthly', 'Enterprise', 'enterprise', 9900, 95000,
    '{"users": -1, "projects": -1, "storage": 1000, "api_calls": -1, "support": "Dedicated", "analytics": "Full AI Suite", "integrations": "Custom", "custom_fields": true, "sso": true}'::jsonb,
    '{"max_users": -1, "max_projects": -1, "max_storage_gb": 1000, "max_api_calls_per_month": -1}'::jsonb)
ON CONFLICT (plan_id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant ON public.tenant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_tenant ON public.billing_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_status ON public.billing_history(status);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_tenant ON public.usage_tracking(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_type ON public.usage_tracking(metric_type);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON public.usage_tracking(period_start, period_end);

-- Enable RLS
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY tenant_settings_tenant_isolation ON public.tenant_settings
    FOR ALL
    USING (tenant_id = (SELECT get_user_tenant_id()))
    WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));

CREATE POLICY billing_history_tenant_isolation ON public.billing_history
    FOR ALL
    USING (tenant_id = (SELECT get_user_tenant_id()))
    WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));

CREATE POLICY usage_tracking_tenant_isolation ON public.usage_tracking
    FOR ALL
    USING (tenant_id = (SELECT get_user_tenant_id()))
    WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));

-- Function to track usage
CREATE OR REPLACE FUNCTION public.track_usage(
    p_tenant_id UUID,
    p_metric_type TEXT,
    p_quantity DECIMAL
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.usage_tracking (
        tenant_id,
        metric_type,
        quantity,
        period_start,
        period_end
    ) VALUES (
        p_tenant_id,
        p_metric_type,
        p_quantity,
        date_trunc('day', NOW()),
        date_trunc('day', NOW()) + INTERVAL '1 day'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current usage
CREATE OR REPLACE FUNCTION public.get_tenant_usage(p_tenant_id UUID)
RETURNS TABLE (
    users INTEGER,
    projects INTEGER,
    storage_gb DECIMAL,
    api_calls INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT ut.user_id)::INTEGER as users,
        COUNT(DISTINCT p.id)::INTEGER as projects,
        COALESCE(SUM(d.file_size) / 1073741824, 0)::DECIMAL as storage_gb,
        COALESCE((
            SELECT SUM(quantity)::INTEGER 
            FROM usage_tracking 
            WHERE tenant_id = p_tenant_id 
            AND metric_type = 'api_calls'
            AND period_start >= date_trunc('month', NOW())
        ), 0) as api_calls
    FROM tenants t
    LEFT JOIN user_tenants ut ON t.id = ut.tenant_id
    LEFT JOIN projects p ON t.id = p.tenant_id
    LEFT JOIN documents d ON t.id = d.tenant_id
    WHERE t.id = p_tenant_id
    GROUP BY t.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update tenant limits based on subscription
CREATE OR REPLACE FUNCTION public.update_tenant_limits()
RETURNS TRIGGER AS $$
DECLARE
    v_plan subscription_plans%ROWTYPE;
BEGIN
    -- Get the plan details
    SELECT * INTO v_plan
    FROM subscription_plans
    WHERE tier = NEW.subscription_tier
    LIMIT 1;
    
    IF v_plan IS NOT NULL THEN
        -- Update or insert tenant settings with new limits
        INSERT INTO tenant_settings (tenant_id, limits)
        VALUES (NEW.id, v_plan.limits)
        ON CONFLICT (tenant_id) DO UPDATE
        SET limits = v_plan.limits,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_limits_on_subscription_change
    AFTER UPDATE OF subscription_tier ON tenants
    FOR EACH ROW
    WHEN (OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier)
    EXECUTE FUNCTION update_tenant_limits();

-- Grant permissions
GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT ALL ON public.tenant_settings TO authenticated;
GRANT ALL ON public.billing_history TO authenticated;
GRANT ALL ON public.usage_tracking TO authenticated;

-- Completion message
DO $$
BEGIN
    RAISE NOTICE 'Tenant billing and settings tables created successfully!';
    RAISE NOTICE 'Subscription tiers configured: Starter ($29), Professional ($59), Enterprise ($99)';
END $$;