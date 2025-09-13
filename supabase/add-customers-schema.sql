-- ============================================
-- ADD CUSTOMERS TO CONTACT MANAGEMENT SYSTEM
-- ============================================

-- 1. Update vendors table to become a general contacts table
-- First, add a contact_type column to distinguish between different contact types
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS contact_type TEXT DEFAULT 'vendor' 
CHECK (contact_type IN ('design_professional', 'contractor', 'vendor', 'customer'));

-- Add customer-specific fields
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS billing_address TEXT,
ADD COLUMN IF NOT EXISTS billing_city TEXT,
ADD COLUMN IF NOT EXISTS billing_state TEXT,
ADD COLUMN IF NOT EXISTS billing_zip TEXT,
ADD COLUMN IF NOT EXISTS project_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_since DATE,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS payment_terms TEXT,
ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12,2);

-- 2. Create customers view for easier querying
CREATE OR REPLACE VIEW public.customers AS
SELECT * FROM public.vendors 
WHERE contact_type = 'customer';

-- 3. Create an associations/customers table to link with projects
CREATE TABLE IF NOT EXISTS public.customers_associations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  association_type TEXT DEFAULT 'customer',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id)
);

-- 4. Update associations table to reference vendors/customers
ALTER TABLE public.associations 
ADD COLUMN IF NOT EXISTS vendor_customer_id UUID REFERENCES public.vendors(id);

-- 5. Add customers to project assignments for notifications
CREATE TABLE IF NOT EXISTS public.project_customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT true,
  can_receive_notifications BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES public.profiles(id),
  UNIQUE(project_id, customer_id)
);

-- 6. Add customers to event attendees
CREATE TABLE IF NOT EXISTS public.event_customer_attendees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.schedule_events(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  customer_contact_name TEXT,
  customer_contact_email TEXT,
  customer_contact_phone TEXT,
  attendance_status TEXT DEFAULT 'pending',
  is_required BOOLEAN DEFAULT false,
  notify_enabled BOOLEAN DEFAULT true,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(event_id, customer_id)
);

-- 7. Add customers to update log mentions
CREATE TABLE IF NOT EXISTS public.update_log_customer_mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  update_log_id UUID NOT NULL REFERENCES public.update_logs(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  mention_type TEXT DEFAULT 'mention',
  notified BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  UNIQUE(update_log_id, customer_id)
);

-- 8. Update notifications table to support customers
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS recipient_customer_id UUID REFERENCES public.vendors(id);

-- Drop old constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS recipient_check;

-- Add new constraint that includes customers
ALTER TABLE public.notifications 
ADD CONSTRAINT recipient_check CHECK (
  (recipient_user_id IS NOT NULL AND recipient_vendor_id IS NULL AND recipient_customer_id IS NULL) OR 
  (recipient_user_id IS NULL AND recipient_vendor_id IS NOT NULL AND recipient_customer_id IS NULL) OR
  (recipient_user_id IS NULL AND recipient_vendor_id IS NULL AND recipient_customer_id IS NOT NULL)
);

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendors_contact_type ON public.vendors(contact_type);
CREATE INDEX IF NOT EXISTS idx_project_customers_project ON public.project_customers(project_id);
CREATE INDEX IF NOT EXISTS idx_project_customers_customer ON public.project_customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_event_customer_attendees_event ON public.event_customer_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_customer_attendees_customer ON public.event_customer_attendees(customer_id);
CREATE INDEX IF NOT EXISTS idx_update_log_customer_mentions_log ON public.update_log_customer_mentions(update_log_id);
CREATE INDEX IF NOT EXISTS idx_update_log_customer_mentions_customer ON public.update_log_customer_mentions(customer_id);

-- 10. Enable RLS on new tables
ALTER TABLE public.project_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_customer_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.update_log_customer_mentions ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS policies
CREATE POLICY "project_customers_access" ON public.project_customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_customers.project_id
      AND p.tenant_id IN (
        SELECT tenant_id FROM public.user_tenants 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "event_customer_attendees_access" ON public.event_customer_attendees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.schedule_events e
      WHERE e.id = event_customer_attendees.event_id
      AND e.tenant_id IN (
        SELECT tenant_id FROM public.user_tenants 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "update_log_customer_mentions_access" ON public.update_log_customer_mentions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.update_logs ul
      WHERE ul.id = update_log_customer_mentions.update_log_id
      AND ul.tenant_id IN (
        SELECT tenant_id FROM public.user_tenants 
        WHERE user_id = auth.uid()
      )
    )
  );

-- 12. Update helper function to include customers
CREATE OR REPLACE FUNCTION get_project_all_contacts(p_project_id UUID)
RETURNS TABLE (
  contact_type TEXT,
  contact_id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  can_notify BOOLEAN
) AS $$
BEGIN
  -- Return team members
  RETURN QUERY
  SELECT 
    'team'::TEXT as contact_type,
    p.id as contact_id,
    p.full_name as name,
    p.email,
    p.mobile_phone as phone,
    ptm.can_receive_notifications as can_notify
  FROM public.project_team_members ptm
  JOIN public.profiles p ON p.id = ptm.user_id
  WHERE ptm.project_id = p_project_id;
  
  -- Return vendors (including design professionals and contractors)
  RETURN QUERY
  SELECT 
    v.contact_type as contact_type,
    v.id as contact_id,
    v.name,
    COALESCE(v.notification_email, v.contact_email) as email,
    COALESCE(v.notification_phone, v.contact_phone) as phone,
    pv.can_receive_notifications as can_notify
  FROM public.project_vendors pv
  JOIN public.vendors v ON v.id = pv.vendor_id
  WHERE pv.project_id = p_project_id
  AND v.contact_type IN ('design_professional', 'contractor', 'vendor');
  
  -- Return customers
  RETURN QUERY
  SELECT 
    'customer'::TEXT as contact_type,
    v.id as contact_id,
    v.name,
    COALESCE(v.notification_email, v.contact_email) as email,
    COALESCE(v.notification_phone, v.contact_phone) as phone,
    pc.can_receive_notifications as can_notify
  FROM public.project_customers pc
  JOIN public.vendors v ON v.id = pc.customer_id
  WHERE pc.project_id = p_project_id
  AND v.contact_type = 'customer';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;