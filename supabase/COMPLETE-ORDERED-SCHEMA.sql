-- ============================================
-- COMPLETE ORDERED SCHEMA WITH ALL DEPENDENCIES
-- RUN THIS ENTIRE FILE IN ORDER
-- ============================================

-- ============================================
-- SECTION A: PREREQUISITES CHECK
-- ============================================

-- Check that required base tables exist
DO $$
BEGIN
  -- Check for required tables
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    RAISE EXCEPTION 'Table profiles does not exist. Run base schema first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
    RAISE EXCEPTION 'Table tenants does not exist. Run base schema first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    RAISE EXCEPTION 'Table projects does not exist. Run base schema first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    RAISE EXCEPTION 'Table tasks does not exist. Run base schema first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendors') THEN
    RAISE EXCEPTION 'Table vendors does not exist. Run base schema first.';
  END IF;
  
  RAISE NOTICE 'All prerequisite tables exist. Proceeding with schema creation.';
END $$;

-- ============================================
-- SECTION B: ENHANCE EXISTING TABLES
-- Dependencies: profiles, vendors tables must exist
-- ============================================

-- B1: Enhance profiles table for team features
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mobile_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "email": {
    "enabled": true,
    "task_assigned": true,
    "task_completed": false,
    "event_invitation": true,
    "event_reminder": true,
    "update_mention": true,
    "deadline_reminder": true,
    "project_assigned": true
  },
  "sms": {
    "enabled": false,
    "urgent_only": true,
    "task_assigned": false,
    "event_reminder": true
  },
  "in_app": {
    "enabled": true,
    "all": true
  },
  "push": {
    "enabled": false
  }
}';

-- B2: Enhance vendors table for notification features
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS notification_email TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS notification_phone TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS vendor_type TEXT; -- 'design_professional', 'contractor', 'supplier', 'consultant'
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "email": {
    "enabled": true,
    "task_assigned": true,
    "event_invitation": true,
    "update_mention": true,
    "project_updates": true
  },
  "sms": {
    "enabled": false,
    "urgent_only": true
  }
}';

-- ============================================
-- SECTION C: PROJECT ASSIGNMENTS
-- Dependencies: projects, profiles, vendors
-- ============================================

-- C1: Project team members (from organization/team directory)
CREATE TABLE IF NOT EXISTS public.project_team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'project_manager', 'lead', 'member', 'viewer', 'admin'
  permissions JSONB DEFAULT '{"can_edit": false, "can_delete": false, "can_assign": false}',
  can_receive_notifications BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  UNIQUE(project_id, user_id)
);

-- C2: Project vendors (design professionals, contractors, suppliers)
CREATE TABLE IF NOT EXISTS public.project_vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  vendor_role TEXT, -- matches vendor_type from vendors table
  scope_of_work TEXT,
  contract_amount DECIMAL(12,2),
  contract_number TEXT,
  start_date DATE,
  end_date DATE,
  insurance_verified BOOLEAN DEFAULT false,
  license_verified BOOLEAN DEFAULT false,
  can_receive_notifications BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  UNIQUE(project_id, vendor_id)
);

-- ============================================
-- SECTION D: TASK ASSIGNMENTS
-- Dependencies: tasks, profiles, vendors
-- ============================================

-- D1: Task team members (multiple team members per task)
CREATE TABLE IF NOT EXISTS public.task_team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'assigned', -- 'lead', 'assigned', 'reviewer', 'observer'
  hours_estimated DECIMAL(5,2),
  hours_actual DECIMAL(5,2),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES public.profiles(id),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(task_id, user_id)
);

-- D2: Task vendors (vendors assigned to specific tasks)
CREATE TABLE IF NOT EXISTS public.task_vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'assigned', -- 'assigned', 'consultant', 'reviewer'
  scope_description TEXT,
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES public.profiles(id),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(task_id, vendor_id)
);

-- ============================================
-- SECTION E: CALENDAR/SCHEDULE EVENTS
-- Dependencies: tenants, projects, profiles
-- ============================================

-- E1: Main schedule events table
CREATE TABLE IF NOT EXISTS public.schedule_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  location_address TEXT,
  location_coordinates JSONB, -- {"lat": 0, "lng": 0}
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT false,
  recurring_rule TEXT, -- iCal RRULE format for recurring events
  event_type TEXT DEFAULT 'meeting', -- 'meeting', 'site_visit', 'inspection', 'deadline', 'milestone', 'delivery'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  color TEXT DEFAULT '#3B82F6',
  reminder_minutes INTEGER DEFAULT 15,
  attachments JSONB DEFAULT '[]',
  meeting_link TEXT, -- For virtual meetings
  agenda TEXT,
  minutes TEXT, -- Meeting minutes/notes after event
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- E2: Team member attendees for events
CREATE TABLE IF NOT EXISTS public.event_team_attendees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.schedule_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attendance_status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'tentative', 'attended', 'no_show'
  is_organizer BOOLEAN DEFAULT false,
  is_required BOOLEAN DEFAULT true,
  notify_enabled BOOLEAN DEFAULT true,
  reminder_sent BOOLEAN DEFAULT false,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  attended_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(event_id, user_id)
);

-- E3: Vendor attendees for events
CREATE TABLE IF NOT EXISTS public.event_vendor_attendees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.schedule_events(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  vendor_contact_name TEXT, -- Specific person from vendor company
  vendor_contact_email TEXT,
  vendor_contact_phone TEXT,
  attendance_status TEXT DEFAULT 'pending',
  is_required BOOLEAN DEFAULT true,
  notify_enabled BOOLEAN DEFAULT true,
  reminder_sent BOOLEAN DEFAULT false,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  attended_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(event_id, vendor_id)
);

-- ============================================
-- SECTION F: UPDATE LOGS & MENTIONS
-- Dependencies: tenants, projects, tasks, profiles
-- ============================================

-- F1: Update logs (project updates, progress reports, issues)
CREATE TABLE IF NOT EXISTS public.update_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general', -- 'general', 'progress', 'issue', 'milestone', 'change_order', 'rfi', 'safety', 'quality'
  severity TEXT DEFAULT 'info', -- 'info', 'warning', 'critical'
  attachments JSONB DEFAULT '[]',
  is_pinned BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- F2: Team members mentioned/tagged in update logs
CREATE TABLE IF NOT EXISTS public.update_log_team_mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  update_log_id UUID NOT NULL REFERENCES public.update_logs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mention_type TEXT DEFAULT 'mention', -- 'mention', 'assignment', 'cc'
  notified BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  UNIQUE(update_log_id, user_id)
);

-- F3: Vendors mentioned/tagged in update logs
CREATE TABLE IF NOT EXISTS public.update_log_vendor_mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  update_log_id UUID NOT NULL REFERENCES public.update_logs(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  mention_type TEXT DEFAULT 'mention',
  notified BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  UNIQUE(update_log_id, vendor_id)
);

-- ============================================
-- SECTION G: NOTIFICATIONS SYSTEM
-- Dependencies: tenants, profiles, vendors
-- ============================================

-- G1: Drop and recreate notifications table with proper structure
DROP TABLE IF EXISTS public.notifications CASCADE;

CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Recipient (either team member OR vendor)
  recipient_user_id UUID REFERENCES public.profiles(id),
  recipient_vendor_id UUID REFERENCES public.vendors(id),
  
  -- Notification details
  type TEXT NOT NULL, -- 'task_assigned', 'task_completed', 'event_invitation', 'event_reminder', 'update_mention', 'deadline_reminder', 'project_assigned'
  channel TEXT NOT NULL, -- 'email', 'sms', 'in_app', 'push'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  status TEXT DEFAULT 'pending', -- 'pending', 'queued', 'sending', 'sent', 'failed', 'cancelled', 'read'
  
  -- Content
  subject TEXT,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}', -- Additional context (task_id, event_id, project_id, etc.)
  action_url TEXT, -- Link to relevant page/item
  
  -- Scheduling and tracking
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  
  -- Ensure only one recipient type is set
  CONSTRAINT recipient_check CHECK (
    (recipient_user_id IS NOT NULL AND recipient_vendor_id IS NULL) OR 
    (recipient_user_id IS NULL AND recipient_vendor_id IS NOT NULL)
  )
);

-- G2: Notification templates for consistent messaging
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  channel TEXT NOT NULL,
  subject_template TEXT,
  body_template TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, type, channel)
);

-- ============================================
-- SECTION H: CREATE ALL INDEXES
-- Dependencies: All tables above must exist
-- ============================================

-- Project assignments indexes
CREATE INDEX IF NOT EXISTS idx_project_team_members_project ON public.project_team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_members_user ON public.project_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_vendors_project ON public.project_vendors(project_id);
CREATE INDEX IF NOT EXISTS idx_project_vendors_vendor ON public.project_vendors(vendor_id);

-- Task assignments indexes
CREATE INDEX IF NOT EXISTS idx_task_team_members_task ON public.task_team_members(task_id);
CREATE INDEX IF NOT EXISTS idx_task_team_members_user ON public.task_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_task_vendors_task ON public.task_vendors(task_id);
CREATE INDEX IF NOT EXISTS idx_task_vendors_vendor ON public.task_vendors(vendor_id);

-- Schedule events indexes
CREATE INDEX IF NOT EXISTS idx_schedule_events_tenant ON public.schedule_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_project ON public.schedule_events(project_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_start ON public.schedule_events(start_time);
CREATE INDEX IF NOT EXISTS idx_schedule_events_type ON public.schedule_events(event_type);
CREATE INDEX IF NOT EXISTS idx_schedule_events_status ON public.schedule_events(status);

-- Event attendees indexes
CREATE INDEX IF NOT EXISTS idx_event_team_attendees_event ON public.event_team_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_team_attendees_user ON public.event_team_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_vendor_attendees_event ON public.event_vendor_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_vendor_attendees_vendor ON public.event_vendor_attendees(vendor_id);

-- Update logs indexes
CREATE INDEX IF NOT EXISTS idx_update_logs_project ON public.update_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_update_logs_task ON public.update_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_update_logs_category ON public.update_logs(category);
CREATE INDEX IF NOT EXISTS idx_update_logs_created ON public.update_logs(created_at);

-- Update log mentions indexes
CREATE INDEX IF NOT EXISTS idx_update_log_team_mentions_log ON public.update_log_team_mentions(update_log_id);
CREATE INDEX IF NOT EXISTS idx_update_log_team_mentions_user ON public.update_log_team_mentions(user_id);
CREATE INDEX IF NOT EXISTS idx_update_log_vendor_mentions_log ON public.update_log_vendor_mentions(update_log_id);
CREATE INDEX IF NOT EXISTS idx_update_log_vendor_mentions_vendor ON public.update_log_vendor_mentions(vendor_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user ON public.notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_vendor ON public.notifications(recipient_vendor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON public.notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- ============================================
-- SECTION I: ROW LEVEL SECURITY
-- Dependencies: All tables must exist
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_team_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_vendor_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.update_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.update_log_team_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.update_log_vendor_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (DROP IF EXISTS first to avoid conflicts)

-- Project team members
DROP POLICY IF EXISTS "project_team_members_access" ON public.project_team_members;
CREATE POLICY "project_team_members_access" ON public.project_team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_team_members.project_id
      AND p.tenant_id IN (
        SELECT tenant_id FROM public.user_tenants 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Project vendors
DROP POLICY IF EXISTS "project_vendors_access" ON public.project_vendors;
CREATE POLICY "project_vendors_access" ON public.project_vendors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_vendors.project_id
      AND p.tenant_id IN (
        SELECT tenant_id FROM public.user_tenants 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Schedule events
DROP POLICY IF EXISTS "schedule_events_access" ON public.schedule_events;
CREATE POLICY "schedule_events_access" ON public.schedule_events
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- Notifications (users see their own or admins see all)
DROP POLICY IF EXISTS "notifications_access" ON public.notifications;
CREATE POLICY "notifications_access" ON public.notifications
  FOR ALL USING (
    recipient_user_id = auth.uid()
    OR tenant_id IN (
      SELECT tenant_id FROM public.user_tenants 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- SECTION J: HELPER FUNCTIONS
-- Dependencies: All tables must exist
-- ============================================

-- Function to get all project recipients (team + vendors)
CREATE OR REPLACE FUNCTION get_project_recipients(p_project_id UUID)
RETURNS TABLE (
  recipient_type TEXT,
  recipient_id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  can_notify BOOLEAN
) AS $$
BEGIN
  -- Return team members
  RETURN QUERY
  SELECT 
    'team'::TEXT as recipient_type,
    p.id as recipient_id,
    p.full_name as name,
    p.email,
    p.mobile_phone as phone,
    ptm.can_receive_notifications as can_notify
  FROM public.project_team_members ptm
  JOIN public.profiles p ON p.id = ptm.user_id
  WHERE ptm.project_id = p_project_id
  AND p.is_active = true;
  
  -- Return vendors
  RETURN QUERY
  SELECT 
    'vendor'::TEXT as recipient_type,
    v.id as recipient_id,
    v.name,
    COALESCE(v.notification_email, v.contact_email) as email,
    COALESCE(v.notification_phone, v.contact_phone) as phone,
    pv.can_receive_notifications as can_notify
  FROM public.project_vendors pv
  JOIN public.vendors v ON v.id = pv.vendor_id
  WHERE pv.project_id = p_project_id
  AND v.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SECTION K: DEFAULT DATA
-- ============================================

-- Insert default notification templates
INSERT INTO public.notification_templates (
  tenant_id, name, type, channel, 
  subject_template, body_template, variables, is_default
)
VALUES 
  (NULL, 'Task Assignment Email', 'task_assigned', 'email', 
   'You have been assigned to: {{task_title}}',
   'You have been assigned to a new task:

Task: {{task_title}}
Project: {{project_name}}
Due Date: {{due_date}}
Priority: {{priority}}

{{description}}

Please log in to view full details.',
   '["task_title", "project_name", "due_date", "priority", "description"]'::jsonb,
   true),
   
  (NULL, 'Event Invitation Email', 'event_invitation', 'email',
   'Event Invitation: {{event_title}}',
   'You are invited to:

{{event_title}}
Date: {{event_date}}
Time: {{start_time}} - {{end_time}}
Location: {{location}}

{{description}}

Please confirm your attendance.',
   '["event_title", "event_date", "start_time", "end_time", "location", "description"]'::jsonb,
   true),
   
  (NULL, 'Update Mention Email', 'update_mention', 'email',
   'You were mentioned in: {{update_title}}',
   'You were mentioned in an update:

{{update_title}}
Project: {{project_name}}
Posted by: {{author_name}}

{{content}}

Click here to view and respond.',
   '["update_title", "project_name", "author_name", "content"]'::jsonb,
   true)
ON CONFLICT DO NOTHING;

-- ============================================
-- SECTION L: GRANT PERMISSIONS
-- ============================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================
-- SECTION M: VERIFICATION
-- ============================================

-- Verification query to check all tables were created
DO $$
DECLARE
  v_count INTEGER;
  v_expected INTEGER := 13; -- Number of new tables we're creating
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN (
    'project_team_members', 'project_vendors',
    'task_team_members', 'task_vendors',
    'schedule_events', 'event_team_attendees', 'event_vendor_attendees',
    'update_logs', 'update_log_team_mentions', 'update_log_vendor_mentions',
    'notifications', 'notification_templates'
  );
  
  IF v_count = v_expected THEN
    RAISE NOTICE '✅ SUCCESS: All % tables created successfully', v_expected;
  ELSE
    RAISE WARNING '⚠️  WARNING: Only % of % tables were created', v_count, v_expected;
  END IF;
END $$;

-- Final status report
SELECT 
  'Schema Status Report' as report,
  COUNT(*) FILTER (WHERE table_name IN (
    'project_team_members', 'project_vendors',
    'task_team_members', 'task_vendors',
    'schedule_events', 'event_team_attendees', 'event_vendor_attendees',
    'update_logs', 'update_log_team_mentions', 'update_log_vendor_mentions',
    'notifications', 'notification_templates'
  )) as new_tables_created,
  COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public';