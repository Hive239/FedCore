-- Email Reply System Schema
-- Handles incoming email replies and threads them back to conversations

-- Add email threading fields to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS email_message_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email_thread_id TEXT,
ADD COLUMN IF NOT EXISTS email_references TEXT,
ADD COLUMN IF NOT EXISTS is_email_reply BOOLEAN DEFAULT FALSE;

-- Add unique conversation key for email threading
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS email_thread_key TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS reply_to_email TEXT;

-- Create table for incoming emails (webhook storage)
CREATE TABLE IF NOT EXISTS incoming_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_email TEXT NOT NULL,
    from_name TEXT,
    to_email TEXT NOT NULL,
    subject TEXT,
    html_body TEXT,
    text_body TEXT,
    message_id TEXT UNIQUE,
    in_reply_to TEXT,
    email_references TEXT,
    thread_id TEXT,
    headers JSONB,
    attachments JSONB DEFAULT '[]',
    received_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    conversation_id UUID REFERENCES conversations(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed', 'ignored')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for email configuration per tenant
CREATE TABLE IF NOT EXISTS email_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    reply_to_email TEXT NOT NULL,
    reply_to_name TEXT,
    webhook_secret TEXT,
    email_provider TEXT CHECK (email_provider IN ('sendgrid', 'postmark', 'resend', 'mailgun', 'ses')),
    smtp_host TEXT,
    smtp_port INTEGER,
    smtp_user TEXT,
    smtp_password_encrypted TEXT,
    inbound_domain TEXT, -- e.g., replies.yourapp.com
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id)
);

-- Update email_queue to include threading info
ALTER TABLE email_queue
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id),
ADD COLUMN IF NOT EXISTS message_thread_id TEXT,
ADD COLUMN IF NOT EXISTS reply_to_email TEXT,
ADD COLUMN IF NOT EXISTS in_reply_to TEXT,
ADD COLUMN IF NOT EXISTS email_references_field TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_incoming_emails_from ON incoming_emails(from_email);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_thread ON incoming_emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_status ON incoming_emails(status);
CREATE INDEX IF NOT EXISTS idx_messages_email_thread ON messages(email_thread_id);
CREATE INDEX IF NOT EXISTS idx_conversations_email_thread ON conversations(email_thread_key);

-- Enable RLS
ALTER TABLE incoming_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for incoming emails
CREATE POLICY "Users can view incoming emails for their conversations"
    ON incoming_emails FOR SELECT
    USING (
        conversation_id IN (
            SELECT conversation_id FROM conversation_participants
            WHERE user_id = auth.uid()
        )
    );

-- RLS for email settings (admin only)
CREATE POLICY "Admins can manage email settings"
    ON email_settings FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- Function to process incoming email replies
CREATE OR REPLACE FUNCTION process_incoming_email(
    p_from_email TEXT,
    p_from_name TEXT,
    p_to_email TEXT,
    p_subject TEXT,
    p_html_body TEXT,
    p_text_body TEXT,
    p_message_id TEXT,
    p_in_reply_to TEXT,
    p_references TEXT
) RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
    v_thread_key TEXT;
    v_message_id UUID;
    v_incoming_id UUID;
BEGIN
    -- Extract thread key from to_email (e.g., conv-abc123@replies.yourapp.com)
    v_thread_key := split_part(p_to_email, '@', 1);
    
    -- Find the conversation by thread key
    SELECT id INTO v_conversation_id
    FROM conversations
    WHERE email_thread_key = v_thread_key;
    
    -- If no conversation found, try to match by participant email
    IF v_conversation_id IS NULL THEN
        SELECT DISTINCT c.id INTO v_conversation_id
        FROM conversations c
        JOIN conversation_participants cp ON c.id = cp.conversation_id
        WHERE cp.external_email = p_from_email
        ORDER BY c.updated_at DESC
        LIMIT 1;
    END IF;
    
    -- Store the incoming email
    INSERT INTO incoming_emails (
        from_email,
        from_name,
        to_email,
        subject,
        html_body,
        text_body,
        message_id,
        in_reply_to,
        email_references,
        thread_id,
        conversation_id,
        status
    ) VALUES (
        p_from_email,
        p_from_name,
        p_to_email,
        p_subject,
        p_html_body,
        p_text_body,
        p_message_id,
        p_in_reply_to,
        p_references,
        v_thread_key,
        v_conversation_id,
        CASE WHEN v_conversation_id IS NOT NULL THEN 'processed' ELSE 'pending' END
    ) RETURNING id INTO v_incoming_id;
    
    -- If we found a conversation, create a message
    IF v_conversation_id IS NOT NULL THEN
        INSERT INTO messages (
            conversation_id,
            sender_email,
            sender_name,
            content,
            type,
            email_message_id,
            email_thread_id,
            is_email_reply,
            metadata
        ) VALUES (
            v_conversation_id,
            p_from_email,
            COALESCE(p_from_name, p_from_email),
            COALESCE(p_text_body, p_html_body),
            'text',
            p_message_id,
            v_thread_key,
            TRUE,
            jsonb_build_object(
                'incoming_email_id', v_incoming_id,
                'subject', p_subject
            )
        ) RETURNING id INTO v_message_id;
        
        -- Update incoming email as processed
        UPDATE incoming_emails
        SET processed_at = NOW()
        WHERE id = v_incoming_id;
    END IF;
    
    RETURN v_incoming_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique thread key for conversations
CREATE OR REPLACE FUNCTION generate_email_thread_key()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate thread key for external conversations
    IF NEW.type = 'external' AND NEW.email_thread_key IS NULL THEN
        NEW.email_thread_key := 'conv-' || substr(md5(random()::text || clock_timestamp()::text), 1, 12);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate thread keys
CREATE TRIGGER generate_conversation_thread_key
    BEFORE INSERT ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION generate_email_thread_key();

-- Function to prepare outgoing email with threading
CREATE OR REPLACE FUNCTION prepare_email_with_threading(
    p_message_id UUID,
    p_conversation_id UUID
) RETURNS VOID AS $$
DECLARE
    v_thread_key TEXT;
    v_tenant_id UUID;
    v_reply_to TEXT;
    v_last_email_id TEXT;
BEGIN
    -- Get conversation thread key and tenant
    SELECT email_thread_key, tenant_id 
    INTO v_thread_key, v_tenant_id
    FROM conversations
    WHERE id = p_conversation_id;
    
    -- Get email settings for tenant
    SELECT 
        COALESCE(reply_to_email, 'noreply@projectpro.app'),
        inbound_domain
    INTO v_reply_to
    FROM email_settings
    WHERE tenant_id = v_tenant_id
    AND is_active = TRUE;
    
    -- If we have an inbound domain, create unique reply-to
    IF v_reply_to IS NOT NULL AND v_thread_key IS NOT NULL THEN
        v_reply_to := v_thread_key || '@' || split_part(v_reply_to, '@', 2);
    END IF;
    
    -- Get last email message ID for threading
    SELECT email_message_id INTO v_last_email_id
    FROM messages
    WHERE conversation_id = p_conversation_id
    AND email_message_id IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Update the email queue entry with threading info
    UPDATE email_queue
    SET 
        conversation_id = p_conversation_id,
        message_thread_id = v_thread_key,
        reply_to_email = v_reply_to,
        in_reply_to = v_last_email_id,
        email_references_field = v_last_email_id
    WHERE message_id = p_message_id;
END;
$$ LANGUAGE plpgsql;

-- Default email settings for existing tenants
INSERT INTO email_settings (
    tenant_id,
    reply_to_email,
    reply_to_name,
    email_provider,
    inbound_domain
)
SELECT 
    id,
    'messages@projectpro.app',
    'Project Pro Messages',
    'resend',
    'replies.projectpro.app'
FROM tenants
WHERE NOT EXISTS (
    SELECT 1 FROM email_settings WHERE tenant_id = tenants.id
);