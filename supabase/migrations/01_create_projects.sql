-- Create projects table (referenced by many other tables)

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  
  -- Project information
  name TEXT NOT NULL,
  description TEXT,
  project_code TEXT UNIQUE,
  
  -- Project details
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'planning' CHECK (status IN (
    'planning', 'active', 'on_hold', 'completed', 'cancelled'
  )),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  
  -- Project type
  project_type TEXT DEFAULT 'construction',
  category TEXT,
  
  -- Location
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Budget
  budget_amount DECIMAL(15, 2),
  spent_amount DECIMAL(15, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  
  -- Team
  project_manager_id UUID,
  team_members UUID[] DEFAULT '{}',
  
  -- Client information
  client_name TEXT,
  client_contact TEXT,
  client_email TEXT,
  client_phone TEXT,
  
  -- Progress
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  
  -- Risk and compliance
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  compliance_status TEXT DEFAULT 'compliant',
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  
  -- ML Features
  ml_predictions_enabled BOOLEAN DEFAULT true,
  ml_risk_score DECIMAL(3, 2),
  ml_completion_prediction DATE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- User tracking
  created_by UUID,
  updated_by UUID
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON public.projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_manager ON public.projects(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_projects_code ON public.projects(project_code);
CREATE INDEX IF NOT EXISTS idx_projects_created ON public.projects(created_at DESC);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policy - Users can only see projects from their tenant
DROP POLICY IF EXISTS "Tenant members can view projects" ON public.projects;
CREATE POLICY "Tenant members can view projects" ON public.projects
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- RLS Policy - Only managers and admins can insert projects
DROP POLICY IF EXISTS "Managers can create projects" ON public.projects;
CREATE POLICY "Managers can create projects" ON public.projects
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'manager')
      AND status = 'active'
    )
  );

-- RLS Policy - Project managers and admins can update
DROP POLICY IF EXISTS "Project managers can update" ON public.projects;
CREATE POLICY "Project managers can update" ON public.projects
  FOR UPDATE USING (
    project_manager_id = auth.uid() OR
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- Grant permissions
GRANT ALL ON public.projects TO authenticated;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION update_project_updated_at();