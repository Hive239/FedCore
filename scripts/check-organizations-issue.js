#!/usr/bin/env node

/**
 * Check for organizations table issue
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkTables() {
  console.log('🔍 Checking table structures...\n')

  try {
    // Check if organizations table exists
    console.log('1. Checking organizations table...')
    const { data: orgsData, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1)
    
    if (orgsError) {
      console.log('❌ Organizations table error:', orgsError.message)
    } else {
      console.log('✅ Organizations table exists')
    }

    // Check tenants table
    console.log('2. Checking tenants table...')
    const { data: tenantsData, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
      .limit(1)
    
    if (tenantsError) {
      console.log('❌ Tenants table error:', tenantsError.message)
    } else {
      console.log('✅ Tenants table exists with', tenantsData?.length || 0, 'records')
    }

    // Check projects table schema
    console.log('3. Checking projects table schema...')
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .limit(1)
    
    if (projectsError) {
      console.log('❌ Projects table error:', projectsError.message)
    } else {
      console.log('✅ Projects table exists')
      if (projectsData && projectsData.length > 0) {
        console.log('   Sample record fields:', Object.keys(projectsData[0]))
      }
    }

    // Try to create a test project to see the actual error
    console.log('4. Testing project creation...')
    const { data: user } = await supabase.auth.getUser()
    
    // Create a minimal test project
    const testProject = {
      name: 'Test Project',
      description: 'Test project for debugging',
      status: 'new',
      created_by: user?.data?.user?.id || 'test-user-id',
      tenant_id: 'test-tenant-id'
    }

    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert(testProject)
      .select()
      .single()

    if (createError) {
      console.log('❌ Test project creation error:', createError.message)
      console.log('   Full error:', createError)
    } else {
      console.log('✅ Test project created successfully')
      // Clean up
      await supabase.from('projects').delete().eq('id', newProject.id)
      console.log('   Cleaned up test project')
    }

  } catch (error) {
    console.error('❌ Error during checks:', error)
  }
}

checkTables()