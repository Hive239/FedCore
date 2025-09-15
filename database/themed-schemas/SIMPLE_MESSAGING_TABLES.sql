-- ============================================
-- SIMPLE MESSAGING TABLES - NO COMPLEX FUNCTIONS
-- ============================================

-- Message Threads Management
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  thread_type VARCHAR(50) DEFAULT 'discussion',
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
  role VARCHAR(50) DEFAULT 'participant',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  is_muted BOOLEAN DEFAULT FALSE,
  notification_preference VARCHAR(50) DEFAULT 'all',
  UNIQUE(thread_id, user_id)
);

-- Message Attachments
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_upload_id UUID,
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

-- Basic indexes only
CREATE INDEX IF NOT EXISTS idx_message_threads_tenant ON message_threads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_created_by ON message_threads(created_by);
CREATE INDEX IF NOT EXISTS idx_thread_participants_thread ON thread_participants(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_participants_user ON thread_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message ON message_read_receipts(message_id);

-- Enable RLS
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;