-- Production Enhancement Schemas
-- Execute after ml-analysis-indexes-policies.sql

-- 1. AI/ML Analytics Tables
CREATE TABLE IF NOT EXISTS nexus_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    productivity_score DECIMAL(5,2) CHECK (productivity_score >= 0 AND productivity_score <= 100),
    schedule_accuracy DECIMAL(5,2) CHECK (schedule_accuracy >= 0 AND schedule_accuracy <= 100),
    conflicts_detected INTEGER DEFAULT 0 CHECK (conflicts_detected >= 0),
    ml_confidence DECIMAL(5,2) CHECK (ml_confidence >= 0 AND ml_confidence <= 100),
    resource_utilization DECIMAL(5,2) CHECK (resource_utilization >= 0 AND resource_utilization <= 100),
    performance_trend TEXT CHECK (performance_trend IN ('up', 'down', 'stable')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Weather Risk Assessment
CREATE TABLE IF NOT EXISTS weather_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')) NOT NULL,
    impact_description TEXT NOT NULL,
    tasks_affected INTEGER DEFAULT 0 CHECK (tasks_affected >= 0),
    weather_condition TEXT,
    temperature_range TEXT,
    precipitation_chance INTEGER CHECK (precipitation_chance >= 0 AND precipitation_chance <= 100),
    wind_speed INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Project Locations/Sites
CREATE TABLE IF NOT EXISTS project_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_type TEXT DEFAULT 'construction_site',
    address TEXT,
    postal_code TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'USA',
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Team Productivity Tracking
CREATE TABLE IF NOT EXISTS productivity_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    tasks_completed INTEGER DEFAULT 0 CHECK (tasks_completed >= 0),
    hours_worked DECIMAL(4,2) DEFAULT 0 CHECK (hours_worked >= 0),
    productivity_score INTEGER CHECK (productivity_score >= 0 AND productivity_score <= 100),
    avg_task_duration DECIMAL(6,2),
    quality_rating DECIMAL(3,2) CHECK (quality_rating >= 0 AND quality_rating <= 5),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Enhanced Task Dependencies
CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type TEXT DEFAULT 'finish_to_start' CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
    lead_time_days INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, depends_on_task_id)
);

-- 6. Organization Members (replaces mock data)
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'vacation', 'sick')),
    online_status TEXT DEFAULT 'offline' CHECK (online_status IN ('online', 'offline', 'away', 'busy')),
    hire_date DATE,
    avatar_url TEXT,
    skills TEXT[],
    certifications TEXT[],
    hourly_rate DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, email)
);

-- 7. Real-time Notifications System
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Enhance documents table with missing columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'expiry_date') THEN
        ALTER TABLE documents ADD COLUMN expiry_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'document_category') THEN
        ALTER TABLE documents ADD COLUMN document_category TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'file_size') THEN
        ALTER TABLE documents ADD COLUMN file_size BIGINT;
    END IF;
END $$;

-- PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_nexus_analytics_tenant_project ON nexus_analytics(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_nexus_analytics_created ON nexus_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_weather_risks_project_date ON weather_risks(project_id, date);
CREATE INDEX IF NOT EXISTS idx_project_locations_tenant ON project_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_locations_coordinates ON project_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_productivity_metrics_user_date ON productivity_metrics(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_team_members_tenant_status ON team_members(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_team_members_department ON team_members(department);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE nexus_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE productivity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES FOR TENANT ISOLATION
CREATE POLICY nexus_analytics_tenant_policy ON nexus_analytics
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY weather_risks_tenant_policy ON weather_risks
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY project_locations_tenant_policy ON project_locations
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY productivity_metrics_tenant_policy ON productivity_metrics
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY task_dependencies_tenant_policy ON task_dependencies
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY team_members_tenant_policy ON team_members
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY notifications_user_policy ON notifications
    FOR ALL USING (user_id = auth.uid());

-- TRIGGERS FOR UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_nexus_analytics_updated_at
    BEFORE UPDATE ON nexus_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_locations_updated_at
    BEFORE UPDATE ON project_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- SAMPLE DATA INSERTION (only if tables are empty)
INSERT INTO nexus_analytics (tenant_id, project_id, productivity_score, schedule_accuracy, conflicts_detected, ml_confidence, resource_utilization, performance_trend)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    p.id,
    85.0 + (RANDOM() * 15),  -- Random productivity score between 85-100
    78.0 + (RANDOM() * 22),  -- Random schedule accuracy between 78-100
    FLOOR(RANDOM() * 3)::INTEGER,  -- 0-2 conflicts
    92.0 + (RANDOM() * 8),   -- ML confidence between 92-100
    75.0 + (RANDOM() * 25),  -- Resource utilization between 75-100
    CASE FLOOR(RANDOM() * 3)::INTEGER WHEN 0 THEN 'up' WHEN 1 THEN 'down' ELSE 'stable' END
FROM projects p
WHERE NOT EXISTS (SELECT 1 FROM nexus_analytics WHERE project_id = p.id)
LIMIT 5;