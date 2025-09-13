-- ML Feedback and Learned Principles Tables
-- For storing user feedback and learned construction principles

-- ML Feedback table for training data
CREATE TABLE IF NOT EXISTS public.ml_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Feedback details
  feedback_type TEXT NOT NULL, -- 'construction_principle', 'schedule_conflict', etc.
  event_type_1 TEXT,
  event_type_2 TEXT,
  user_action TEXT NOT NULL, -- 'accepted', 'rejected', 'modified'
  principle_id TEXT,
  
  -- Context
  context JSONB, -- Weather, location, season, etc.
  project_context JSONB, -- Full context from the analysis
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  
  -- Indexing
  CONSTRAINT valid_action CHECK (user_action IN ('accepted', 'rejected', 'modified'))
);

-- Learned Principles table
CREATE TABLE IF NOT EXISTS public.learned_principles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Principle details
  principle_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'sequencing', 'safety', 'quality', etc.
  importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  confidence DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Conditions and rules
  conditions JSONB,
  exceptions JSONB,
  examples JSONB,
  
  -- Learning metadata
  learned_from_project UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  times_applied INTEGER DEFAULT 0,
  times_accepted INTEGER DEFAULT 0,
  times_rejected INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_applied_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_shared BOOLEAN DEFAULT false -- Can be shared across tenants
);

-- Conflict Resolution History
CREATE TABLE IF NOT EXISTS public.conflict_resolutions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Conflict details
  event_1_id UUID REFERENCES public.schedule_events(id) ON DELETE CASCADE,
  event_2_id UUID REFERENCES public.schedule_events(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL,
  severity TEXT,
  
  -- Resolution
  resolution_type TEXT, -- 'auto', 'manual', 'ignored'
  resolution_details JSONB,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  
  -- Outcome
  was_successful BOOLEAN,
  user_feedback TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ml_feedback_user ON public.ml_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_feedback_tenant ON public.ml_feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ml_feedback_type ON public.ml_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_ml_feedback_created ON public.ml_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_feedback_events ON public.ml_feedback(event_type_1, event_type_2);

CREATE INDEX IF NOT EXISTS idx_learned_principles_tenant ON public.learned_principles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_learned_principles_category ON public.learned_principles(category);
CREATE INDEX IF NOT EXISTS idx_learned_principles_confidence ON public.learned_principles(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_learned_principles_active ON public.learned_principles(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_conflict_resolutions_tenant ON public.conflict_resolutions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conflict_resolutions_events ON public.conflict_resolutions(event_1_id, event_2_id);
CREATE INDEX IF NOT EXISTS idx_conflict_resolutions_created ON public.conflict_resolutions(created_at DESC);

-- Enable RLS
ALTER TABLE public.ml_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learned_principles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conflict_resolutions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "ml_feedback_tenant_access" ON public.ml_feedback
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "learned_principles_tenant_access" ON public.learned_principles
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid()
    ) OR is_shared = true
  );

CREATE POLICY "conflict_resolutions_tenant_access" ON public.conflict_resolutions
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

-- Functions for ML analytics
CREATE OR REPLACE FUNCTION get_principle_effectiveness(
  p_tenant_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  principle_id TEXT,
  name TEXT,
  acceptance_rate DECIMAL,
  total_applications INTEGER,
  confidence DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lp.principle_id,
    lp.name,
    CASE 
      WHEN lp.times_applied > 0 THEN 
        ROUND(lp.times_accepted::DECIMAL / lp.times_applied, 2)
      ELSE 0
    END as acceptance_rate,
    lp.times_applied as total_applications,
    lp.confidence
  FROM public.learned_principles lp
  WHERE lp.tenant_id = p_tenant_id
    AND lp.is_active = true
    AND lp.last_applied_at >= NOW() - INTERVAL '1 day' * p_days
  ORDER BY lp.confidence DESC, lp.times_applied DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update principle statistics
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
      END
    WHERE principle_id = NEW.principle_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating stats
CREATE TRIGGER update_principle_stats_trigger
  AFTER INSERT ON public.ml_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_principle_stats();

-- Function to get conflict patterns
CREATE OR REPLACE FUNCTION get_conflict_patterns(
  p_tenant_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  event_pair TEXT,
  conflict_count INTEGER,
  resolution_rate DECIMAL,
  avg_severity TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CONCAT(
      COALESCE(mf1.event_type_1, 'unknown'), 
      '-', 
      COALESCE(mf1.event_type_2, 'unknown')
    ) as event_pair,
    COUNT(*)::INTEGER as conflict_count,
    ROUND(
      COUNT(CASE WHEN cr.resolution_type IS NOT NULL THEN 1 END)::DECIMAL / 
      GREATEST(COUNT(*)::DECIMAL, 1), 
      2
    ) as resolution_rate,
    MODE() WITHIN GROUP (ORDER BY cr.severity) as avg_severity
  FROM public.conflict_resolutions cr
  LEFT JOIN public.ml_feedback mf1 ON cr.id = mf1.id
  WHERE cr.tenant_id = p_tenant_id
  GROUP BY COALESCE(mf1.event_type_1, 'unknown'), COALESCE(mf1.event_type_2, 'unknown')
  ORDER BY conflict_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON public.ml_feedback TO authenticated;
GRANT ALL ON public.learned_principles TO authenticated;
GRANT ALL ON public.conflict_resolutions TO authenticated;
GRANT EXECUTE ON FUNCTION get_principle_effectiveness TO authenticated;
GRANT EXECUTE ON FUNCTION get_conflict_patterns TO authenticated;