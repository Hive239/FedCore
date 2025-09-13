// Script to check ALL data in the database
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkAllData() {
  console.log('='.repeat(80))
  console.log('CHECKING ALL DATA IN DATABASE')
  console.log('='.repeat(80))
  
  // Get admin user
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', 'admin@projectpro.com')
    .single()
  
  const userId = users?.id
  console.log('\n👤 Admin User ID:', userId)
  
  // Get all tenants
  console.log('\n📊 ALL TENANTS:')
  const { data: tenants } = await supabase
    .from('tenants')
    .select('*')
  console.table(tenants)
  
  // Get user's tenant assignments
  console.log('\n🔗 USER TENANT ASSIGNMENTS:')
  const { data: userTenants } = await supabase
    .from('user_tenants')
    .select('*')
    .eq('user_id', userId)
  console.table(userTenants)
  
  const tenantId = userTenants?.[0]?.tenant_id
  console.log('\n✅ Your Tenant ID:', tenantId)
  
  // Check ALL projects regardless of tenant
  console.log('\n' + '='.repeat(80))
  console.log('📁 ALL PROJECTS IN DATABASE:')
  const { data: allProjects, count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact' })
  
  console.log(`Total projects found: ${projectCount}`)
  if (allProjects && allProjects.length > 0) {
    allProjects.forEach(p => {
      console.log(`  - ${p.name} (ID: ${p.id}, Tenant: ${p.tenant_id}, Created by: ${p.created_by})`)
    })
  }
  
  // Check projects for YOUR tenant
  console.log('\n📁 PROJECTS FOR YOUR TENANT:')
  const { data: yourProjects } = await supabase
    .from('projects')
    .select('*')
    .eq('tenant_id', tenantId)
  
  if (yourProjects && yourProjects.length > 0) {
    console.table(yourProjects.map(p => ({
      name: p.name,
      id: p.id,
      status: p.status,
      tenant_id: p.tenant_id
    })))
  } else {
    console.log('  ❌ No projects found for your tenant')
  }
  
  // Check ALL vendors/contacts regardless of tenant
  console.log('\n' + '='.repeat(80))
  console.log('👥 ALL CONTACTS/VENDORS IN DATABASE:')
  const { data: allVendors, count: vendorCount } = await supabase
    .from('vendors')
    .select('*', { count: 'exact' })
  
  console.log(`Total vendors/contacts found: ${vendorCount}`)
  if (allVendors && allVendors.length > 0) {
    allVendors.forEach(v => {
      console.log(`  - ${v.name} (Type: ${v.contact_type}, Tenant: ${v.tenant_id}, Created by: ${v.created_by})`)
    })
  }
  
  // Check vendors for YOUR tenant
  console.log('\n👥 CONTACTS FOR YOUR TENANT:')
  const { data: yourVendors } = await supabase
    .from('vendors')
    .select('*')
    .eq('tenant_id', tenantId)
  
  if (yourVendors && yourVendors.length > 0) {
    console.table(yourVendors.map(v => ({
      name: v.name,
      type: v.contact_type,
      tenant_id: v.tenant_id
    })))
  } else {
    console.log('  ❌ No contacts found for your tenant')
  }
  
  // Check ALL tasks regardless of tenant
  console.log('\n' + '='.repeat(80))
  console.log('✅ ALL TASKS IN DATABASE:')
  const { data: allTasks, count: taskCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact' })
  
  console.log(`Total tasks found: ${taskCount}`)
  if (allTasks && allTasks.length > 0) {
    allTasks.forEach(t => {
      console.log(`  - ${t.title} (Status: ${t.status}, Tenant: ${t.tenant_id}, Created by: ${t.created_by})`)
    })
  }
  
  // Check tasks for YOUR tenant
  console.log('\n✅ TASKS FOR YOUR TENANT:')
  const { data: yourTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('tenant_id', tenantId)
  
  if (yourTasks && yourTasks.length > 0) {
    console.table(yourTasks.map(t => ({
      title: t.title,
      status: t.status,
      tenant_id: t.tenant_id
    })))
  } else {
    console.log('  ❌ No tasks found for your tenant')
  }
  
  // Check ALL schedule events regardless of tenant
  console.log('\n' + '='.repeat(80))
  console.log('📅 ALL SCHEDULE EVENTS IN DATABASE:')
  const { data: allEvents, count: eventCount } = await supabase
    .from('schedule_events')
    .select('*', { count: 'exact' })
  
  console.log(`Total events found: ${eventCount}`)
  if (allEvents && allEvents.length > 0) {
    allEvents.forEach(e => {
      console.log(`  - ${e.title} (Date: ${e.start_time}, Tenant: ${e.tenant_id}, Created by: ${e.created_by})`)
    })
  }
  
  // Check events for YOUR tenant
  console.log('\n📅 EVENTS FOR YOUR TENANT:')
  const { data: yourEvents } = await supabase
    .from('schedule_events')
    .select('*')
    .eq('tenant_id', tenantId)
  
  if (yourEvents && yourEvents.length > 0) {
    console.table(yourEvents.map(e => ({
      title: e.title,
      start: e.start_time,
      tenant_id: e.tenant_id
    })))
  } else {
    console.log('  ❌ No events found for your tenant')
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('SUMMARY:')
  console.log('='.repeat(80))
  console.log(`Your User ID: ${userId}`)
  console.log(`Your Tenant ID: ${tenantId}`)
  console.log(`\nTotal counts in database:`)
  console.log(`  - Projects: ${projectCount}`)
  console.log(`  - Contacts: ${vendorCount}`)
  console.log(`  - Tasks: ${taskCount}`)
  console.log(`  - Events: ${eventCount}`)
  
  // If data exists but not under your tenant, offer to migrate it
  const orphanedData = {
    projects: allProjects?.filter(p => p.tenant_id !== tenantId && (p.created_by === userId || !p.tenant_id)) || [],
    vendors: allVendors?.filter(v => v.tenant_id !== tenantId && (v.created_by === userId || !v.tenant_id)) || [],
    tasks: allTasks?.filter(t => t.tenant_id !== tenantId && (t.created_by === userId || !t.tenant_id)) || [],
    events: allEvents?.filter(e => e.tenant_id !== tenantId && (e.created_by === userId || !e.tenant_id)) || []
  }
  
  const hasOrphanedData = orphanedData.projects.length > 0 || 
                          orphanedData.vendors.length > 0 || 
                          orphanedData.tasks.length > 0 || 
                          orphanedData.events.length > 0
  
  if (hasOrphanedData) {
    console.log('\n⚠️  FOUND DATA NOT ASSIGNED TO YOUR TENANT:')
    console.log(`  - Projects: ${orphanedData.projects.length}`)
    console.log(`  - Contacts: ${orphanedData.vendors.length}`)
    console.log(`  - Tasks: ${orphanedData.tasks.length}`)
    console.log(`  - Events: ${orphanedData.events.length}`)
    console.log('\nThis data needs to be migrated to your tenant.')
  }
}

checkAllData().then(() => {
  process.exit(0)
}).catch(err => {
  console.error('Error:', err)
  process.exit(1)
})