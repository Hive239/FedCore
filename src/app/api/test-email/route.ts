import { NextResponse } from 'next/server'

// Test endpoint to verify email configuration
export async function GET() {
  const hasResendKey = !!(process.env.RESEND_API_KEY && 
                          process.env.RESEND_API_KEY !== 're_xxxxxxxxxxxxxxxxxxxxx' &&
                          process.env.RESEND_API_KEY.length > 10)
  
  if (!hasResendKey) {
    return NextResponse.json({ 
      configured: false,
      message: 'Email service not configured. RESEND_API_KEY is missing or invalid.'
    })
  }
  
  try {
    const { Resend } = require('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    
    // Send a test email
    const { data, error } = await resend.emails.send({
      from: 'FEDCORE <onboarding@resend.dev>',  // Using Resend's test domain
      to: ['delivered@resend.dev'],  // Resend's test email
      subject: 'Test Email from FEDCORE',
      html: '<p>This is a test email to verify your configuration is working.</p>'
    })
    
    if (error) {
      return NextResponse.json({ 
        configured: true,
        success: false,
        error: error.message || 'Failed to send test email'
      })
    }
    
    return NextResponse.json({ 
      configured: true,
      success: true,
      message: 'Email service is configured and working!',
      messageId: data?.id
    })
    
  } catch (err) {
    return NextResponse.json({ 
      configured: true,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    })
  }
}