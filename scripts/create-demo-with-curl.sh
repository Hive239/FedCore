#!/bin/bash

# Create demo account using curl and Supabase REST API

SUPABASE_URL="https://ndvlruqscfjsmpdojtnl.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmxydXFzY2Zqc21wZG9qdG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM0MDkxOCwiZXhwIjoyMDY3OTE2OTE4fQ.FUHyTqcKz98F1l8dpLMb4zvn-v_S0MWDQ4g8SGiun8k"

echo "Creating demo account for FEDCORE..."

# Step 1: Create the auth user
echo "1. Creating auth user..."
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

# Extract user ID from response
USER_ID=$(echo $USER_RESPONSE | grep -o '"id":"[^"]*' | grep -o '[^"]*$' | head -1)

if [ -z "$USER_ID" ]; then
  echo "Error creating user. Response:"
  echo $USER_RESPONSE
  echo ""
  echo "User might already exist. Trying to get existing user..."
  
  # Try to get existing user
  USER_ID=$(curl -s -X GET \
    "${SUPABASE_URL}/auth/v1/admin/users" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "apikey: ${SERVICE_KEY}" | \
    grep -o '"email":"demo@projectpro.com"[^}]*"id":"[^"]*' | \
    grep -o '"id":"[^"]*' | \
    grep -o '[^"]*$')
fi

if [ -z "$USER_ID" ]; then
  echo "Failed to create or find user"
  exit 1
fi

echo "✓ User ID: $USER_ID"

# Step 2: Create tenant
echo "2. Creating demo tenant..."
curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/tenants" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "id": "demo-tenant-123",
    "name": "Demo Construction Company",
    "slug": "demo-construction",
    "settings": {
      "theme": "default",
      "features": ["projects", "tasks", "messaging", "documents", "reports", "map", "updates"]
    }
  }' > /dev/null

echo "✓ Tenant created (or already exists)"

# Step 3: Link user to tenant
echo "3. Linking user to tenant..."
curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/user_tenants" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"tenant_id\": \"demo-tenant-123\",
    \"role\": \"owner\"
  }" > /dev/null

echo "✓ User linked to tenant"

# Step 4: Create demo projects
echo "4. Creating demo projects..."
curl -s -X POST \
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
  ]" > /dev/null

echo "✓ Demo projects created"

echo ""
echo "✅ Demo account setup complete!"
echo "Email: demo@projectpro.com"
echo "Password: demo123456"
echo "User ID: $USER_ID"