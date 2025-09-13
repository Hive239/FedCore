// Test if data is accessible through the app's API
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testDataAccess() {
  console.log('=' .repeat(80))
  console.log('TESTING DATA ACCESS AS YOUR USER')
  console.log('=' .repeat(80))
  
  // Simulate your user session
  const userId = '4ac496a0-f45f-4fa2-a102-fb85be28799a'
  const tenantId = 'a1d23abb-0e73-4fb0-bbdd-dc60383cebe5'
  
  console.log('Your User ID:', userId)
  console.log('Your Tenant ID:', tenantId)
  console.log('')
  
  // Test 1: Can we fetch tasks with the exact query the app uses?
  console.log('TEST 1: Fetching tasks with app query...')
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        project:projects(*),
        assignee:profiles!assignee_id(*),
        category:categories(*)
      `)
      .eq('tenant_id', tenantId)
      .order('position', { ascending: true })
    
    if (error) {
      console.error('❌ Task query failed:', error.message)
      console.error('Full error:', error)
    } else {
      console.log(`✅ Tasks query succeeded! Found ${tasks?.length || 0} tasks`)
      if (tasks && tasks.length > 0) {
        console.log('Sample tasks:', tasks.slice(0, 3).map(t => t.title).join(', '))
      }
    }
  } catch (e) {
    console.error('❌ Task query exception:', e.message)
  }
  
  console.log('')
  
  // Test 2: Can we fetch projects?
  console.log('TEST 2: Fetching projects with app query...')
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Project query failed:', error.message)
    } else {
      console.log(`✅ Projects query succeeded! Found ${projects?.length || 0} projects`)
      if (projects && projects.length > 0) {
        console.log('Projects:', projects.map(p => p.name).join(', '))
      }
    }
  } catch (e) {
    console.error('❌ Project query exception:', e.message)
  }
  
  console.log('')
  
  // Test 3: Can we fetch vendors/contacts?
  console.log('TEST 3: Fetching contacts with app query...')
  try {
    const { data: vendors, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Vendors query failed:', error.message)
    } else {
      console.log(`✅ Vendors query succeeded! Found ${vendors?.length || 0} contacts`)
      if (vendors && vendors.length > 0) {
        console.log('Contacts:', vendors.map(v => `${v.name} (${v.contact_type})`).join(', '))
      }
    }
  } catch (e) {
    console.error('❌ Vendors query exception:', e.message)
  }
  
  console.log('')
  
  // Test 4: Can we fetch calendar events?
  console.log('TEST 4: Fetching calendar events with app query...')
  try {
    const { data: events, error } = await supabase
      .from('schedule_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('start_time', { ascending: true })
      .limit(10)
    
    if (error) {
      console.error('❌ Events query failed:', error.message)
    } else {
      console.log(`✅ Events query succeeded! Found ${events?.length || 0} events (showing first 10)`)
      if (events && events.length > 0) {
        console.log('Sample events:', events.slice(0, 3).map(e => e.title).join(', '))
      }
    }
  } catch (e) {
    console.error('❌ Events query exception:', e.message)
  }
  
  console.log('')
  console.log('=' .repeat(80))
  console.log('TESTING COMPLETE')
  console.log('=' .repeat(80))
  console.log('\nIf all tests passed (✅), the data IS accessible.')
  console.log('The app should show this data when you refresh.')
  console.log('\nTry these steps:')
  console.log('1. Hard refresh the browser (Cmd+Shift+R on Mac)')
  console.log('2. Clear browser cache/cookies for localhost:3001')
  console.log('3. Log out and log back in as admin@projectpro.com')
}

testDataAccess().then(() => {
  process.exit(0)
}).catch(err => {
  console.error('Test failed:', err)
  process.exit(1)
})