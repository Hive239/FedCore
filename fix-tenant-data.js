// Script to fix existing data by adding tenant_id
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixTenantData() {
  try {
    console.log('Starting tenant data fix...')
    
    // Step 1: Get the admin user (you)
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', 'admin@projectpro.com')
      .single()
    
    if (userError || !users) {
      console.error('Could not find admin user:', userError)
      return
    }
    
    const userId = users.id
    console.log('Found admin user:', userId)
    
    // Step 2: Get or create tenant for the user
    let { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', userId)
      .single()
    
    let tenantId
    
    if (!userTenant) {
      // Create a tenant if none exists
      console.log('No tenant found, creating one...')
      
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: 'Default Organization',
          slug: 'default-org'
        })
        .select()
        .single()
      
      if (tenantError) {
        console.error('Error creating tenant:', tenantError)
        return
      }
      
      // Assign user to tenant
      const { error: assignError } = await supabase
        .from('user_tenants')
        .insert({
          user_id: userId,
          tenant_id: newTenant.id,
          role: 'admin',
          is_default: true
        })
      
      if (assignError) {
        console.error('Error assigning user to tenant:', assignError)
        return
      }
      
      tenantId = newTenant.id
      console.log('Created new tenant:', tenantId)
    } else {
      tenantId = userTenant.tenant_id
      console.log('Using existing tenant:', tenantId)
    }
    
    // Step 3: Update all tables with the tenant_id
    const tablesToUpdate = [
      'vendors',        // Your contacts
      'schedule_events', // Your calendar events
      'tasks',          // Your tasks including drywall repair
      'projects',       // Your projects
      'documents',      // Any documents
      'messages',       // Any messages
      'customers'       // Any customers
    ]
    
    for (const table of tablesToUpdate) {
      console.log(`\nUpdating ${table}...`)
      
      // First, check if table exists and has data
      const { data: existingData, error: checkError } = await supabase
        .from(table)
        .select('id')
        .is('tenant_id', null)
        .limit(1000)
      
      if (checkError) {
        if (checkError.code === '42P01') {
          console.log(`Table ${table} doesn't exist, skipping...`)
          continue
        } else {
          console.log(`Error checking ${table}:`, checkError.message)
          continue
        }
      }
      
      if (!existingData || existingData.length === 0) {
        console.log(`No records without tenant_id in ${table}`)
        continue
      }
      
      // Update all records without tenant_id
      const { error: updateError } = await supabase
        .from(table)
        .update({ 
          tenant_id: tenantId,
          updated_at: new Date().toISOString()
        })
        .is('tenant_id', null)
      
      if (updateError) {
        console.log(`Error updating ${table}:`, updateError.message)
      } else {
        console.log(`Updated ${existingData.length} records in ${table}`)
      }
      
      // Also update records that might have wrong tenant_id
      const { error: fixError } = await supabase
        .from(table)
        .update({ 
          tenant_id: tenantId,
          updated_at: new Date().toISOString()
        })
        .neq('tenant_id', tenantId)
        .or(`created_by.eq.${userId},user_id.eq.${userId}`)
      
      if (!fixError) {
        console.log(`Fixed any records with wrong tenant_id in ${table}`)
      }
    }
    
    console.log('\n✅ Tenant data fix completed!')
    console.log('Your tenant ID is:', tenantId)
    console.log('\nAll your existing data should now be visible in the app.')
    
  } catch (error) {
    console.error('Error in fixTenantData:', error)
  }
}

// Run the fix
fixTenantData().then(() => {
  console.log('\nScript completed. You can now refresh your app to see all your data.')
  process.exit(0)
}).catch(err => {
  console.error('Script failed:', err)
  process.exit(1)
})