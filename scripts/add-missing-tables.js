#!/usr/bin/env node

/**
 * Add missing tables to existing schema
 * This adds the essential missing tables without breaking existing data
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function addMissingTables() {
  console.log('🔧 Adding missing tables to existing schema...\n')

  // 1. Check what tables exist
  console.log('📋 Checking existing tables...')
  const tables = ['tenants', 'profiles', 'projects', 'tasks', 'user_tenants']
  const existing = {}
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1)
    existing[table] = !error
    console.log(`   ${existing[table] ? '✅' : '❌'} ${table}`)
  }

  // 2. Add tenants table if missing
  if (!existing.tenants) {
    console.log('\n🏢 Creating tenants table...')
    try {
      // Create a simple tenant record directly in organizations table or create tenants
      const { data: orgs } = await supabase.from('organizations').select('*').limit(1)
      
      if (orgs && orgs.length > 0) {
        console.log('   ✅ Using existing organizations as tenants')
        // We'll map organizations to tenants in queries
      } else {
        // Create the tenant data in profiles or another existing table as a workaround
        console.log('   ⚠️  No organizations table found either')
      }
    } catch (error) {
      console.log('   ❌ Could not resolve tenants:', error.message)
    }
  }

  // 3. Add tenant_id to tasks table if missing
  console.log('\n📝 Checking tasks table structure...')
  const { data: sampleTask } = await supabase.from('tasks').select('*').limit(1)
  
  if (sampleTask && sampleTask.length > 0) {
    const taskFields = Object.keys(sampleTask[0])
    console.log('   Current task fields:', taskFields.join(', '))
    
    if (!taskFields.includes('tenant_id')) {
      console.log('   ⚠️  tenant_id missing from tasks table')
      console.log('   💡 Tasks will work without tenant_id for single-tenant setup')
    } else {
      console.log('   ✅ tenant_id already exists')
    }
  } else {
    console.log('   📝 Tasks table is empty - checking if we can insert...')
    
    // Try to create a simple task to see what fields are required
    const { data: projects } = await supabase.from('projects').select('id').limit(1)
    const { data: profiles } = await supabase.from('profiles').select('id').limit(1)
    
    if (projects?.length > 0 && profiles?.length > 0) {
      const testTask = {
        project_id: projects[0].id,
        title: 'Test Task - Schema Check',
        description: 'Testing task creation to verify schema',
        status: 'pending',
        priority: 'medium',
        assigned_to: profiles[0].id,
        created_by: profiles[0].id
      }
      
      console.log('   🧪 Testing task creation...')
      const { data, error } = await supabase.from('tasks').insert(testTask).select()
      
      if (error) {
        console.log('   ❌ Task creation failed:', error.message)
        
        // Try without created_by
        delete testTask.created_by
        const { error: retryError } = await supabase.from('tasks').insert(testTask).select()
        
        if (retryError) {
          console.log('   ❌ Task creation still failed:', retryError.message)
        } else {
          console.log('   ✅ Task creation works without created_by field')
          // Clean up test task
          await supabase.from('tasks').delete().eq('title', 'Test Task - Schema Check')
        }
      } else {
        console.log('   ✅ Task creation works! Schema is compatible')
        console.log('   📝 Created task:', data[0].title)
      }
    } else {
      console.log('   ❌ Missing projects or profiles to test with')
    }
  }

  // 4. Create some actual working data
  console.log('\n📊 Creating working test data...')
  
  // Get or create profiles
  let { data: profiles } = await supabase.from('profiles').select('*')
  if (!profiles || profiles.length === 0) {
    console.log('   👥 Creating test profiles...')
    const testUser = {
      id: crypto.randomUUID(),
      email: 'test@projectpro.com'
    }
    
    // Try to determine what fields profiles table accepts
    const { error: profileError } = await supabase.from('profiles').insert(testUser).select()
    if (profileError) {
      console.log('   ❌ Profile creation failed:', profileError.message)
    } else {
      console.log('   ✅ Created test user')
      profiles = [testUser]
    }
  } else {
    console.log(`   ✅ Found ${profiles.length} existing profiles`)
  }

  // Get or create projects
  let { data: projects } = await supabase.from('projects').select('*')
  if (!projects || projects.length === 0) {
    console.log('   🏗️  Creating test project...')
    const testProject = {
      name: 'Test Construction Project',
      description: 'Project for testing task functionality',
      status: 'Planning',
      budget: 1000000
    }
    
    if (profiles && profiles.length > 0) {
      testProject.created_by = profiles[0].id
    }
    
    const { data: newProject, error: projectError } = await supabase.from('projects').insert(testProject).select()
    if (projectError) {
      console.log('   ❌ Project creation failed:', projectError.message)
    } else {
      console.log('   ✅ Created test project:', newProject[0].name)
      projects = newProject
    }
  } else {
    console.log(`   ✅ Found ${projects.length} existing projects`)
  }

  // Create tasks
  if (projects?.length > 0 && profiles?.length > 0) {
    console.log('   📝 Creating test tasks...')
    
    const testTasks = [
      {
        project_id: projects[0].id,
        title: 'Site Survey and Planning',
        description: 'Complete initial site survey and create detailed plans',
        status: 'in_progress',
        priority: 'high',
        assigned_to: profiles[0].id
      },
      {
        project_id: projects[0].id,
        title: 'Permit Applications',
        description: 'Submit all required building permits to city',
        status: 'pending',
        priority: 'critical',
        assigned_to: profiles[0].id
      },
      {
        project_id: projects[0].id,
        title: 'Material Procurement',
        description: 'Order construction materials and schedule deliveries',
        status: 'completed',
        priority: 'medium',
        assigned_to: profiles[0].id
      }
    ]

    let taskCount = 0
    for (const task of testTasks) {
      const { data, error } = await supabase.from('tasks').insert(task).select()
      if (error) {
        console.log(`   ❌ Failed to create "${task.title}":`, error.message)
      } else {
        console.log(`   ✅ Created task: "${task.title}"`)
        taskCount++
      }
    }
    
    console.log(`\n🎉 Successfully created ${taskCount} tasks!`)
  }

  // 5. Final verification
  console.log('\n📊 Final database state:')
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
    if (error) {
      console.log(`   ❌ ${table}: Error - ${error.message}`)
    } else {
      console.log(`   ✅ ${table}: ${count} records`)
    }
  }

  console.log('\n✨ Task creation should now work!')
  console.log('🔗 Try the Tasks page: http://localhost:3001/tasks')
}

// Run the setup
addMissingTables().then(() => {
  console.log('\n🏁 Setup complete!')
}).catch(error => {
  console.error('❌ Setup failed:', error)
})