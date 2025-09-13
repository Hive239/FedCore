#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Project Pro Database Setup${NC}"
echo ""

# Check if password is provided
if [ -z "$1" ]; then
    echo "Usage: ./scripts/quick-db-setup.sh <your-supabase-db-password>"
    echo ""
    echo "Get your password from:"
    echo "https://supabase.com/dashboard/project/ndvlruqscfjsmpdojtnl/settings/database"
    echo "(Look for 'Database Password' in the Connection String section)"
    exit 1
fi

DB_PASSWORD="$1"
DB_HOST="db.ndvlruqscfjsmpdojtnl.supabase.co"

echo "📋 Setting up database schema and data..."

# Execute all SQL files in one command
PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p 5432 \
    -U postgres \
    -d postgres \
    -v ON_ERROR_STOP=1 \
    -c "$(cat supabase/schema.sql supabase/add_users_to_tenant.sql supabase/seed.sql)"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Success! Database is ready.${NC}"
    echo ""
    echo "Test credentials:"
    echo "  admin@projectpro.com / Admin123!"
    echo "  john@projectpro.com / John123!"
    echo "  jane@projectpro.com / Jane123!"
else
    echo -e "${RED}❌ Setup failed. Please check the error messages.${NC}"
fi