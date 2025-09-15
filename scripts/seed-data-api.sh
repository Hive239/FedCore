#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Supabase credentials
SUPABASE_URL="https://ndvlruqscfjsmpdojtnl.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmxydXFzY2Zqc21wZG9qdG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM0MDkxOCwiZXhwIjoyMDY3OTE2OTE4fQ.FUHyTqcKz98F1l8dpLMb4zvn-v_S0MWDQ4g8SGiun8k"

echo -e "${BLUE}🚀 Seeding FEDCORE database via API${NC}"
echo ""

# Function to make API calls
api_call() {
    local table=$1
    local data=$2
    local method=${3:-POST}
    
    echo -n "  Creating $table... "
    
    response=$(curl -s -X $method \
        "${SUPABASE_URL}/rest/v1/$table" \
        -H "apikey: ${SERVICE_KEY}" \
        -H "Authorization: Bearer ${SERVICE_KEY}" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "$data")
    
    if [ $? -eq 0 ] && [ -z "$response" ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        echo "    Error: $response"
    fi
}

# Create tenant
echo "Creating tenant..."
api_call "tenants" '{
    "id": "d0d0d0d0-0000-0000-0000-000000000001",
    "name": "Acme Property Management",
    "slug": "acme-property"
}'

# Link users to tenant
echo ""
echo "Linking users to tenant..."
api_call "user_tenants" '[
    {
        "user_id": "fca922b4-a9e7-402d-8137-6904b07aeb72",
        "tenant_id": "d0d0d0d0-0000-0000-0000-000000000001",
        "role": "owner"
    },
    {
        "user_id": "5c2f282b-7d2c-4007-8bd5-f0a40e59b9fd",
        "tenant_id": "d0d0d0d0-0000-0000-0000-000000000001",
        "role": "admin"
    },
    {
        "user_id": "c5243ac6-da91-49bd-8608-51285bfd37e8",
        "tenant_id": "d0d0d0d0-0000-0000-0000-000000000001",
        "role": "member"
    },
    {
        "user_id": "d454a81d-b819-44d3-b6c1-b9e7621c71a3",
        "tenant_id": "d0d0d0d0-0000-0000-0000-000000000001",
        "role": "member"
    },
    {
        "user_id": "58c68337-084c-4dc2-b110-a5ba4cd78d9b",
        "tenant_id": "d0d0d0d0-0000-0000-0000-000000000001",
        "role": "member"
    },
    {
        "user_id": "e0d295a8-a3d8-4b30-83d5-75414de92eef",
        "tenant_id": "d0d0d0d0-0000-0000-0000-000000000001",
        "role": "member"
    }
]'

# Create associations
echo ""
echo "Creating associations..."
api_call "associations" '[
    {
        "id": "a0a0a0a0-0000-0000-0000-000000000001",
        "tenant_id": "d0d0d0d0-0000-0000-0000-000000000001",
        "name": "Sunset Ridge HOA",
        "address": "123 Sunset Blvd, San Francisco, CA 94110",
        "contact_name": "John Smith",
        "contact_email": "john@sunsetridge.com",
        "contact_phone": "(555) 123-4567"
    },
    {
        "id": "a0a0a0a0-0000-0000-0000-000000000002",
        "tenant_id": "d0d0d0d0-0000-0000-0000-000000000001",
        "name": "Oak Park Condos",
        "address": "456 Oak Street, San Francisco, CA 94102",
        "contact_name": "Jane Doe",
        "contact_email": "jane@oakpark.com",
        "contact_phone": "(555) 234-5678"
    },
    {
        "id": "a0a0a0a0-0000-0000-0000-000000000003",
        "tenant_id": "d0d0d0d0-0000-0000-0000-000000000001",
        "name": "Riverside Apartments",
        "address": "789 River Road, San Francisco, CA 94107",
        "contact_name": "Bob Wilson",
        "contact_email": "bob@riverside.com",
        "contact_phone": "(555) 345-6789"
    }
]'

# Create categories
echo ""
echo "Creating categories..."
api_call "categories" '[
    {
        "id": "c0c0c0c0-0000-0000-0000-000000000001",
        "tenant_id": "d0d0d0d0-0000-0000-0000-000000000001",
        "name": "Maintenance",
        "type": "task",
        "color": "#3b82f6"
    },
    {
        "id": "c0c0c0c0-0000-0000-0000-000000000002",
        "tenant_id": "d0d0d0d0-0000-0000-0000-000000000001",
        "name": "Renovation",
        "type": "task",
        "color": "#10b981"
    },
    {
        "id": "c0c0c0c0-0000-0000-0000-000000000003",
        "tenant_id": "d0d0d0d0-0000-0000-0000-000000000001",
        "name": "Emergency",
        "type": "task",
        "color": "#ef4444"
    },
    {
        "id": "c0c0c0c0-0000-0000-0000-000000000007",
        "tenant_id": "d0d0d0d0-0000-0000-0000-000000000001",
        "name": "Plumbing",
        "type": "vendor",
        "color": "#14b8a6"
    },
    {
        "id": "c0c0c0c0-0000-0000-0000-000000000008",
        "tenant_id": "d0d0d0d0-0000-0000-0000-000000000001",
        "name": "Electrical",
        "type": "vendor",
        "color": "#f97316"
    }
]'

# Create projects
echo ""
echo "Creating projects..."
api_call "projects" '[
    {
        "id": "p0000001-0000-0000-0000-000000000001",
        "tenant_id": "d0d0d0d0-0000-0000-0000-000000000001",
        "name": "Pool Renovation",
        "description": "Complete renovation of the community pool area",
        "status": "on-track",
        "budget": 45000.00,
        "start_date": "2024-01-15",
        "end_date": "2024-03-30",
        "association_id": "a0a0a0a0-0000-0000-0000-000000000001",
        "created_by": "fca922b4-a9e7-402d-8137-6904b07aeb72"
    },
    {
        "id": "p0000001-0000-0000-0000-000000000002",
        "tenant_id": "d0d0d0d0-0000-0000-0000-000000000001",
        "name": "Parking Lot Resurfacing",
        "description": "Resurfacing and restriping of main parking area",
        "status": "delayed",
        "budget": 28000.00,
        "start_date": "2024-02-01",
        "end_date": "2024-02-28",
        "association_id": "a0a0a0a0-0000-0000-0000-000000000002",
        "created_by": "fca922b4-a9e7-402d-8137-6904b07aeb72"
    },
    {
        "id": "p0000001-0000-0000-0000-000000000003",
        "tenant_id": "d0d0d0d0-0000-0000-0000-000000000001",
        "name": "Landscape Upgrade",
        "description": "Drought-resistant landscaping installation",
        "status": "new",
        "budget": 15000.00,
        "start_date": "2024-03-01",
        "end_date": "2024-04-15",
        "association_id": "a0a0a0a0-0000-0000-0000-000000000003",
        "created_by": "5c2f282b-7d2c-4007-8bd5-f0a40e59b9fd"
    }
]'

# Create tasks
echo ""
echo "Creating tasks..."
api_call "tasks" '[
    {
        "tenant_id": "d0d0d0d0-0000-0000-0000-000000000001",
        "project_id": "p0000001-0000-0000-0000-000000000001",
        "title": "Get contractor quotes",
        "description": "Obtain at least 3 quotes from licensed pool contractors",
        "status": "in-progress",
        "priority": "high",
        "due_date": "2024-01-20",
        "assignee_id": "c5243ac6-da91-49bd-8608-51285bfd37e8",
        "created_by": "fca922b4-a9e7-402d-8137-6904b07aeb72",
        "position": 0
    },
    {
        "tenant_id": "d0d0d0d0-0000-0000-0000-000000000001",
        "project_id": "p0000001-0000-0000-0000-000000000001",
        "title": "Review pool designs",
        "description": "Review and approve final pool design plans",
        "status": "pending",
        "priority": "high",
        "due_date": "2024-01-25",
        "assignee_id": "d454a81d-b819-44d3-b6c1-b9e7621c71a3",
        "created_by": "fca922b4-a9e7-402d-8137-6904b07aeb72",
        "position": 1
    },
    {
        "tenant_id": "d0d0d0d0-0000-0000-0000-000000000001",
        "project_id": "p0000001-0000-0000-0000-000000000002",
        "title": "Schedule parking lot closure",
        "description": "Coordinate with residents for parking alternatives",
        "status": "completed",
        "priority": "medium",
        "due_date": "2024-01-28",
        "assignee_id": "c5243ac6-da91-49bd-8608-51285bfd37e8",
        "created_by": "5c2f282b-7d2c-4007-8bd5-f0a40e59b9fd",
        "position": 0
    }
]'

# Create vendors
echo ""
echo "Creating vendors..."
api_call "vendors" '[
    {
        "tenant_id": "d0d0d0d0-0000-0000-0000-000000000001",
        "name": "ABC Plumbing",
        "description": "Full service plumbing contractor",
        "category_id": "c0c0c0c0-0000-0000-0000-000000000007",
        "contact_name": "Alice Brown",
        "contact_email": "alice@abcplumbing.com",
        "contact_phone": "(555) 123-4567",
        "address": "123 Main St, San Francisco, CA",
        "rating": 4.8,
        "status": "active",
        "created_by": "fca922b4-a9e7-402d-8137-6904b07aeb72"
    },
    {
        "tenant_id": "d0d0d0d0-0000-0000-0000-000000000001",
        "name": "Elite Electric",
        "description": "Commercial and residential electrical services",
        "category_id": "c0c0c0c0-0000-0000-0000-000000000008",
        "contact_name": "Eddie Volt",
        "contact_email": "eddie@eliteelectric.com",
        "contact_phone": "(555) 234-5678",
        "address": "456 Oak Ave, San Francisco, CA",
        "rating": 4.5,
        "status": "active",
        "created_by": "fca922b4-a9e7-402d-8137-6904b07aeb72"
    }
]'

echo ""
echo -e "${GREEN}✅ Data seeding complete!${NC}"
echo ""
echo "You can now log in and see:"
echo "  - 3 property associations"
echo "  - 3 projects with different statuses"
echo "  - 3 tasks in the Kanban board"
echo "  - 2 vendors in the directory"
echo "  - Categories for organizing items"