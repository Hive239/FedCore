#!/usr/bin/env node

/**
 * Script to set up basic tenant and user data
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupBasicData() {
  console.log('🚀 Setting up basic tenant and user data...\n')

  try {
    // 1. Create a test tenant
    console.log('🏢 Creating test tenant...')
    const { data: existingTenants } = await supabase
      .from('tenants')
      .select('id')
      .limit(1)
    
    let tenantId
    if (existingTenants?.length > 0) {
      tenantId = existingTenants[0].id
      console.log(`✅ Found existing tenant: ${tenantId}`)
    } else {
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: 'Demo Construction Company',
          plan: 'enterprise',
          settings: {
            features: {
              nexus_ai: true,
              ml_predictions: true,
              architecture_analysis: true
            }
          }
        })
        .select()
        .single()
      
      if (tenantError) {
        console.error('❌ Error creating tenant:', tenantError)
        return false
      }
      tenantId = tenant.id
      console.log(`✅ Created tenant: ${tenantId}`)
    }

    // 2. Create a test user profile
    console.log('👤 Creating test user profile...')
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    let userId
    if (existingProfiles?.length > 0) {
      userId = existingProfiles[0].id
      console.log(`✅ Found existing user: ${userId}`)
    } else {
      // Generate a UUID for the user
      const userUuid = crypto.randomUUID ? crypto.randomUUID() : 
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0
          const v = c == 'x' ? r : (r & 0x3 | 0x8)
          return v.toString(16)
        })
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userUuid,
          name: 'John Doe',
          email: 'admin@projectpro.com',
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (profileError) {
        console.error('❌ Error creating profile:', profileError)
        return false
      }
      userId = profile.id
      console.log(`✅ Created user profile: ${userId}`)
    }

    // 3. Link user to tenant
    console.log('🔗 Linking user to tenant...')
    const { data: existingLink } = await supabase
      .from('user_tenants')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single()
    
    if (!existingLink) {
      const { error: linkError } = await supabase
        .from('user_tenants')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          role: 'admin'
        })
      
      if (linkError) {
        console.error('⚠️  Error linking user to tenant:', linkError.message)
      } else {
        console.log('✅ Linked user to tenant')
      }
    } else {
      console.log('✅ User already linked to tenant')
    }

    // 4. Create some projects
    console.log('📁 Creating sample projects...')
    const projects = [
      {
        tenant_id: tenantId,
        name: 'Downtown Office Complex',
        status: 'active',
        start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        budget: 5000000,
        created_by: userId
      },
      {
        tenant_id: tenantId,
        name: 'Residential Tower Phase 1',
        status: 'in-progress',
        start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000).toISOString(),
        budget: 8000000,
        created_by: userId
      },
      {
        tenant_id: tenantId,
        name: 'Shopping Mall Renovation',
        status: 'completed',
        start_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        budget: 3000000,
        created_by: userId
      }
    ]
    
    for (const project of projects) {
      const { error } = await supabase.from('projects').insert(project)
      if (error && !error.message.includes('duplicate')) {
        console.log('⚠️  Error creating project:', error.message)
      }
    }
    console.log('✅ Created sample projects')

    // 5. Create some activity logs
    console.log('📊 Creating activity logs...')
    const activities = []
    const actions = ['created', 'updated', 'completed', 'assigned', 'commented']
    const resources = ['project', 'task', 'document', 'meeting', 'report']
    
    for (let i = 0; i < 50; i++) {
      activities.push({
        tenant_id: tenantId,
        user_id: userId,
        action: actions[Math.floor(Math.random() * actions.length)],
        resource_type: resources[Math.floor(Math.random() * resources.length)],
        resource_id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
        metadata: {},
        created_at: new Date(Date.now() - i * 3600000).toISOString()
      })
    }
    
    const { error: activityError } = await supabase.from('activity_logs').insert(activities)
    if (activityError) {
      console.log('⚠️  Activity logs might already exist:', activityError.message)
    } else {
      console.log('✅ Created activity logs')
    }

    console.log('\n✨ Basic data setup completed!')
    console.log(`📍 Tenant ID: ${tenantId}`)
    console.log(`📍 User ID: ${userId}`)
    console.log('\nNow you can run: node scripts/populate-architecture-analysis.js')
    
    return true

  } catch (error) {
    console.error('❌ Error setting up basic data:', error)
    return false
  }
}

// Run the script
setupBasicData().then(success => {
  process.exit(success ? 0 : 1)
})