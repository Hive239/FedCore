#!/bin/bash

# Complete demo setup for existing user
SUPABASE_URL="https://ndvlruqscfjsmpdojtnl.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmxydXFzY2Zqc21wZG9qdG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM0MDkxOCwiZXhwIjoyMDY3OTE2OTE4fQ.FUHyTqcKz98F1l8dpLMb4zvn-v_S0MWDQ4g8SGiun8k"

# The user ID from the previous successful creation
USER_ID="f013cb62-e5fb-40ec-a92e-b655505e2b88"

echo "Completing demo setup for existing user..."
echo "User ID: $USER_ID"

# Step 1: Create tenant
echo "1. Creating demo tenant..."
curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/tenants" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{
    "id": "demo-tenant-123",
    "name": "Demo Construction Company",
    "slug": "demo-construction",
    "settings": {
      "theme": "default",
      "features": ["projects", "tasks", "messaging", "documents", "reports", "map", "updates"]
    }
  }'

echo "✓ Tenant created (or already exists)"

# Step 2: Link user to tenant
echo "2. Linking user to tenant..."
curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/user_tenants" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"tenant_id\": \"demo-tenant-123\",
    \"role\": \"owner\"
  }"

echo "✓ User linked to tenant"

# Step 3: Create demo projects
echo "3. Creating demo projects..."
curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/pp_projects" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d "[
    {
      \"name\": \"Downtown Office Renovation\",
      \"description\": \"Complete renovation of 5,000 sq ft office space including new HVAC, electrical, and modern finishes\",
      \"status\": \"active\",
      \"tenant_id\": \"demo-tenant-123\",
      \"created_by\": \"$USER_ID\",
      \"project_address\": \"123 Main St, Downtown\",
      \"owner_name\": \"Tech Startup Inc\",
      \"owner_phone\": \"555-0123\"
    },
    {
      \"name\": \"Retail Store Build-Out\",
      \"description\": \"New construction of 3,000 sq ft retail space with custom fixtures and lighting\",
      \"status\": \"active\",
      \"tenant_id\": \"demo-tenant-123\",
      \"created_by\": \"$USER_ID\",
      \"project_address\": \"456 Commerce Blvd\",
      \"owner_name\": \"Fashion Retailer LLC\",
      \"owner_phone\": \"555-0124\"
    },
    {
      \"name\": \"Restaurant Kitchen Upgrade\",
      \"description\": \"Commercial kitchen renovation with new equipment and code compliance updates\",
      \"status\": \"active\",
      \"tenant_id\": \"demo-tenant-123\",
      \"created_by\": \"$USER_ID\",
      \"project_address\": \"789 Dining Ave\",
      \"owner_name\": \"Gourmet Restaurant Group\",
      \"owner_phone\": \"555-0125\"
    }
  ]"

echo "✓ Demo projects created"

# Step 4: Create some demo tasks
echo "4. Creating demo tasks..."
# First get a project ID
PROJECT_ID=$(curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/pp_projects?tenant_id=eq.demo-tenant-123&limit=1" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "apikey: ${SERVICE_KEY}" | \
  grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$PROJECT_ID" ]; then
  curl -s -X POST \
    "${SUPABASE_URL}/rest/v1/pp_tasks" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d "[
      {
        \"title\": \"Initial site inspection\",
        \"description\": \"Conduct thorough inspection and document existing conditions\",
        \"status\": \"pending\",
        \"priority\": \"high\",
        \"tenant_id\": \"demo-tenant-123\",
        \"created_by\": \"$USER_ID\",
        \"project_id\": \"$PROJECT_ID\"
      },
      {
        \"title\": \"Prepare permit applications\",
        \"description\": \"Complete and submit all required building permits\",
        \"status\": \"in-progress\",
        \"priority\": \"high\",
        \"tenant_id\": \"demo-tenant-123\",
        \"created_by\": \"$USER_ID\",
        \"project_id\": \"$PROJECT_ID\"
      },
      {
        \"title\": \"Order materials\",
        \"description\": \"Place orders for all construction materials\",
        \"status\": \"pending\",
        \"priority\": \"medium\",
        \"tenant_id\": \"demo-tenant-123\",
        \"created_by\": \"$USER_ID\",
        \"project_id\": \"$PROJECT_ID\"
      }
    ]"
  echo "✓ Demo tasks created"
fi

echo ""
echo "✅ Demo account setup complete!"
echo "================================"
echo "Email: demo@projectpro.com"
echo "Password: demo123456"
echo "User ID: $USER_ID"
echo ""
echo "You can now login with these credentials!"