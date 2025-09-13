#!/bin/bash

# Create demo account using psql direct connection to Supabase

# Database connection details
DB_HOST="db.ndvlruqscfjsmpdojtnl.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
DB_PASSWORD="ProjectPro123!"

echo "Creating demo account using psql..."

# Create a temporary SQL file
cat > /tmp/create_demo_account.sql << 'EOF'
-- Create demo tenant
INSERT INTO public.tenants (id, name, slug, settings)
VALUES (
  'demo-tenant-123',
  'Demo Construction Company',
  'demo-construction',
  jsonb_build_object(
    'theme', 'default',
    'features', ARRAY['projects', 'tasks', 'messaging', 'documents', 'reports', 'map', 'updates']
  )
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, slug = EXCLUDED.slug, settings = EXCLUDED.settings;

-- Create auth user using Supabase's auth functions
-- Note: This requires the auth schema to be accessible
DO $$
DECLARE
  demo_user_id UUID;
BEGIN
  -- Check if user already exists
  SELECT id INTO demo_user_id FROM auth.users WHERE email = 'demo@projectpro.com' LIMIT 1;
  
  IF demo_user_id IS NULL THEN
    -- Create new user (Note: Direct user creation in auth.users might be restricted)
    -- You may need to use Supabase Dashboard or Auth API for this step
    RAISE NOTICE 'User does not exist. Please create via Supabase Dashboard.';
  ELSE
    -- User exists, link to tenant
    INSERT INTO public.user_tenants (user_id, tenant_id, role)
    VALUES (demo_user_id, 'demo-tenant-123', 'owner')
    ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = 'owner';
    
    -- Create demo projects
    INSERT INTO public.pp_projects (name, description, status, tenant_id, created_by, project_address, owner_name, owner_phone)
    VALUES 
      (
        'Downtown Office Renovation',
        'Complete renovation of 5,000 sq ft office space',
        'active',
        'demo-tenant-123',
        demo_user_id,
        '123 Main St, Downtown',
        'Tech Startup Inc',
        '555-0123'
      ),
      (
        'Retail Store Build-Out',
        'New construction of 3,000 sq ft retail space',
        'active',
        'demo-tenant-123',
        demo_user_id,
        '456 Commerce Blvd',
        'Fashion Retailer LLC',
        '555-0124'
      ),
      (
        'Restaurant Kitchen Upgrade',
        'Commercial kitchen renovation',
        'active',
        'demo-tenant-123',
        demo_user_id,
        '789 Dining Ave',
        'Gourmet Restaurant Group',
        '555-0125'
      )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Demo account setup complete for user %', demo_user_id;
  END IF;
END $$;

-- Verify the setup
SELECT 
  t.name as tenant_name,
  u.email,
  ut.role,
  COUNT(p.id) as project_count
FROM public.tenants t
LEFT JOIN public.user_tenants ut ON t.id = ut.tenant_id
LEFT JOIN auth.users u ON ut.user_id = u.id
LEFT JOIN public.pp_projects p ON t.id = p.tenant_id
WHERE t.id = 'demo-tenant-123'
GROUP BY t.name, u.email, ut.role;
EOF

# Run psql command
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -f /tmp/create_demo_account.sql

# Clean up
rm -f /tmp/create_demo_account.sql

echo ""
echo "Note: If the user doesn't exist, you'll need to create it first via:"
echo "1. Supabase Dashboard > Authentication > Users > Add User"
echo "2. Or use the curl script: ./create-demo-with-curl.sh"