#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixVendorTenants() {
  console.log('🔧 Fixing Vendor Tenant Associations\n')
  console.log('=' .repeat(60))

  // 1. Check vendors without tenant_id
  const { data: vendorsWithoutTenant, error: vendorError } = await supabase
    .from('vendors')
    .select('*')
    .is('tenant_id', null)

  console.log(`\n📊 Vendors without tenant_id: ${vendorsWithoutTenant?.length || 0}`)
  
  if (vendorsWithoutTenant && vendorsWithoutTenant.length > 0) {
    console.log('  Vendors missing tenant:')
    vendorsWithoutTenant.forEach(v => {
      console.log(`    - ${v.name} (ID: ${v.id})`)
    })
  }

  // 2. Get the default tenant (ABC Construction Co from your user)
  const defaultTenantId = '8de3a9f0-adc3-481a-8a2d-596ff73f2afc' // ABC Construction Co

  // 3. Update vendors without tenant_id
  if (vendorsWithoutTenant && vendorsWithoutTenant.length > 0) {
    console.log(`\n🔄 Assigning vendors to tenant: ABC Construction Co`)
    
    const { error: updateError } = await supabase
      .from('vendors')
      .update({ tenant_id: defaultTenantId })
      .is('tenant_id', null)

    if (updateError) {
      console.error('  ❌ Error updating vendors:', updateError.message)
    } else {
      console.log('  ✅ Successfully updated vendor tenant associations')
    }
  }

  // 4. Verify the fix
  const { data: allVendors, count } = await supabase
    .from('vendors')
    .select('*', { count: 'exact' })
    .eq('tenant_id', defaultTenantId)

  console.log(`\n✅ Final Results:`)
  console.log(`  Total vendors for ABC Construction: ${count || 0}`)
  
  if (allVendors && allVendors.length > 0) {
    console.log('  Vendors now visible:')
    allVendors.forEach(v => {
      console.log(`    - ${v.name} (Type: ${v.status || 'vendor'})`)
    })
  }

  // 5. Also check the all_contacts view
  const { data: contacts } = await supabase
    .from('all_contacts')
    .select('*')
    .eq('tenant_id', defaultTenantId)

  console.log(`\n📋 All Contacts View:`)
  console.log(`  Total contacts visible: ${contacts?.length || 0}`)

  console.log('\n💡 Next Steps:')
  console.log('  1. Refresh your Contacts page in the browser')
  console.log('  2. Contacts should now be visible')
  console.log('  3. If not, check that your user is logged in with ABC Construction tenant')
}

fixVendorTenants().catch(console.error)