const { createClient } = require('@supabase/supabase-js');

// Your Supabase configuration
const SUPABASE_URL = 'https://uaruyrkcisljnkwjwygn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcnV5cmtjaXNsam5rd2p3eWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NjQ5NDUsImV4cCI6MjA2ODA0MDk0NX0.ZcfBiJgwHh7vVrxUy3WdAbfvhiuqFqs-NahJjwtUmNQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...');
  console.log('URL:', SUPABASE_URL);
  
  try {
    // Test auth with admin credentials
    console.log('\n📧 Testing login with admin@projectpro.com...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@projectpro.com',
      password: process.argv[2] || 'your-password-here'
    });

    if (error) {
      console.log('❌ Login failed:', error.message);
      if (error.message === 'Invalid login credentials') {
        console.log('\n💡 Please run with your password: node test-supabase-connection.js YOUR_PASSWORD');
      }
    } else {
      console.log('✅ Login successful!');
      console.log('User ID:', data.user?.id);
      console.log('Email:', data.user?.email);
      
      // Test if we can access the database
      console.log('\n📊 Testing database access...');
      const { data: testData, error: dbError } = await supabase
        .from('tenants')
        .select('*')
        .limit(1);
      
      if (dbError) {
        if (dbError.code === '42P01') {
          console.log('⚠️  Table "tenants" does not exist');
          console.log('   You need to run the database setup SQL');
        } else {
          console.log('⚠️  Database error:', dbError.message);
        }
      } else {
        console.log('✅ Database access successful!');
      }
      
      // Sign out
      await supabase.auth.signOut();
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testConnection();