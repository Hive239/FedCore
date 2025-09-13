import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { withTenantAuth } from '@/lib/auth/tenant-security'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

async function handleInvite(request: NextRequest, context: { userId: string; tenantId: string; role: string }) {
  try {
    const supabase = await createClient()
    
    const body = await request.json()
    const { emails, role, tenantId, message } = body

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'Invalid email list' }, { status: 400 })
    }

    // CRITICAL: Verify user can only invite to their own tenant
    if (tenantId !== context.tenantId) {
      console.error(`Cross-tenant invitation attempt blocked: User ${context.userId} tried to invite to tenant ${tenantId} but belongs to ${context.tenantId}`)
      return NextResponse.json({ error: 'Unauthorized: Cannot invite to other tenants' }, { status: 403 })
    }

    // Only admins and owners can send invitations
    if (context.role !== 'admin' && context.role !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized: Only admins can send invitations' }, { status: 403 })
    }

    // Get tenant information
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', context.tenantId)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Get inviter information
    const { data: inviter } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', context.userId)
      .single()

    const inviterName = inviter?.full_name || inviter?.email || 'A team member'
    const results = []

    for (const email of emails) {
      const token = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      // Insert invitation into database
      const { data: invitation, error: dbError } = await supabase
        .from('tenant_invitations')
        .insert({
          tenant_id: context.tenantId, // Use validated tenant ID
          email: email.toLowerCase().trim(),
          role: role || 'member',
          invited_by: context.userId,
          invitation_token: token,
          expires_at: expiresAt.toISOString(),
          accepted: false
        })
        .select()
        .single()

      if (dbError) {
        console.error('Database error for', email, dbError)
        results.push({ email, success: false, error: dbError.message })
        continue
      }

      // Send invitation email
      try {
        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/join?token=${token}`
        
        // If Resend is not configured, skip email sending but still create the invitation
        if (!resend) {
          console.log('Email service not configured. Invitation created without sending email.')
          console.log(`Invitation URL for ${email}: ${inviteUrl}`)
          results.push({ email, success: true, id: invitation.id, url: inviteUrl })
          continue
        }
        
        const emailResponse = await resend.emails.send({
          from: 'Project Pro <noreply@projectpro.app>',
          to: email,
          subject: `You're invited to join ${tenant.name} on Project Pro`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
              </div>
              
              <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e5e5; border-radius: 0 0 10px 10px;">
                <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi there,</p>
                
                <p style="color: #333; font-size: 16px; line-height: 1.6;">
                  ${inviterName} has invited you to join <strong>${tenant.name}</strong> on Project Pro as a <strong>${role}</strong>.
                </p>
                
                ${message ? `
                  <div style="background: #f7f9fc; border-left: 4px solid #667eea; padding: 15px 20px; margin: 20px 0;">
                    <p style="color: #555; font-size: 14px; margin: 0; font-style: italic;">"${message}"</p>
                  </div>
                ` : ''}
                
                <p style="color: #333; font-size: 16px; line-height: 1.6;">
                  Project Pro is a powerful project management platform that helps teams collaborate effectively and deliver projects on time.
                </p>
                
                <div style="text-align: center; margin: 35px 0;">
                  <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 35px; border-radius: 5px; font-weight: 600; font-size: 16px;">
                    Accept Invitation
                  </a>
                </div>
                
                <p style="color: #666; font-size: 14px; line-height: 1.5;">
                  Or copy and paste this link into your browser:<br>
                  <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px; text-align: center;">
                  This invitation will expire in 7 days. If you have any questions, please contact ${inviterName}.
                </p>
              </div>
            </div>
          `
        })

        results.push({ email, success: true, id: invitation.id })
      } catch (emailError: any) {
        console.error('Email error for', email, emailError)
        
        // Delete the invitation if email sending failed
        await supabase
          .from('tenant_invitations')
          .delete()
          .eq('id', invitation.id)
        
        results.push({ email, success: false, error: 'Failed to send email' })
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return NextResponse.json({
      message: `Sent ${successful} invitation(s)`,
      successful,
      failed,
      results
    })
  } catch (error: any) {
    console.error('Invitation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send invitations' },
      { status: 500 }
    )
  }
}

// Export with tenant authentication wrapper
export const POST = withTenantAuth(handleInvite)