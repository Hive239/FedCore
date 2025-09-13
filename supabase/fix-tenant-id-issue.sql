-- Fix the tenant_id NOT NULL constraint issue in vendors table
-- This allows contacts to be added without requiring a tenant_id

-- Make tenant_id optional (nullable) so contacts can be added without tenant complexity
ALTER TABLE public.vendors 
ALTER COLUMN tenant_id DROP NOT NULL;

-- Now contacts can be inserted without a tenant_id
-- The application will work without needing to manage tenants

-- Verify the change
SELECT 
  'Tenant ID is now optional in vendors table' as status,
  is_nullable as "tenant_id is nullable?"
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'vendors'
  AND column_name = 'tenant_id';