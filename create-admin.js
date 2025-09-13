const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://uaruyrkcisljnkwjwygn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcnV5cmtjaXNsam5rd2p3eWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NjQ5NDUsImV4cCI6MjA2ODA0MDk0NX0.ZcfBiJgwHh7vVrxUy3WdAbfvhiuqFqs-NahJjwtUmNQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createAdmin() {
  console.log('🚀 Attempting to create admin user...\n');
  
  try {
    // Try to sign up the admin user
    const { data, error } = await supabase.auth.signUp({
      email: 'admin@projectpro.com',
      password: 'Latitude26!',
      options: {
        data: {
          full_name: 'Admin User',
          role: 'admin'
        }
      }
    });
    
    if (error) {
      console.log('❌ Error:', error.message);
      
      if (error.message.includes('already registered')) {
        console.log('\n📝 The admin user already exists.');
        console.log('To reset the password:');
        console.log('1. Go to https://supabase.com/dashboard/project/uaruyrkcisljnkwjwygn/auth/users');
        console.log('2. Find admin@projectpro.com');
        console.log('3. Click on the user');
        console.log('4. Click "Send Password Recovery"');
        console.log('5. Or manually update the password in the dashboard');
      }
    } else if (data?.user) {
      console.log('✅ Admin user created successfully!');
      console.log('   User ID:', data.user.id);
      console.log('   Email:', data.user.email);
      console.log('\n📝 You can now login with:');
      console.log('   Email: admin@projectpro.com');
      console.log('   Password: Latitude26!');
      
      // Note about email confirmation
      if (!data.session) {
        console.log('\n⚠️  Note: Email confirmation may be required.');
        console.log('   Check your email or disable email confirmation in Supabase.');
      }
    } else {
      console.log('⚠️  Unexpected response - no error but no user data');
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

createAdmin();