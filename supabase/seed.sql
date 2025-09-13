-- Create test tenant
INSERT INTO public.tenants (id, name, slug) VALUES
  ('d0d0d0d0-0000-0000-0000-000000000001', 'Acme Property Management', 'acme-property');

-- Create test associations
INSERT INTO public.associations (id, tenant_id, name, address, contact_name, contact_email, contact_phone) VALUES
  ('a0a0a0a0-0000-0000-0000-000000000001', 'd0d0d0d0-0000-0000-0000-000000000001', 'Sunset Ridge HOA', '123 Sunset Blvd, San Francisco, CA 94110', 'John Smith', 'john@sunsetridge.com', '(555) 123-4567'),
  ('a0a0a0a0-0000-0000-0000-000000000002', 'd0d0d0d0-0000-0000-0000-000000000001', 'Oak Park Condos', '456 Oak Street, San Francisco, CA 94102', 'Jane Doe', 'jane@oakpark.com', '(555) 234-5678'),
  ('a0a0a0a0-0000-0000-0000-000000000003', 'd0d0d0d0-0000-0000-0000-000000000001', 'Riverside Apartments', '789 River Road, San Francisco, CA 94107', 'Bob Wilson', 'bob@riverside.com', '(555) 345-6789');

-- Create test categories
INSERT INTO public.categories (id, tenant_id, name, type, color) VALUES
  ('c0c0c0c0-0000-0000-0000-000000000001', 'd0d0d0d0-0000-0000-0000-000000000001', 'Maintenance', 'task', '#3b82f6'),
  ('c0c0c0c0-0000-0000-0000-000000000002', 'd0d0d0d0-0000-0000-0000-000000000001', 'Renovation', 'task', '#10b981'),
  ('c0c0c0c0-0000-0000-0000-000000000003', 'd0d0d0d0-0000-0000-0000-000000000001', 'Emergency', 'task', '#ef4444'),
  ('c0c0c0c0-0000-0000-0000-000000000004', 'd0d0d0d0-0000-0000-0000-000000000001', 'Capital Improvement', 'project', '#8b5cf6'),
  ('c0c0c0c0-0000-0000-0000-000000000005', 'd0d0d0d0-0000-0000-0000-000000000001', 'Routine Maintenance', 'project', '#06b6d4'),
  ('c0c0c0c0-0000-0000-0000-000000000006', 'd0d0d0d0-0000-0000-0000-000000000001', 'Contracts', 'document', '#f59e0b'),
  ('c0c0c0c0-0000-0000-0000-000000000007', 'd0d0d0d0-0000-0000-0000-000000000001', 'Plumbing', 'vendor', '#14b8a6'),
  ('c0c0c0c0-0000-0000-0000-000000000008', 'd0d0d0d0-0000-0000-0000-000000000001', 'Electrical', 'vendor', '#f97316'),
  ('c0c0c0c0-0000-0000-0000-000000000009', 'd0d0d0d0-0000-0000-0000-000000000001', 'Board Meeting', 'event', '#6366f1'),
  ('c0c0c0c0-0000-0000-0000-000000000010', 'd0d0d0d0-0000-0000-0000-000000000001', 'Site Visit', 'event', '#22c55e');