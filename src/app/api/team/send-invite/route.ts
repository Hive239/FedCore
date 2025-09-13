import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  try {
    // Skip auth check for now - in production you'd verify the user
    // const supabase = await createClient()
    // const { data: { user } } = await supabase.auth.getUser()
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }
    
    // Get request body
    const body = await request.json()
    const { email, inviteLink, role, senderName, organizationName } = body
    
    if (!email || !inviteLink) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Initialize Resend with API key
    const resend = new Resend(process.env.RESEND_API_KEY)
    
    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Project Pro <onboarding@resend.dev>',  // Using Resend's test domain for now
      to: [email],
      subject: `You're invited to join ${organizationName || 'our organization'} on Project Pro`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .content { background: #f7f7f7; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
              .role-badge { display: inline-block; background: #e5e7eb; color: #374151; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
              .link-text { word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 5px; margin-top: 10px; font-size: 12px; color: #4b5563; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 28px;">You're Invited!</h1>
              </div>
              <div class="content">
                <p style="font-size: 16px; color: #1f2937;">Hi there,</p>
                
                <p style="font-size: 16px; color: #1f2937;">
                  ${senderName || 'A team member'} has invited you to join <strong>${organizationName || 'their organization'}</strong> on Project Pro as a <span class="role-badge">${role || 'member'}</span>.
                </p>
                
                <p style="font-size: 16px; color: #1f2937;">
                  Project Pro is a powerful project management platform designed for construction and contracting teams. Join your team to:
                </p>
                
                <ul style="color: #4b5563; font-size: 14px; line-height: 1.8;">
                  <li>📊 Collaborate on projects in real-time</li>
                  <li>📅 Manage schedules and deadlines</li>
                  <li>💬 Communicate with your team</li>
                  <li>📈 Track progress and generate reports</li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${inviteLink}" class="button">Accept Invitation</a>
                </div>
                
                <p style="font-size: 12px; color: #6b7280;">
                  Or copy and paste this link into your browser:
                </p>
                <div class="link-text">
                  ${inviteLink}
                </div>
                
                <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
                  This invitation will expire in 7 days.
                </p>
              </div>
              
              <div class="footer">
                <p>© 2024 Project Pro. All rights reserved.</p>
                <p>If you didn't expect this invitation, you can safely ignore this email.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
You're invited to join ${organizationName || 'our organization'} on Project Pro!

${senderName || 'A team member'} has invited you to join as a ${role || 'member'}.

Accept your invitation:
${inviteLink}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.
      `
    })
    
    if (error) {
      console.error('Failed to send email:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message || 'Failed to send email',
        inviteLink 
      }, { status: 200 })
    }
    
    return NextResponse.json({ success: true, messageId: data?.id })
    
  } catch (error) {
    console.error('Send invite error:', error)
    return NextResponse.json({ 
      error: 'Failed to send invitation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}