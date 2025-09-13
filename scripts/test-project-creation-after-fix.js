#!/usr/bin/env node

/**
 * Test project creation after organizations fix
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

async function testProjectCreation() {
  console.log('🧪 Testing project creation after organizations fix...\n')

  try {
    // 1. Verify organizations table exists and has data
    console.log('1. Checking organizations table...')
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, tenant_id')
      .limit(5)

    if (orgsError) {
      console.log('❌ Organizations table issue:', orgsError.message)
      console.log('👉 Please run the emergency-fix-organizations.sql script in Supabase SQL Editor first!')
      return false
    }

    console.log(`✅ Organizations table accessible with ${orgs?.length || 0} records`)
    if (orgs && orgs.length > 0) {
      console.log('   Sample org:', orgs[0])
    }

    // 2. Get user and tenant for testing
    console.log('2. Getting user and tenant data...')
    const { data: users } = await supabase.from('profiles').select('id').limit(1)
    const { data: tenants } = await supabase.from('tenants').select('id').limit(1)

    if (!users?.length || !tenants?.length) {
      console.log('❌ Missing users or tenants for test')
      return false
    }

    const userId = users[0].id
    const tenantId = tenants[0].id
    console.log(`✅ Using user: ${userId}`)
    console.log(`✅ Using tenant: ${tenantId}`)

    // 3. Test project creation with the same data structure as the app
    console.log('3. Testing project creation...')
    const testProjectData = {
      name: 'TEST PROJECT - Please Delete',
      description: 'Test project created after organizations fix',
      status: 'new',
      created_by: userId,
      tenant_id: tenantId
    }

    console.log('   Inserting:', testProjectData)

    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert(testProjectData)
      .select()
      .single()

    if (createError) {
      console.log('❌ Project creation still failing:', createError.message)
      console.log('   Full error:', JSON.stringify(createError, null, 2))
      
      if (createError.message.includes('organizations')) {
        console.log('\n💡 The organizations table might still have issues.')
        console.log('   Make sure you ran the emergency-fix-organizations.sql script!')
      }
      
      return false
    }

    console.log('✅ Project created successfully!')
    console.log('   Project ID:', newProject.id)
    console.log('   Project Name:', newProject.name)

    // 4. Test project retrieval
    console.log('4. Testing project retrieval...')
    const { data: retrievedProject, error: retrieveError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', newProject.id)
      .single()

    if (retrieveError) {
      console.log('❌ Project retrieval error:', retrieveError.message)
    } else {
      console.log('✅ Project retrieved successfully')
    }

    // 5. Clean up test project
    console.log('5. Cleaning up test project...')
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', newProject.id)

    if (deleteError) {
      console.log('⚠️  Could not delete test project:', deleteError.message)
      console.log(`   Please manually delete project with ID: ${newProject.id}`)
    } else {
      console.log('✅ Test project cleaned up')
    }

    console.log('\n🎉 PROJECT CREATION IS NOW WORKING!')
    console.log('🔥 The organizations fix has resolved the issue!')
    console.log('💫 You can now create projects in the application!')

    return true

  } catch (error) {
    console.error('❌ Test error:', error.message)
    return false
  }
}

testProjectCreation()