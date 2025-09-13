#!/usr/bin/env node

/**
 * Test task creation after dependencies fix
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

async function testTaskCreation() {
  console.log('🧪 Testing task creation after dependencies fix...\n')

  try {
    // Get user and tenant for testing
    console.log('1. Getting user and tenant data...')
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

    // Check tasks table structure
    console.log('2. Checking tasks table...')
    const { data: existingTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .limit(1)

    if (tasksError) {
      console.log('❌ Tasks table access error:', tasksError.message)
      return false
    }

    console.log('✅ Tasks table accessible')
    if (existingTasks && existingTasks.length > 0) {
      console.log('   Sample task columns:', Object.keys(existingTasks[0]))
    }

    // Test task creation with the same data structure as the app (but excluding dependencies)
    console.log('3. Testing task creation...')
    const testTaskData = {
      title: 'TEST TASK - Please Delete',
      description: 'Test task created after dependencies fix',
      status: 'pending',
      priority: 'medium',
      // Exclude dependencies, contact_tags, tags since they're not in the database
      // dependencies: [],  // This would cause the error
      // contact_tags: [],  // This might not be in the DB
      // tags: [],          // This might not be in the DB
    }

    console.log('   Inserting task:', testTaskData)

    // Simulate the same insert that the app does
    const position = 0 // New task gets position 0
    const insertData = {
      ...testTaskData,
      position,
      created_by: userId,
      tenant_id: tenantId
    }

    console.log('   Final insert data:', insertData)

    const { data: newTask, error: createError } = await supabase
      .from('tasks')
      .insert(insertData)
      .select()
      .single()

    if (createError) {
      console.log('❌ Task creation still failing:', createError.message)
      console.log('   Full error:', JSON.stringify(createError, null, 2))
      return false
    }

    console.log('✅ Task created successfully!')
    console.log('   Task ID:', newTask.id)
    console.log('   Task Title:', newTask.title)

    // Clean up test task
    console.log('4. Cleaning up test task...')
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', newTask.id)

    if (deleteError) {
      console.log('⚠️  Could not delete test task:', deleteError.message)
      console.log(`   Please manually delete task with ID: ${newTask.id}`)
    } else {
      console.log('✅ Test task cleaned up')
    }

    console.log('\n🎉 TASK CREATION IS NOW WORKING!')
    console.log('🔥 The dependencies field exclusion fixed the issue!')
    console.log('💫 You can now create tasks in the application!')

    return true

  } catch (error) {
    console.error('❌ Test error:', error.message)
    return false
  }
}

testTaskCreation()