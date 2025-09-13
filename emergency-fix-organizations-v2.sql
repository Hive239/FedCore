-- EMERGENCY FIX V2 for Organizations Table Issue
-- Run this immediately in Supabase SQL Editor

-- Drop existing organizations table if it exists (not view)
DROP TABLE IF EXISTS public.organizations CASCADE;

-- Create organizations table with exact same structure as tenants
CREATE TABLE public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    website TEXT,
    industry TEXT,
    size TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active',
    subscription_tier TEXT DEFAULT 'basic',
    max_users INTEGER DEFAULT 10,
    max_projects INTEGER DEFAULT 10,
    project_code_format TEXT,
    project_code_auto_generate BOOLEAN DEFAULT false,
    project_code_next_number INTEGER DEFAULT 1,
    project_code_prefix TEXT,
    subscription_status TEXT DEFAULT 'active',
    trial_ends_at TIMESTAMPTZ,
    billing_email TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    -- Add tenant_id column that references self (for any queries expecting it)
    tenant_id UUID
);

-- Copy ALL data from tenants to organizations
INSERT INTO public.organizations (
    id, name, slug, logo_url, website, industry, size, settings,
    created_at, updated_at, status, subscription_tier, max_users, max_projects,
    project_code_format, project_code_auto_generate, project_code_next_number,
    project_code_prefix, subscription_status, trial_ends_at, billing_email,
    stripe_customer_id, stripe_subscription_id, tenant_id
)
SELECT 
    id, name, slug, logo_url, website, industry, size, settings,
    created_at, updated_at, status, subscription_tier, max_users, max_projects,
    project_code_format, project_code_auto_generate, project_code_next_number,
    project_code_prefix, subscription_status, trial_ends_at, billing_email,
    stripe_customer_id, stripe_subscription_id, 
    id as tenant_id  -- Self-reference for any queries expecting tenant_id
FROM public.tenants;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT SELECT ON public.organizations TO anon;

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view organizations they belong to" ON public.organizations
    FOR SELECT USING (
        id IN (
            SELECT tenant_id FROM public.user_tenants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update organizations they own" ON public.organizations
    FOR UPDATE USING (
        id IN (
            SELECT tenant_id FROM public.user_tenants 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Create sync trigger to keep organizations in sync with tenants
CREATE OR REPLACE FUNCTION sync_organizations_with_tenants()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.organizations (
            id, name, slug, logo_url, website, industry, size, settings,
            created_at, updated_at, status, subscription_tier, max_users, max_projects,
            project_code_format, project_code_auto_generate, project_code_next_number,
            project_code_prefix, subscription_status, trial_ends_at, billing_email,
            stripe_customer_id, stripe_subscription_id, tenant_id
        )
        VALUES (
            NEW.id, NEW.name, NEW.slug, NEW.logo_url, NEW.website, NEW.industry, 
            NEW.size, NEW.settings, NEW.created_at, NEW.updated_at, NEW.status, 
            NEW.subscription_tier, NEW.max_users, NEW.max_projects,
            NEW.project_code_format, NEW.project_code_auto_generate, NEW.project_code_next_number,
            NEW.project_code_prefix, NEW.subscription_status, NEW.trial_ends_at, NEW.billing_email,
            NEW.stripe_customer_id, NEW.stripe_subscription_id, NEW.id
        )
        ON CONFLICT (id) DO UPDATE SET
            tenant_id = NEW.id,
            updated_at = NOW();
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.organizations 
        SET name = NEW.name, slug = NEW.slug, logo_url = NEW.logo_url, website = NEW.website,
            industry = NEW.industry, size = NEW.size, settings = NEW.settings, updated_at = NEW.updated_at,
            status = NEW.status, subscription_tier = NEW.subscription_tier, max_users = NEW.max_users, 
            max_projects = NEW.max_projects, project_code_format = NEW.project_code_format,
            project_code_auto_generate = NEW.project_code_auto_generate, 
            project_code_next_number = NEW.project_code_next_number,
            project_code_prefix = NEW.project_code_prefix, subscription_status = NEW.subscription_status,
            trial_ends_at = NEW.trial_ends_at, billing_email = NEW.billing_email,
            stripe_customer_id = NEW.stripe_customer_id, stripe_subscription_id = NEW.stripe_subscription_id,
            tenant_id = NEW.id
        WHERE id = NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.organizations WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS sync_organizations_trigger ON public.tenants;
CREATE TRIGGER sync_organizations_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION sync_organizations_with_tenants();

-- Verify the fix
SELECT 
    COUNT(*) as total_organizations,
    COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as organizations_with_tenant_id,
    'V2 Emergency fix complete - organizations table recreated' as status
FROM public.organizations;