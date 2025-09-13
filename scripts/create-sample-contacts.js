#!/usr/bin/env node

/**
 * Create sample contacts for testing task assignment
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createSampleContacts() {
  console.log('📋 Creating sample contacts for task assignment...\n')

  try {
    // Get the first user and their tenant
    const { data: users } = await supabase.from('profiles').select('id, email').limit(1)
    const userId = users[0].id
    
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', userId)
    
    const userTenant = userTenants?.[0]  // Get first tenant
    
    if (!userTenant) {
      console.log('❌ User has no tenant')
      return
    }
    
    const tenantId = userTenant.tenant_id
    
    // Get tenant name
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single()
    
    console.log(`Creating contacts for tenant: ${tenant?.name || tenantId}\n`)
    
    // Sample contacts data
    const sampleContacts = [
      {
        name: 'John Smith Construction',
        contact_type: 'contractor',
        contact_name: 'John Smith',
        contact_email: 'john@smithconstruction.com',
        contact_phone: '(555) 123-4567',
        company_name: 'Smith Construction LLC',
        address: '123 Builder Lane',
        city: 'Naples',
        state: 'FL',
        zip: '34102',
        tenant_id: tenantId,
        created_by: userId
      },
      {
        name: 'Sarah Johnson Design',
        contact_type: 'design_professional',
        contact_name: 'Sarah Johnson',
        contact_email: 'sarah@johnsondesign.com',
        contact_phone: '(555) 234-5678',
        company_name: 'Johnson Design Studio',
        address: '456 Design Plaza',
        city: 'Naples',
        state: 'FL',
        zip: '34103',
        tenant_id: tenantId,
        created_by: userId
      },
      {
        name: 'ABC Building Supplies',
        contact_type: 'vendor',
        vendor_type: 'Materials',
        contact_name: 'Mike Wilson',
        contact_email: 'mike@abcsupplies.com',
        contact_phone: '(555) 345-6789',
        company_name: 'ABC Building Supplies',
        address: '789 Supply Road',
        city: 'Fort Myers',
        state: 'FL',
        zip: '33901',
        tenant_id: tenantId,
        created_by: userId
      },
      {
        name: 'Premier Properties LLC',
        contact_type: 'customer',
        contact_name: 'Lisa Davis',
        contact_email: 'lisa@premierproperties.com',
        contact_phone: '(555) 456-7890',
        company_name: 'Premier Properties LLC',
        address: '321 Executive Blvd',
        city: 'Naples',
        state: 'FL',
        zip: '34108',
        tenant_id: tenantId,
        created_by: userId
      }
    ]
    
    // Check existing contacts first
    const { data: existing } = await supabase
      .from('vendors')
      .select('id, name')
      .eq('tenant_id', tenantId)
    
    console.log(`Found ${existing?.length || 0} existing contacts`)
    
    if (existing && existing.length > 0) {
      console.log('Existing contacts:')
      existing.forEach(c => console.log(`  - ${c.name}`))
      console.log('\n❓ Do you want to add more sample contacts? (They won\'t duplicate)')
    }
    
    // Insert sample contacts
    for (const contact of sampleContacts) {
      // Check if already exists
      const { data: exists } = await supabase
        .from('vendors')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', contact.name)
        .single()
      
      if (exists) {
        console.log(`⏭️  Skipping ${contact.name} (already exists)`)
      } else {
        const { data, error } = await supabase
          .from('vendors')
          .insert(contact)
          .select()
          .single()
        
        if (error) {
          console.log(`❌ Failed to create ${contact.name}:`, error.message)
        } else {
          console.log(`✅ Created ${contact.name} (${contact.contact_type})`)
        }
      }
    }
    
    // Show final count
    const { count } = await supabase
      .from('vendors')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
    
    console.log(`\n📊 Total contacts in your organization: ${count}`)
    console.log('🎯 You can now assign these contacts to tasks!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

createSampleContacts()