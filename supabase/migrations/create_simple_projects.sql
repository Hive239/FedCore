-- Create or update projects table with all necessary columns

-- First check if projects table exists and add missing columns
DO $$
BEGIN
  -- Create projects table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'projects'
  ) THEN
    CREATE TABLE public.projects (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      tenant_id UUID,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;

  -- Add project_manager_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'project_manager_id'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN project_manager_id UUID;
  END IF;

  -- Add project_code if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'project_code'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN project_code TEXT;
  END IF;

  -- Add start_date if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'start_date'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN start_date DATE;
  END IF;

  -- Add end_date if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'end_date'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN end_date DATE;
  END IF;

  -- Add priority if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'priority'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN priority TEXT DEFAULT 'medium';
  END IF;

  -- Add project_type if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'project_type'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN project_type TEXT DEFAULT 'construction';
  END IF;

  -- Add budget_amount if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'budget_amount'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN budget_amount DECIMAL(15, 2);
  END IF;

  -- Add spent_amount if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'spent_amount'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN spent_amount DECIMAL(15, 2) DEFAULT 0;
  END IF;

  -- Add completion_percentage if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'completion_percentage'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN completion_percentage INTEGER DEFAULT 0;
  END IF;

  -- Add client_name if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'client_name'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN client_name TEXT;
  END IF;

  -- Add client_email if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'client_email'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN client_email TEXT;
  END IF;

  -- Add metadata if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;

  -- Add created_by if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN created_by UUID;
  END IF;

  -- Add updated_by if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN updated_by UUID;
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON public.projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_manager ON public.projects(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_projects_code ON public.projects(project_code);
CREATE INDEX IF NOT EXISTS idx_projects_created ON public.projects(created_at DESC);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.projects TO authenticated;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_project_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamps
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION update_project_updated_at();