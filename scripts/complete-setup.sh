#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Complete FEDCORE Setup${NC}"
echo ""

# Check if tables exist by trying to query tenants table
echo "Checking if database schema exists..."
SCHEMA_CHECK=$(curl -s -X GET \
    "https://ndvlruqscfjsmpdojtnl.supabase.co/rest/v1/tenants?select=id&limit=1" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmxydXFzY2Zqc21wZG9qdG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDA5MTgsImV4cCI6MjA2NzkxNjkxOH0.jIbw-7_Yv0ymhPybd65XY-gcw8qMKWCgBHHLBqMXaqY" \
    -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmxydXFzY2Zqc21wZG9qdG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDA5MTgsImV4cCI6MjA2NzkxNjkxOH0.jIbw-7_Yv0ymhPybd65XY-gcw8qMKWCgBHHLBqMXaqY")

if [[ $SCHEMA_CHECK == *"\"tenants\""* ]] || [[ $SCHEMA_CHECK == "[]" ]]; then
    echo -e "${GREEN}✓ Schema exists${NC}"
    
    echo ""
    echo -e "${YELLOW}Running data seeding script...${NC}"
    echo ""
    
    # Run the data seeding script
    "/Users/mpari/Desktop/HIVE239/Project Pro/FedCore/scripts/seed-data-api.sh"
else
    echo -e "${RED}✗ Schema not found${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Database schema needs to be created first!${NC}"
    echo ""
    echo "Please follow these steps:"
    echo ""
    echo "1. Go to: https://supabase.com/dashboard/project/ndvlruqscfjsmpdojtnl/sql/new"
    echo ""
    echo "2. Copy and paste the contents of:"
    echo "   supabase/complete-setup.sql"
    echo ""
    echo "3. Click 'RUN' to create the schema"
    echo ""
    echo "4. Then run this script again to seed the data"
    echo ""
    echo "Alternatively, you can use psql:"
    echo "   PGPASSWORD='ProjectPro123!' psql -h db.ndvlruqscfjsmpdojtnl.supabase.co -p 5432 -U postgres -d postgres -f supabase/complete-setup.sql"
fi