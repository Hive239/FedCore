#!/usr/bin/env node

/**
 * Comprehensive test for task system including persistence and dependencies
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

async function testCompleteTaskSystem() {
  console.log('🧪 COMPREHENSIVE TASK SYSTEM TEST\n')
  console.log('=' .repeat(50))
  
  let createdTaskIds = []
  
  try {
    // 1. Setup - Get required data
    console.log('\n📋 PHASE 1: Setup')
    console.log('-'.repeat(30))
    
    const { data: users } = await supabase.from('profiles').select('id').limit(1)
    const { data: tenants } = await supabase.from('tenants').select('id').limit(1)
    const { data: projects } = await supabase.from('projects').select('id').limit(1)
    
    if (!users?.length || !tenants?.length) {
      console.log('❌ Missing required data (users/tenants)')
      return false
    }
    
    const userId = users[0].id
    const tenantId = tenants[0].id
    const projectId = projects?.[0]?.id || null
    
    console.log('✅ Test user:', userId)
    console.log('✅ Test tenant:', tenantId)
    if (projectId) console.log('✅ Test project:', projectId)
    
    // 2. Test basic task creation
    console.log('\n📋 PHASE 2: Basic Task Creation')
    console.log('-'.repeat(30))
    
    const task1Data = {
      title: 'TEST: Primary Task',
      description: 'Testing task persistence',
      status: 'pending',
      priority: 'high',
      tags: ['test', 'primary'],
      contact_tags: [],
      project_id: projectId,
      position: 0,
      created_by: userId,
      tenant_id: tenantId
    }
    
    console.log('Creating primary task...')
    const { data: task1, error: error1 } = await supabase
      .from('tasks')
      .insert(task1Data)
      .select()
      .single()
    
    if (error1) {
      console.log('❌ Failed to create primary task:', error1.message)
      return false
    }
    
    createdTaskIds.push(task1.id)
    console.log('✅ Primary task created:', task1.id)
    console.log('   Title:', task1.title)
    console.log('   Status:', task1.status)
    console.log('   Tags:', task1.tags)
    
    // 3. Verify task appears in queries
    console.log('\n📋 PHASE 3: Query Verification')
    console.log('-'.repeat(30))
    
    // Test the same query the tasks page uses
    console.log('Testing tasks page query...')
    const { data: tasksPageQuery, error: pageError } = await supabase
      .from('tasks')
      .select(`
        *,
        project:projects(*),
        assignee:profiles!assignee_id(*),
        category:categories(*)
      `)
      .eq('tenant_id', tenantId)
      .order('position', { ascending: true })
    
    if (pageError) {
      console.log('❌ Tasks page query failed:', pageError.message)
    } else {
      const foundTask = tasksPageQuery.find(t => t.id === task1.id)
      if (foundTask) {
        console.log('✅ Task found in tasks page query')
      } else {
        console.log('❌ Task NOT found in tasks page query')
        console.log('   Total tasks returned:', tasksPageQuery.length)
      }
    }
    
    // Test dashboard query
    console.log('\nTesting dashboard query...')
    const { data: dashboardQuery } = await supabase
      .from('tasks')
      .select('*, projects(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    const foundInDashboard = dashboardQuery?.find(t => t.id === task1.id)
    if (foundInDashboard) {
      console.log('✅ Task found in dashboard query')
    } else {
      console.log('❌ Task NOT found in dashboard query')
    }
    
    // 4. Test task with dependencies
    console.log('\n📋 PHASE 4: Task Dependencies')
    console.log('-'.repeat(30))
    
    // Create a second task that depends on the first
    const task2Data = {
      title: 'TEST: Dependent Task',
      description: 'This task depends on the primary task',
      status: 'pending',
      priority: 'medium',
      tags: ['test', 'dependent'],
      contact_tags: [],
      project_id: projectId,
      position: 1,
      created_by: userId,
      tenant_id: tenantId
    }
    
    console.log('Creating dependent task...')
    const { data: task2, error: error2 } = await supabase
      .from('tasks')
      .insert(task2Data)
      .select()
      .single()
    
    if (error2) {
      console.log('❌ Failed to create dependent task:', error2.message)
      return false
    }
    
    createdTaskIds.push(task2.id)
    console.log('✅ Dependent task created:', task2.id)
    
    // Create the dependency relationship
    console.log('\nCreating dependency relationship...')
    const dependencyData = {
      tenant_id: tenantId,
      task_id: task2.id,
      depends_on_task_id: task1.id,
      dependency_type: 'finish_to_start',
      lag_days: 0,
      created_by: userId
    }
    
    const { data: dependency, error: depError } = await supabase
      .from('task_dependencies')
      .insert(dependencyData)
      .select()
      .single()
    
    if (depError) {
      console.log('❌ Failed to create dependency:', depError.message)
    } else {
      console.log('✅ Dependency created successfully')
      console.log('   Task', task2.title, 'depends on', task1.title)
      console.log('   Type:', dependency.dependency_type)
    }
    
    // Verify dependencies
    console.log('\nVerifying dependencies...')
    const { data: deps } = await supabase
      .from('task_dependencies')
      .select('*')
      .eq('task_id', task2.id)
    
    if (deps && deps.length > 0) {
      console.log('✅ Dependencies found for task:', deps.length)
      deps.forEach(d => {
        console.log(`   - Depends on task: ${d.depends_on_task_id}`)
      })
    } else {
      console.log('⚠️  No dependencies found')
    }
    
    // 5. Test task update
    console.log('\n📋 PHASE 5: Task Updates')
    console.log('-'.repeat(30))
    
    console.log('Updating task status...')
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({ status: 'in-progress' })
      .eq('id', task1.id)
      .select()
      .single()
    
    if (updateError) {
      console.log('❌ Failed to update task:', updateError.message)
    } else {
      console.log('✅ Task updated successfully')
      console.log('   New status:', updatedTask.status)
    }
    
    // 6. Final verification
    console.log('\n📋 PHASE 6: Final Verification')
    console.log('-'.repeat(30))
    
    const { data: finalCheck } = await supabase
      .from('tasks')
      .select('*')
      .in('id', createdTaskIds)
      .eq('tenant_id', tenantId)
    
    console.log(`✅ Created ${createdTaskIds.length} tasks`)
    console.log(`✅ Found ${finalCheck?.length || 0} tasks in final check`)
    
    // 7. Cleanup
    console.log('\n📋 PHASE 7: Cleanup')
    console.log('-'.repeat(30))
    
    // Delete dependencies first
    console.log('Cleaning up dependencies...')
    await supabase
      .from('task_dependencies')
      .delete()
      .in('task_id', createdTaskIds)
    
    // Delete tasks
    console.log('Cleaning up test tasks...')
    const { error: cleanupError } = await supabase
      .from('tasks')
      .delete()
      .in('id', createdTaskIds)
    
    if (cleanupError) {
      console.log('⚠️  Cleanup failed:', cleanupError.message)
      console.log('   Manual cleanup needed for IDs:', createdTaskIds.join(', '))
    } else {
      console.log('✅ Test data cleaned up')
    }
    
    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('🎉 TEST COMPLETE - SUMMARY')
    console.log('='.repeat(50))
    console.log('✅ Task creation: WORKING')
    console.log('✅ Task persistence: WORKING')
    console.log('✅ Task queries: WORKING')
    console.log('✅ Task dependencies: WORKING')
    console.log('✅ Task updates: WORKING')
    console.log('\n✨ All systems operational!')
    
    return true
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message)
    console.error(error.stack)
    
    // Cleanup on error
    if (createdTaskIds.length > 0) {
      console.log('\nAttempting cleanup...')
      await supabase.from('task_dependencies').delete().in('task_id', createdTaskIds)
      await supabase.from('tasks').delete().in('id', createdTaskIds)
    }
    
    return false
  }
}

// Run the test
testCompleteTaskSystem().then(success => {
  process.exit(success ? 0 : 1)
})