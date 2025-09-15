-- ============================================
-- SYSTEM ADMINISTRATION SCHEMA
-- System monitoring and administrative features
-- Run AFTER complete-production-setup-fixed.sql
-- ============================================

-- Calendar Events (Enhanced with work_location)
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
  event_type VARCHAR(100) DEFAULT 'meeting',
  project_id UUID REFERENCES projects(id),
  task_id UUID REFERENCES tasks(id),
  is_all_day BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT, -- RRULE format
  organizer_id UUID REFERENCES profiles(id),
  attendees JSONB,
  meeting_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incident Response Plans
CREATE TABLE IF NOT EXISTS incident_response_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name VARCHAR(255) NOT NULL UNIQUE,
  incident_type VARCHAR(100) NOT NULL,
  severity_level VARCHAR(20) NOT NULL,
  response_steps JSONB NOT NULL,
  escalation_matrix JSONB,
  notification_lists JSONB,
  sla_minutes INTEGER,
  owner_id UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Monitoring
CREATE TABLE IF NOT EXISTS system_monitoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name VARCHAR(100) NOT NULL,
  check_type VARCHAR(50) NOT NULL, -- health, performance, availability
  status VARCHAR(20) NOT NULL, -- up, down, degraded, maintenance
  response_time_ms INTEGER,
  error_rate DECIMAL(5,4),
  last_check_at TIMESTAMPTZ DEFAULT NOW(),
  last_success_at TIMESTAMPTZ,
  consecutive_failures INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk Assessments
CREATE TABLE IF NOT EXISTS risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  risk_title VARCHAR(255) NOT NULL,
  risk_description TEXT,
  category VARCHAR(100) NOT NULL,
  probability VARCHAR(20) NOT NULL, -- very_low, low, medium, high, very_high
  impact VARCHAR(20) NOT NULL, -- very_low, low, medium, high, very_high
  risk_score DECIMAL(5,2),
  current_controls TEXT,
  residual_risk VARCHAR(20),
  mitigation_plans JSONB,
  owner_id UUID REFERENCES profiles(id),
  review_date DATE,
  status VARCHAR(50) DEFAULT 'active', -- active, mitigated, closed, monitoring
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asset Inventory
CREATE TABLE IF NOT EXISTS asset_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  asset_name VARCHAR(255) NOT NULL,
  asset_type VARCHAR(100) NOT NULL,
  category VARCHAR(100),
  manufacturer VARCHAR(255),
  model VARCHAR(255),
  serial_number VARCHAR(255),
  asset_tag VARCHAR(100),
  location VARCHAR(255),
  assigned_to UUID REFERENCES profiles(id),
  purchase_date DATE,
  purchase_cost DECIMAL(15,2),
  warranty_expires DATE,
  status VARCHAR(50) DEFAULT 'active',
  condition VARCHAR(50),
  last_maintenance DATE,
  next_maintenance DATE,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update Logs (System updates tracking)
CREATE TABLE IF NOT EXISTS update_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  update_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  field_name VARCHAR(255),
  old_value TEXT,
  new_value TEXT,
  change_summary TEXT,
  user_id UUID REFERENCES profiles(id),
  ip_address INET,
  user_agent TEXT,
  project_id UUID REFERENCES projects(id),
  team_member_id UUID,
  automated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuration Management
CREATE TABLE IF NOT EXISTS system_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(255) NOT NULL UNIQUE,
  config_value TEXT,
  data_type VARCHAR(50) DEFAULT 'string',
  category VARCHAR(100),
  description TEXT,
  is_secret BOOLEAN DEFAULT FALSE,
  is_readonly BOOLEAN DEFAULT FALSE,
  validation_rule TEXT,
  default_value TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backup Management
CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type VARCHAR(50) NOT NULL, -- full, incremental, differential
  backup_scope VARCHAR(100), -- database, files, full_system
  status VARCHAR(50) NOT NULL, -- running, completed, failed
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  backup_size_bytes BIGINT,
  backup_location TEXT,
  encryption_enabled BOOLEAN DEFAULT TRUE,
  retention_days INTEGER DEFAULT 30,
  verification_status VARCHAR(50),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance Windows
CREATE TABLE IF NOT EXISTS maintenance_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  maintenance_type VARCHAR(100) NOT NULL,
  impact_level VARCHAR(20) NOT NULL, -- low, medium, high
  affected_services JSONB,
  notification_sent BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  performed_by UUID REFERENCES profiles(id),
  tasks_completed JSONB,
  issues_encountered TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- License Management
CREATE TABLE IF NOT EXISTS license_management (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_name VARCHAR(255) NOT NULL,
  license_type VARCHAR(100) NOT NULL,
  license_key TEXT,
  seats_total INTEGER,
  seats_used INTEGER DEFAULT 0,
  cost_per_seat DECIMAL(10,2),
  annual_cost DECIMAL(15,2),
  vendor VARCHAR(255),
  purchase_date DATE,
  expiry_date DATE,
  renewal_date DATE,
  auto_renewal BOOLEAN DEFAULT FALSE,
  contact_person VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Change Management
CREATE TABLE IF NOT EXISTS change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_number VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  change_type VARCHAR(100) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  impact VARCHAR(20) NOT NULL,
  risk_level VARCHAR(20) NOT NULL,
  business_justification TEXT,
  implementation_plan TEXT,
  rollback_plan TEXT,
  testing_plan TEXT,
  requested_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  implemented_by UUID REFERENCES profiles(id),
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'submitted',
  approval_status VARCHAR(50) DEFAULT 'pending',
  implementation_status VARCHAR(50),
  post_implementation_review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_calendar_events_tenant ON calendar_events(tenant_id);
CREATE INDEX idx_calendar_events_time ON calendar_events(start_time, end_time);
CREATE INDEX idx_calendar_events_project ON calendar_events(project_id);
CREATE INDEX idx_system_monitoring_service ON system_monitoring(service_name);
CREATE INDEX idx_system_monitoring_status ON system_monitoring(status);
CREATE INDEX idx_risk_assessments_tenant ON risk_assessments(tenant_id);
CREATE INDEX idx_asset_inventory_tenant ON asset_inventory(tenant_id);
CREATE INDEX idx_asset_inventory_assigned ON asset_inventory(assigned_to);
CREATE INDEX idx_update_logs_tenant ON update_logs(tenant_id);
CREATE INDEX idx_update_logs_entity ON update_logs(entity_type, entity_id);
CREATE INDEX idx_update_logs_time ON update_logs(created_at);
CREATE INDEX idx_backup_logs_status ON backup_logs(status);
CREATE INDEX idx_backup_logs_time ON backup_logs(start_time);
CREATE INDEX idx_maintenance_windows_status ON maintenance_windows(status);
CREATE INDEX idx_maintenance_windows_schedule ON maintenance_windows(scheduled_start);
CREATE INDEX idx_license_management_expiry ON license_management(expiry_date);
CREATE INDEX idx_change_requests_status ON change_requests(status);

-- RLS Policies
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_logs ENABLE ROW LEVEL SECURITY;

-- Calendar events tenant isolation
CREATE POLICY calendar_events_tenant_policy ON calendar_events
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

-- Risk assessments tenant isolation
CREATE POLICY risk_assessments_tenant_policy ON risk_assessments
  FOR ALL USING (
    tenant_id IS NULL OR
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
  );

-- Asset inventory tenant isolation
CREATE POLICY asset_inventory_tenant_policy ON asset_inventory
  FOR ALL USING (
    tenant_id IS NULL OR
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
  );

-- Update logs tenant isolation
CREATE POLICY update_logs_tenant_policy ON update_logs
  FOR ALL USING (
    tenant_id IS NULL OR
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
  );