import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import crypto from 'crypto'

// Email webhook endpoint for receiving replies
// Supports multiple email providers: SendGrid, Postmark, Resend, Mailgun

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const provider = headersList.get('x-email-provider') || detectProvider(headersList)
    
    if (!provider) {
      return NextResponse.json(
        { error: 'Unknown email provider' },
        { status: 400 }
      )
    }

    // Parse the webhook based on provider
    let emailData: any = null
    
    switch (provider) {
      case 'sendgrid':
        emailData = await parseSendGridWebhook(request)
        break
      case 'postmark':
        emailData = await parsePostmarkWebhook(request)
        break
      case 'resend':
        emailData = await parseResendWebhook(request)
        break
      case 'mailgun':
        emailData = await parseMailgunWebhook(request)
        break
      default:
        return NextResponse.json(
          { error: 'Unsupported email provider' },
          { status: 400 }
        )
    }

    if (!emailData) {
      return NextResponse.json(
        { error: 'Failed to parse email data' },
        { status: 400 }
      )
    }

    // Process the incoming email
    const { data, error } = await supabase.rpc('process_incoming_email', {
      p_from_email: emailData.from_email,
      p_from_name: emailData.from_name,
      p_to_email: emailData.to_email,
      p_subject: emailData.subject,
      p_html_body: emailData.html_body,
      p_text_body: emailData.text_body,
      p_message_id: emailData.message_id,
      p_in_reply_to: emailData.in_reply_to,
      p_references: emailData.references
    })

    if (error) {
      console.error('Error processing incoming email:', error)
      return NextResponse.json(
        { error: 'Failed to process email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, id: data })
    
  } catch (error) {
    console.error('Email webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function detectProvider(headers: Headers): string | null {
  // Detect provider based on headers
  if (headers.get('x-postmark-signature')) return 'postmark'
  if (headers.get('x-sendgrid-signature')) return 'sendgrid'
  if (headers.get('x-resend-signature')) return 'resend'
  if (headers.get('x-mailgun-signature')) return 'mailgun'
  
  return null
}

async function parseSendGridWebhook(request: NextRequest) {
  const data = await request.json()
  
  // SendGrid inbound parse webhook format
  return {
    from_email: data.from?.match(/<(.+)>/)?.[1] || data.from,
    from_name: data.from?.split('<')[0]?.trim(),
    to_email: data.to,
    subject: data.subject,
    html_body: data.html,
    text_body: data.text,
    message_id: data.headers?.['Message-ID'],
    in_reply_to: data.headers?.['In-Reply-To'],
    references: data.headers?.['References']
  }
}

async function parsePostmarkWebhook(request: NextRequest) {
  const data = await request.json()
  
  // Postmark inbound webhook format
  return {
    from_email: data.FromFull?.Email || data.From,
    from_name: data.FromFull?.Name,
    to_email: data.ToFull?.[0]?.Email || data.To,
    subject: data.Subject,
    html_body: data.HtmlBody,
    text_body: data.TextBody,
    message_id: data.MessageID,
    in_reply_to: data.Headers?.find((h: any) => h.Name === 'In-Reply-To')?.Value,
    references: data.Headers?.find((h: any) => h.Name === 'References')?.Value
  }
}

async function parseResendWebhook(request: NextRequest) {
  const data = await request.json()
  
  // Resend webhook format
  if (data.type === 'email.received') {
    const email = data.data
    return {
      from_email: email.from.email,
      from_name: email.from.name,
      to_email: email.to[0].email,
      subject: email.subject,
      html_body: email.html,
      text_body: email.text,
      message_id: email.message_id,
      in_reply_to: email.in_reply_to,
      references: email.references
    }
  }
  
  return null
}

async function parseMailgunWebhook(request: NextRequest) {
  const formData = await request.formData()
  
  // Mailgun webhook format (form data)
  return {
    from_email: formData.get('sender') as string,
    from_name: formData.get('from')?.toString().split('<')[0]?.trim(),
    to_email: formData.get('recipient') as string,
    subject: formData.get('subject') as string,
    html_body: formData.get('body-html') as string,
    text_body: formData.get('body-plain') as string,
    message_id: formData.get('Message-Id') as string,
    in_reply_to: formData.get('In-Reply-To') as string,
    references: formData.get('References') as string
  }
}

// Verify webhook signatures (example for SendGrid)
function verifySendGridSignature(request: NextRequest, secret: string): boolean {
  const signature = request.headers.get('x-sendgrid-signature')
  if (!signature) return false
  
  // Implementation depends on SendGrid's signature format
  // This is a simplified example
  return true
}