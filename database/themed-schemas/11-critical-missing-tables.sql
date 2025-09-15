-- ============================================
-- CRITICAL MISSING TABLES SCHEMA
-- Essential tables required for full functionality
-- Run AFTER all other themed schemas
-- ============================================

-- Contact Management System
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  address TEXT,
  contact_type VARCHAR(50) DEFAULT 'client', -- client, vendor, contractor, supplier
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, archived
  notes TEXT,
  metadata JSONB,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar Events System
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(100) DEFAULT 'UTC',
  location TEXT,
  work_location VARCHAR(100), -- office, home, site, remote
  event_type VARCHAR(100) DEFAULT 'meeting', -- meeting, deadline, milestone, inspection
  project_id UUID REFERENCES projects(id),
  task_id UUID REFERENCES tasks(id),
  is_all_day BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT, -- RRULE format
  organizer_id UUID REFERENCES profiles(id),
  attendees JSONB, -- Array of user IDs and external emails
  meeting_url TEXT,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Dependencies System
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type VARCHAR(50) DEFAULT 'finish_to_start', -- finish_to_start, start_to_start, finish_to_finish, start_to_finish
  lag_days INTEGER DEFAULT 0, -- Delay in days
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id),
  -- Prevent circular dependencies
  CONSTRAINT no_self_dependency CHECK (task_id != depends_on_task_id)
);

-- File Uploads Management
CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  storage_path TEXT NOT NULL,
  storage_provider VARCHAR(50) DEFAULT 'local', -- local, s3, gcs, azure
  checksum VARCHAR(64), -- File integrity verification
  is_public BOOLEAN DEFAULT FALSE,
  project_id UUID REFERENCES projects(id),
  task_id UUID REFERENCES tasks(id),
  document_id UUID REFERENCES documents(id),
  uploaded_by UUID REFERENCES profiles(id),
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Locations
CREATE TABLE IF NOT EXISTS project_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'USA',
  coordinates JSONB, -- {"lat": 0, "lng": 0}
  location_type VARCHAR(50) DEFAULT 'primary', -- primary, secondary, storage, office
  access_instructions TEXT,
  contact_info JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Invitations System
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- owner, admin, member
  invited_by UUID NOT NULL REFERENCES profiles(id),
  invitation_token VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, declined, expired
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES profiles(id),
  message TEXT,
  permissions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Logs (Enhanced audit trail)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  action VARCHAR(100) NOT NULL, -- created, updated, deleted, viewed, exported, etc.
  entity_type VARCHAR(100) NOT NULL, -- project, task, vendor, document, etc.
  entity_id UUID NOT NULL,
  entity_name VARCHAR(255),
  changes JSONB, -- Before/after values
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Phases Management
CREATE TABLE IF NOT EXISTS project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  phase_order INTEGER NOT NULL,
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'planned', -- planned, active, completed, on_hold
  progress DECIMAL(5,2) DEFAULT 0, -- 0-100
  budget_allocated DECIMAL(15,2),
  budget_spent DECIMAL(15,2) DEFAULT 0,
  milestones JSONB, -- Array of milestone objects
  dependencies JSONB, -- Dependencies on other phases
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time Tracking System
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  project_id UUID REFERENCES projects(id),
  task_id UUID REFERENCES tasks(id),
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  is_billable BOOLEAN DEFAULT TRUE,
  hourly_rate DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'active', -- active, paused, completed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resource Allocations
CREATE TABLE IF NOT EXISTS resource_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id),
  task_id UUID REFERENCES tasks(id),
  resource_type VARCHAR(100) NOT NULL, -- equipment, material, labor, vehicle
  resource_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50), -- hours, pieces, tons, etc.
  cost_per_unit DECIMAL(10,2),
  total_cost DECIMAL(15,2),
  allocated_date DATE NOT NULL,
  start_date DATE,
  end_date DATE,
  vendor_id UUID REFERENCES vendors(id),
  status VARCHAR(50) DEFAULT 'allocated', -- allocated, in_use, returned, damaged
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Sessions Management
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  tenant_id UUID REFERENCES tenants(id),
  session_token VARCHAR(255) NOT NULL UNIQUE,
  device_info JSONB,
  ip_address INET,
  user_agent TEXT,
  location JSONB, -- Geographic location if available
  is_active BOOLEAN DEFAULT TRUE,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);

CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant ON calendar_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_time_range ON calendar_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_project ON calendar_events(project_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_organizer ON calendar_events(organizer_id);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);

CREATE INDEX IF NOT EXISTS idx_file_uploads_tenant ON file_uploads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_project ON file_uploads(project_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_task ON file_uploads(task_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_uploader ON file_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_uploads_mime_type ON file_uploads(mime_type);

CREATE INDEX IF NOT EXISTS idx_project_locations_project ON project_locations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_locations_type ON project_locations(location_type);

CREATE INDEX IF NOT EXISTS idx_team_invitations_tenant ON team_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);

CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant ON activity_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_occurred ON activity_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_project_phases_project ON project_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_project_phases_order ON project_phases(project_id, phase_order);

CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(start_time);

CREATE INDEX IF NOT EXISTS idx_resource_allocations_project ON resource_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_resource_allocations_type ON resource_allocations(resource_type);
CREATE INDEX IF NOT EXISTS idx_resource_allocations_vendor ON resource_allocations(vendor_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
-- Skip these indexes - they're handled by the working fix
-- CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
-- CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);

-- RLS Policies
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
DO $$ BEGIN
  CREATE POLICY contacts_tenant_policy ON contacts
    FOR ALL USING (tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY calendar_events_tenant_policy ON calendar_events
    FOR ALL USING (tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY task_dependencies_tenant_policy ON task_dependencies
    FOR ALL USING (
      task_id IN (
        SELECT t.id FROM tasks t 
        JOIN user_tenants ut ON t.tenant_id = ut.tenant_id 
        WHERE ut.user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY file_uploads_tenant_policy ON file_uploads
    FOR ALL USING (tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY team_invitations_tenant_policy ON team_invitations
    FOR ALL USING (tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY activity_logs_tenant_policy ON activity_logs
    FOR ALL USING (tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY time_entries_tenant_policy ON time_entries
    FOR ALL USING (tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY user_sessions_own_policy ON user_sessions
    FOR ALL USING (user_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;