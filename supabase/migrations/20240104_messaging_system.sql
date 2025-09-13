-- Messaging System Schema
-- Supports internal team messaging and external email communications

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('direct', 'group', 'external')),
    name TEXT,
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    is_archived BOOLEAN DEFAULT FALSE
);

-- Create conversation participants
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    external_email TEXT,
    external_name TEXT,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    last_read_at TIMESTAMPTZ,
    unread_count INTEGER DEFAULT 0,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    CHECK (
        (user_id IS NOT NULL AND external_email IS NULL) OR 
        (user_id IS NULL AND external_email IS NOT NULL)
    )
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    sender_email TEXT,
    sender_name TEXT,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'system')),
    attachments JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create message read receipts
CREATE TABLE IF NOT EXISTS message_read_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- Create typing indicators table (for real-time)
CREATE TABLE IF NOT EXISTS typing_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

-- Create email queue for external messages
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    to_email TEXT NOT NULL,
    to_name TEXT,
    from_email TEXT NOT NULL,
    from_name TEXT,
    subject TEXT NOT NULL,
    html_body TEXT NOT NULL,
    text_body TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
    error TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_message_read_receipts_message ON message_read_receipts(message_id);
CREATE INDEX idx_typing_indicators_conversation ON typing_indicators(conversation_id);
CREATE INDEX idx_email_queue_status ON email_queue(status);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Conversations: Users can see conversations they're part of
CREATE POLICY "Users can view their conversations"
    ON conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = conversations.id
            AND user_id = auth.uid()
        )
    );

-- Conversations: Users can create conversations in their tenant
CREATE POLICY "Users can create conversations"
    ON conversations FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants
            WHERE user_id = auth.uid()
        )
    );

-- Conversation participants: Users can see participants in their conversations
CREATE POLICY "Users can view conversation participants"
    ON conversation_participants FOR SELECT
    USING (
        conversation_id IN (
            SELECT id FROM conversations
            WHERE EXISTS (
                SELECT 1 FROM conversation_participants cp
                WHERE cp.conversation_id = conversations.id
                AND cp.user_id = auth.uid()
            )
        )
    );

-- Messages: Users can view messages in their conversations
CREATE POLICY "Users can view messages"
    ON messages FOR SELECT
    USING (
        conversation_id IN (
            SELECT conversation_id FROM conversation_participants
            WHERE user_id = auth.uid()
        )
    );

-- Messages: Users can send messages to their conversations
CREATE POLICY "Users can send messages"
    ON messages FOR INSERT
    WITH CHECK (
        conversation_id IN (
            SELECT conversation_id FROM conversation_participants
            WHERE user_id = auth.uid()
        )
    );

-- Message read receipts: Users can mark messages as read
CREATE POLICY "Users can create read receipts"
    ON message_read_receipts FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Typing indicators: Users can update their typing status
CREATE POLICY "Users can manage typing indicators"
    ON typing_indicators FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Functions

-- Function to update conversation last message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET 
        last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 100),
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    
    -- Update unread counts for all participants except sender
    UPDATE conversation_participants
    SET unread_count = unread_count + 1
    WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating conversation on new message
CREATE TRIGGER update_conversation_on_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Insert read receipts for unread messages
    INSERT INTO message_read_receipts (message_id, user_id)
    SELECT m.id, p_user_id
    FROM messages m
    WHERE m.conversation_id = p_conversation_id
    AND m.sender_id != p_user_id
    AND NOT EXISTS (
        SELECT 1 FROM message_read_receipts
        WHERE message_id = m.id AND user_id = p_user_id
    );
    
    -- Reset unread count
    UPDATE conversation_participants
    SET 
        unread_count = 0,
        last_read_at = NOW()
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old typing indicators
CREATE OR REPLACE FUNCTION cleanup_typing_indicators()
RETURNS VOID AS $$
BEGIN
    DELETE FROM typing_indicators
    WHERE started_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql;

-- Function to get conversation members for a user
CREATE OR REPLACE FUNCTION get_team_members_for_messaging(p_user_id UUID)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT,
    is_online BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.email,
        p.full_name,
        p.avatar_url,
        ut.role,
        (p.last_seen_at > NOW() - INTERVAL '5 minutes') as is_online
    FROM profiles p
    JOIN user_tenants ut ON p.id = ut.user_id
    WHERE ut.tenant_id IN (
        SELECT tenant_id FROM user_tenants WHERE user_id = p_user_id
    )
    AND p.id != p_user_id
    ORDER BY p.full_name;
END;
$$ LANGUAGE plpgsql;

-- Add last_seen_at to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- Create function to update last seen
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS VOID AS $$
BEGIN
    UPDATE profiles
    SET last_seen_at = NOW()
    WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql;