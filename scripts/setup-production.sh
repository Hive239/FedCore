#!/bin/bash

# Production Setup Script for Project Pro
# This script transitions from demo mode to production mode

echo "================================================"
echo "Project Pro - Production Setup"
echo "================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: Please run this script from the ProjectPro directory"
    exit 1
fi

# Backup current .env.local if it exists
if [ -f ".env.local" ]; then
    echo "Backing up current .env.local to .env.local.demo-backup"
    cp .env.local .env.local.demo-backup
fi

# Copy production environment file
echo "Setting up production environment..."
cp .env.local.production .env.local

echo ""
echo "================================================"
echo "DATABASE SETUP INSTRUCTIONS"
echo "================================================"
echo ""
echo "1. Go to your Supabase dashboard: https://app.supabase.com"
echo ""
echo "2. Run these SQL scripts in order in the SQL Editor:"
echo "   a) supabase/complete-production-setup.sql"
echo "   b) supabase/create-admin-user.sql" 
echo "   c) supabase/seed-production-data.sql"
echo ""
echo "3. Create your admin user:"
echo "   - Go to Authentication > Users"
echo "   - Click 'Add User'"
echo "   - Email: admin@projectpro.com (or your preferred email)"
echo "   - Password: [Choose a secure password]"
echo "   - Click 'Create User'"
echo ""
echo "4. After creating the user, go back to SQL Editor and run:"
echo "   The second part of create-admin-user.sql to make them an admin"
echo ""
echo "5. Update .env.local with your service role key from:"
echo "   Settings > API > service_role key"
echo ""
echo "================================================"
echo "STARTING THE APPLICATION"
echo "================================================"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "To start the application in production mode:"
echo "npm run dev"
echo ""
echo "Login with:"
echo "Email: admin@projectpro.com"
echo "Password: [The password you set]"
echo ""
echo "================================================"