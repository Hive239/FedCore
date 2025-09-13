-- Fix Organizations Table Issue
-- Run this in Supabase SQL Editor to create the missing organizations table

-- Create organizations table that mirrors tenants structure
CREATE TABLE IF NOT EXISTS public.organizations (
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
    max_projects INTEGER DEFAULT 10
);

-- Copy existing tenant data to organizations table
INSERT INTO public.organizations (
    id, name, slug, logo_url, website, industry, size, settings,
    created_at, updated_at, status, subscription_tier, max_users, max_projects
)
SELECT 
    id, name, slug, logo_url, website, industry, size, settings,
    created_at, updated_at, status, subscription_tier, max_users, max_projects
FROM public.tenants
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    updated_at = NOW();

-- Create sync function to keep organizations in sync with tenants
CREATE OR REPLACE FUNCTION sync_organizations_with_tenants()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.organizations (id, name, slug, logo_url, website, industry, size, settings, created_at, updated_at, status, subscription_tier, max_users, max_projects)
        VALUES (NEW.id, NEW.name, NEW.slug, NEW.logo_url, NEW.website, NEW.industry, NEW.size, NEW.settings, NEW.created_at, NEW.updated_at, NEW.status, NEW.subscription_tier, NEW.max_users, NEW.max_projects)
        ON CONFLICT (id) DO NOTHING;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.organizations 
        SET name = NEW.name, slug = NEW.slug, logo_url = NEW.logo_url, website = NEW.website,
            industry = NEW.industry, size = NEW.size, settings = NEW.settings, updated_at = NEW.updated_at,
            status = NEW.status, subscription_tier = NEW.subscription_tier, max_users = NEW.max_users, max_projects = NEW.max_projects
        WHERE id = NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.organizations WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync organizations with tenants
DROP TRIGGER IF EXISTS sync_organizations_trigger ON public.tenants;
CREATE TRIGGER sync_organizations_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION sync_organizations_with_tenants();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT SELECT ON public.organizations TO anon;

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (same as tenants)
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

-- Verify the table was created and populated
SELECT 
    COUNT(*) as organization_count,
    'Organizations table created successfully' as status
FROM public.organizations;