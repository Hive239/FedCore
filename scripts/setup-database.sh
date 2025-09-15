#!/bin/bash

# Supabase connection details
DB_HOST="db.ndvlruqscfjsmpdojtnl.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

# You'll need to provide the password when running
echo "🚀 Setting up FEDCORE database using psql..."
echo ""
echo "Please enter your Supabase database password"
echo "You can find it at: https://supabase.com/dashboard/project/ndvlruqscfjsmpdojtnl/settings/database"
echo "Look for 'Database Password' in the Connection String section"
echo ""

# Run the SQL files in order
echo "📋 Creating database schema..."
PGPASSWORD=$SUPABASE_DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -f supabase/schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Schema created successfully!"
    
    echo ""
    echo "👥 Adding users to tenant and sample data..."
    PGPASSWORD=$SUPABASE_DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -f supabase/add_users_to_tenant.sql
    
    if [ $? -eq 0 ]; then
        echo "✅ Users linked to tenant successfully!"
        
        echo ""
        echo "🌱 Adding seed data..."
        PGPASSWORD=$SUPABASE_DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -f supabase/seed.sql
        
        if [ $? -eq 0 ]; then
            echo "✅ Seed data added successfully!"
        else
            echo "❌ Failed to add seed data"
        fi
    else
        echo "❌ Failed to link users to tenant"
    fi
else
    echo "❌ Failed to create schema"
fi

echo ""
echo "🎉 Database setup complete!"