import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const inviteToken = requestUrl.searchParams.get('invite')

  if (code) {
    const cookieStore = cookies()
    const supabase = await createClient()
    
    // Exchange code for session
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && user) {
      // Check if user needs tenant assignment (for social logins)
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()
      
      if (!userTenant) {
        // Check for invitation
        if (inviteToken) {
          const { data: invitation } = await supabase
            .from('tenant_invitations')
            .select('*')
            .eq('invitation_token', inviteToken)
            .eq('email', user.email)
            .single()
          
          if (invitation && !invitation.accepted) {
            // Accept invitation and add user to tenant
            await supabase
              .from('user_tenants')
              .insert({
                user_id: user.id,
                tenant_id: invitation.tenant_id,
                role: invitation.role
              })
            
            // Mark invitation as accepted
            await supabase
              .from('tenant_invitations')
              .update({ 
                accepted: true, 
                accepted_at: new Date().toISOString() 
              })
              .eq('id', invitation.id)
          }
        } else {
          // No invitation - create new tenant for user
          const companyName = user.user_metadata?.company_name || `${user.email?.split('@')[0]}'s Organization`
          const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          
          // Create tenant
          const { data: tenant } = await supabase
            .from('tenants')
            .insert({
              name: companyName,
              slug: slug,
              status: 'active'
            })
            .select()
            .single()
          
          if (tenant) {
            // Assign user as owner
            await supabase
              .from('user_tenants')
              .insert({
                user_id: user.id,
                tenant_id: tenant.id,
                role: 'owner'
              })
          }
        }
        
        // Create profile if doesn't exist
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
            avatar_url: user.user_metadata?.avatar_url
          })
      }
    }
    
    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  // Return to login with error
  return NextResponse.redirect(new URL('/login?error=auth', requestUrl.origin))
}