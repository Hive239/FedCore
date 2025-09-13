// FIND THE REAL USER'S DATA
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function findRealUserData() {
  console.log('FINDING DATA FOR THE CORRECT USER: mparish@meridianswfl.com')
  console.log('='.repeat(80))
  
  // Step 1: Find the CORRECT user
  const { data: users, error: userError } = await supabase
    .from('profiles')
    .select('*')
    .or('email.eq.mparish@meridianswfl.com,email.ilike.%mparish%,email.ilike.%meridian%')
  
  console.log('\nSEARCHING FOR USER ACCOUNTS:')
  if (users && users.length > 0) {
    users.forEach(u => {
      console.log(`Found user: ${u.email} (ID: ${u.id})`)
    })
  } else {
    console.log('NO USER FOUND WITH EMAIL mparish@meridianswfl.com')
    console.log('\nLet me check ALL users in the database:')
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('id, email, full_name')
    
    console.log('ALL USERS IN DATABASE:')
    allUsers?.forEach(u => {
      console.log(`  - ${u.email || 'no email'} (${u.full_name || 'no name'}) - ID: ${u.id}`)
    })
  }
  
  // Let's also check what user owns the data
  console.log('\n' + '='.repeat(80))
  console.log('CHECKING WHO OWNS THE EXISTING DATA:')
  
  // Check projects
  const { data: projects } = await supabase
    .from('projects')
    .select('name, created_by, tenant_id')
  
  if (projects && projects.length > 0) {
    console.log('\nPROJECTS AND THEIR OWNERS:')
    for (const p of projects) {
      const { data: owner } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', p.created_by)
        .single()
      console.log(`  - ${p.name}: owned by ${owner?.email || 'unknown'} (${p.created_by})`)
    }
  }
  
  // Check tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('title, created_by')
    .limit(5)
  
  if (tasks && tasks.length > 0) {
    console.log('\nTASKS AND THEIR OWNERS (first 5):')
    for (const t of tasks) {
      const { data: owner } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', t.created_by)
        .single()
      console.log(`  - ${t.title}: owned by ${owner?.email || 'unknown'} (${t.created_by})`)
    }
  }
  
  // Check if mparish@meridianswfl.com needs to be created
  console.log('\n' + '='.repeat(80))
  console.log('WHAT TO DO NEXT:')
  console.log('='.repeat(80))
  
  const mparishUser = users?.find(u => u.email === 'mparish@meridianswfl.com')
  
  if (!mparishUser) {
    console.log('\n❌ USER mparish@meridianswfl.com DOES NOT EXIST')
    console.log('\nYou need to:')
    console.log('1. Sign up with mparish@meridianswfl.com')
    console.log('2. Then we can assign all the data to that account')
    console.log('\nOR if you want to use admin@projectpro.com:')
    console.log('1. Log in as admin@projectpro.com')
    console.log('2. The data is already there for that account')
  } else {
    console.log('\n✅ USER mparish@meridianswfl.com EXISTS')
    console.log(`User ID: ${mparishUser.id}`)
    
    // Check what tenant they have
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('*')
      .eq('user_id', mparishUser.id)
    
    if (userTenants && userTenants.length > 0) {
      console.log(`\nUser's tenant: ${userTenants[0].tenant_id}`)
      
      // Check what data exists for their tenant
      const tenantId = userTenants[0].tenant_id
      
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
      
      const { count: taskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
      
      const { count: vendorCount } = await supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
      
      const { count: eventCount } = await supabase
        .from('schedule_events')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
      
      console.log('\nData for mparish@meridianswfl.com:')
      console.log(`  - Projects: ${projectCount}`)
      console.log(`  - Tasks: ${taskCount}`)
      console.log(`  - Contacts: ${vendorCount}`)
      console.log(`  - Events: ${eventCount}`)
      
      if (projectCount === 0 && taskCount === 0) {
        console.log('\n⚠️  This user has NO DATA')
        console.log('We need to transfer the data from admin@projectpro.com to this user')
      }
    } else {
      console.log('\n⚠️  User has no tenant assigned')
    }
  }
}

findRealUserData().then(() => {
  process.exit(0)
}).catch(err => {
  console.error('Error:', err)
  process.exit(1)
})