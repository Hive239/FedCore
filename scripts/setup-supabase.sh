#!/bin/bash

# Load environment variables
source .env.local

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🚀 Setting up Supabase database..."

# Function to execute SQL
execute_sql() {
    local sql=$1
    local description=$2
    
    echo -n "  $description... "
    
    response=$(curl -s -X POST \
        "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/query" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$sql\"}")
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        echo "Error: $response"
    fi
}

# First, let's create the schema using the SQL Editor API
echo "📋 Creating database schema..."
schema_sql=$(cat supabase/schema.sql | sed ':a;N;$!ba;s/\n/\\n/g' | sed 's/"/\\"/g')

# Execute schema SQL via the Supabase Dashboard SQL Editor endpoint
# Note: This requires using the Dashboard API which might need different auth
echo ""
echo "⚠️  Please run the following steps manually in your Supabase Dashboard:"
echo ""
echo "1. Go to https://supabase.com/dashboard/project/ndvlruqscfjsmpdojtnl/sql/new"
echo "2. Copy and paste the contents of: supabase/schema.sql"
echo "3. Click 'Run' to execute the schema creation"
echo ""
read -p "Press enter when you've completed the schema setup..."

# Now let's create test users
echo ""
echo "👥 Creating test users..."

# Function to create a user
create_user() {
    local email=$1
    local password=$2
    local full_name=$3
    
    echo -n "  Creating user: $email... "
    
    response=$(curl -s -X POST \
        "${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/signup" \
        -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$email\",
            \"password\": \"$password\",
            \"data\": {
                \"full_name\": \"$full_name\",
                \"company\": \"Acme Property Management\"
            }
        }")
    
    if [[ $response == *"user"* ]]; then
        echo -e "${GREEN}✓${NC}"
        
        # Extract user ID from response
        user_id=$(echo $response | grep -oP '"id":"\K[^"]+' | head -1)
        echo "    User ID: $user_id"
        
        # Add user to tenant
        if [[ ! -z "$user_id" ]]; then
            add_to_tenant_sql="INSERT INTO public.user_tenants (user_id, tenant_id, role) VALUES ('$user_id', 'd0d0d0d0-0000-0000-0000-000000000001', 'member') ON CONFLICT DO NOTHING;"
            echo "    Run this SQL to add user to tenant: $add_to_tenant_sql"
        fi
    else
        echo -e "${RED}✗${NC}"
        echo "    Error: $response"
    fi
}

# Create test users
create_user "admin@projectpro.com" "Admin123!" "Admin User"
create_user "john@projectpro.com" "John123!" "John Manager"
create_user "jane@projectpro.com" "Jane123!" "Jane Smith"
create_user "bob@projectpro.com" "Bob123!" "Bob Johnson"

echo ""
echo "📝 Next steps:"
echo "1. Go to your Supabase Dashboard SQL editor"
echo "2. Run the contents of: supabase/seed.sql"
echo "3. For each user created above, run the INSERT statement to add them to the tenant"
echo ""
echo "✅ Setup complete! You can now log in with any of the test users."
echo ""
echo "Test credentials:"
echo "  - admin@projectpro.com / Admin123!"
echo "  - john@projectpro.com / John123!"
echo "  - jane@projectpro.com / Jane123!"
echo "  - bob@projectpro.com / Bob123!"