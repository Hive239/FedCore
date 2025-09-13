#!/bin/bash

echo "Updating .env.local with correct Supabase credentials..."

# Backup current env
cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)

# Create new .env.local
cat > .env.local << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ndvlruqscfjsmpdojtnl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

# Application URL (update for production)
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

echo ""
echo "Please update .env.local with your actual Supabase keys from:"
echo "https://supabase.com/dashboard/project/ndvlruqscfjsmpdojtnl/settings/api"
echo ""
echo "1. Replace YOUR_ANON_KEY_HERE with the 'anon' public key"
echo "2. Replace YOUR_SERVICE_ROLE_KEY_HERE with the 'service_role' secret key"
echo ""
echo "The keys should start with:"
echo "- Anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmxydXFzY2Zqc21wZG9qdG5sIiwicm9sZSI6ImFub24i..."
echo "- Service key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmxydXFzY2Zqc21wZG9qdG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSI..."