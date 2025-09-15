-- ============================================
-- ENHANCED INTERNAL MESSAGING SYSTEM
-- Complete internal messaging and communication features
-- Run AFTER critical missing tables schema
-- ============================================

-- Message Threads Management
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  thread_type VARCHAR(50) DEFAULT 'discussion', -- discussion, announcement, task_related, project_update
  project_id UUID REFERENCES projects(id),
  task_id UUID REFERENCES tasks(id),
  is_archived BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  last_message_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  participant_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thread Participants
CREATE TABLE IF NOT EXISTS thread_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  role VARCHAR(50) DEFAULT 'participant', -- owner, moderator, participant
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  is_muted BOOLEAN DEFAULT FALSE,
  notification_preference VARCHAR(50) DEFAULT 'all', -- all, mentions, none
  UNIQUE(thread_id, user_id)
);

-- Enhanced Messages (modify existing table if needed)
DO $$ BEGIN
  -- Add missing columns to existing messages table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'thread_id') THEN
      ALTER TABLE messages ADD COLUMN thread_id UUID REFERENCES message_threads(id);
      RAISE NOTICE 'Added thread_id column to existing messages table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'recipient_id') THEN
      ALTER TABLE messages ADD COLUMN recipient_id UUID REFERENCES profiles(id);
      RAISE NOTICE 'Added recipient_id column to existing messages table';
    END IF;
  ELSE
    -- Create messages table if it doesn't exist
    CREATE TABLE messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      thread_id UUID REFERENCES message_threads(id),
      sender_id UUID NOT NULL REFERENCES profiles(id),
      recipient_id UUID REFERENCES profiles(id), -- For direct messages
      conversation_id UUID, -- For group conversations
      subject VARCHAR(255),
      content TEXT NOT NULL,
      message_type VARCHAR(50) DEFAULT 'text', -- text, file, image, system, notification
      metadata JSONB, -- File attachments, formatting, etc.
      is_read BOOLEAN DEFAULT FALSE,
      read_at TIMESTAMPTZ,
      is_system BOOLEAN DEFAULT FALSE,
      reply_to_id UUID REFERENCES messages(id),
      reactions JSONB, -- Emoji reactions
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Message Attachments
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_upload_id UUID, -- REFERENCES file_uploads(id) - table created by 11-critical-missing-tables.sql
  filename VARCHAR(255) NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  download_url TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message Read Receipts
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
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

-- User Preferences for Messaging
CREATE TABLE IF NOT EXISTS user_messaging_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  desktop_notifications BOOLEAN DEFAULT TRUE,
  sound_notifications BOOLEAN DEFAULT TRUE,
  notification_schedule JSONB, -- Quiet hours, days, etc.
  auto_read_receipts BOOLEAN DEFAULT TRUE,
  show_online_status BOOLEAN DEFAULT TRUE,
  thread_preview_length INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- Message Search Index
CREATE TABLE IF NOT EXISTS message_search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  search_vector tsvector,
  content_preview TEXT,
  sender_name VARCHAR(255),
  thread_subject VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Announcements
CREATE TABLE IF NOT EXISTS system_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for global announcements
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  announcement_type VARCHAR(50) DEFAULT 'info', -- info, warning, success, error, maintenance
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  target_audience VARCHAR(50) DEFAULT 'all', -- all, admins, specific_role
  target_roles JSONB, -- Array of roles if target_audience is specific_role
  is_dismissible BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcement Read Status
CREATE TABLE IF NOT EXISTS announcement_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES system_announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  read_at TIMESTAMPTZ DEFAULT NOW(),
  dismissed_at TIMESTAMPTZ,
  UNIQUE(announcement_id, user_id)
);

-- Direct Message Conversations (separate from threads)
CREATE TABLE IF NOT EXISTS direct_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  participant_1_id UUID NOT NULL REFERENCES profiles(id),
  participant_2_id UUID NOT NULL REFERENCES profiles(id),
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  is_archived_p1 BOOLEAN DEFAULT FALSE,
  is_archived_p2 BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, participant_1_id, participant_2_id),
  CONSTRAINT different_participants CHECK (participant_1_id != participant_2_id)
);

-- Message Drafts
CREATE TABLE IF NOT EXISTS message_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES message_threads(id),
  conversation_id UUID REFERENCES direct_conversations(id),
  recipient_id UUID REFERENCES profiles(id),
  subject VARCHAR(255),
  content TEXT,
  attachments JSONB,
  auto_saved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_threads_tenant ON message_threads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_project ON message_threads(project_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_created_by ON message_threads(created_by);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_message ON message_threads(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_thread_participants_thread ON thread_participants(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_participants_user ON thread_participants(user_id);

-- Only create indexes for columns that will exist after the ALTER TABLE above
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Skip these - they reference columns that may not exist in base schema
-- CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
-- CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
-- CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
-- CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user ON message_read_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_user_messaging_prefs_user ON user_messaging_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_message_search_tenant ON message_search_index(tenant_id);
CREATE INDEX IF NOT EXISTS idx_message_search_vector ON message_search_index USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_system_announcements_tenant ON system_announcements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_system_announcements_published ON system_announcements(is_published, published_at);
CREATE INDEX IF NOT EXISTS idx_announcement_read_user ON announcement_read_status(user_id);

CREATE INDEX IF NOT EXISTS idx_direct_conversations_p1 ON direct_conversations(participant_1_id);
CREATE INDEX IF NOT EXISTS idx_direct_conversations_p2 ON direct_conversations(participant_2_id);
CREATE INDEX IF NOT EXISTS idx_direct_conversations_last_message ON direct_conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_drafts_user ON message_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_message_drafts_thread ON message_drafts(thread_id);

-- Full-text search index for messages (skip - subject column doesn't exist)
-- CREATE INDEX IF NOT EXISTS idx_messages_search ON messages 
--   USING GIN(to_tsvector('english', subject || ' ' || content));

-- RLS Policies
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_messaging_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_drafts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on messages table if it wasn't already enabled
DO $$ BEGIN
  ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN NULL; -- Table might already have RLS enabled
END $$;

-- Tenant isolation policies
DO $$ BEGIN
  CREATE POLICY message_threads_tenant_policy ON message_threads
    FOR ALL USING (tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY thread_participants_access_policy ON thread_participants
    FOR ALL USING (
      user_id = auth.uid() OR
      thread_id IN (
        SELECT thread_id FROM thread_participants WHERE user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY messages_participant_policy ON messages
    FOR ALL USING (
      sender_id = auth.uid() OR
      recipient_id = auth.uid() OR
      thread_id IN (
        SELECT thread_id FROM thread_participants WHERE user_id = auth.uid()
      ) OR
      tenant_id IN (
        SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY user_messaging_prefs_own_policy ON user_messaging_preferences
    FOR ALL USING (user_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY system_announcements_tenant_policy ON system_announcements
    FOR SELECT USING (
      tenant_id IS NULL OR
      tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY direct_conversations_participant_policy ON direct_conversations
    FOR ALL USING (
      participant_1_id = auth.uid() OR 
      participant_2_id = auth.uid()
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY message_drafts_own_policy ON message_drafts
    FOR ALL USING (user_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Trigger to update message search index
CREATE OR REPLACE FUNCTION update_message_search_index()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO message_search_index (message_id, tenant_id, search_vector, content_preview, sender_name, thread_subject)
    VALUES (
      NEW.id,
      NEW.tenant_id,
      to_tsvector('english', COALESCE(NEW.subject, '') || ' ' || NEW.content),
      LEFT(NEW.content, 200),
      (SELECT COALESCE(full_name, email) FROM profiles WHERE id = NEW.sender_id),
      (SELECT subject FROM message_threads WHERE id = NEW.thread_id)
    )
    ON CONFLICT (message_id) DO UPDATE SET
      search_vector = EXCLUDED.search_vector,
      content_preview = EXCLUDED.content_preview,
      sender_name = EXCLUDED.sender_name,
      thread_subject = EXCLUDED.thread_subject;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    DELETE FROM message_search_index WHERE message_id = OLD.id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for message search index
DROP TRIGGER IF EXISTS trigger_update_message_search_index ON messages;
CREATE TRIGGER trigger_update_message_search_index
  AFTER INSERT OR UPDATE OR DELETE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_message_search_index();

-- Function to get unread message count for user
CREATE OR REPLACE FUNCTION get_unread_message_count(user_id UUID, tenant_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM messages m
    WHERE (m.recipient_id = user_id OR m.thread_id IN (
      SELECT thread_id FROM thread_participants WHERE user_id = user_id
    ))
    AND m.tenant_id = tenant_id
    AND m.is_read = false
    AND m.sender_id != user_id
  );
END;
$$ LANGUAGE plpgsql;