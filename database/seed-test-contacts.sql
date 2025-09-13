-- ============================================
-- Seed Test Contacts with Correct Schema
-- ============================================

-- The contacts table has these columns:
-- name (not first_name/last_name)
-- contact_type (required: 'client', 'vendor', 'subcontractor', 'consultant', 'other')
-- email, phone, company, etc.

-- Create test tenant if not exists
INSERT INTO public.tenants (id, name, slug)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'Test Company',
  'test-company'
) ON CONFLICT (id) DO NOTHING;

-- Insert test contacts with correct schema
INSERT INTO public.contacts (
    tenant_id, 
    name,           -- Single name field, not first_name/last_name
    email, 
    phone, 
    company, 
    contact_type,   -- Required field
    title,
    is_active
)
VALUES 
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'John Smith', 'john.smith@example.com', '555-0001', 'ABC Construction', 'client', 'Project Manager', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Jane Doe', 'jane.doe@example.com', '555-0002', 'XYZ Architects', 'consultant', 'Lead Architect', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Mike Johnson', 'mike.j@example.com', '555-0003', 'Electric Co', 'subcontractor', 'Electrician', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Sarah Williams', 'sarah.w@example.com', '555-0004', 'Plumbing Plus', 'subcontractor', 'Plumber', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Tom Brown', 'tom.brown@example.com', '555-0005', 'HVAC Services', 'subcontractor', 'HVAC Specialist', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Lisa Anderson', 'lisa.a@example.com', '555-0006', 'Quality Materials', 'vendor', 'Sales Manager', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Robert Wilson', 'robert.w@example.com', '555-0007', 'City Permits Office', 'other', 'Permit Coordinator', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Emily Chen', 'emily.c@example.com', '555-0008', 'Structural Engineers LLC', 'consultant', 'Structural Engineer', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'David Martinez', 'david.m@example.com', '555-0009', 'Martinez Roofing', 'subcontractor', 'Roofing Contractor', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Jennifer Taylor', 'jennifer.t@example.com', '555-0010', 'Home Depot Pro', 'vendor', 'Account Manager', true)
ON CONFLICT DO NOTHING;

-- Verify the contacts were created
SELECT 
    id,
    name,
    email,
    phone,
    company,
    contact_type,
    title,
    is_active,
    created_at
FROM public.contacts
WHERE tenant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
ORDER BY created_at DESC
LIMIT 10;

-- Count by contact type
SELECT 
    contact_type,
    COUNT(*) as count
FROM public.contacts
WHERE tenant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
GROUP BY contact_type
ORDER BY count DESC;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Test contacts seeded successfully!';
    RAISE NOTICE 'Contact types: client, vendor, subcontractor, consultant, other';
END $$;