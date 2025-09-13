#!/bin/bash

# Load environment variables
source .env.local

# Extract database password from the dashboard
echo "🔑 Getting database credentials..."
echo ""
echo "You need to get your database password from:"
echo "https://supabase.com/dashboard/project/ndvlruqscfjsmpdojtnl/settings/database"
echo ""
echo "Run this command with your password:"
echo "SUPABASE_DB_PASSWORD='your-password-here' ./scripts/psql-setup.sh"
echo ""

if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo "❌ SUPABASE_DB_PASSWORD environment variable not set"
    exit 1
fi

# Database connection details
DB_HOST="db.ndvlruqscfjsmpdojtnl.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

# Create a combined SQL file for easier execution
echo "📋 Preparing SQL scripts..."
cat > /tmp/project_pro_setup.sql << 'EOF'
-- Start transaction
BEGIN;

EOF

# Append all SQL files
cat supabase/schema.sql >> /tmp/project_pro_setup.sql
echo "" >> /tmp/project_pro_setup.sql
cat supabase/add_users_to_tenant.sql >> /tmp/project_pro_setup.sql
echo "" >> /tmp/project_pro_setup.sql
cat supabase/seed.sql >> /tmp/project_pro_setup.sql

# End transaction
echo "COMMIT;" >> /tmp/project_pro_setup.sql

echo "🚀 Executing database setup..."
PGPASSWORD=$SUPABASE_DB_PASSWORD psql \
    -h $DB_HOST \
    -p $DB_PORT \
    -d $DB_NAME \
    -U $DB_USER \
    -v ON_ERROR_STOP=1 \
    -f /tmp/project_pro_setup.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database setup completed successfully!"
    echo ""
    echo "You can now log in with:"
    echo "  - admin@projectpro.com / Admin123!"
    echo "  - john@projectpro.com / John123!"
    echo "  - jane@projectpro.com / Jane123!"
    echo "  - bob@projectpro.com / Bob123!"
else
    echo ""
    echo "❌ Database setup failed. Check the error messages above."
fi

# Cleanup
rm -f /tmp/project_pro_setup.sql