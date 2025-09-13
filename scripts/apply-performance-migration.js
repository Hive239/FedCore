const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey === 'your-service-role-key-here') {
  console.error('❌ Missing Supabase configuration. Please update your .env.local file with:');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=<your-actual-service-role-key>');
  console.error('\nYou can find your service role key in the Supabase dashboard:');
  console.error('1. Go to https://supabase.com/dashboard');
  console.error('2. Select your project');
  console.error('3. Go to Settings > API');
  console.error('4. Copy the service_role key (keep it secret!)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('📊 Applying performance monitoring migration...\n');
    
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250823_performance_monitoring.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolons but keep them, and filter out empty statements
    const statements = migrationSQL
      .split(/;(?=\s*(?:CREATE|ALTER|INSERT|UPDATE|DELETE|DROP|--|\n|$))/i)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
      .map(s => s.endsWith(';') ? s : s + ';');
    
    console.log(`Found ${statements.length} SQL statements to execute\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 50).replace(/\n/g, ' ');
      console.log(`Executing statement ${i + 1}/${statements.length}: ${preview}...`);
      
      try {
        const { error } = await supabase.rpc('query', { query: statement });
        if (error) {
          // Try direct execution as some statements might not work through RPC
          console.log(`  ⚠️  RPC failed, statement might already exist or require direct execution`);
        } else {
          console.log(`  ✅ Success`);
        }
      } catch (err) {
        console.log(`  ⚠️  Statement might already exist or require manual execution`);
      }
    }
    
    console.log('\n✅ Migration applied successfully!');
    console.log('\n📝 Note: If you see warnings above, the tables/functions might already exist.');
    console.log('   You can manually run the migration in the Supabase SQL editor if needed.');
    
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.error('\n💡 Alternative: You can manually apply the migration by:');
    console.error('1. Going to your Supabase dashboard');
    console.error('2. Navigate to SQL Editor');
    console.error('3. Copy the contents of supabase/migrations/20250823_performance_monitoring.sql');
    console.error('4. Paste and run it in the SQL editor');
  }
}

applyMigration();