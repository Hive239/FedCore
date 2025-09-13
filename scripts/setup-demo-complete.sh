#!/bin/bash

# Complete demo setup using both curl (for auth) and psql (for data)

# Configuration
SUPABASE_URL="https://ndvlruqscfjsmpdojtnl.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmxydXFzY2Zqc21wZG9qdG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM0MDkxOCwiZXhwIjoyMDY3OTE2OTE4fQ.FUHyTqcKz98F1l8dpLMb4zvn-v_S0MWDQ4g8SGiun8k"
DB_HOST="db.ndvlruqscfjsmpdojtnl.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
DB_PASSWORD="ProjectPro123!"

echo "=== Complete Demo Account Setup ==="
echo ""

# Step 1: Create auth user via API
echo "Step 1: Creating auth user via API..."
USER_RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@projectpro.com",
    "password": "demo123456",
    "email_confirm": true,
    "user_metadata": {
      "full_name": "Demo User"
    }
  }')

# Extract user ID
USER_ID=$(echo $USER_RESPONSE | grep -o '"id":"[^"]*' | grep -o '[^"]*$' | head -1)

if [ -z "$USER_ID" ]; then
  echo "User might already exist. Checking..."
  
  # Get existing user ID via psql
  USER_ID=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -t -c \
    "SELECT id FROM auth.users WHERE email = 'demo@projectpro.com' LIMIT 1;" | tr -d ' ')
fi

if [ -z "$USER_ID" ]; then
  echo "❌ Failed to create or find user"
  exit 1
fi

echo "✓ User ready with ID: $USER_ID"

# Step 2: Set up data via psql
echo ""
echo "Step 2: Setting up demo data via psql..."

# Create SQL with the actual user ID
cat > /tmp/setup_demo_data.sql << EOF
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

-- Link user to tenant
INSERT INTO public.user_tenants (user_id, tenant_id, role)
VALUES ('$USER_ID', 'demo-tenant-123', 'owner')
ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = 'owner';

-- Create demo projects
INSERT INTO public.pp_projects (name, description, status, tenant_id, created_by, project_address, owner_name, owner_phone)
VALUES 
  (
    'Downtown Office Renovation',
    'Complete renovation of 5,000 sq ft office space including new HVAC, electrical, and modern finishes',
    'active',
    'demo-tenant-123',
    '$USER_ID',
    '123 Main St, Downtown',
    'Tech Startup Inc',
    '555-0123'
  ),
  (
    'Retail Store Build-Out',
    'New construction of 3,000 sq ft retail space with custom fixtures and lighting',
    'active',
    'demo-tenant-123',
    '$USER_ID',
    '456 Commerce Blvd',
    'Fashion Retailer LLC',
    '555-0124'
  ),
  (
    'Restaurant Kitchen Upgrade',
    'Commercial kitchen renovation with new equipment and code compliance updates',
    'active',
    'demo-tenant-123',
    '$USER_ID',
    '789 Dining Ave',
    'Gourmet Restaurant Group',
    '555-0125'
  )
ON CONFLICT DO NOTHING;

-- Create some demo tasks
INSERT INTO public.pp_tasks (title, description, status, priority, tenant_id, created_by, project_id)
SELECT 
  'Initial site inspection',
  'Conduct thorough inspection and document existing conditions',
  'pending',
  'high',
  'demo-tenant-123',
  '$USER_ID',
  id
FROM public.pp_projects 
WHERE tenant_id = 'demo-tenant-123' 
LIMIT 1;

-- Verify setup
SELECT 
  'Setup Complete!' as status,
  COUNT(DISTINCT p.id) as projects,
  COUNT(DISTINCT t.id) as tasks
FROM public.pp_projects p
LEFT JOIN public.pp_tasks t ON p.id = t.project_id
WHERE p.tenant_id = 'demo-tenant-123';
EOF

# Run the SQL
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -f /tmp/setup_demo_data.sql

# Clean up
rm -f /tmp/setup_demo_data.sql

echo ""
echo "✅ Demo account setup complete!"
echo "================================"
echo "Email: demo@projectpro.com"
echo "Password: demo123456"
echo "User ID: $USER_ID"
echo ""
echo "You can now login with these credentials at your app!"