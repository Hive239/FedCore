#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ Need SUPABASE_SERVICE_ROLE_KEY to bypass RLS')
  process.exit(1)
}

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugContacts() {
  console.log('🔍 Debugging Contacts Issue (Bypassing RLS)\n')
  console.log('=' .repeat(60))

  // 1. Check if there's data in contacts table (bypassing RLS)
  const { data: contacts, count: contactCount, error: contactError } = await supabase
    .from('contacts')
    .select('*', { count: 'exact' })

  console.log('\n📊 Contacts Table (with service role):')
  console.log(`  Total records: ${contactCount || 0}`)
  
  if (contactError) {
    console.log(`  ❌ Error: ${contactError.message}`)
  } else if (contacts && contacts.length > 0) {
    console.log('  Sample records:')
    contacts.slice(0, 3).forEach(c => {
      console.log(`    - ${c.name} (${c.contact_type}) - Tenant: ${c.tenant_id}`)
    })
  }

  // 2. Check RLS policies on contacts table
  const { data: policies } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'contacts')

  console.log('\n🔒 RLS Policies on contacts table:')
  if (policies && policies.length > 0) {
    policies.forEach(p => {
      console.log(`  - ${p.policyname}: ${p.cmd}`)
    })
  } else {
    console.log('  No RLS policies found')
  }

  // 3. Check if RLS is enabled
  const { data: tableInfo } = await supabase
    .from('pg_tables')
    .select('rowsecurity')
    .eq('tablename', 'contacts')
    .single()

  console.log('\n🔐 RLS Status:')
  console.log(`  RLS Enabled: ${tableInfo?.rowsecurity ? 'Yes' : 'No'}`)

  // 4. Check tenants to understand multi-tenancy
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, slug')

  console.log('\n🏢 Tenants in system:')
  if (tenants) {
    tenants.forEach(t => {
      console.log(`  - ${t.name} (${t.slug}): ${t.id}`)
    })
  }

  // 5. Check if contacts were migrated somewhere else
  const { data: migrationLog } = await supabase
    .from('activity_logs')
    .select('*')
    .or('action.eq.migration,action.ilike.%contact%,description.ilike.%migrat%')
    .order('created_at', { ascending: false })
    .limit(5)

  if (migrationLog && migrationLog.length > 0) {
    console.log('\n📋 Recent migration activities:')
    migrationLog.forEach(log => {
      console.log(`  - ${log.created_at}: ${log.action} - ${log.description}`)
    })
  }

  // 6. Try to find where the contacts might have gone
  console.log('\n🔎 Checking alternative locations:')
  
  // Check vendors
  const { count: vendorCount } = await supabase
    .from('vendors')
    .select('*', { count: 'exact', head: true })
  console.log(`  - Vendors table: ${vendorCount || 0} records`)

  // Check associations  
  const { count: assocCount } = await supabase
    .from('associations')
    .select('*', { count: 'exact', head: true })
  console.log(`  - Associations table: ${assocCount || 0} records`)

  // Check if there's a backup table
  const { data: backupTables } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .or('table_name.ilike.%backup%,table_name.ilike.%old%,table_name.ilike.%archive%')

  if (backupTables && backupTables.length > 0) {
    console.log('\n💾 Backup/Archive tables found:')
    backupTables.forEach(t => {
      console.log(`  - ${t.table_name}`)
    })
  }

  // 7. Check for recent schema changes
  console.log('\n🔧 Checking for recent schema changes...')
  
  // Look for the enterprise schema we just applied
  const { data: recentChanges } = await supabase
    .rpc('get_recent_schema_changes')
    .catch(() => ({ data: null }))

  if (recentChanges) {
    console.log('  Recent schema changes detected')
  }

  // Recommendation
  console.log('\n💡 Possible causes:')
  console.log('  1. RLS policies may be filtering out contacts')
  console.log('  2. Contacts may need to be associated with correct tenant_id')
  console.log('  3. Data might be in vendors/associations tables instead')
  console.log('  4. Recent schema changes may have affected data visibility')

  console.log('\n✅ Recommended actions:')
  console.log('  1. Check if your user is associated with the correct tenant')
  console.log('  2. Verify tenant_id is set correctly on contacts')
  console.log('  3. Consider re-importing contacts with proper tenant association')
}

debugContacts().catch(console.error)