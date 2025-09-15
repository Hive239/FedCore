-- ============================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- Critical missing indexes for query performance
-- Run AFTER all table schemas are applied
-- ============================================

-- User and Authentication Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_lookup ON profiles(id) WHERE id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_lookup ON user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_lookup ON user_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_role ON user_tenants(role);
CREATE INDEX IF NOT EXISTS idx_user_tenants_composite ON user_tenants(user_id, tenant_id, role);

-- Core Business Entity Indexes
-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_tenant_status ON projects(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_date_range ON projects(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_projects_status_created ON projects(status, created_at);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks(assignee_id, status) WHERE assignee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_priority_status ON tasks(priority, status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_assignee ON tasks(tenant_id, assignee_id) WHERE status != 'completed';

-- Vendors
CREATE INDEX IF NOT EXISTS idx_vendors_tenant_status ON vendors(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_vendors_rating ON vendors(rating) WHERE rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_created_by ON vendors(created_by);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_project_category ON documents(project_id, category_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_mime_type ON documents(mime_type);
CREATE INDEX IF NOT EXISTS idx_documents_created_date ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_file_size ON documents(file_size);
-- Skip this - handled by working fix
-- CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_category ON documents(tenant_id, category_id);

-- Events
CREATE INDEX IF NOT EXISTS idx_events_date_range ON events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_events_project_date ON events(project_id, start_date) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_location ON events(location) WHERE location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);

-- Categories
CREATE INDEX IF NOT EXISTS idx_categories_tenant_type ON categories(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Associations (check columns before creating indexes)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'associations') THEN
    -- Check if entity_type column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'associations' AND column_name = 'entity_type') THEN
      CREATE INDEX IF NOT EXISTS idx_associations_entity_type ON associations(entity_type, entity_id);
    ELSE
      RAISE NOTICE 'Skipping associations entity_type index - column does not exist';
    END IF;
    
    -- Check if associated_entity_type column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'associations' AND column_name = 'associated_entity_type') THEN
      CREATE INDEX IF NOT EXISTS idx_associations_associated_type ON associations(associated_entity_type, associated_entity_id);
    ELSE
      RAISE NOTICE 'Skipping associations associated_entity_type index - column does not exist';
    END IF;
    
    -- Check if tenant_id column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'associations' AND column_name = 'tenant_id') THEN
      CREATE INDEX IF NOT EXISTS idx_associations_tenant ON associations(tenant_id);
    ELSE
      RAISE NOTICE 'Skipping associations tenant_id index - column does not exist';
    END IF;
  ELSE
    RAISE NOTICE 'Skipping associations indexes - table does not exist';
  END IF;
END $$;

-- Messages and Conversations (check columns before creating indexes)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    -- Always safe indexes
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
    
    -- Check optional columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'conversation_id') THEN
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id) WHERE conversation_id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'recipient_id') THEN
      CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
    ELSE
      RAISE NOTICE 'Skipping messages recipient_id index - column does not exist';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'is_read') THEN
      CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'tenant_id') THEN
        CREATE INDEX IF NOT EXISTS idx_messages_tenant_unread ON messages(tenant_id, is_read) WHERE is_read = false;
      END IF;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_id) WHERE project_id IS NOT NULL;

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Tenant Management (check columns)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
    -- Always safe indexes
    CREATE INDEX IF NOT EXISTS idx_tenants_name ON tenants(name);
    CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON tenants(created_at);
    
    -- Check if status column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'status') THEN
      CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status) WHERE status IS NOT NULL;
    ELSE
      RAISE NOTICE 'Skipping tenants status index - column does not exist';
    END IF;
  END IF;
END $$;

-- Full-Text Search Indexes (GIN indexes for text search)
CREATE INDEX IF NOT EXISTS idx_projects_search ON projects 
  USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_tasks_search ON tasks 
  USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_vendors_search ON vendors 
  USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_documents_search ON documents 
  USING GIN(to_tsvector('english', filename || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_contacts_search ON contacts 
  USING GIN(to_tsvector('english', name || ' ' || COALESCE(company, '') || ' ' || COALESCE(email, '')));

-- Partial Indexes for Common Filtered Queries
CREATE INDEX IF NOT EXISTS idx_tasks_active ON tasks(tenant_id, project_id, assignee_id) 
  WHERE status IN ('pending', 'in-progress');

CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(tenant_id, created_by) 
  WHERE status IN ('new', 'on-track', 'delayed');

CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(tenant_id) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_events_upcoming ON events(tenant_id, start_date) 
  WHERE start_date >= CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, created_at) 
  WHERE is_read = false;

-- Composite Indexes for Complex Queries
CREATE INDEX IF NOT EXISTS idx_tasks_project_assignee_status ON tasks(project_id, assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_project_type ON documents(project_id, mime_type);
CREATE INDEX IF NOT EXISTS idx_events_project_date_type ON events(project_id, start_date, event_type);
CREATE INDEX IF NOT EXISTS idx_vendors_location_specialty ON vendors(location, specialty) 
  WHERE location IS NOT NULL AND specialty IS NOT NULL;

-- Time-based Indexes for Reporting
CREATE INDEX IF NOT EXISTS idx_projects_created_month ON projects(DATE_TRUNC('month', created_at), tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_month ON tasks(DATE_TRUNC('month', updated_at), tenant_id) 
  WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_events_month ON events(DATE_TRUNC('month', start_date), tenant_id);

-- BRIN Indexes for Large Time-Series Data (efficient for large tables)  
-- Only create if tables exist (they're created by 11-critical-missing-tables.sql)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
    CREATE INDEX IF NOT EXISTS idx_activity_logs_time_brin ON activity_logs USING BRIN (created_at);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_entries') THEN  
    CREATE INDEX IF NOT EXISTS idx_time_entries_time_brin ON time_entries USING BRIN (start_time);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'file_uploads') THEN
    CREATE INDEX IF NOT EXISTS idx_file_uploads_time_brin ON file_uploads USING BRIN (created_at);
  END IF;
END $$;

-- Covering Indexes for Frequent SELECT queries
CREATE INDEX IF NOT EXISTS idx_tasks_project_assignee_cover ON tasks(project_id, assignee_id) 
  INCLUDE (title, status, priority, due_date);

CREATE INDEX IF NOT EXISTS idx_projects_tenant_cover ON projects(tenant_id) 
  INCLUDE (name, status, start_date, end_date);

-- Unique Constraints with Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tenants_unique ON user_tenants(user_id, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_tenant ON categories(tenant_id, name, type);

-- Expression Indexes for Common Calculations
CREATE INDEX IF NOT EXISTS idx_tasks_overdue ON tasks(tenant_id) 
  WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_projects_duration ON projects(tenant_id, (end_date - start_date)) 
  WHERE start_date IS NOT NULL AND end_date IS NOT NULL;

-- Hash Indexes for Equality Lookups (PostgreSQL 10+)
CREATE INDEX IF NOT EXISTS idx_profiles_email_hash ON profiles USING HASH (email);
CREATE INDEX IF NOT EXISTS idx_tenants_name_hash ON tenants USING HASH (name);

-- Functional Indexes
CREATE INDEX IF NOT EXISTS idx_projects_name_lower ON projects(tenant_id, LOWER(name));
CREATE INDEX IF NOT EXISTS idx_vendors_name_lower ON vendors(tenant_id, LOWER(name));
CREATE INDEX IF NOT EXISTS idx_contacts_email_lower ON contacts(tenant_id, LOWER(email));

-- Statistics Collection Enhancement
-- Update table statistics for better query planning
DO $$
BEGIN
    -- Set statistics target for frequently queried columns
    ALTER TABLE projects ALTER COLUMN name SET STATISTICS 1000;
    ALTER TABLE tasks ALTER COLUMN title SET STATISTICS 1000;
    ALTER TABLE vendors ALTER COLUMN name SET STATISTICS 1000;
    ALTER TABLE profiles ALTER COLUMN email SET STATISTICS 1000;
    
    -- Analyze tables to update statistics
    ANALYZE projects;
    ANALYZE tasks;
    ANALYZE vendors;
    ANALYZE profiles;
    ANALYZE user_tenants;
    ANALYZE documents;
    ANALYZE events;
    ANALYZE messages;
    ANALYZE notifications;
    ANALYZE contacts;
    ANALYZE calendar_events;
    ANALYZE activity_logs;
    
    RAISE NOTICE 'Statistics updated for performance optimization';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some statistics updates failed: %', SQLERRM;
END
$$;

-- Index Maintenance Function
CREATE OR REPLACE FUNCTION refresh_performance_indexes()
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
BEGIN
    -- Reindex critical indexes
    REINDEX INDEX CONCURRENTLY idx_tasks_tenant_assignee;
    REINDEX INDEX CONCURRENTLY idx_projects_tenant_status;
    REINDEX INDEX CONCURRENTLY idx_user_tenants_composite;
    
    result := 'Performance indexes refreshed successfully';
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Index refresh failed: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Index Usage Monitoring Function
CREATE OR REPLACE FUNCTION check_index_usage()
RETURNS TABLE (
    schemaname TEXT,
    tablename TEXT,
    indexname TEXT,
    idx_scan BIGINT,
    idx_tup_read BIGINT,
    idx_tup_fetch BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.schemaname::TEXT,
        s.tablename::TEXT,
        s.indexname::TEXT,
        s.idx_scan,
        s.idx_tup_read,
        s.idx_tup_fetch
    FROM pg_stat_user_indexes s
    JOIN pg_index i ON s.indexrelid = i.indexrelid
    WHERE s.schemaname = 'public'
    ORDER BY s.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;