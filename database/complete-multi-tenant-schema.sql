-- ============================================
-- Complete Multi-Tenant Schema for ProjectPro
-- Organizations → Projects → Tasks
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. TENANTS (Organizations)
-- ============================================
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'professional', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due')),
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. USER PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'project_manager', 'engineer', 'architect', 'contractor', 'member', 'viewer')),
  phone TEXT,
  bio TEXT,
  preferences JSONB DEFAULT '{}',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. USER-TENANT RELATIONSHIPS
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer')),
  permissions JSONB DEFAULT '{}',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- ============================================
-- 4. PROJECTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Planning' CHECK (status IN ('Not Started', 'Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  budget DECIMAL(15, 2),
  spent DECIMAL(15, 2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  actual_end_date DATE,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  
  -- Location
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Relationships
  created_by UUID REFERENCES public.profiles(id),
  project_manager UUID REFERENCES public.profiles(id),
  
  -- Metadata
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. TASKS
-- ============================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  
  -- Task Details
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'blocked')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  task_type TEXT DEFAULT 'task' CHECK (task_type IN ('task', 'milestone', 'deliverable', 'inspection', 'meeting')),
  
  -- Assignment
  assigned_to UUID REFERENCES public.profiles(id),
  assigned_by UUID REFERENCES public.profiles(id),
  
  -- Dates
  start_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Progress
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  estimated_hours DECIMAL(10, 2),
  actual_hours DECIMAL(10, 2),
  
  -- Dependencies
  parent_task_id UUID REFERENCES public.tasks(id),
  depends_on UUID[], -- Array of task IDs this task depends on
  blocks UUID[], -- Array of task IDs this task blocks
  
  -- Additional Info
  tags TEXT[],
  attachments JSONB DEFAULT '[]',
  checklist JSONB DEFAULT '[]',
  custom_fields JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- ============================================
-- 6. TASK COMMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  comment TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. PROJECT TEAMS
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('lead', 'manager', 'member', 'viewer')),
  permissions JSONB DEFAULT '{}',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- ============================================
-- 8. ACTIVITY LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Tenant indexes
CREATE INDEX idx_tenants_slug ON public.tenants(slug);
CREATE INDEX idx_tenants_created ON public.tenants(created_at DESC);

-- User-Tenant indexes
CREATE INDEX idx_user_tenants_user ON public.user_tenants(user_id);
CREATE INDEX idx_user_tenants_tenant ON public.user_tenants(tenant_id);

-- Project indexes
CREATE INDEX idx_projects_tenant ON public.projects(tenant_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_manager ON public.projects(project_manager);
CREATE INDEX idx_projects_created ON public.projects(created_at DESC);

-- Task indexes
CREATE INDEX idx_tasks_tenant ON public.tasks(tenant_id);
CREATE INDEX idx_tasks_project ON public.tasks(project_id);
CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_created ON public.tasks(created_at DESC);

-- Activity log indexes
CREATE INDEX idx_activity_tenant ON public.activity_logs(tenant_id);
CREATE INDEX idx_activity_user ON public.activity_logs(user_id);
CREATE INDEX idx_activity_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_created ON public.activity_logs(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can see all profiles in their tenant
CREATE POLICY "profiles_view" ON public.profiles
  FOR SELECT USING (
    id IN (
      SELECT user_id FROM public.user_tenants
      WHERE tenant_id IN (
        SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
      )
    )
  );

-- Projects: Users can see projects in their tenant
CREATE POLICY "projects_tenant_access" ON public.projects
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

-- Tasks: Users can see tasks in their tenant
CREATE POLICY "tasks_tenant_access" ON public.tasks
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

-- Activity logs: Users can see logs in their tenant
CREATE POLICY "activity_tenant_access" ON public.activity_logs
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to log activities
CREATE OR REPLACE FUNCTION log_activity(
  p_tenant_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_entity_name TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO public.activity_logs (
    tenant_id, user_id, action, entity_type, entity_id, entity_name, details
  ) VALUES (
    p_tenant_id, p_user_id, p_action, p_entity_type, p_entity_id, p_entity_name, p_details
  ) RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;