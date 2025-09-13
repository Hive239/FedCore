#!/usr/bin/env node

// Script to create demo user using Supabase Admin API
// Usage: SUPABASE_SERVICE_KEY=your_service_key node scripts/create-demo-user.js

const SUPABASE_URL = 'https://ndvlruqscfjsmpdojtnl.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmxydXFzY2Zqc21wZG9qdG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM0MDkxOCwiZXhwIjoyMDY3OTE2OTE4fQ.FUHyTqcKz98F1l8dpLMb4zvn-v_S0MWDQ4g8SGiun8k';

async function createDemoUser() {
  console.log('Creating demo user...');
  
  try {
    // Step 1: Create the auth user
    const createUserResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      },
      body: JSON.stringify({
        email: 'demo@projectpro.com',
        password: 'demo123456',
        email_confirm: true,
        user_metadata: {
          full_name: 'Demo User'
        }
      })
    });

    const userData = await createUserResponse.json();
    
    if (!createUserResponse.ok) {
      console.error('Error creating user:', userData);
      return;
    }

    console.log('✓ Demo user created successfully');
    console.log('User ID:', userData.id);

    // Step 2: Create tenant
    const tenantResponse = await fetch(`${SUPABASE_URL}/rest/v1/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
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

    if (tenantResponse.ok) {
      console.log('✓ Demo tenant created successfully');
    }

    // Step 3: Link user to tenant
    const linkResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      },
      body: JSON.stringify({
        user_id: userData.id,
        tenant_id: 'demo-tenant-123',
        role: 'owner'
      })
    });

    if (linkResponse.ok) {
      console.log('✓ User linked to tenant successfully');
    }

    console.log('\n✅ Demo account setup complete!');
    console.log('Email: demo@projectpro.com');
    console.log('Password: demo123456');

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
createDemoUser();