-- Task Enhancements Schema
-- This migration adds support for:
-- 1. Task tags for vendors, design professionals, and contractors
-- 2. Task dependencies and connections
-- 3. AI-suggested next tasks

-- Create enum for contact types if not exists
DO $$ BEGIN
  CREATE TYPE contact_type AS ENUM ('vendor', 'design_professional', 'contractor', 'customer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add tags column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS contact_tags JSONB DEFAULT '[]'; -- Store contact IDs with their types

-- Create task_dependencies table for managing task relationships
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  depends_on_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  dependency_type TEXT DEFAULT 'finish_to_start' CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
  lag_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(task_id, depends_on_task_id)
);

-- Create task_suggestions table for AI-generated suggestions
CREATE TABLE IF NOT EXISTS public.task_suggestions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  suggested_title TEXT NOT NULL,
  suggested_description TEXT,
  suggested_priority task_priority,
  suggested_duration_days INTEGER,
  suggested_tags JSONB DEFAULT '[]',
  suggested_contact_tags JSONB DEFAULT '[]',
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  suggestion_reason TEXT,
  construction_phase TEXT, -- e.g., 'planning', 'permits', 'foundation', 'framing', 'electrical', 'plumbing', etc.
  is_accepted BOOLEAN DEFAULT false,
  created_task_id UUID REFERENCES public.tasks(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Create construction_timeline_templates table for standard construction workflows
CREATE TABLE IF NOT EXISTS public.construction_timeline_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- e.g., 'residential', 'commercial', 'renovation'
  phase TEXT NOT NULL, -- e.g., 'planning', 'permits', 'foundation', etc.
  typical_tasks JSONB NOT NULL, -- Array of task templates with dependencies
  typical_duration_days INTEGER,
  required_contacts JSONB DEFAULT '[]', -- Types of contacts typically needed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create task_templates table for commonly used tasks
CREATE TABLE IF NOT EXISTS public.task_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority task_priority DEFAULT 'medium',
  estimated_duration_days INTEGER,
  tags JSONB DEFAULT '[]',
  required_contact_types JSONB DEFAULT '[]', -- e.g., ['design_professional', 'contractor']
  typical_dependencies JSONB DEFAULT '[]', -- Common predecessor tasks
  construction_phase TEXT,
  is_global BOOLEAN DEFAULT false, -- If true, available to all tenants
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON public.task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON public.task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_task_suggestions_parent ON public.task_suggestions(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_task_suggestions_project ON public.task_suggestions(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON public.tasks USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_tasks_contact_tags ON public.tasks USING GIN (contact_tags);

-- Insert some default construction timeline templates
INSERT INTO public.construction_timeline_templates (name, category, phase, typical_tasks, typical_duration_days, required_contacts)
VALUES 
  ('Residential Planning', 'residential', 'planning', 
   '[
     {"title": "Site Survey", "duration_days": 2, "contacts": ["design_professional"]},
     {"title": "Architectural Design", "duration_days": 14, "contacts": ["design_professional"]},
     {"title": "Engineering Review", "duration_days": 7, "contacts": ["design_professional"]},
     {"title": "Budget Estimation", "duration_days": 3, "contacts": ["contractor"]}
   ]'::jsonb, 
   26, 
   '["design_professional", "contractor"]'::jsonb),
   
  ('Permit Phase', 'residential', 'permits',
   '[
     {"title": "Prepare Permit Documents", "duration_days": 3, "contacts": ["design_professional"]},
     {"title": "Submit Building Permit", "duration_days": 1, "contacts": []},
     {"title": "Permit Review Period", "duration_days": 21, "contacts": []},
     {"title": "Address Permit Comments", "duration_days": 5, "contacts": ["design_professional"]}
   ]'::jsonb,
   30,
   '["design_professional"]'::jsonb),
   
  ('Foundation Work', 'residential', 'foundation',
   '[
     {"title": "Site Excavation", "duration_days": 2, "contacts": ["contractor"]},
     {"title": "Pour Footings", "duration_days": 1, "contacts": ["contractor"]},
     {"title": "Foundation Walls", "duration_days": 3, "contacts": ["contractor"]},
     {"title": "Waterproofing", "duration_days": 1, "contacts": ["contractor"]},
     {"title": "Foundation Inspection", "duration_days": 1, "contacts": ["contractor"]}
   ]'::jsonb,
   8,
   '["contractor"]'::jsonb),
   
  ('Framing Phase', 'residential', 'framing',
   '[
     {"title": "Floor System", "duration_days": 3, "contacts": ["contractor"]},
     {"title": "Wall Framing", "duration_days": 5, "contacts": ["contractor"]},
     {"title": "Roof Framing", "duration_days": 4, "contacts": ["contractor"]},
     {"title": "Sheathing Installation", "duration_days": 2, "contacts": ["contractor"]},
     {"title": "Framing Inspection", "duration_days": 1, "contacts": ["contractor"]}
   ]'::jsonb,
   15,
   '["contractor"]'::jsonb),
   
  ('MEP Rough-In', 'residential', 'mep_rough',
   '[
     {"title": "Plumbing Rough-In", "duration_days": 3, "contacts": ["contractor", "vendor"]},
     {"title": "Electrical Rough-In", "duration_days": 4, "contacts": ["contractor", "vendor"]},
     {"title": "HVAC Rough-In", "duration_days": 3, "contacts": ["contractor", "vendor"]},
     {"title": "MEP Inspections", "duration_days": 2, "contacts": ["contractor"]}
   ]'::jsonb,
   12,
   '["contractor", "vendor"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Function to get suggested next tasks based on completed task
CREATE OR REPLACE FUNCTION get_task_suggestions(
  p_task_id UUID,
  p_project_id UUID DEFAULT NULL
) RETURNS TABLE (
  title TEXT,
  description TEXT,
  priority task_priority,
  duration_days INTEGER,
  required_contacts JSONB,
  confidence DECIMAL,
  reason TEXT
) AS $$
DECLARE
  v_task_title TEXT;
  v_project_category TEXT;
  v_current_phase TEXT;
BEGIN
  -- Get current task details
  SELECT t.title INTO v_task_title
  FROM tasks t
  WHERE t.id = p_task_id;
  
  -- Try to determine project category and phase
  -- This is simplified - in production, you'd have more sophisticated phase detection
  v_current_phase := CASE 
    WHEN v_task_title ILIKE '%permit%' THEN 'permits'
    WHEN v_task_title ILIKE '%foundation%' THEN 'foundation'
    WHEN v_task_title ILIKE '%framing%' THEN 'framing'
    WHEN v_task_title ILIKE '%electrical%' OR v_task_title ILIKE '%plumbing%' THEN 'mep_rough'
    WHEN v_task_title ILIKE '%design%' OR v_task_title ILIKE '%plan%' THEN 'planning'
    ELSE NULL
  END;
  
  -- Return suggestions based on templates
  RETURN QUERY
  SELECT 
    (task_obj->>'title')::TEXT as title,
    COALESCE((task_obj->>'description')::TEXT, '') as description,
    'medium'::task_priority as priority,
    (task_obj->>'duration_days')::INTEGER as duration_days,
    task_obj->'contacts' as required_contacts,
    0.75::DECIMAL as confidence,
    'Based on typical construction sequence' as reason
  FROM construction_timeline_templates ctt,
       jsonb_array_elements(ctt.typical_tasks) as task_obj
  WHERE ctt.phase = v_current_phase
  LIMIT 3;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- Task dependencies policies
CREATE POLICY "Users can view task dependencies in their tenant" ON public.task_dependencies
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage task dependencies in their tenant" ON public.task_dependencies
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

-- Task suggestions policies
CREATE POLICY "Users can view task suggestions in their tenant" ON public.task_suggestions
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage task suggestions in their tenant" ON public.task_suggestions
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

-- Task templates policies
CREATE POLICY "Users can view task templates" ON public.task_templates
  FOR SELECT USING (
    is_global = true OR
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their tenant's task templates" ON public.task_templates
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
    )
  );