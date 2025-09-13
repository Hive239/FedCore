const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://uaruyrkcisljnkwjwygn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcnV5cmtjaXNsam5rd2p3eWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NjQ5NDUsImV4cCI6MjA2ODA0MDk0NX0.ZcfBiJgwHh7vVrxUy3WdAbfvhiuqFqs-NahJjwtUmNQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyAdmin() {
  console.log('🔍 Verifying admin user setup...\n');
  
  // Test with the password provided as argument
  const password = process.argv[2];
  
  if (!password) {
    console.log('❌ Please provide the admin password:');
    console.log('   node verify-admin.js YOUR_ADMIN_PASSWORD\n');
    return;
  }
  
  try {
    console.log('Testing login for admin@projectpro.com...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@projectpro.com',
      password: password
    });
    
    if (error) {
      console.log('❌ Login failed:', error.message);
      
      if (error.message === 'Invalid login credentials') {
        console.log('\n📝 Possible issues:');
        console.log('1. The password is incorrect');
        console.log('2. The admin user doesn\'t exist yet');
        console.log('\n💡 To fix:');
        console.log('1. Go to Supabase Dashboard > Authentication > Users');
        console.log('2. Check if admin@projectpro.com exists');
        console.log('3. If not, create it with "Invite User" button');
        console.log('4. If it exists, use "Reset Password" to set a new password');
      }
    } else {
      console.log('✅ Login successful!');
      console.log('   User ID:', data.user?.id);
      console.log('   Email:', data.user?.email);
      
      // Check profile
      console.log('\n📊 Checking profile...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user?.id)
        .single();
      
      if (profileError) {
        console.log('⚠️  No profile found:', profileError.message);
        console.log('\n💡 Run the SQL script in Supabase to create the profile');
      } else {
        console.log('✅ Profile exists:');
        console.log('   Tenant ID:', profile.tenant_id);
        console.log('   Role:', profile.role);
        console.log('   Full Name:', profile.full_name);
      }
      
      // Sign out
      await supabase.auth.signOut();
      
      console.log('\n✅ Everything looks good! You should be able to login.');
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

verifyAdmin();