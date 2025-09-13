#!/bin/bash

# Complete demo setup with proper UUIDs
SUPABASE_URL="https://ndvlruqscfjsmpdojtnl.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmxydXFzY2Zqc21wZG9qdG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM0MDkxOCwiZXhwIjoyMDY3OTE2OTE4fQ.FUHyTqcKz98F1l8dpLMb4zvn-v_S0MWDQ4g8SGiun8k"

# The user ID from the previous successful creation
USER_ID="f013cb62-e5fb-40ec-a92e-b655505e2b88"
# Use a proper UUID for tenant
TENANT_ID="550e8400-e29b-41d4-a716-446655440001"

echo "Completing demo setup with proper UUIDs..."
echo "User ID: $USER_ID"
echo "Tenant ID: $TENANT_ID"

# Step 1: Create tenant
echo "1. Creating demo tenant..."
TENANT_RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/tenants" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation,resolution=merge-duplicates" \
  -d "{
    \"id\": \"$TENANT_ID\",
    \"name\": \"Demo Construction Company\",
    \"slug\": \"demo-construction\",
    \"settings\": {
      \"theme\": \"default\",
      \"features\": [\"projects\", \"tasks\", \"messaging\", \"documents\", \"reports\", \"map\", \"updates\"]
    }
  }")

echo "Tenant response: $TENANT_RESPONSE"
echo "✓ Tenant created"

# Step 2: Link user to tenant
echo "2. Linking user to tenant..."
LINK_RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/user_tenants" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation,resolution=merge-duplicates" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"tenant_id\": \"$TENANT_ID\",
    \"role\": \"owner\"
  }")

echo "Link response: $LINK_RESPONSE"
echo "✓ User linked to tenant"

# Step 3: Create demo projects
echo "3. Creating demo projects..."
PROJECTS_RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/pp_projects" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "[
    {
      \"name\": \"Downtown Office Renovation\",
      \"description\": \"Complete renovation of 5,000 sq ft office space including new HVAC, electrical, and modern finishes\",
      \"status\": \"active\",
      \"tenant_id\": \"$TENANT_ID\",
      \"created_by\": \"$USER_ID\",
      \"project_address\": \"123 Main St, Downtown\",
      \"owner_name\": \"Tech Startup Inc\",
      \"owner_phone\": \"555-0123\"
    },
    {
      \"name\": \"Retail Store Build-Out\",
      \"description\": \"New construction of 3,000 sq ft retail space with custom fixtures and lighting\",
      \"status\": \"active\",
      \"tenant_id\": \"$TENANT_ID\",
      \"created_by\": \"$USER_ID\",
      \"project_address\": \"456 Commerce Blvd\",
      \"owner_name\": \"Fashion Retailer LLC\",
      \"owner_phone\": \"555-0124\"
    },
    {
      \"name\": \"Restaurant Kitchen Upgrade\",
      \"description\": \"Commercial kitchen renovation with new equipment and code compliance updates\",
      \"status\": \"active\",
      \"tenant_id\": \"$TENANT_ID\",
      \"created_by\": \"$USER_ID\",
      \"project_address\": \"789 Dining Ave\",
      \"owner_name\": \"Gourmet Restaurant Group\",
      \"owner_phone\": \"555-0125\"
    }
  ]")

echo "Projects response: $PROJECTS_RESPONSE"
echo "✓ Demo projects created"

# Step 4: Get a project ID for tasks
PROJECT_ID=$(echo "$PROJECTS_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$PROJECT_ID" ]; then
  echo "4. Creating demo tasks for project: $PROJECT_ID"
  TASKS_RESPONSE=$(curl -s -X POST \
    "${SUPABASE_URL}/rest/v1/pp_tasks" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "[
      {
        \"title\": \"Initial site inspection\",
        \"description\": \"Conduct thorough inspection and document existing conditions\",
        \"status\": \"pending\",
        \"priority\": \"high\",
        \"tenant_id\": \"$TENANT_ID\",
        \"created_by\": \"$USER_ID\",
        \"project_id\": \"$PROJECT_ID\"
      },
      {
        \"title\": \"Prepare permit applications\",
        \"description\": \"Complete and submit all required building permits\",
        \"status\": \"in-progress\",
        \"priority\": \"high\",
        \"tenant_id\": \"$TENANT_ID\",
        \"created_by\": \"$USER_ID\",
        \"project_id\": \"$PROJECT_ID\"
      },
      {
        \"title\": \"Order materials\",
        \"description\": \"Place orders for all construction materials\",
        \"status\": \"pending\",
        \"priority\": \"medium\",
        \"tenant_id\": \"$TENANT_ID\",
        \"created_by\": \"$USER_ID\",
        \"project_id\": \"$PROJECT_ID\"
      }
    ]")
  echo "Tasks response: $TASKS_RESPONSE"
  echo "✓ Demo tasks created"
else
  echo "Could not create tasks - no project ID found"
fi

echo ""
echo "✅ Demo account setup complete!"
echo "================================"
echo "Email: demo@projectpro.com"
echo "Password: demo123456"
echo "User ID: $USER_ID"
echo "Tenant ID: $TENANT_ID"
echo ""
echo "You can now login with these credentials!"