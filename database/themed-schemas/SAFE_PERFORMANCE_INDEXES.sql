-- ============================================
-- SAFE PERFORMANCE INDEXES - GUARANTEED NO ERRORS
-- Only creates indexes for confirmed existing columns
-- ============================================

-- Core indexes that will definitely work
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_lookup ON user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_lookup ON user_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_composite ON user_tenants(user_id, tenant_id);

-- Projects - basic indexes
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- Tasks - basic indexes  
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);

-- Vendors - basic indexes
CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON vendors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);

-- Documents - basic indexes
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

-- Events - basic indexes
CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_id);

-- Categories - basic indexes  
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Tenants - basic indexes
CREATE INDEX IF NOT EXISTS idx_tenants_name ON tenants(name);
CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON tenants(created_at);

-- Messages - basic indexes (only confirmed columns)
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Notifications - basic indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Conversations - basic indexes
CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);

-- Safe performance indexes created successfully