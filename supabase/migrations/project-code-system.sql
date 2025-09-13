-- Add project code configuration to tenants table
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS project_code_format TEXT DEFAULT 'PRJ-{YEAR}-{NUMBER}',
  ADD COLUMN IF NOT EXISTS project_code_auto_generate BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS project_code_next_number INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS project_code_prefix TEXT DEFAULT 'PRJ';

-- Add project_code to projects table if not exists
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS project_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS code_auto_generated BOOLEAN DEFAULT true;

-- Create index for project_code lookup
CREATE INDEX IF NOT EXISTS idx_projects_project_code ON public.projects(project_code);

-- Function to generate next project code
CREATE OR REPLACE FUNCTION generate_project_code()
RETURNS TEXT AS $$
DECLARE
  org_id UUID;
  code_format TEXT;
  code_prefix TEXT;
  next_number INTEGER;
  generated_code TEXT;
  current_year TEXT;
BEGIN
  -- Get tenant settings
  SELECT 
    t.id,
    t.project_code_format,
    t.project_code_prefix,
    t.project_code_next_number
  INTO 
    org_id,
    code_format,
    code_prefix,
    next_number
  FROM public.tenants t
  JOIN public.user_tenants ut ON ut.tenant_id = t.id
  WHERE ut.user_id = auth.uid()
  LIMIT 1;

  -- Get current year
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;

  -- Generate code based on format
  generated_code := code_format;
  generated_code := REPLACE(generated_code, '{PREFIX}', COALESCE(code_prefix, 'PRJ'));
  generated_code := REPLACE(generated_code, '{YEAR}', current_year);
  generated_code := REPLACE(generated_code, '{YY}', SUBSTRING(current_year FROM 3 FOR 2));
  generated_code := REPLACE(generated_code, '{NUMBER}', LPAD(next_number::TEXT, 3, '0'));
  generated_code := REPLACE(generated_code, '{NUM}', LPAD(next_number::TEXT, 4, '0'));

  -- Increment the counter for next time
  UPDATE public.tenants 
  SET project_code_next_number = next_number + 1
  WHERE id = org_id;

  RETURN generated_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-generate project code on insert
CREATE OR REPLACE FUNCTION set_project_code()
RETURNS TRIGGER AS $$
DECLARE
  auto_generate BOOLEAN;
BEGIN
  -- Check if auto-generation is enabled
  SELECT project_code_auto_generate INTO auto_generate
  FROM public.tenants t
  JOIN public.user_tenants ut ON ut.tenant_id = t.id
  WHERE ut.user_id = auth.uid()
  LIMIT 1;

  -- Only generate if not provided and auto-generation is enabled
  IF NEW.project_code IS NULL AND auto_generate THEN
    NEW.project_code := generate_project_code();
    NEW.code_auto_generated := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-generating project codes
DROP TRIGGER IF EXISTS auto_generate_project_code ON public.projects;
CREATE TRIGGER auto_generate_project_code
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION set_project_code();

-- Sample project code formats:
-- 'PRJ-{YEAR}-{NUMBER}' => PRJ-2024-001
-- '{PREFIX}-{YY}-{NUM}' => CONST-24-0001
-- '{PREFIX}/{YEAR}/{NUMBER}' => BUILD/2024/001
-- 'P{NUMBER}' => P001

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION generate_project_code() TO authenticated;
GRANT EXECUTE ON FUNCTION set_project_code() TO authenticated;