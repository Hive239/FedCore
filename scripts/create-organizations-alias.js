#!/usr/bin/env node

/**
 * Create organizations table as a simple table that mirrors tenants
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

async function createOrganizationsAlias() {
  console.log('🚀 Creating organizations table as simple alias...\n')

  try {
    // Since we can't run DDL directly, let's try a different approach
    // Let's manually create the organizations records by inserting into
    // what might be an existing but empty organizations table

    // First, let's try to get tenant data
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
    
    if (tenantsError) {
      console.log('❌ Error getting tenants:', tenantsError.message)
      return false
    }

    console.log(`✅ Found ${tenants?.length || 0} tenants to mirror as organizations`)

    // Let's try creating records that might satisfy the organizations constraint
    // We'll create an organizations table structure using Supabase client-side approach
    
    console.log('\n🔧 Attempting workaround...')
    
    // Method 1: Try using the REST API to create the table structure
    // Since the error suggests a table exists but is empty, let's try to populate it
    
    // Get the first tenant for structure reference
    if (tenants && tenants.length > 0) {
      const sampleTenant = tenants[0]
      console.log('Sample tenant structure:', Object.keys(sampleTenant))
      
      // Let's try to "insert" into organizations with the same structure as tenants
      for (const tenant of tenants) {
        const orgData = {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          created_at: tenant.created_at,
          updated_at: tenant.updated_at
        }
        
        try {
          // This might work if the table exists but is empty
          const { error: insertError } = await supabase
            .from('organizations')
            .insert(orgData)
          
          if (insertError) {
            console.log(`❌ Cannot insert org ${tenant.name}:`, insertError.message)
          } else {
            console.log(`✅ Created organization: ${tenant.name}`)
          }
        } catch (e) {
          console.log(`❌ Error with org ${tenant.name}:`, e.message)
        }
      }
    }

    // Method 2: Test if the organizations table now works
    console.log('\n🧪 Testing organizations table access...')
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .limit(5)

    if (orgsError) {
      console.log('❌ Organizations still not accessible:', orgsError.message)
      
      // Method 3: Maybe there's a different table name or view we need
      console.log('\n🔍 The issue might be:')
      console.log('1. Database trigger expecting organizations table')
      console.log('2. RLS policy referencing organizations')
      console.log('3. View or materialized view missing')
      console.log('4. Function or stored procedure referencing organizations')
      console.log('\n💡 Solution: We need to create the organizations table in the database directly')
      console.log('   This requires database admin access or a proper migration')
      
      return false
    } else {
      console.log('✅ Organizations table accessible with', orgs?.length || 0, 'records')
      return true
    }

  } catch (error) {
    console.error('❌ Error:', error)
    return false
  }
}

createOrganizationsAlias()