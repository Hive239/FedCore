-- Simplified ML Feedback table (no foreign key constraints to avoid dependency issues)
CREATE TABLE IF NOT EXISTS public.ml_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  tenant_id UUID,
  
  -- Feedback details
  feedback_type TEXT NOT NULL,
  event_type_1 TEXT,
  event_type_2 TEXT,
  user_action TEXT NOT NULL CHECK (user_action IN ('accepted', 'rejected', 'modified')),
  principle_id TEXT,
  
  -- Context
  context JSONB DEFAULT '{}',
  project_context JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  project_id UUID
);

-- Learned Principles table (simplified)
CREATE TABLE IF NOT EXISTS public.learned_principles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  
  -- Principle details
  principle_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  confidence DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Conditions and rules
  conditions JSONB DEFAULT '{}',
  exceptions JSONB DEFAULT '{}',
  examples JSONB DEFAULT '[]',
  
  -- Learning metadata
  learned_from_project UUID,
  times_applied INTEGER DEFAULT 0,
  times_accepted INTEGER DEFAULT 0,
  times_rejected INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_applied_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_shared BOOLEAN DEFAULT false
);

-- Conflict Resolution History (simplified)
CREATE TABLE IF NOT EXISTS public.conflict_resolutions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  
  -- Conflict details
  event_1_id UUID,
  event_2_id UUID,
  conflict_type TEXT NOT NULL,
  severity TEXT,
  
  -- Resolution
  resolution_type TEXT,
  resolution_details JSONB DEFAULT '{}',
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  
  -- Outcome
  was_successful BOOLEAN,
  user_feedback TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ml_feedback_user ON public.ml_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_feedback_tenant ON public.ml_feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ml_feedback_type ON public.ml_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_ml_feedback_created ON public.ml_feedback(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learned_principles_tenant ON public.learned_principles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_learned_principles_category ON public.learned_principles(category);
CREATE INDEX IF NOT EXISTS idx_learned_principles_active ON public.learned_principles(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_conflict_resolutions_tenant ON public.conflict_resolutions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conflict_resolutions_created ON public.conflict_resolutions(created_at DESC);

-- Simple function to update principle stats
CREATE OR REPLACE FUNCTION update_principle_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.principle_id IS NOT NULL THEN
    UPDATE public.learned_principles
    SET 
      times_applied = times_applied + 1,
      times_accepted = CASE 
        WHEN NEW.user_action = 'accepted' THEN times_accepted + 1 
        ELSE times_accepted 
      END,
      times_rejected = CASE 
        WHEN NEW.user_action = 'rejected' THEN times_rejected + 1 
        ELSE times_rejected 
      END,
      last_applied_at = NOW(),
      confidence = CASE
        WHEN NEW.user_action = 'accepted' THEN 
          LEAST(1.0, confidence + 0.02)
        WHEN NEW.user_action = 'rejected' THEN 
          GREATEST(0.3, confidence - 0.05)
        ELSE confidence
      END,
      updated_at = NOW()
    WHERE principle_id = NEW.principle_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating stats
DROP TRIGGER IF EXISTS update_principle_stats_trigger ON public.ml_feedback;
CREATE TRIGGER update_principle_stats_trigger
  AFTER INSERT ON public.ml_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_principle_stats();

-- Grant permissions
GRANT ALL ON public.ml_feedback TO authenticated;
GRANT ALL ON public.learned_principles TO authenticated;
GRANT ALL ON public.conflict_resolutions TO authenticated;