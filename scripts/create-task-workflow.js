const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createWorkflowWithDependencies() {
  console.log('Creating complete task workflow with dependencies...\n')
  
  // Get user and tenant info
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const user = users[0]
  
  if (!user) {
    console.error('No users found')
    return
  }
  
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()
  
  const tenantId = userTenant?.tenant_id
  
  console.log(`Using user: ${user.email}`)
  console.log(`Tenant ID: ${tenantId}\n`)
  
  // Create a construction project workflow
  const tasks = [
    {
      title: 'Site Preparation',
      description: 'Clear and prepare the construction site',
      status: 'completed',
      priority: 'high',
      position: 0
    },
    {
      title: 'Foundation Work',
      description: 'Pour concrete foundation and let it cure',
      status: 'completed',
      priority: 'high',
      position: 1
    },
    {
      title: 'Frame Construction',
      description: 'Build the structural frame of the building',
      status: 'in-progress',
      priority: 'high',
      position: 2
    },
    {
      title: 'Electrical Rough-In',
      description: 'Install electrical wiring throughout the structure',
      status: 'pending',
      priority: 'medium',
      position: 3
    },
    {
      title: 'Plumbing Installation',
      description: 'Install plumbing pipes and fixtures',
      status: 'pending',
      priority: 'medium',
      position: 4
    },
    {
      title: 'HVAC Installation',
      description: 'Install heating, ventilation, and air conditioning systems',
      status: 'pending',
      priority: 'medium',
      position: 5
    },
    {
      title: 'Insulation',
      description: 'Install insulation in walls and attic',
      status: 'pending',
      priority: 'low',
      position: 6
    },
    {
      title: 'Drywall Installation',
      description: 'Install and finish drywall throughout',
      status: 'pending',
      priority: 'medium',
      position: 7
    },
    {
      title: 'Interior Painting',
      description: 'Paint all interior walls and ceilings',
      status: 'pending',
      priority: 'low',
      position: 8
    },
    {
      title: 'Final Inspection',
      description: 'Complete final inspection and get occupancy permit',
      status: 'pending',
      priority: 'high',
      position: 9
    }
  ]
  
  // Create all tasks
  const createdTasks = []
  for (const taskData of tasks) {
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        ...taskData,
        created_by: user.id,
        tenant_id: tenantId,
        due_date: new Date(Date.now() + (30 + taskData.position * 7) * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error(`Error creating task "${taskData.title}":`, error.message)
    } else {
      createdTasks.push(task)
      console.log(`✅ Created: ${task.title} (${task.status})`)
    }
  }
  
  console.log(`\nCreated ${createdTasks.length} tasks`)
  
  // Define dependencies
  const dependencies = [
    { from: 'Foundation Work', to: 'Site Preparation', type: 'finish_to_start', lag: 2 },
    { from: 'Frame Construction', to: 'Foundation Work', type: 'finish_to_start', lag: 7 },
    { from: 'Electrical Rough-In', to: 'Frame Construction', type: 'finish_to_start', lag: 0 },
    { from: 'Plumbing Installation', to: 'Frame Construction', type: 'finish_to_start', lag: 0 },
    { from: 'HVAC Installation', to: 'Frame Construction', type: 'finish_to_start', lag: 0 },
    { from: 'Insulation', to: 'Electrical Rough-In', type: 'finish_to_start', lag: 0 },
    { from: 'Insulation', to: 'Plumbing Installation', type: 'finish_to_start', lag: 0 },
    { from: 'Drywall Installation', to: 'Insulation', type: 'finish_to_start', lag: 1 },
    { from: 'Interior Painting', to: 'Drywall Installation', type: 'finish_to_start', lag: 3 },
    { from: 'Final Inspection', to: 'Interior Painting', type: 'finish_to_start', lag: 2 }
  ]
  
  console.log('\nCreating task dependencies...')
  
  for (const dep of dependencies) {
    const fromTask = createdTasks.find(t => t.title === dep.from)
    const toTask = createdTasks.find(t => t.title === dep.to)
    
    if (fromTask && toTask) {
      const { error } = await supabase
        .from('task_dependencies')
        .insert({
          task_id: fromTask.id,
          depends_on_task_id: toTask.id,
          dependency_type: dep.type,
          lag_days: dep.lag,
          tenant_id: tenantId,
          created_by: user.id
        })
      
      if (error) {
        console.error(`Error creating dependency: ${dep.from} -> ${dep.to}:`, error.message)
      } else {
        console.log(`✅ ${dep.from} depends on ${dep.to} (${dep.type}, lag: ${dep.lag} days)`)
      }
    }
  }
  
  // Verify dependencies
  console.log('\n--- Verifying Dependencies ---')
  const { data: allDeps } = await supabase
    .from('task_dependencies')
    .select('*')
  
  console.log(`Total dependencies in database: ${allDeps?.length || 0}`)
  
  // Test status transition
  console.log('\n--- Testing Status Transition ---')
  const pendingTask = createdTasks.find(t => t.status === 'pending')
  if (pendingTask) {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'in-progress' })
      .eq('id', pendingTask.id)
    
    if (error) {
      console.error('Error updating status:', error)
    } else {
      console.log(`✅ Successfully transitioned "${pendingTask.title}" from pending to in-progress`)
    }
  }
  
  console.log('\n🎉 Workflow creation complete!')
  console.log('You can now view these tasks and their dependencies in the application.')
}

createWorkflowWithDependencies().catch(console.error)