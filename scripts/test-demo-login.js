#!/usr/bin/env node

// Test demo login
const SUPABASE_URL = 'https://ndvlruqscfjsmpdojtnl.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmxydXFzY2Zqc21wZG9qdG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDA5MTgsImV4cCI6MjA2NzkxNjkxOH0.jIbw-7_Yv0ymhPybd65XY-gcw8qMKWCgBHHLBqMXaqY';

async function testDemoLogin() {
  console.log('Testing demo login...');
  
  try {
    // Test auth endpoint
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
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

    const authData = await authResponse.json();
    
    if (!authResponse.ok) {
      console.error('Auth failed:', authData);
      return;
    }

    console.log('✓ Login successful!');
    console.log('User ID:', authData.user.id);
    console.log('Email:', authData.user.email);
    
    // Test fetching user's tenant
    const tenantResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/user_tenants?user_id=eq.${authData.user.id}&select=*,tenants(*)`,
      {
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'apikey': ANON_KEY
        }
      }
    );

    const tenantData = await tenantResponse.json();
    console.log('\nUser tenants:', JSON.stringify(tenantData, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testDemoLogin();