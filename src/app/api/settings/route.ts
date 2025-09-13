import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()
    
    if (!userTenant) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }
    
    // Get user settings directly from tables
    const { data: profileSettings } = await supabase
      .from('user_profile_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('tenant_id', userTenant.tenant_id)
      .single()
    
    const { data: notificationSettings } = await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('tenant_id', userTenant.tenant_id)
      .single()
    
    const { data: appearanceSettings } = await supabase
      .from('user_appearance_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('tenant_id', userTenant.tenant_id)
      .single()
    
    const settings = {
      profile: profileSettings || {},
      notifications: notificationSettings || {},
      appearance: appearanceSettings || {}
    }
    
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user - more reliable than getSession
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized - No session found' }, { status: 401 })
    }
    
    // Get user's tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()
    
    if (!userTenant) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }
    
    const { section, settings } = await request.json()
    
    if (!section || !settings) {
      return NextResponse.json({ error: 'Missing section or settings data' }, { status: 400 })
    }
    
    // Validate section
    const validSections = ['profile', 'notifications', 'appearance', 'contacts', 'team']
    if (!validSections.includes(section)) {
      return NextResponse.json({ error: 'Invalid settings section' }, { status: 400 })
    }
    
    let tableName = ''
    let dataToInsert = {
      ...settings,
      user_id: user.id,
      tenant_id: userTenant.tenant_id,
      updated_at: new Date().toISOString()
    }
    
    // Determine table based on section
    switch(section) {
      case 'profile':
        tableName = 'user_profile_settings'
        break
      case 'notifications':
        tableName = 'user_notification_settings'
        break
      case 'appearance':
        tableName = 'user_appearance_settings'
        break
      case 'contacts':
        tableName = 'user_contact_settings'
        break
      case 'team':
        tableName = 'user_team_settings'
        break
    }
    
    // Try to update, if no rows affected then insert
    const { data: existingData } = await supabase
      .from(tableName)
      .select('id')
      .eq('user_id', user.id)
      .eq('tenant_id', userTenant.tenant_id)
      .single()
    
    let result
    if (existingData) {
      // Update existing settings
      const { data, error } = await supabase
        .from(tableName)
        .update(dataToInsert)
        .eq('user_id', user.id)
        .eq('tenant_id', userTenant.tenant_id)
        .select()
        
      if (error) {
        console.error(`Error updating ${section} settings:`, error)
        return NextResponse.json({ error: `Failed to update ${section} settings` }, { status: 500 })
      }
      result = data
    } else {
      // Insert new settings
      dataToInsert.created_at = new Date().toISOString()
      const { data, error } = await supabase
        .from(tableName)
        .insert(dataToInsert)
        .select()
        
      if (error) {
        console.error(`Error inserting ${section} settings:`, error)
        return NextResponse.json({ error: `Failed to save ${section} settings` }, { status: 500 })
      }
      result = data
    }
    
    return NextResponse.json({ 
      message: 'Settings updated successfully',
      settings: result
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}