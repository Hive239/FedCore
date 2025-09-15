#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🔍 FEDCORE Database Status Check${NC}"
echo ""

# Check if schema exists by querying tenants table
echo "Checking database schema..."
SCHEMA_CHECK=$(curl -s -X GET \
    "https://ndvlruqscfjsmpdojtnl.supabase.co/rest/v1/tenants?select=id&limit=1" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmxydXFzY2Zqc21wZG9qdG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDA5MTgsImV4cCI6MjA2NzkxNjkxOH0.jIbw-7_Yv0ymhPybd65XY-gcw8qMKWCgBHHLBqMXaqY" \
    -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmxydXFzY2Zqc21wZG9qdG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDA5MTgsImV4cCI6MjA2NzkxNjkxOH0.jIbw-7_Yv0ymhPybd65XY-gcw8qMKWCgBHHLBqMXaqY")

if [[ $SCHEMA_CHECK == *"\"tenants\""* ]] || [[ $SCHEMA_CHECK == "[]" ]]; then
    echo -e "${GREEN}✓ Schema exists${NC}"
    echo ""
    
    # Check if data exists
    echo "Checking for existing data..."
    DATA_CHECK=$(curl -s -X GET \
        "https://ndvlruqscfjsmpdojtnl.supabase.co/rest/v1/tenants?select=name&id=eq.d0d0d0d0-0000-0000-0000-000000000001" \
        -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmxydXFzY2Zqc21wZG9qdG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDA5MTgsImV4cCI6MjA2NzkxNjkxOH0.jIbw-7_Yv0ymhPybd65XY-gcw8qMKWCgBHHLBqMXaqY" \
        -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmxydXFzY2Zqc21wZG9qdG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDA5MTgsImV4cCI6MjA2NzkxNjkxOH0.jIbw-7_Yv0ymhPybd65XY-gcw8qMKWCgBHHLBqMXaqY")
    
    if [[ $DATA_CHECK == *"Acme Property Management"* ]]; then
        echo -e "${GREEN}✓ Test data exists${NC}"
        echo ""
        echo -e "${GREEN}✅ Your database is fully set up!${NC}"
        echo ""
        echo "You can log in with:"
        echo "  • admin@projectpro.com / Admin123!"
        echo "  • john@projectpro.com / John123!"
        echo "  • jane@projectpro.com / Jane123!"
    else
        echo -e "${YELLOW}⚠ No test data found${NC}"
        echo ""
        echo "The database schema exists but needs test data."
        echo "Run: ./scripts/seed-data-api.sh"
    fi
else
    echo -e "${RED}✗ Schema not found${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Database schema needs to be created first!${NC}"
    echo ""
    echo "Steps to set up your database:"
    echo ""
    echo "1. Go to your Supabase SQL Editor:"
    echo "   ${BLUE}https://supabase.com/dashboard/project/ndvlruqscfjsmpdojtnl/sql/new${NC}"
    echo ""
    echo "2. Copy the entire contents of:"
    echo "   ${BLUE}supabase/complete-setup.sql${NC}"
    echo ""
    echo "3. Paste it in the SQL Editor and click 'RUN'"
    echo ""
    echo "4. Create test users in Authentication:"
    echo "   ${BLUE}https://supabase.com/dashboard/project/ndvlruqscfjsmpdojtnl/auth/users${NC}"
    echo ""
    echo "   Create these users with passwords:"
    echo "   • admin@projectpro.com / Admin123!"
    echo "   • john@projectpro.com / John123!"
    echo "   • jane@projectpro.com / Jane123!"
    echo ""
    echo "5. Run this script again to verify setup"
fi