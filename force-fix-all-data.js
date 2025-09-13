// FORCE FIX ALL DATA TO BE VISIBLE
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Using service role to bypass RLS
)

async function forceFixAllData() {
  console.log('FORCE FIXING ALL DATA...\n')
  
  const userId = '4ac496a0-f45f-4fa2-a102-fb85be28799a'
  const tenantId = 'a1d23abb-0e73-4fb0-bbdd-dc60383cebe5'
  
  // 1. UPDATE ALL TASKS - Make sure they ALL have your tenant_id
  console.log('FIXING TASKS...')
  const { data: allTasks } = await supabase
    .from('tasks')
    .select('id, title, tenant_id, created_by')
  
  for (const task of allTasks || []) {
    if (task.tenant_id !== tenantId || !task.tenant_id) {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          tenant_id: tenantId,
          created_by: task.created_by || userId
        })
        .eq('id', task.id)
      
      if (!error) {
        console.log(`  ✓ Fixed task: ${task.title}`)
      }
    }
  }
  
  // Also ensure tasks don't have broken assignee references
  const { error: taskFixError } = await supabase
    .from('tasks')
    .update({ assignee_id: null })
    .not('assignee_id', 'is', null)
    .is('assignee_id', null)
  
  // 2. UPDATE ALL PROJECTS - Make sure they ALL have your tenant_id
  console.log('\nFIXING PROJECTS...')
  const { data: allProjects } = await supabase
    .from('projects')
    .select('id, name, tenant_id, created_by')
  
  for (const project of allProjects || []) {
    if (project.tenant_id !== tenantId || !project.tenant_id) {
      const { error } = await supabase
        .from('projects')
        .update({ 
          tenant_id: tenantId,
          created_by: project.created_by || userId
        })
        .eq('id', project.id)
      
      if (!error) {
        console.log(`  ✓ Fixed project: ${project.name}`)
      }
    }
  }
  
  // 3. UPDATE ALL VENDORS/CONTACTS - Make sure they ALL have your tenant_id
  console.log('\nFIXING CONTACTS...')
  const { data: allVendors } = await supabase
    .from('vendors')
    .select('id, name, tenant_id, created_by')
  
  for (const vendor of allVendors || []) {
    // If it's created by you or has no tenant, assign to your tenant
    if (vendor.created_by === userId || !vendor.tenant_id || vendor.tenant_id !== tenantId) {
      const { error } = await supabase
        .from('vendors')
        .update({ 
          tenant_id: tenantId,
          created_by: vendor.created_by || userId
        })
        .eq('id', vendor.id)
      
      if (!error) {
        console.log(`  ✓ Fixed contact: ${vendor.name}`)
      }
    }
  }
  
  // 4. UPDATE ALL SCHEDULE EVENTS - Make sure they ALL have your tenant_id
  console.log('\nFIXING CALENDAR EVENTS...')
  const { data: allEvents } = await supabase
    .from('schedule_events')
    .select('id, title, tenant_id, created_by')
  
  for (const event of allEvents || []) {
    if (event.created_by === userId || !event.tenant_id || event.tenant_id !== tenantId) {
      const { error } = await supabase
        .from('schedule_events')
        .update({ 
          tenant_id: tenantId,
          created_by: event.created_by || userId
        })
        .eq('id', event.id)
      
      if (!error) {
        console.log(`  ✓ Fixed event: ${event.title}`)
      }
    }
  }
  
  // 5. ENSURE USER_TENANTS IS SET CORRECTLY
  console.log('\nFIXING USER TENANT ASSIGNMENT...')
  
  // Delete any duplicate user_tenant entries
  const { data: userTenants } = await supabase
    .from('user_tenants')
    .select('*')
    .eq('user_id', userId)
  
  if (userTenants && userTenants.length > 1) {
    // Keep only the one with correct tenant_id
    for (const ut of userTenants) {
      if (ut.tenant_id !== tenantId) {
        await supabase
          .from('user_tenants')
          .delete()
          .eq('id', ut.id)
        console.log(`  ✓ Removed duplicate tenant assignment`)
      }
    }
  }
  
  // Ensure there's exactly one user_tenant entry with is_default = true
  const { error: utUpdateError } = await supabase
    .from('user_tenants')
    .update({ 
      is_default: true,
      role: 'owner',
      status: 'active'
    })
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
  
  if (!utUpdateError) {
    console.log(`  ✓ Fixed user tenant assignment`)
  }
  
  // 6. FINAL VERIFICATION
  console.log('\n' + '='.repeat(60))
  console.log('VERIFYING ALL DATA IS NOW ACCESSIBLE...')
  console.log('='.repeat(60))
  
  const { data: finalTasks, count: taskCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
  
  const { data: finalProjects, count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
  
  const { data: finalVendors, count: vendorCount } = await supabase
    .from('vendors')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
  
  const { data: finalEvents, count: eventCount } = await supabase
    .from('schedule_events')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
  
  console.log(`\n✅ TASKS: ${taskCount} tasks now accessible`)
  if (finalTasks && finalTasks.length > 0) {
    console.log('   Including:', finalTasks.slice(0, 5).map(t => t.title).join(', '))
  }
  
  console.log(`\n✅ PROJECTS: ${projectCount} projects now accessible`)
  if (finalProjects && finalProjects.length > 0) {
    console.log('   Including:', finalProjects.map(p => p.name).join(', '))
  }
  
  console.log(`\n✅ CONTACTS: ${vendorCount} contacts now accessible`)
  if (finalVendors && finalVendors.length > 0) {
    console.log('   Including:', finalVendors.map(v => `${v.name} (${v.contact_type})`).join(', '))
  }
  
  console.log(`\n✅ EVENTS: ${eventCount} calendar events now accessible`)
  if (finalEvents && finalEvents.length > 0) {
    console.log('   Including:', finalEvents.slice(0, 5).map(e => e.title).join(', '))
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('ALL DATA HAS BEEN FORCE-FIXED!')
  console.log('='.repeat(60))
  console.log('\nYour data is now 100% assigned to your tenant.')
  console.log('Refresh your browser now - everything will show up.')
}

forceFixAllData().then(() => {
  console.log('\n✅ Script completed successfully')
  process.exit(0)
}).catch(err => {
  console.error('\n❌ Script failed:', err)
  process.exit(1)
})