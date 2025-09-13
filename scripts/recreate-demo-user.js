#!/usr/bin/env node

// Recreate demo user from scratch
const SUPABASE_URL = 'https://ndvlruqscfjsmpdojtnl.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmxydXFzY2Zqc21wZG9qdG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM0MDkxOCwiZXhwIjoyMDY3OTE2OTE4fQ.FUHyTqcKz98F1l8dpLMb4zvn-v_S0MWDQ4g8SGiun8k';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmxydXFzY2Zqc21wZG9qdG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDA5MTgsImV4cCI6MjA2NzkxNjkxOH0.jIbw-7_Yv0ymhPybd65XY-gcw8qMKWCgBHHLBqMXaqY';

async function recreateDemoUser() {
  console.log('Recreating demo user from scratch...\n');
  
  try {
    // 1. Get existing user
    console.log('1. Checking for existing user...');
    const getUsersResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      }
    });

    const { users } = await getUsersResponse.json();
    const existingUser = users?.find(u => u.email === 'demo@projectpro.com');

    if (existingUser) {
      console.log('Found existing user, deleting...');
      
      // Delete existing user
      const deleteResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${existingUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY
        }
      });

      if (deleteResponse.ok) {
        console.log('✓ Existing user deleted');
      } else {
        console.log('Failed to delete user:', await deleteResponse.text());
      }
    }

    // 2. Create new user
    console.log('\n2. Creating new demo user...');
    const createResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json'
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

    const createResult = await createResponse.json();
    
    if (!createResponse.ok) {
      console.error('Failed to create user:', createResult);
      return;
    }

    const userId = createResult.id;
    console.log('✓ User created with ID:', userId);

    // 3. Test login immediately
    console.log('\n3. Testing login with new user...');
    const loginResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY
      },
      body: JSON.stringify({
        email: 'demo@projectpro.com',
        password: 'demo123456'
      })
    });

    const loginResult = await loginResponse.json();
    
    if (loginResponse.ok) {
      console.log('✓ Login successful!');
      console.log('  Access token:', loginResult.access_token?.substring(0, 50) + '...');
    } else {
      console.log('❌ Login failed:', loginResult);
    }

    // 4. Link to tenant
    console.log('\n4. Linking user to tenant...');
    const linkResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_tenants`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        user_id: userId,
        tenant_id: '550e8400-e29b-41d4-a716-446655440001',
        role: 'owner'
      })
    });

    if (linkResponse.ok) {
      console.log('✓ User linked to tenant');
    } else {
      console.log('Failed to link user:', await linkResponse.text());
    }

    console.log('\n✅ Demo user recreated successfully!');
    console.log('Email: demo@projectpro.com');
    console.log('Password: demo123456');
    console.log('User ID:', userId);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the recreation
recreateDemoUser();