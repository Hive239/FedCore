#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkContacts() {
  console.log('🔍 Checking contacts in database...\n')

  // Check if contacts table exists
  const { data: tables } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .like('table_name', '%contact%')

  console.log('Tables with "contact" in name:', tables?.map(t => t.table_name))

  // Try different contact-related tables
  const tablesToCheck = [
    'contacts',
    'team_members',
    'vendors',
    'associations',
    'all_contacts'
  ]

  for (const table of tablesToCheck) {
    try {
      const { data, count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(5)

      if (!error) {
        console.log(`\n📊 ${table} table:`)
        console.log(`  - Count: ${count || data?.length || 0}`)
        if (data && data.length > 0) {
          console.log('  - Sample record:', JSON.stringify(data[0], null, 2).substring(0, 200) + '...')
        }
      }
    } catch (e) {
      // Table doesn't exist
    }
  }

  // Check recent activity logs for contact-related actions
  const { data: activities } = await supabase
    .from('activity_logs')
    .select('action, description, created_at')
    .or('action.ilike.%contact%,description.ilike.%contact%')
    .order('created_at', { ascending: false })
    .limit(10)

  if (activities && activities.length > 0) {
    console.log('\n📝 Recent contact-related activities:')
    activities.forEach(a => {
      console.log(`  - ${a.created_at}: ${a.action} - ${a.description}`)
    })
  }

  // Check if there's a view or migration issue
  const { data: views } = await supabase
    .from('information_schema.views')
    .select('table_name')
    .eq('table_schema', 'public')
    .like('table_name', '%contact%')

  if (views && views.length > 0) {
    console.log('\n👁️ Contact-related views:', views.map(v => v.table_name))
  }
}

checkContacts().catch(console.error)