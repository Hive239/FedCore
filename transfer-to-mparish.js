// TRANSFER ALL DATA TO mparish@meridianswfl.com
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function transferToMparish() {
  console.log('TRANSFERRING ALL DATA TO mparish@meridianswfl.com')
  console.log('='.repeat(80))
  
  // Step 1: Find mparish user
  let { data: mparishUser } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'mparish@meridianswfl.com')
    .single()
  
  if (!mparishUser) {
    console.log('User mparish@meridianswfl.com not found in profiles.')
    console.log('Checking auth.users table...')
    
    // Check auth.users table directly
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const authUser = authUsers?.users?.find(u => u.email === 'mparish@meridianswfl.com')
    
    if (authUser) {
      console.log('Found in auth.users! Creating profile...')
      // Create profile for existing auth user
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          email: 'mparish@meridianswfl.com',
          full_name: 'Matthew Parish',
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (profileError) {
        console.error('Error creating profile:', profileError)
        return
      }
      
      mparishUser = newProfile
      console.log('Profile created for mparish@meridianswfl.com')
    } else {
      console.log('\n❌ User mparish@meridianswfl.com does not exist at all.')
      console.log('Please sign up with mparish@meridianswfl.com first, then run this script again.')
      return
    }
  }
  
  const userId = mparishUser.id
  console.log('Found user mparish@meridianswfl.com - ID:', userId)
  
  // Step 2: Get or create tenant for mparish
  let { data: userTenant } = await supabase
    .from('user_tenants')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  let tenantId
  
  if (!userTenant) {
    console.log('Creating tenant for mparish...')
    
    // Use the existing Meridian Contracting tenant or create it
    let { data: meridianTenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('name', 'Meridian Contracting')
      .single()
    
    if (!meridianTenant) {
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: 'Meridian Contracting',
          slug: 'meridian-contracting'
        })
        .select()
        .single()
      
      if (tenantError) {
        console.error('Error creating tenant:', tenantError)
        return
      }
      meridianTenant = newTenant
    }
    
    tenantId = meridianTenant.id
    
    // Assign mparish to this tenant
    const { error: assignError } = await supabase
      .from('user_tenants')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        role: 'owner',
        is_default: true,
        status: 'active'
      })
    
    if (assignError) {
      console.error('Error assigning tenant:', assignError)
      return
    }
    
    console.log('Assigned to Meridian Contracting tenant:', tenantId)
  } else {
    tenantId = userTenant.tenant_id
    console.log('Using existing tenant:', tenantId)
  }
  
  // Step 3: Transfer ALL data to this tenant and user
  console.log('\nTransferring all data...')
  
  // Transfer all projects
  const { error: projectError } = await supabase
    .from('projects')
    .update({
      tenant_id: tenantId,
      created_by: userId,
      updated_at: new Date().toISOString()
    })
    .or('tenant_id.neq.' + tenantId + ',created_by.neq.' + userId)
  
  if (!projectError) {
    console.log('✅ Transferred all projects')
  }
  
  // Transfer all tasks
  const { error: taskError } = await supabase
    .from('tasks')
    .update({
      tenant_id: tenantId,
      created_by: userId,
      updated_at: new Date().toISOString()
    })
    .or('tenant_id.neq.' + tenantId + ',created_by.neq.' + userId)
  
  if (!taskError) {
    console.log('✅ Transferred all tasks')
  }
  
  // Transfer all vendors/contacts
  const { error: vendorError } = await supabase
    .from('vendors')
    .update({
      tenant_id: tenantId,
      created_by: userId,
      updated_at: new Date().toISOString()
    })
    .or('tenant_id.neq.' + tenantId + ',created_by.neq.' + userId)
  
  if (!vendorError) {
    console.log('✅ Transferred all contacts')
  }
  
  // Transfer all schedule events  
  const { error: eventError } = await supabase
    .from('schedule_events')
    .update({
      tenant_id: tenantId,
      created_by: userId,
      updated_at: new Date().toISOString()
    })
    .or('tenant_id.neq.' + tenantId + ',created_by.neq.' + userId)
  
  if (!eventError) {
    console.log('✅ Transferred all calendar events')
  }
  
  // Transfer all documents
  const { error: docError } = await supabase
    .from('documents')
    .update({
      tenant_id: tenantId,
      uploaded_by: userId,
      updated_at: new Date().toISOString()
    })
    .or('tenant_id.neq.' + tenantId + ',uploaded_by.neq.' + userId)
  
  if (!docError) {
    console.log('✅ Transferred all documents')
  }
  
  // Transfer all messages
  const { error: msgError } = await supabase
    .from('messages')
    .update({
      tenant_id: tenantId,
      user_id: userId,
      updated_at: new Date().toISOString()
    })
    .or('tenant_id.neq.' + tenantId + ',user_id.neq.' + userId)
  
  if (!msgError) {
    console.log('✅ Transferred all messages')
  }
  
  // Step 4: Verify the transfer
  console.log('\n' + '='.repeat(80))
  console.log('VERIFYING DATA FOR mparish@meridianswfl.com:')
  console.log('='.repeat(80))
  
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
  
  console.log(`\n✅ Projects: ${projectCount}`)
  console.log(`✅ Tasks: ${taskCount}`)
  console.log(`✅ Contacts: ${vendorCount}`)
  console.log(`✅ Calendar Events: ${eventCount}`)
  
  console.log('\n' + '='.repeat(80))
  console.log('ALL DATA TRANSFERRED TO mparish@meridianswfl.com!')
  console.log('='.repeat(80))
  console.log('\nYour User ID:', userId)
  console.log('Your Tenant ID:', tenantId)
  console.log('\nLog in with mparish@meridianswfl.com and all your data will be there.')
}

transferToMparish().then(() => {
  console.log('\n✅ Transfer complete')
  process.exit(0)
}).catch(err => {
  console.error('Transfer failed:', err)
  process.exit(1)
})