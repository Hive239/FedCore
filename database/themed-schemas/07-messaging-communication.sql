-- ============================================
-- MESSAGING & COMMUNICATION SCHEMA
-- Enhanced messaging and email integration
-- Run AFTER complete-production-setup-fixed.sql
-- ============================================

-- Enhanced Conversations (if not exists in base)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(255),
  type VARCHAR(50) DEFAULT 'direct', -- direct, group, channel, broadcast
  is_archived BOOLEAN DEFAULT FALSE,
  last_message_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation Participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  role VARCHAR(50) DEFAULT 'member', -- owner, admin, member
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  is_muted BOOLEAN DEFAULT FALSE,
  muted_until TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  notification_preference VARCHAR(50) DEFAULT 'all', -- all, mentions, none
  UNIQUE(conversation_id, user_id)
);

-- Message Read Receipts
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Typing Indicators
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  started_typing_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 seconds'),
  UNIQUE(conversation_id, user_id)
);

-- Email Queue
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  to_email VARCHAR(255) NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  cc_emails TEXT[],
  bcc_emails TEXT[],
  subject VARCHAR(998) NOT NULL,
  html_body TEXT,
  text_body TEXT,
  attachments JSONB,
  priority INTEGER DEFAULT 5, -- 1-10, 1 being highest
  template_id VARCHAR(100),
  template_data JSONB,
  status VARCHAR(50) DEFAULT 'pending', -- pending, sending, sent, failed, bounced
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  message_id VARCHAR(255), -- External email service message ID
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incoming Emails
CREATE TABLE IF NOT EXISTS incoming_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  from_email VARCHAR(255) NOT NULL,
  to_emails TEXT[] NOT NULL,
  cc_emails TEXT[],
  subject VARCHAR(998),
  html_body TEXT,
  text_body TEXT,
  attachments JSONB,
  headers JSONB,
  message_id VARCHAR(255),
  in_reply_to VARCHAR(255),
  reference_ids TEXT[],
  spam_score DECIMAL(5,2),
  is_spam BOOLEAN DEFAULT FALSE,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  conversation_id UUID REFERENCES conversations(id),
  created_message_id UUID REFERENCES messages(id),
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Settings
CREATE TABLE IF NOT EXISTS email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  smtp_host VARCHAR(255),
  smtp_port INTEGER,
  smtp_username VARCHAR(255),
  smtp_password_encrypted TEXT,
  smtp_secure BOOLEAN DEFAULT TRUE,
  imap_host VARCHAR(255),
  imap_port INTEGER,
  imap_username VARCHAR(255),
  imap_password_encrypted TEXT,
  imap_secure BOOLEAN DEFAULT TRUE,
  from_name VARCHAR(255),
  from_email VARCHAR(255),
  reply_to_email VARCHAR(255),
  signature_html TEXT,
  signature_text TEXT,
  auto_bcc_emails TEXT[],
  daily_send_limit INTEGER DEFAULT 1000,
  sends_today INTEGER DEFAULT 0,
  limit_reset_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  template_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(998) NOT NULL,
  html_template TEXT NOT NULL,
  text_template TEXT,
  variables JSONB, -- Expected variables and their descriptions
  category VARCHAR(50),
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, template_id)
);

-- Message Attachments
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT,
  metadata JSONB,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message Reactions
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  reaction VARCHAR(50) NOT NULL, -- emoji or reaction type
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, reaction)
);

-- Message Mentions
CREATE TABLE IF NOT EXISTS message_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES profiles(id),
  mention_type VARCHAR(50) DEFAULT 'user', -- user, everyone, channel
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL, -- email, push, sms, in_app
  category VARCHAR(100) NOT NULL, -- messages, tasks, projects, system, etc.
  enabled BOOLEAN DEFAULT TRUE,
  frequency VARCHAR(50) DEFAULT 'instant', -- instant, hourly, daily, weekly
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id, channel, category)
);

-- Notification Queue
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  data JSONB,
  channels VARCHAR(50)[] DEFAULT ARRAY['in_app'],
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, read, failed
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS Messages
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  to_phone VARCHAR(50) NOT NULL,
  from_phone VARCHAR(50),
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, failed
  provider VARCHAR(50), -- twilio, aws_sns, etc.
  provider_message_id VARCHAR(255),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_message_read_receipts_message ON message_read_receipts(message_id);
CREATE INDEX idx_typing_indicators_conversation ON typing_indicators(conversation_id);
CREATE INDEX idx_typing_indicators_expires ON typing_indicators(expires_at);
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_scheduled ON email_queue(scheduled_for);
CREATE INDEX idx_incoming_emails_tenant ON incoming_emails(tenant_id);
CREATE INDEX idx_incoming_emails_processed ON incoming_emails(processed);
CREATE INDEX idx_email_templates_tenant ON email_templates(tenant_id);
CREATE INDEX idx_message_attachments_message ON message_attachments(message_id);
CREATE INDEX idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX idx_message_mentions_message ON message_mentions(message_id);
CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX idx_notification_queue_user ON notification_queue(user_id);
CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_sms_messages_tenant ON sms_messages(tenant_id);

-- RLS Policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE incoming_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

-- Conversation access based on participation
CREATE POLICY conversations_participant_policy ON conversations
  FOR ALL USING (
    id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- Email settings tenant isolation
CREATE POLICY email_settings_tenant_policy ON email_settings
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

-- User's own notification preferences
CREATE POLICY notification_preferences_own_policy ON notification_preferences
  FOR ALL USING (user_id = auth.uid());