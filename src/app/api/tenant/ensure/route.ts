import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'No active session' }, { status: 401 })
    }
    
    const user = session.user
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has a tenant assignment
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (userTenant) {
      return NextResponse.json({ 
        message: 'User already assigned to tenant',
        tenant_id: userTenant.tenant_id 
      })
    }

    // User doesn't have a tenant, create a default one or assign to existing default
    // First, try to find a default tenant
    const { data: defaultTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', 'default-tenant')
      .single()

    let tenantId: string

    if (!defaultTenant) {
      // Create a default tenant
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: 'Default Organization',
          slug: 'default-tenant',
          settings: {}
        })
        .select()
        .single()

      if (tenantError) {
        console.error('Error creating tenant:', tenantError)
        return NextResponse.json({ 
          error: 'Failed to create default tenant: ' + tenantError.message 
        }, { status: 500 })
      }

      tenantId = newTenant.id
    } else {
      tenantId = defaultTenant.id
    }

    // Assign user to the tenant
    const { data: assignment, error: assignError } = await supabase
      .from('user_tenants')
      .insert({
        user_id: user.id,
        tenant_id: tenantId,
        role: 'member'
      })
      .select()
      .single()

    if (assignError) {
      console.error('Error assigning user to tenant:', assignError)
      return NextResponse.json({ 
        error: 'Failed to assign user to tenant: ' + assignError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'User successfully assigned to tenant',
      tenant_id: tenantId,
      assignment 
    })

  } catch (error) {
    console.error('Error in ensure tenant:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}