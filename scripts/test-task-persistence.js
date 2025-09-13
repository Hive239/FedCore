#!/usr/bin/env node

/**
 * Test task persistence with tags support
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

async function testTaskPersistence() {
  console.log('🧪 Testing task persistence with tags support...\n')

  try {
    // Get user and tenant for testing
    console.log('1. Getting user and tenant data...')
    const { data: users } = await supabase.from('profiles').select('id').limit(1)
    const { data: tenants } = await supabase.from('tenants').select('id').limit(1)
    const { data: projects } = await supabase.from('projects').select('id').limit(1)

    if (!users?.length || !tenants?.length) {
      console.log('❌ Missing users or tenants for test')
      return false
    }

    const userId = users[0].id
    const tenantId = tenants[0].id
    const projectId = projects?.[0]?.id || null
    
    console.log(`✅ Using user: ${userId}`)
    console.log(`✅ Using tenant: ${tenantId}`)
    if (projectId) console.log(`✅ Using project: ${projectId}`)

    // Check if tags columns exist
    console.log('\n2. Checking if tags columns exist...')
    const { data: taskSample, error: sampleError } = await supabase
      .from('tasks')
      .select('*')
      .limit(1)

    if (sampleError) {
      console.log('❌ Could not query tasks table:', sampleError.message)
      return false
    }

    if (taskSample && taskSample.length > 0) {
      const columns = Object.keys(taskSample[0])
      console.log('   Available columns:', columns.join(', '))
      
      const hasTagsColumn = columns.includes('tags')
      const hasContactTagsColumn = columns.includes('contact_tags')
      
      console.log(`   Has 'tags' column: ${hasTagsColumn ? '✅' : '❌'}`)
      console.log(`   Has 'contact_tags' column: ${hasContactTagsColumn ? '✅' : '❌'}`)
      
      if (!hasTagsColumn || !hasContactTagsColumn) {
        console.log('\n⚠️  IMPORTANT: The tags columns are missing!')
        console.log('   Run this SQL to add them:')
        console.log('   ALTER TABLE public.tasks')
        console.log('   ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT \'[]\',')
        console.log('   ADD COLUMN IF NOT EXISTS contact_tags JSONB DEFAULT \'[]\';')
      }
    } else {
      console.log('   No existing tasks to check columns')
    }

    // Test task creation with tags
    console.log('\n3. Testing task creation with tags...')
    const testTaskData = {
      title: 'TEST TASK - Tags Support',
      description: 'Testing task persistence with tags',
      status: 'pending',
      priority: 'medium',
      tags: ['test', 'persistence', 'debug'],
      contact_tags: [],
      project_id: projectId
    }

    console.log('   Creating task with data:', JSON.stringify(testTaskData, null, 2))

    const position = 999 // High position to keep it at the end
    const insertData = {
      ...testTaskData,
      position,
      created_by: userId,
      tenant_id: tenantId
    }

    const { data: newTask, error: createError } = await supabase
      .from('tasks')
      .insert(insertData)
      .select()
      .single()

    if (createError) {
      console.log('❌ Task creation failed:', createError.message)
      console.log('   Error details:', JSON.stringify(createError, null, 2))
      
      // If tags columns don't exist, try without them
      if (createError.message.includes('tags') || createError.message.includes('contact_tags')) {
        console.log('\n   Retrying without tags...')
        const { tags, contact_tags, ...dataWithoutTags } = insertData
        
        const { data: retryTask, error: retryError } = await supabase
          .from('tasks')
          .insert(dataWithoutTags)
          .select()
          .single()
        
        if (retryError) {
          console.log('   ❌ Task creation still failed:', retryError.message)
          return false
        } else {
          console.log('   ✅ Task created without tags (columns missing)')
          newTask = retryTask
        }
      } else {
        return false
      }
    } else {
      console.log('✅ Task created successfully with tags!')
    }

    console.log('   Task ID:', newTask.id)
    console.log('   Task Title:', newTask.title)
    if (newTask.tags) console.log('   Task Tags:', newTask.tags)

    // Verify the task persists
    console.log('\n4. Verifying task persistence...')
    const { data: verifyTask, error: verifyError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', newTask.id)
      .single()

    if (verifyError || !verifyTask) {
      console.log('❌ Could not retrieve created task:', verifyError?.message)
      return false
    }

    console.log('✅ Task retrieved successfully!')
    console.log('   Verified Title:', verifyTask.title)
    console.log('   Verified Status:', verifyTask.status)
    if (verifyTask.tags) console.log('   Verified Tags:', verifyTask.tags)

    // Clean up test task
    console.log('\n5. Cleaning up test task...')
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

    console.log('\n🎉 TASK PERSISTENCE TEST COMPLETE!')
    console.log('📝 Summary:')
    console.log('   - Tasks are being created in the database')
    console.log('   - Tasks persist and can be retrieved')
    if (newTask.tags !== undefined) {
      console.log('   - Tags support is working')
    } else {
      console.log('   - Tags columns need to be added to the database')
    }

    return true

  } catch (error) {
    console.error('❌ Test error:', error.message)
    console.error(error.stack)
    return false
  }
}

testTaskPersistence()