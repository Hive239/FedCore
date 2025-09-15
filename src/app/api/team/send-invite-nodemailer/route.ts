import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, inviteLink, role, senderName, organizationName } = body
    
    console.log('📧 Nodemailer endpoint called with:', { email, role, organizationName })
    
    if (!email || !inviteLink) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Create transporter with Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    })
    
    // Verify transporter configuration
    try {
      await transporter.verify()
      console.log('✅ Gmail transporter verified successfully')
    } catch (verifyError) {
      console.error('❌ Gmail transporter verification failed:', verifyError)
      return NextResponse.json({ 
        error: 'Email service configuration error',
        details: 'Failed to connect to Gmail. Check GMAIL_USER and GMAIL_APP_PASSWORD environment variables.'
      }, { status: 500 })
    }
    
    // Send email
    const mailOptions = {
      from: `"${organizationName || 'FEDCORE'}" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `You're invited to join ${organizationName || 'our organization'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You're Invited! 🎉</h2>
          <p>You've been invited to join <strong>${organizationName}</strong> as a <strong>${role}</strong>.</p>
          <p>Click the link below to accept your invitation:</p>
          <a href="${inviteLink}" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Accept Invitation
          </a>
          <p>Or copy this link:</p>
          <p style="background: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all;">
            ${inviteLink}
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
      text: `
You're invited to join ${organizationName} as a ${role}.

Accept your invitation here:
${inviteLink}

This invitation expires in 7 days.
      `
    }
    
    console.log('📤 Sending email to:', email)
    
    const info = await transporter.sendMail(mailOptions)
    
    console.log('✅ Email sent successfully!')
    console.log('Message ID:', info.messageId)
    console.log('Response:', info.response)
    
    return NextResponse.json({ 
      success: true, 
      messageId: info.messageId,
      message: 'Invitation email sent successfully!'
    })
    
  } catch (error) {
    console.error('❌ Send invite error:', error)
    return NextResponse.json({ 
      error: 'Failed to send invitation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}