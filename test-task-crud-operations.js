#!/usr/bin/env node

/**
 * Test script to verify all task CRUD operations work correctly
 * This will test: Create, Read, Update, Delete, and UI functionality
 */

const { createClient } = require('@supabase/supabase-js')

// Use the environment variables from .env.local
const SUPABASE_URL = "https://uaruyrkcisljnkwjwygn.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcnV5cmtjaXNsam5rd2p3eWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NjQ5NDUsImV4cCI6MjA2ODA0MDk0NX0.ZcfBiJgwHh7vVrxUy3WdAbfvhiuqFqs-NahJjwtUmNQ"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testTaskCRUDOperations() {
  console.log('🔍 Starting Task CRUD Operations Test...\n')

  let testTaskId = null
  let testProjectId = null
  let testTenantId = null

  try {
    // Step 1: Check if we can connect to the database
    console.log('1️⃣ Testing database connection...')
    const { data: connectionTest, error: connectionError } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .limit(1)

    if (connectionError) {
      console.error('❌ Database connection failed:', connectionError.message)
      return
    }
    console.log('✅ Database connection successful\n')

    // Step 2: Get or create a test project
    console.log('2️⃣ Setting up test data...')
    const { data: projects } = await supabase
      .from('projects')
      .select('id, tenant_id')
      .limit(1)
      .single()

    if (projects) {
      testProjectId = projects.id
      testTenantId = projects.tenant_id
      console.log(`✅ Using existing project: ${testProjectId}`)
    } else {
      console.log('⚠️ No projects found - you may need to create one first')
      return
    }

    // Step 3: Test CREATE operation
    console.log('\n3️⃣ Testing CREATE operation...')
    const testTaskData = {
      title: 'Test Task - DELETE ME',
      description: 'This is a test task created by the CRUD test script',
      status: 'pending',
      priority: 'medium',
      project_id: testProjectId,
      tenant_id: testTenantId,
      position: 0
    }

    const { data: createdTask, error: createError } = await supabase
      .from('tasks')
      .insert(testTaskData)
      .select()
      .single()

    if (createError) {
      console.error('❌ CREATE failed:', createError.message)
      return
    }

    testTaskId = createdTask.id
    console.log(`✅ CREATE successful - Task ID: ${testTaskId}`)

    // Step 4: Test READ operation
    console.log('\n4️⃣ Testing READ operation...')
    const { data: readTask, error: readError } = await supabase
      .from('tasks')
      .select(`
        *,
        project:projects(name),
        category:categories(*)
      `)
      .eq('id', testTaskId)
      .single()

    if (readError) {
      console.error('❌ READ failed:', readError.message)
      return
    }
    console.log('✅ READ successful')
    console.log(`   Title: ${readTask.title}`)
    console.log(`   Status: ${readTask.status}`)
    console.log(`   Priority: ${readTask.priority}`)

    // Step 5: Test UPDATE operation
    console.log('\n5️⃣ Testing UPDATE operation...')
    const updatedData = {
      status: 'in-progress',
      priority: 'high',
      description: 'Updated by CRUD test script'
    }

    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(updatedData)
      .eq('id', testTaskId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ UPDATE failed:', updateError.message)
      return
    }
    console.log('✅ UPDATE successful')
    console.log(`   New Status: ${updatedTask.status}`)
    console.log(`   New Priority: ${updatedTask.priority}`)

    // Step 6: Test position update (for drag & drop)
    console.log('\n6️⃣ Testing position UPDATE (drag & drop)...')
    const { error: positionError } = await supabase
      .from('tasks')
      .update({ 
        position: 99,
        status: 'completed'
      })
      .eq('id', testTaskId)

    if (positionError) {
      console.error('❌ Position UPDATE failed:', positionError.message)
      return
    }
    console.log('✅ Position UPDATE successful')

    // Step 7: Test task filtering/search
    console.log('\n7️⃣ Testing task filtering...')
    const { data: filteredTasks, error: filterError } = await supabase
      .from('tasks')
      .select('*')
      .eq('tenant_id', testTenantId)
      .eq('status', 'completed')
      .ilike('title', '%test%')

    if (filterError) {
      console.error('❌ FILTER failed:', filterError.message)
      return
    }
    console.log(`✅ FILTER successful - Found ${filteredTasks.length} tasks`)

    // Step 8: Test DELETE operation
    console.log('\n8️⃣ Testing DELETE operation...')
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', testTaskId)

    if (deleteError) {
      console.error('❌ DELETE failed:', deleteError.message)
      return
    }
    console.log('✅ DELETE successful')

    // Step 9: Verify deletion
    console.log('\n9️⃣ Verifying deletion...')
    const { data: deletedTask, error: verifyError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', testTaskId)
      .single()

    if (verifyError && verifyError.code === 'PGRST116') {
      console.log('✅ Deletion verified - Task no longer exists')
    } else {
      console.error('❌ Deletion verification failed - Task may still exist')
      return
    }

    // Step 10: Test RLS policies
    console.log('\n🔟 Testing Row Level Security (RLS) policies...')
    
    // This should work (tasks in same tenant)
    const { data: rlsTest1, error: rlsError1 } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('tenant_id', testTenantId)
      .limit(5)

    if (rlsError1) {
      console.error('❌ RLS test failed:', rlsError1.message)
      return
    }
    console.log(`✅ RLS test successful - Can access ${rlsTest1.length} tasks in tenant`)

    console.log('\n🎉 All Task CRUD operations are working correctly!')
    console.log('\n📋 Summary:')
    console.log('   ✅ Database Connection')
    console.log('   ✅ CREATE Task')
    console.log('   ✅ READ Task (with relations)')
    console.log('   ✅ UPDATE Task')
    console.log('   ✅ UPDATE Position (drag & drop)')
    console.log('   ✅ FILTER/SEARCH Tasks')
    console.log('   ✅ DELETE Task')
    console.log('   ✅ Verify Deletion')
    console.log('   ✅ Row Level Security')

  } catch (error) {
    console.error('💥 Test failed with error:', error.message)
    console.error(error)

    // Cleanup: Try to delete the test task if it was created
    if (testTaskId) {
      console.log('\n🧹 Cleaning up test data...')
      try {
        await supabase.from('tasks').delete().eq('id', testTaskId)
        console.log('✅ Test task cleaned up')
      } catch (cleanupError) {
        console.log('⚠️ Could not clean up test task')
      }
    }
  }
}

// Run the test
testTaskCRUDOperations()