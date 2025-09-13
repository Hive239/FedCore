// Test script to verify update_logs queries work
const { createClient } = require('@supabase/supabase-js')

// You'll need to set these from your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUpdateLogsQuery() {
  console.log('Testing update_logs query...')
  
  // Test 1: Basic select
  const { data: updates, error: updatesError } = await supabase
    .from('update_logs')
    .select(`
      *,
      projects(name, project_code)
    `)
    .limit(5)
  
  if (updatesError) {
    console.error('Error fetching updates:', updatesError)
  } else {
    console.log('✓ Updates fetched:', updates?.length || 0, 'records')
  }
  
  // Test 2: Fetch team member profiles
  if (updates && updates.length > 0) {
    const teamMemberIds = [...new Set(updates.map(u => u.team_member_id).filter(id => id))]
    
    if (teamMemberIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', teamMemberIds)
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
      } else {
        console.log('✓ Profiles fetched:', profiles?.length || 0, 'records')
        
        // Map profiles to updates
        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || [])
        const formattedData = updates.map(update => ({
          ...update,
          team_member_name: profileMap.get(update.team_member_id) || 'Unknown'
        }))
        
        console.log('✓ Data formatted successfully')
        console.log('Sample record:', JSON.stringify(formattedData[0], null, 2))
      }
    }
  }
}

testUpdateLogsQuery()
  .then(() => console.log('Test complete'))
  .catch(err => console.error('Test failed:', err))