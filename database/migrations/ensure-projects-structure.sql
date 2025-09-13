-- Ensure projects table has required columns
-- This migration ensures project_code column exists

DO $$
BEGIN
  -- Check if projects table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'projects') THEN
    -- Check if project_code column exists
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'project_code') THEN
      -- Add project_code column if it doesn't exist
      ALTER TABLE projects ADD COLUMN project_code TEXT;
      
      -- Generate default project codes for existing projects
      UPDATE projects 
      SET project_code = 'PRJ-' || TO_CHAR(created_at, 'YYYY') || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 3, '0')
      WHERE project_code IS NULL;
    END IF;
    
    -- Check if client column exists (might be needed for some views)
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'client') THEN
      -- Add client column if it doesn't exist
      ALTER TABLE projects ADD COLUMN client TEXT;
    END IF;
  END IF;
END $$;

-- Create index on project_code if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_projects_project_code ON projects(project_code);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Projects table structure ensured successfully!';
END $$;