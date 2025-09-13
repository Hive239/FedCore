-- Update Logs Table Schema
-- For tracking daily project updates with photos and details

-- Create update_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS update_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  team_member_id UUID REFERENCES profiles(id),
  photos TEXT[], -- Array of photo URLs
  weather JSONB, -- Weather data: temp, description, humidity, windSpeed
  tasks_completed TEXT[], -- Array of completed tasks
  issues TEXT[], -- Array of issues/problems
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_update_logs_project ON update_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_update_logs_date ON update_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_update_logs_team_member ON update_logs(team_member_id);
CREATE INDEX IF NOT EXISTS idx_update_logs_tenant ON update_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_update_logs_created ON update_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE update_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their tenant's update logs" ON update_logs;
DROP POLICY IF EXISTS "Users can create update logs for their tenant" ON update_logs;
DROP POLICY IF EXISTS "Users can update their own update logs" ON update_logs;
DROP POLICY IF EXISTS "Users can delete their own update logs" ON update_logs;

-- RLS Policies
CREATE POLICY "Users can view their tenant's update logs"
  ON update_logs FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create update logs for their tenant"
  ON update_logs FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their own update logs"
  ON update_logs FOR UPDATE
  USING (
    created_by = auth.uid() AND
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own update logs"
  ON update_logs FOR DELETE
  USING (
    created_by = auth.uid() AND
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- Function to automatically set updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_logs_updated_at ON update_logs;
CREATE TRIGGER update_logs_updated_at
  BEFORE UPDATE ON update_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON update_logs TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;