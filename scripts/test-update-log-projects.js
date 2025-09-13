#!/usr/bin/env node

/**
 * Test if projects are loading correctly for update logs
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

async function testUpdateLogProjects() {
  console.log('🧪 Testing Update Log Project Loading\n')
  console.log('=' .repeat(50))
  
  try {
    // 1. Get a user
    console.log('\n1. Getting test user...')
    const { data: users } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .limit(1)
    
    if (!users || users.length === 0) {
      console.log('❌ No users found')
      return false
    }
    
    const user = users[0]
    console.log('✅ Test user:', user.email)
    
    // 2. Get user's tenants (handle multiple tenants)
    console.log('\n2. Getting user tenants...')
    const { data: userTenants, error: tenantError } = await supabase
      .from('user_tenants')
      .select('tenant_id, tenants(name)')
      .eq('user_id', user.id)
    
    if (tenantError || !userTenants || userTenants.length === 0) {
      console.log('❌ No tenants found for user:', tenantError?.message)
      return false
    }
    
    console.log('✅ Tenants found:', userTenants.length)
    userTenants.forEach((ut, i) => {
      console.log(`   ${i + 1}. ${ut.tenants?.name} (${ut.tenant_id})`)
    })
    
    // Use first tenant (like the UI does)
    const userTenant = userTenants[0]
    console.log('   Using first tenant for testing:', userTenant.tenants?.name)
    
    // 3. Load projects for the tenant (same query as the update log page)
    console.log('\n3. Loading projects for tenant...')
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name, project_code, client')
      .eq('tenant_id', userTenant.tenant_id)
      .order('name')
    
    if (projectError) {
      console.log('❌ Error loading projects:', projectError.message)
      console.log('   Full error:', JSON.stringify(projectError, null, 2))
      return false
    }
    
    console.log('✅ Projects loaded successfully!')
    console.log('   Total projects found:', projects?.length || 0)
    
    if (projects && projects.length > 0) {
      console.log('\n   Project List:')
      projects.forEach((project, index) => {
        console.log(`   ${index + 1}. ${project.project_code || 'NO-CODE'} - ${project.name}`)
        console.log(`      ID: ${project.id}`)
        console.log(`      Client: ${project.client || 'N/A'}`)
      })
    } else {
      console.log('   ⚠️  No projects found for this tenant')
      
      // Check if there are ANY projects in the database
      console.log('\n4. Checking for ANY projects in database...')
      const { data: allProjects, count } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
      
      console.log('   Total projects in database:', count || 0)
      
      if (count === 0) {
        console.log('\n   ℹ️  The database has no projects at all.')
        console.log('   You need to create projects first before using the update log.')
      }
    }
    
    // 5. Test the exact scenario that happens in the UI
    console.log('\n5. Simulating UI flow...')
    console.log('   - User opens update log page')
    console.log('   - loadProjects() is called')
    console.log('   - Projects array should be populated')
    console.log('   - When "New Update" is clicked, dropdown should show projects')
    
    if (projects && projects.length > 0) {
      console.log('\n   ✅ Expected behavior: Dropdown should show:')
      console.log('      <option value="">Select a project</option>')
      projects.forEach(p => {
        console.log(`      <option value="${p.id}">${p.project_code ? p.project_code + ' - ' : ''}${p.name}</option>`)
      })
    } else {
      console.log('\n   ⚠️  Expected behavior: Dropdown will show "No projects available"')
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('📋 SUMMARY')
    console.log('='.repeat(50))
    
    if (projects && projects.length > 0) {
      console.log('✅ Projects are loading correctly!')
      console.log('✅ The update log dropdown should populate properly')
      console.log('\nIf projects are still not showing in the UI:')
      console.log('1. Check browser console for errors')
      console.log('2. Ensure you are logged in as the correct user')
      console.log('3. Try refreshing the page')
      console.log('4. Check if projects have the correct tenant_id')
    } else {
      console.log('⚠️  No projects found for this tenant')
      console.log('\nTo fix this:')
      console.log('1. Create projects in the Projects page first')
      console.log('2. Ensure projects are associated with your tenant')
      console.log('3. Check that your user is properly assigned to a tenant')
    }
    
    return true
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error.stack)
    return false
  }
}

// Run the test
testUpdateLogProjects().then(success => {
  process.exit(success ? 0 : 1)
})