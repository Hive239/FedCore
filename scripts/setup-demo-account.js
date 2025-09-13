#!/usr/bin/env node

// Script to set up demo account using Supabase Management API
// Run with: node scripts/setup-demo-account.js

const SUPABASE_URL = 'https://ndvlruqscfjsmpdojtnl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmxydXFzY2Zqc21wZG9qdG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDA5MTgsImV4cCI6MjA2NzkxNjkxOH0.jIbw-7_Yv0ymhPybd65XY-gcw8qMKWCgBHHLBqMXaqY';

async function setupDemoAccount() {
  console.log('Setting up demo account...');
  
  try {
    // First, let's create the tenant
    const tenantResponse = await fetch(`${SUPABASE_URL}/rest/v1/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id: 'demo-tenant-123',
        name: 'Demo Construction Company',
        slug: 'demo-construction',
        settings: {
          theme: 'default',
          features: ['projects', 'tasks', 'messaging', 'documents', 'reports', 'map', 'updates']
        }
      })
    });

    if (!tenantResponse.ok) {
      const error = await tenantResponse.text();
      console.log('Tenant might already exist or error:', error);
    } else {
      console.log('✓ Demo tenant created successfully');
    }

    // Note: Creating auth users requires the service role key
    console.log('\nTo complete demo account setup:');
    console.log('1. Go to Supabase Dashboard > Authentication > Users');
    console.log('2. Create a new user with:');
    console.log('   Email: demo@projectpro.com');
    console.log('   Password: demo123456');
    console.log('3. Copy the generated User ID');
    console.log('4. Run the SQL query in Supabase to link the user to the tenant');
    
  } catch (error) {
    console.error('Error setting up demo account:', error);
  }
}

setupDemoAccount();