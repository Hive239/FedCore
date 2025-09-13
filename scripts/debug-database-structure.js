#!/usr/bin/env node

/**
 * Debug database structure to find organizations reference
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function debugDatabase() {
  console.log('🔍 Debugging database structure...\n')

  try {
    // 1. List all tables
    console.log('1. Querying information schema for all tables...')
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `
    
    const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', { sql: tablesQuery })
    
    if (tablesError && !tablesError.message.includes('Could not find the function')) {
      console.log('❌ Tables query error:', tablesError.message)
    } else if (!tablesError) {
      console.log('✅ Found tables:', tables)
    }

    // 2. Try alternative approach - check what we can actually query
    console.log('2. Checking accessible tables by querying...')
    const testTables = ['projects', 'tenants', 'organizations', 'profiles', 'user_tenants']
    
    for (const table of testTables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1)
        if (error) {
          console.log(`❌ ${table}: ${error.message}`)
        } else {
          console.log(`✅ ${table}: accessible (${data?.length || 0} sample records)`)
          if (data && data.length > 0) {
            console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`)
          }
        }
      } catch (e) {
        console.log(`❌ ${table}: ${e.message}`)
      }
    }

    // 3. Check for foreign key constraints mentioning organizations
    console.log('\n3. Checking for foreign key constraints...')
    const constraintsQuery = `
      SELECT 
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND (ccu.table_name LIKE '%organizations%' OR tc.table_name LIKE '%organizations%')
      ORDER BY tc.table_name, tc.constraint_name;
    `

    // 4. Let's directly try to INSERT without the organizations reference
    console.log('\n4. Direct project insertion test...')
    
    // Get actual user and tenant
    const { data: users } = await supabase.from('profiles').select('id').limit(1)
    const { data: tenants } = await supabase.from('tenants').select('id').limit(1)
    
    if (users?.length && tenants?.length) {
      const testData = {
        name: 'Debug Test Project',
        status: 'new',
        created_by: users[0].id,
        tenant_id: tenants[0].id
      }
      
      console.log('Attempting direct insert with:', testData)
      
      const { data: result, error: insertError } = await supabase
        .from('projects')
        .insert(testData)
        .select()
      
      if (insertError) {
        console.log('❌ Direct insert error:', insertError.message)
        console.log('   Full error object:', JSON.stringify(insertError, null, 2))
      } else {
        console.log('✅ Direct insert successful:', result)
        // Clean up
        if (result && result.length > 0) {
          await supabase.from('projects').delete().eq('id', result[0].id)
          console.log('   Cleaned up test project')
        }
      }
    } else {
      console.log('❌ Missing users or tenants for test')
    }

    // 5. Check if there's an organizations view we missed
    console.log('\n5. Checking for views...')
    const viewsQuery = `
      SELECT table_name, view_definition 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%org%'
      ORDER BY table_name;
    `

  } catch (error) {
    console.error('❌ Error during debug:', error.message)
  }
}

debugDatabase()