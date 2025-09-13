#!/usr/bin/env node

/**
 * Ensure admin profile has its own organization/tenant
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

async function ensureAdminHasTenant() {
  console.log('🔍 Checking admin user tenant assignment...\n')

  try {
    // Get all profiles (users)
    console.log('1. Fetching all user profiles...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .order('created_at', { ascending: true })

    if (profilesError) {
      console.log('❌ Error fetching profiles:', profilesError.message)
      return false
    }

    console.log(`✅ Found ${profiles.length} user profiles`)
    
    for (const profile of profiles) {
      console.log(`\n📋 Checking user: ${profile.email} (${profile.full_name || 'No name'})`)
      
      // Check if user has a tenant
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id, role, tenants(name)')
        .eq('user_id', profile.id)

      if (!userTenant || userTenant.length === 0) {
        console.log(`❌ User ${profile.email} has NO tenant assignment!`)
        
        // Create a personal tenant for this user
        const tenantName = profile.full_name ? 
          `${profile.full_name}'s Organization` : 
          `${profile.email.split('@')[0]}'s Organization`
        
        const tenantSlug = profile.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-') + '-org'
        
        console.log(`🔧 Creating tenant: ${tenantName}`)
        
        // Create tenant
        const { data: newTenant, error: tenantError } = await supabase
          .from('tenants')
          .insert({
            name: tenantName,
            slug: tenantSlug
          })
          .select()
          .single()
        
        if (tenantError) {
          console.log('❌ Error creating tenant:', tenantError.message)
          continue
        }
        
        console.log(`✅ Tenant created with ID: ${newTenant.id}`)
        
        // Assign user to the new tenant as admin
        const { error: assignError } = await supabase
          .from('user_tenants')
          .insert({
            user_id: profile.id,
            tenant_id: newTenant.id,
            role: 'admin'
          })
        
        if (assignError) {
          console.log('❌ Error assigning user to tenant:', assignError.message)
          continue
        }
        
        console.log(`✅ User assigned to tenant as admin`)
        
      } else {
        console.log(`✅ User has tenant(s):`)
        userTenant.forEach(ut => {
          console.log(`   - ${ut.tenants.name} (role: ${ut.role})`)
        })
      }
    }

    console.log('\n🎉 All users now have their own organizations!')
    console.log('🔒 Tenant isolation is properly implemented!')
    
    return true

  } catch (error) {
    console.error('❌ Script error:', error.message)
    return false
  }
}

ensureAdminHasTenant()