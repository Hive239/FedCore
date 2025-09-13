-- Fix update_logs table - ensure date column exists
-- This migration fixes the date column issue

-- First, check if the table exists and add the date column if missing
DO $$
BEGIN
  -- Check if update_logs table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'update_logs') THEN
    -- Check if date column exists
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'update_logs' AND column_name = 'date') THEN
      -- Add date column if it doesn't exist
      ALTER TABLE update_logs ADD COLUMN date DATE DEFAULT CURRENT_DATE;
    END IF;
  ELSE
    -- Create the table if it doesn't exist
    CREATE TABLE update_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      team_member_id UUID REFERENCES profiles(id),
      photos TEXT[], 
      weather JSONB,
      tasks_completed TEXT[],
      issues TEXT[],
      created_by UUID REFERENCES auth.users(id),
      created_by_name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
    );
    
    -- Create indexes
    CREATE INDEX idx_update_logs_project ON update_logs(project_id);
    CREATE INDEX idx_update_logs_date ON update_logs(date DESC);
    CREATE INDEX idx_update_logs_team_member ON update_logs(team_member_id);
    CREATE INDEX idx_update_logs_tenant ON update_logs(tenant_id);
    CREATE INDEX idx_update_logs_created ON update_logs(created_at DESC);
    
    -- Enable RLS
    ALTER TABLE update_logs ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policies
    CREATE POLICY "Users can view their tenant's update logs"
      ON update_logs FOR SELECT
      USING (tenant_id IN (
        SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
      ) OR tenant_id IS NULL);
    
    CREATE POLICY "Users can create update logs"
      ON update_logs FOR INSERT
      WITH CHECK (created_by = auth.uid() OR created_by IS NULL);
    
    CREATE POLICY "Users can update their own update logs"
      ON update_logs FOR UPDATE
      USING (created_by = auth.uid() OR created_by IS NULL);
    
    CREATE POLICY "Users can delete their own update logs"
      ON update_logs FOR DELETE
      USING (created_by = auth.uid() OR created_by IS NULL);
    
    -- Grant permissions
    GRANT ALL ON update_logs TO anon, authenticated;
  END IF;
END $$;

-- Add index on date column if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_update_logs_date ON update_logs(date DESC);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Update logs table date column fixed successfully!';
END $$;