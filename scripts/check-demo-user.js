#!/usr/bin/env node

// Check demo user status
const SUPABASE_URL = 'https://ndvlruqscfjsmpdojtnl.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmxydXFzY2Zqc21wZG9qdG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM0MDkxOCwiZXhwIjoyMDY3OTE2OTE4fQ.FUHyTqcKz98F1l8dpLMb4zvn-v_S0MWDQ4g8SGiun8k';

async function checkDemoUser() {
  console.log('Checking demo user status...\n');
  
  try {
    // 1. Get all users to see if demo user exists
    const usersResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      }
    });

    const { users } = await usersResponse.json();
    const demoUser = users?.find(u => u.email === 'demo@projectpro.com');

    if (!demoUser) {
      console.log('❌ Demo user NOT found');
      console.log('\nAll users:');
      users?.forEach(u => console.log(`- ${u.email} (${u.id})`));
      return;
    }

    console.log('✓ Demo user found:');
    console.log('  ID:', demoUser.id);
    console.log('  Email:', demoUser.email);
    console.log('  Created:', demoUser.created_at);
    console.log('  Confirmed:', demoUser.email_confirmed_at ? 'Yes' : 'No');
    console.log('  Last sign in:', demoUser.last_sign_in_at || 'Never');
    console.log('  User metadata:', JSON.stringify(demoUser.user_metadata));

    // 2. Try to update/reset the password
    console.log('\n2. Resetting password to ensure it\'s correct...');
    
    const updateResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${demoUser.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        password: 'demo123456',
        email_confirm: true
      })
    });

    const updateResult = await updateResponse.json();
    
    if (updateResponse.ok) {
      console.log('✓ Password reset successfully');
    } else {
      console.log('❌ Failed to reset password:', updateResult);
    }

    // 3. Test login with anon key
    console.log('\n3. Testing login with anon key...');
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmxydXFzY2Zqc21wZG9qdG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDA5MTgsImV4cCI6MjA2NzkxNjkxOH0.jIbw-7_Yv0ymhPybd65XY-gcw8qMKWCgBHHLBqMXaqY';
    
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

    // 4. Check user's tenant
    console.log('\n4. Checking user tenant...');
    const tenantResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/user_tenants?user_id=eq.${demoUser.id}`,
      {
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY
        }
      }
    );

    const tenantData = await tenantResponse.json();
    console.log('User tenants:', JSON.stringify(tenantData, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the check
checkDemoUser();