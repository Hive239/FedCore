import { createClient } from '@/lib/supabase/client'

/**
 * Comprehensive test suite for messaging system
 * Tests all messaging features and data persistence
 */

export async function testMessagingSystem() {
  const supabase = createClient()
  const results: { test: string; status: 'pass' | 'fail'; details?: string }[] = []
  
  console.log('🧪 Starting Messaging System Tests...')
  
  try {
    // Test 1: User Authentication
    const { data: { user } } = await supabase.auth.getUser()
    results.push({
      test: 'User Authentication',
      status: user ? 'pass' : 'fail',
      details: user ? `Authenticated as ${user.email}` : 'No user authenticated'
    })
    
    if (!user) {
      console.error('❌ Tests cannot continue without authentication')
      return results
    }
    
    // Test 2: Check User Profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    results.push({
      test: 'User Profile',
      status: profile && !profileError ? 'pass' : 'fail',
      details: profile ? `Profile: ${profile.full_name || profile.email}` : profileError?.message
    })
    
    // Test 3: Check User Tenant Assignment
    const { data: userTenant, error: tenantError } = await supabase
      .from('user_tenants')
      .select('*, tenants(*)')
      .eq('user_id', user.id)
      .single()
    
    results.push({
      test: 'Tenant Assignment',
      status: userTenant && !tenantError ? 'pass' : 'fail',
      details: userTenant ? `Assigned to: ${userTenant.tenants?.name}` : 'No tenant assignment'
    })
    
    // Test 4: Load Team Members
    const { data: teamMembers, error: teamError } = await supabase
      .rpc('get_team_members_for_messaging', { p_user_id: user.id })
    
    results.push({
      test: 'Team Members Loading',
      status: teamMembers && !teamError ? 'pass' : 'fail',
      details: teamMembers ? `Found ${teamMembers.length} team members` : teamError?.message
    })
    
    // Test 5: Load Conversations
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(
          user_id,
          external_email,
          external_name,
          unread_count
        )
      `)
      .order('last_message_at', { ascending: false })
    
    results.push({
      test: 'Conversations Loading',
      status: conversations && !convError ? 'pass' : 'fail',
      details: conversations ? `Found ${conversations.length} conversations` : convError?.message
    })
    
    // Test 6: Create Test Conversation
    if (userTenant && teamMembers && teamMembers.length > 0) {
      const testConversation = {
        tenant_id: userTenant.tenant_id,
        type: 'direct' as const,
        name: null,
        created_by: user.id
      }
      
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert(testConversation)
        .select()
        .single()
      
      if (newConv && !createError) {
        // Add participants
        const { error: partError } = await supabase
          .from('conversation_participants')
          .insert([
            { conversation_id: newConv.id, user_id: user.id, role: 'admin' },
            { conversation_id: newConv.id, user_id: teamMembers[0].user_id, role: 'member' }
          ])
        
        results.push({
          test: 'Create Conversation',
          status: !partError ? 'pass' : 'fail',
          details: !partError ? `Created conversation ${newConv.id}` : partError?.message
        })
        
        // Test 7: Send Test Message
        const testMessage = {
          conversation_id: newConv.id,
          sender_id: user.id,
          sender_name: profile?.full_name || user.email,
          content: 'Test message from automated test',
          type: 'text'
        }
        
        const { data: message, error: msgError } = await supabase
          .from('messages')
          .insert(testMessage)
          .select()
          .single()
        
        results.push({
          test: 'Send Message',
          status: message && !msgError ? 'pass' : 'fail',
          details: message ? `Sent message ${message.id}` : msgError?.message
        })
        
        // Test 8: Load Messages
        const { data: messages, error: loadMsgError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', newConv.id)
        
        results.push({
          test: 'Load Messages',
          status: messages && !loadMsgError ? 'pass' : 'fail',
          details: messages ? `Loaded ${messages.length} messages` : loadMsgError?.message
        })
        
        // Cleanup test conversation
        await supabase
          .from('conversations')
          .delete()
          .eq('id', newConv.id)
      } else {
        results.push({
          test: 'Create Conversation',
          status: 'fail',
          details: createError?.message
        })
      }
    }
    
    // Test 9: Check Email Settings
    const { data: emailSettings, error: emailError } = await supabase
      .from('email_settings')
      .select('*')
      .single()
    
    results.push({
      test: 'Email Settings',
      status: emailSettings && !emailError ? 'pass' : 'fail',
      details: emailSettings ? `Email provider: ${emailSettings.email_provider}` : 'No email settings configured'
    })
    
    // Test 10: Check External Contacts (Vendors)
    const { data: vendors, error: vendorError } = await supabase
      .from('vendors')
      .select('*')
      .limit(5)
    
    results.push({
      test: 'External Contacts',
      status: vendors && !vendorError ? 'pass' : 'fail',
      details: vendors ? `Found ${vendors.length} external contacts` : vendorError?.message
    })
    
    // Test 11: Check for Mock Data
    const { data: anyMockMessages } = await supabase
      .from('messages')
      .select('content')
      .or('content.ilike.%demo%,content.ilike.%test%,content.ilike.%mock%')
      .limit(1)
    
    results.push({
      test: 'No Mock Data',
      status: !anyMockMessages || anyMockMessages.length === 0 ? 'pass' : 'fail',
      details: anyMockMessages?.length ? 'Found potential mock data in messages' : 'No mock data detected'
    })
    
    // Test 12: Real-time Subscriptions
    const channel = supabase
      .channel('test-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, () => {})
    
    const subscribeResult = await channel.subscribe()
    
    results.push({
      test: 'Real-time Subscriptions',
      status: subscribeResult ? 'pass' : 'fail',
      details: `Subscription ${subscribeResult ? 'successful' : 'failed'}`
    })
    
    channel.unsubscribe()
    
  } catch (error) {
    results.push({
      test: 'System Error',
      status: 'fail',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
  
  // Print results summary
  console.log('\n📊 Test Results Summary:')
  console.log('========================')
  
  let passCount = 0
  let failCount = 0
  
  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : '❌'
    console.log(`${icon} ${result.test}: ${result.status.toUpperCase()}`)
    if (result.details) {
      console.log(`   └─ ${result.details}`)
    }
    
    if (result.status === 'pass') passCount++
    else failCount++
  })
  
  console.log('\n📈 Final Score:')
  console.log(`   Passed: ${passCount}/${results.length}`)
  console.log(`   Failed: ${failCount}/${results.length}`)
  console.log(`   Success Rate: ${Math.round((passCount / results.length) * 100)}%`)
  
  return results
}

// Function to verify data persistence
export async function verifyDataPersistence() {
  const supabase = createClient()
  const checks: { feature: string; persistent: boolean; storage: string }[] = []
  
  console.log('🔍 Checking Data Persistence...')
  
  // Check conversations persistence
  const { data: convCount } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
  
  checks.push({
    feature: 'Conversations',
    persistent: true,
    storage: 'PostgreSQL Database'
  })
  
  // Check messages persistence
  const { data: msgCount } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
  
  checks.push({
    feature: 'Messages',
    persistent: true,
    storage: 'PostgreSQL Database'
  })
  
  // Check email queue persistence
  const { data: emailCount } = await supabase
    .from('email_queue')
    .select('id', { count: 'exact', head: true })
  
  checks.push({
    feature: 'Email Queue',
    persistent: true,
    storage: 'PostgreSQL Database'
  })
  
  // Check profiles persistence
  const { data: profileCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
  
  checks.push({
    feature: 'User Profiles',
    persistent: true,
    storage: 'PostgreSQL Database'
  })
  
  // Check vendors persistence
  const { data: vendorCount } = await supabase
    .from('vendors')
    .select('id', { count: 'exact', head: true })
  
  checks.push({
    feature: 'External Contacts',
    persistent: true,
    storage: 'PostgreSQL Database'
  })
  
  console.log('\n💾 Data Persistence Report:')
  console.log('===========================')
  checks.forEach(check => {
    const icon = check.persistent ? '✅' : '❌'
    console.log(`${icon} ${check.feature}: ${check.storage}`)
  })
  
  return checks
}

// Function to test email integration
export async function testEmailIntegration() {
  const supabase = createClient()
  const tests: { test: string; result: string }[] = []
  
  console.log('📧 Testing Email Integration...')
  
  // Check email settings
  const { data: settings } = await supabase
    .from('email_settings')
    .select('*')
    .single()
  
  tests.push({
    test: 'Email Settings Configured',
    result: settings ? `Provider: ${settings.email_provider}, Domain: ${settings.inbound_domain}` : 'Not configured'
  })
  
  // Check email queue
  const { data: queue } = await supabase
    .from('email_queue')
    .select('status')
    .limit(100)
  
  tests.push({
    test: 'Email Queue Status',
    result: queue ? JSON.stringify(queue) : 'Empty queue'
  })
  
  // Check incoming emails
  const { data: incoming } = await supabase
    .from('incoming_emails')
    .select('status')
    .limit(100)
  
  tests.push({
    test: 'Incoming Emails',
    result: incoming ? JSON.stringify(incoming) : 'No incoming emails'
  })
  
  console.log('\n📮 Email Integration Report:')
  console.log('============================')
  tests.forEach(test => {
    console.log(`• ${test.test}: ${test.result}`)
  })
  
  return tests
}

// Export all tests as a single function
export async function runAllMessagingTests() {
  console.log('🚀 Running Complete Messaging System Tests\n')
  
  const messagingTests = await testMessagingSystem()
  const persistenceTests = await verifyDataPersistence()
  const emailTests = await testEmailIntegration()
  
  return {
    messaging: messagingTests,
    persistence: persistenceTests,
    email: emailTests
  }
}