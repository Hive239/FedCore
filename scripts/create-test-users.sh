#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Supabase project details
SUPABASE_URL="https://ndvlruqscfjsmpdojtnl.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmxydXFzY2Zqc21wZG9qdG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDA5MTgsImV4cCI6MjA2NzkxNjkxOH0.jIbw-7_Yv0ymhPybd65XY-gcw8qMKWCgBHHLBqMXaqY"

echo -e "${BLUE}🚀 Creating test users for FEDCORE${NC}"
echo ""

# Function to create a user
create_user() {
    local email=$1
    local password=$2
    local full_name=$3
    local company=$4
    
    echo -n "Creating user: $email... "
    
    response=$(curl -s -X POST \
        "${SUPABASE_URL}/auth/v1/signup" \
        -H "apikey: ${ANON_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$email\",
            \"password\": \"$password\",
            \"data\": {
                \"full_name\": \"$full_name\",
                \"company\": \"$company\"
            }
        }")
    
    if [[ $response == *"user"* ]] && [[ $response != *"error"* ]]; then
        echo -e "${GREEN}✓${NC}"
        # Extract and store the user ID
        user_id=$(echo $response | grep -oE '"id":"[^"]+' | cut -d'"' -f4 | head -1)
        if [[ ! -z "$user_id" ]]; then
            echo "  User ID: $user_id"
            echo "$user_id:$email" >> created_users.txt
        fi
    else
        echo -e "${RED}✗${NC}"
        if [[ $response == *"User already registered"* ]]; then
            echo "  User already exists"
        else
            echo "  Error: $response"
        fi
    fi
}

# Create test users
echo "Creating test users..."
echo ""

create_user "admin@projectpro.com" "Admin123!" "Admin User" "Acme Property Management"
create_user "john@projectpro.com" "John123!" "John Manager" "Acme Property Management"
create_user "jane@projectpro.com" "Jane123!" "Jane Smith" "Acme Property Management"
create_user "bob@projectpro.com" "Bob123!" "Bob Johnson" "Acme Property Management"
create_user "sarah@projectpro.com" "Sarah123!" "Sarah Williams" "Oak Park Properties"
create_user "mike@projectpro.com" "Mike123!" "Mike Davis" "Riverside Management"

echo ""
echo -e "${BLUE}📋 Test User Credentials:${NC}"
echo "------------------------"
echo "admin@projectpro.com / Admin123! (Admin)"
echo "john@projectpro.com / John123! (Manager)"
echo "jane@projectpro.com / Jane123! (Team Member)"
echo "bob@projectpro.com / Bob123! (Team Member)"
echo "sarah@projectpro.com / Sarah123! (External)"
echo "mike@projectpro.com / Mike123! (External)"
echo ""

# Create SQL file for manual execution
cat > add_users_to_tenant.sql << EOF
-- First, ensure we have the test tenant
INSERT INTO public.tenants (id, name, slug) VALUES
  ('d0d0d0d0-0000-0000-0000-000000000001', 'Acme Property Management', 'acme-property')
ON CONFLICT (id) DO NOTHING;

-- Add users to tenant (replace USER_ID with actual IDs from above)
-- You'll need to run these after getting the user IDs from the signup process
EOF

if [ -f created_users.txt ]; then
    echo "" >> add_users_to_tenant.sql
    echo "-- Add these users to the tenant:" >> add_users_to_tenant.sql
    while IFS=: read -r user_id email; do
        if [[ ! -z "$user_id" ]]; then
            role="member"
            if [[ "$email" == "admin@projectpro.com" ]]; then
                role="owner"
            elif [[ "$email" == "john@projectpro.com" ]]; then
                role="admin"
            fi
            echo "INSERT INTO public.user_tenants (user_id, tenant_id, role) VALUES ('$user_id', 'd0d0d0d0-0000-0000-0000-000000000001', '$role') ON CONFLICT DO NOTHING; -- $email" >> add_users_to_tenant.sql
        fi
    done < created_users.txt
    rm created_users.txt
fi

echo -e "${GREEN}✅ User creation complete!${NC}"
echo ""
echo "Next steps:"
echo "1. The users have been created in Supabase Auth"
echo "2. Go to your Supabase SQL Editor: https://supabase.com/dashboard/project/ndvlruqscfjsmpdojtnl/sql/new"
echo "3. Run the schema.sql file first (if not already done)"
echo "4. Run the add_users_to_tenant.sql file to link users to the tenant"
echo "5. Run the seed.sql file to add sample data"
echo ""
echo "You can now log in to the app with any of the test credentials above!"