const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testDependencies() {
  console.log('Testing task dependencies with live data...\n')
  
  // 1. Fetch all tasks with their dependencies
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select(`
      id,
      title,
      status,
      position,
      project_id,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (tasksError) {
    console.error('Error fetching tasks:', tasksError)
    return
  }
  
  console.log(`Found ${tasks.length} recent tasks:`)
  tasks.forEach(task => {
    console.log(`- ${task.title} (${task.status}) - ID: ${task.id}`)
  })
  
  // 2. Check task_dependencies table
  const { data: dependencies, error: depError } = await supabase
    .from('task_dependencies')
    .select(`
      id,
      task_id,
      depends_on_task_id,
      dependency_type,
      lag_days,
      created_at
    `)
    .order('created_at', { ascending: false })
  
  if (depError) {
    console.error('Error fetching dependencies:', depError)
    return
  }
  
  console.log(`\nFound ${dependencies.length} task dependencies:`)
  
  if (dependencies.length > 0) {
    for (const dep of dependencies) {
      // Get task titles for better readability
      const { data: task } = await supabase
        .from('tasks')
        .select('title')
        .eq('id', dep.task_id)
        .single()
      
      const { data: dependsOn } = await supabase
        .from('tasks')
        .select('title')
        .eq('id', dep.depends_on_task_id)
        .single()
      
      console.log(`- "${task?.title || dep.task_id}" depends on "${dependsOn?.title || dep.depends_on_task_id}"`)
      console.log(`  Type: ${dep.dependency_type}, Lag: ${dep.lag_days} days`)
    }
  } else {
    console.log('No dependencies found. Creating test dependencies...')
    
    // Create dependencies between existing tasks
    if (tasks.length >= 2) {
      const newDep = {
        task_id: tasks[0].id,
        depends_on_task_id: tasks[1].id,
        dependency_type: 'finish_to_start',
        lag_days: 0,
        tenant_id: tasks[0].tenant_id || null,
        created_by: tasks[0].created_by || null
      }
      
      const { data: created, error: createError } = await supabase
        .from('task_dependencies')
        .insert(newDep)
        .select()
      
      if (createError) {
        console.error('Error creating dependency:', createError)
      } else {
        console.log(`\nCreated dependency: "${tasks[0].title}" depends on "${tasks[1].title}"`)
      }
    }
  }
  
  // 3. Test status transitions
  console.log('\n--- Testing Status Transitions ---')
  const statuses = ['pending', 'in_progress', 'completed', 'cancelled']
  
  if (tasks.length > 0) {
    const testTask = tasks[0]
    console.log(`\nTesting status transition for: "${testTask.title}"`)
    console.log(`Current status: ${testTask.status}`)
    
    // Move to in-progress (with hyphen, not underscore)
    const newStatus = testTask.status === 'pending' ? 'in-progress' : 
                      testTask.status === 'in-progress' ? 'completed' : 'pending'
    
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', testTask.id)
    
    if (updateError) {
      console.log('Error updating status:', updateError)
    } else {
      console.log(`Successfully transitioned to: ${newStatus}`)
      
      // Verify the update
      const { data: updated } = await supabase
        .from('tasks')
        .select('status')
        .eq('id', testTask.id)
        .single()
      
      console.log(`Verified status is now: ${updated.status}`)
    }
  }
  
  // 4. Check for demo data
  console.log('\n--- Checking for Demo Data ---')
  const { data: demoTasks } = await supabase
    .from('tasks')
    .select('id, title')
    .or('title.ilike.%demo%,title.ilike.%test%,title.ilike.%sample%')
  
  if (demoTasks && demoTasks.length > 0) {
    console.log(`Found ${demoTasks.length} potential demo tasks:`)
    demoTasks.forEach(task => console.log(`- ${task.title}`))
  } else {
    console.log('No obvious demo data found in tasks')
  }
  
  console.log('\n✅ Task dependency test complete!')
}

testDependencies().catch(console.error)