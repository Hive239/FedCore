const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function removeDemoData() {
  console.log('Scanning for and removing demo data...\n')
  
  // Check for demo/test tasks
  const { data: demoTasks } = await supabase
    .from('tasks')
    .select('id, title')
    .or('title.ilike.%demo%,title.ilike.%test%,title.ilike.%sample%,title.ilike.%example%')
  
  if (demoTasks && demoTasks.length > 0) {
    console.log(`Found ${demoTasks.length} demo tasks to remove:`)
    for (const task of demoTasks) {
      console.log(`- ${task.title}`)
      
      // Remove dependencies first
      await supabase
        .from('task_dependencies')
        .delete()
        .or(`task_id.eq.${task.id},depends_on_task_id.eq.${task.id}`)
      
      // Then remove the task
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id)
      
      if (error) {
        console.error(`  Error removing: ${error.message}`)
      } else {
        console.log(`  ✅ Removed`)
      }
    }
  } else {
    console.log('No demo tasks found')
  }
  
  // Check for demo projects
  const { data: demoProjects } = await supabase
    .from('projects')
    .select('id, name')
    .or('name.ilike.%demo%,name.ilike.%test%,name.ilike.%sample%,name.ilike.%example%')
  
  if (demoProjects && demoProjects.length > 0) {
    console.log(`\nFound ${demoProjects.length} demo projects to remove:`)
    for (const project of demoProjects) {
      console.log(`- ${project.name}`)
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id)
      
      if (error) {
        console.error(`  Error removing: ${error.message}`)
      } else {
        console.log(`  ✅ Removed`)
      }
    }
  } else {
    console.log('\nNo demo projects found')
  }
  
  // Summary of real data
  console.log('\n--- Current Real Data Summary ---')
  
  const { count: taskCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
  
  const { count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
  
  const { count: depCount } = await supabase
    .from('task_dependencies')
    .select('*', { count: 'exact', head: true })
  
  console.log(`Tasks: ${taskCount}`)
  console.log(`Projects: ${projectCount}`)
  console.log(`Task Dependencies: ${depCount}`)
  
  console.log('\n✅ Demo data cleanup complete!')
}

removeDemoData().catch(console.error)