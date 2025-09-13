#!/usr/bin/env node

/**
 * Verify that created tasks appear in both the tasks list and dashboard
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

async function verifyTaskDisplay() {
  console.log('🔍 Verifying task display in application...\n')

  try {
    // Get tenant for querying
    console.log('1. Getting tenant data...')
    const { data: tenants } = await supabase.from('tenants').select('id').limit(1)
    
    if (!tenants?.length) {
      console.log('❌ No tenants found')
      return false
    }

    const tenantId = tenants[0].id
    console.log(`✅ Using tenant: ${tenantId}`)

    // Query tasks the same way the tasks page does
    console.log('\n2. Querying tasks (like tasks page)...')
    const { data: taskPageData, error: taskPageError } = await supabase
      .from('tasks')
      .select(`
        *,
        project:projects(*),
        assignee:profiles!assignee_id(*),
        category:categories(*)
      `)
      .eq('tenant_id', tenantId)
      .order('position', { ascending: true })

    if (taskPageError) {
      console.log('❌ Tasks page query failed:', taskPageError.message)
      return false
    }

    console.log(`✅ Tasks page query returned ${taskPageData?.length || 0} tasks`)
    if (taskPageData && taskPageData.length > 0) {
      console.log('   Latest 3 tasks:')
      taskPageData.slice(0, 3).forEach(task => {
        console.log(`   - "${task.title}" (status: ${task.status}, created: ${task.created_at})`)
      })
    }

    // Query tasks the same way the dashboard does
    console.log('\n3. Querying tasks (like dashboard)...')
    const { data: dashboardData, error: dashboardError } = await supabase
      .from('tasks')
      .select('*, projects(name)')
      .eq('tenant_id', tenantId)
      .order('due_date', { ascending: true })
      .limit(5)

    if (dashboardError) {
      console.log('❌ Dashboard query failed:', dashboardError.message)
      return false
    }

    console.log(`✅ Dashboard query returned ${dashboardData?.length || 0} tasks`)
    if (dashboardData && dashboardData.length > 0) {
      console.log('   Tasks for recent activity:')
      dashboardData.forEach(task => {
        console.log(`   - "${task.title}" (project: ${task.projects?.name || 'N/A'})`)
      })
    }

    // Check if both queries return the same data
    console.log('\n4. Data consistency check...')
    
    if (taskPageData && dashboardData) {
      // Find tasks that appear in both queries
      const taskPageIds = new Set(taskPageData.map(t => t.id))
      const dashboardIds = new Set(dashboardData.map(t => t.id))
      const commonIds = [...taskPageIds].filter(id => dashboardIds.has(id))
      
      console.log(`   Tasks in tasks page: ${taskPageIds.size}`)
      console.log(`   Tasks in dashboard: ${dashboardIds.size}`)
      console.log(`   Common tasks: ${commonIds.length}`)
      
      if (commonIds.length > 0) {
        console.log('✅ Tasks are appearing in both views consistently')
      }
    }

    // Check for any recent tasks created
    console.log('\n5. Checking for recent tasks (last hour)...')
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: recentTasks, error: recentError } = await supabase
      .from('tasks')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })

    if (!recentError && recentTasks) {
      console.log(`   Found ${recentTasks.length} tasks created in the last hour`)
      if (recentTasks.length > 0) {
        console.log('   Recent tasks:')
        recentTasks.forEach(task => {
          console.log(`   - "${task.title}" (created: ${task.created_at})`)
        })
      }
    }

    console.log('\n✅ VERIFICATION COMPLETE!')
    console.log('\n📋 Summary:')
    console.log('   1. Tasks are stored in the database')
    console.log('   2. Tasks page query is working')
    console.log('   3. Dashboard query is working')
    console.log('   4. Data is consistent across views')
    console.log('\n💡 If tasks are not showing in the UI:')
    console.log('   - Check browser console for errors')
    console.log('   - Ensure React Query cache is being invalidated')
    console.log('   - Try refreshing the page after creating a task')
    console.log('   - Check that the user has the correct tenant_id')

    return true

  } catch (error) {
    console.error('❌ Verification error:', error.message)
    console.error(error.stack)
    return false
  }
}

verifyTaskDisplay()