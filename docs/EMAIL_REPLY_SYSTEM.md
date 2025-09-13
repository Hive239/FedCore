# Email Reply System Documentation

## Overview
The messaging system now supports two-way email communication with external contacts (customers, vendors). When contacts reply to emails sent from Project Pro, their responses automatically appear in the messaging console.

## How It Works

### Sending Emails to External Contacts
1. When you message an external contact, the system sends an actual email
2. Each conversation gets a unique thread key (e.g., `conv-abc123`)
3. The reply-to address is set to `conv-abc123@replies.projectpro.app`
4. Email includes threading headers for proper email client grouping

### Receiving Email Replies
1. Contact replies to the email they received
2. Email provider (SendGrid, Postmark, etc.) sends webhook to `/api/webhooks/email`
3. System processes the incoming email:
   - Extracts the thread key from the to-address
   - Finds the matching conversation
   - Creates a new message in the conversation
   - Marks it as an email reply with special styling

### Visual Indicators
- **Email replies** show with a blue background and "Email Reply" badge
- **Sent emails** show a mail icon instead of read receipts
- **Subject lines** are preserved from email replies

## Database Schema

### New Tables
- `incoming_emails` - Stores raw incoming email data
- `email_settings` - Tenant-specific email configuration

### Modified Tables
- `messages` - Added email tracking fields:
  - `email_message_id` - Unique email ID
  - `email_thread_id` - Thread identifier
  - `is_email_reply` - Boolean flag for replies
  - `sender_email` - External sender's email

- `conversations` - Added:
  - `email_thread_key` - Unique key for email threading
  - `reply_to_email` - Dynamic reply-to address

- `email_queue` - Added threading fields:
  - `conversation_id` - Links to conversation
  - `reply_to_email` - Dynamic reply address
  - `in_reply_to` - Email threading header
  - `email_references_field` - Email thread references

## Email Provider Setup

### Supported Providers
- SendGrid
- Postmark
- Resend
- Mailgun
- Amazon SES

### Configuration Steps

#### 1. SendGrid Setup
```bash
# Set up Inbound Parse webhook
1. Go to Settings > Inbound Parse
2. Add Host & URL:
   - Host: replies.projectpro.app
   - URL: https://yourapp.com/api/webhooks/email
3. Add MX records to your DNS:
   - mx.sendgrid.net (priority 10)
```

#### 2. Postmark Setup
```bash
# Configure Inbound webhook
1. Go to Servers > Inbound
2. Add webhook URL: https://yourapp.com/api/webhooks/email
3. Set up inbound email address
4. Configure DNS records as provided
```

#### 3. Resend Setup
```bash
# Set up Email Forwarding
1. Go to Email Forwarding
2. Add domain: replies.projectpro.app
3. Set webhook: https://yourapp.com/api/webhooks/email
4. Add DNS records as instructed
```

### DNS Configuration
Add these DNS records for your reply domain:

```
MX records:
- 10 mx.yourprovider.com

TXT records:
- v=spf1 include:yourprovider.com ~all
- (DKIM records as provided by your email service)
```

## Testing

### Manual Testing
1. Create a conversation with an external contact
2. Send a message (email will be sent)
3. Reply to the email from the contact's email client
4. Check that reply appears in messaging console

### Webhook Testing
Use curl to simulate incoming email:

```bash
curl -X POST https://yourapp.com/api/webhooks/email \
  -H "Content-Type: application/json" \
  -H "x-email-provider: resend" \
  -d '{
    "type": "email.received",
    "data": {
      "from": {"email": "customer@example.com", "name": "John Customer"},
      "to": [{"email": "conv-abc123@replies.projectpro.app"}],
      "subject": "Re: Message from Project Pro",
      "text": "This is my reply to your message",
      "message_id": "<unique-id@example.com>"
    }
  }'
```

## Security Considerations

1. **Webhook Verification**: Each provider has signature verification
2. **Thread Key Security**: Use random generated keys, not sequential IDs
3. **Rate Limiting**: Implement rate limits on webhook endpoint
4. **Spam Filtering**: Consider adding spam detection
5. **Email Validation**: Validate sender emails against known contacts

## Future Enhancements

1. **Attachments**: Handle email attachments
2. **Rich HTML**: Preserve HTML formatting from emails
3. **Auto-responses**: Set up out-of-office replies
4. **Email Templates**: Pre-formatted response templates
5. **Read Receipts**: Track when emails are opened
6. **Delivery Status**: Show email bounce/delivery status