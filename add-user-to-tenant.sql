-- First, run the seed data
INSERT INTO public.tenants (id, name, slug) VALUES
  ('d0d0d0d0-0000-0000-0000-000000000001', 'Acme Property Management', 'acme-property')
ON CONFLICT (id) DO NOTHING;

-- Add categories
INSERT INTO public.categories (id, tenant_id, name, type, color) VALUES
  ('c0c0c0c0-0000-0000-0000-000000000001', 'd0d0d0d0-0000-0000-0000-000000000001', 'Maintenance', 'task', '#3b82f6'),
  ('c0c0c0c0-0000-0000-0000-000000000002', 'd0d0d0d0-0000-0000-0000-000000000001', 'Renovation', 'task', '#10b981'),
  ('c0c0c0c0-0000-0000-0000-000000000003', 'd0d0d0d0-0000-0000-0000-000000000001', 'Emergency', 'task', '#ef4444'),
  ('c0c0c0c0-0000-0000-0000-000000000004', 'd0d0d0d0-0000-0000-0000-000000000001', 'Capital Improvement', 'project', '#8b5cf6')
ON CONFLICT (id) DO NOTHING;

-- Link your user to the tenant (replace YOUR_USER_ID with your actual auth.users ID)
-- You can get your user ID by running: SELECT id FROM auth.users WHERE email = 'your-email@example.com';
-- For now, this will link any existing user to the tenant
INSERT INTO public.user_tenants (user_id, tenant_id, role)
SELECT id, 'd0d0d0d0-0000-0000-0000-000000000001', 'owner'
FROM auth.users
WHERE email IS NOT NULL
ON CONFLICT (user_id, tenant_id) DO NOTHING;