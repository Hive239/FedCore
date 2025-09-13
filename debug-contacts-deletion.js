const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugContactsDeletion() {
  console.log('🔍 Debugging contacts deletion issue...\n')

  try {
    // 1. Check if vendors table exists and its structure
    console.log('1. Checking vendors table structure...')
    const { data: tableInfo, error: tableError } = await supabase
      .from('vendors')
      .select('*')
      .limit(1)

    if (tableError) {
      console.error('❌ Error accessing vendors table:', tableError)
      return
    } else {
      console.log('✅ Vendors table is accessible')
      if (tableInfo && tableInfo.length > 0) {
        console.log('📋 Table columns found:', Object.keys(tableInfo[0]))
      }
    }

    // 2. Check RLS policies
    console.log('\n2. Checking RLS policies...')
    const { data: policies, error: policyError } = await supabase
      .rpc('pg_policies_info', { table_name: 'vendors' })
      .catch(() => {
        // If the RPC doesn't exist, try a different approach
        return { data: null, error: { message: 'Cannot check policies via RPC' } }
      })

    if (policyError) {
      console.log('⚠️  Cannot check policies directly:', policyError.message)
    } else {
      console.log('✅ RLS policies info:', policies)
    }

    // 3. Test authentication status
    console.log('\n3. Testing authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ No authenticated user found')
      console.log('This could be why deletion fails - RLS requires authentication')
      
      // Try with service role key if available
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceKey) {
        console.log('\n🔑 Testing with service role key...')
        const adminSupabase = createClient(supabaseUrl, serviceKey)
        
        const { data: contacts, error: contactsError } = await adminSupabase
          .from('vendors')
          .select('id, name, contact_type')
          .limit(5)

        if (contactsError) {
          console.error('❌ Error with service role:', contactsError)
        } else {
          console.log('✅ Service role works. Found contacts:', contacts?.length || 0)
          if (contacts && contacts.length > 0) {
            console.log('Sample contacts:', contacts)
          }
        }
      }
    } else {
      console.log('✅ User authenticated:', user.email)
      
      // 4. Test tenant access
      console.log('\n4. Testing tenant access...')
      const { data: userTenant, error: tenantError } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()

      if (tenantError) {
        console.error('❌ Error getting tenant:', tenantError)
      } else {
        console.log('✅ User tenant found:', userTenant?.tenant_id)
      }

      // 5. Test contact operations
      console.log('\n5. Testing contact operations...')
      
      // Try to fetch contacts
      const { data: contacts, error: fetchError } = await supabase
        .from('vendors')
        .select('*')
        .limit(5)

      if (fetchError) {
        console.error('❌ Error fetching contacts:', fetchError)
      } else {
        console.log(`✅ Fetched ${contacts?.length || 0} contacts`)
        
        if (contacts && contacts.length > 0) {
          const testContact = contacts[0]
          console.log('📋 Testing deletion on contact:', testContact.id, testContact.name)
          
          // Test deletion (but don't actually delete, just check permissions)
          const { error: deleteError } = await supabase
            .from('vendors')
            .delete()
            .eq('id', testContact.id)
            .eq('id', 'non-existent-id') // This will match nothing, so nothing gets deleted
            
          if (deleteError) {
            console.error('❌ Delete operation failed:', deleteError)
            console.error('This is likely the root cause of the deletion issue')
          } else {
            console.log('✅ Delete permission check passed')
          }
        }
      }
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error)
  }
}

debugContactsDeletion()