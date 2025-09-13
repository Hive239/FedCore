-- First, ensure we have the test tenant
INSERT INTO public.tenants (id, name, slug) VALUES
  ('d0d0d0d0-0000-0000-0000-000000000001', 'Acme Property Management', 'acme-property')
ON CONFLICT (id) DO NOTHING;

-- Add users to the tenant with their actual IDs
INSERT INTO public.user_tenants (user_id, tenant_id, role) VALUES 
  ('fca922b4-a9e7-402d-8137-6904b07aeb72', 'd0d0d0d0-0000-0000-0000-000000000001', 'owner'),   -- admin@projectpro.com
  ('5c2f282b-7d2c-4007-8bd5-f0a40e59b9fd', 'd0d0d0d0-0000-0000-0000-000000000001', 'admin'),   -- john@projectpro.com
  ('c5243ac6-da91-49bd-8608-51285bfd37e8', 'd0d0d0d0-0000-0000-0000-000000000001', 'member'),  -- jane@projectpro.com
  ('d454a81d-b819-44d3-b6c1-b9e7621c71a3', 'd0d0d0d0-0000-0000-0000-000000000001', 'member'),  -- bob@projectpro.com
  ('58c68337-084c-4dc2-b110-a5ba4cd78d9b', 'd0d0d0d0-0000-0000-0000-000000000001', 'member'),  -- sarah@projectpro.com
  ('e0d295a8-a3d8-4b30-83d5-75414de92eef', 'd0d0d0d0-0000-0000-0000-000000000001', 'member')   -- mike@projectpro.com
ON CONFLICT DO NOTHING;

-- Add some sample projects with the admin user as creator
INSERT INTO public.projects (id, tenant_id, name, description, status, budget, start_date, end_date, association_id, created_by) VALUES
  ('p0000001-0000-0000-0000-000000000001', 'd0d0d0d0-0000-0000-0000-000000000001', 'Pool Renovation', 'Complete renovation of the community pool area', 'on-track', 45000.00, '2024-01-15', '2024-03-30', 'a0a0a0a0-0000-0000-0000-000000000001', 'fca922b4-a9e7-402d-8137-6904b07aeb72'),
  ('p0000001-0000-0000-0000-000000000002', 'd0d0d0d0-0000-0000-0000-000000000001', 'Parking Lot Resurfacing', 'Resurfacing and restriping of main parking area', 'delayed', 28000.00, '2024-02-01', '2024-02-28', 'a0a0a0a0-0000-0000-0000-000000000002', 'fca922b4-a9e7-402d-8137-6904b07aeb72'),
  ('p0000001-0000-0000-0000-000000000003', 'd0d0d0d0-0000-0000-0000-000000000001', 'Landscape Upgrade', 'Drought-resistant landscaping installation', 'new', 15000.00, '2024-03-01', '2024-04-15', 'a0a0a0a0-0000-0000-0000-000000000003', '5c2f282b-7d2c-4007-8bd5-f0a40e59b9fd'),
  ('p0000001-0000-0000-0000-000000000004', 'd0d0d0d0-0000-0000-0000-000000000001', 'Security System Update', 'Install new cameras and access control', 'on-hold', 32000.00, '2024-04-01', '2024-05-15', 'a0a0a0a0-0000-0000-0000-000000000001', '5c2f282b-7d2c-4007-8bd5-f0a40e59b9fd'),
  ('p0000001-0000-0000-0000-000000000005', 'd0d0d0d0-0000-0000-0000-000000000001', 'Roof Repairs Phase 1', 'Repair and maintenance of building A and B roofs', 'completed', 52000.00, '2023-10-01', '2023-12-15', 'a0a0a0a0-0000-0000-0000-000000000002', 'fca922b4-a9e7-402d-8137-6904b07aeb72');

-- Add sample tasks
INSERT INTO public.tasks (id, tenant_id, project_id, title, description, status, priority, due_date, assignee_id, created_by, position) VALUES
  ('t0000001-0000-0000-0000-000000000001', 'd0d0d0d0-0000-0000-0000-000000000001', 'p0000001-0000-0000-0000-000000000001', 'Get contractor quotes', 'Obtain at least 3 quotes from licensed pool contractors', 'in-progress', 'high', '2024-01-20', 'c5243ac6-da91-49bd-8608-51285bfd37e8', 'fca922b4-a9e7-402d-8137-6904b07aeb72', 0),
  ('t0000001-0000-0000-0000-000000000002', 'd0d0d0d0-0000-0000-0000-000000000001', 'p0000001-0000-0000-0000-000000000001', 'Review pool designs', 'Review and approve final pool design plans', 'pending', 'high', '2024-01-25', 'd454a81d-b819-44d3-b6c1-b9e7621c71a3', 'fca922b4-a9e7-402d-8137-6904b07aeb72', 1),
  ('t0000001-0000-0000-0000-000000000003', 'd0d0d0d0-0000-0000-0000-000000000001', 'p0000001-0000-0000-0000-000000000002', 'Schedule parking lot closure', 'Coordinate with residents for parking alternatives', 'completed', 'medium', '2024-01-28', 'c5243ac6-da91-49bd-8608-51285bfd37e8', '5c2f282b-7d2c-4007-8bd5-f0a40e59b9fd', 0),
  ('t0000001-0000-0000-0000-000000000004', 'd0d0d0d0-0000-0000-0000-000000000001', 'p0000001-0000-0000-0000-000000000002', 'Hire traffic control', 'Arrange for traffic control during construction', 'review', 'medium', '2024-02-05', '58c68337-084c-4dc2-b110-a5ba4cd78d9b', '5c2f282b-7d2c-4007-8bd5-f0a40e59b9fd', 1),
  ('t0000001-0000-0000-0000-000000000005', 'd0d0d0d0-0000-0000-0000-000000000001', NULL, 'Monthly HOA newsletter', 'Prepare and send February newsletter', 'pending', 'low', '2024-02-01', 'e0d295a8-a3d8-4b30-83d5-75414de92eef', 'fca922b4-a9e7-402d-8137-6904b07aeb72', 0),
  ('t0000001-0000-0000-0000-000000000006', 'd0d0d0d0-0000-0000-0000-000000000001', NULL, 'Update emergency contacts', 'Review and update all emergency contact information', 'on-hold', 'low', '2024-02-15', 'd454a81d-b819-44d3-b6c1-b9e7621c71a3', '5c2f282b-7d2c-4007-8bd5-f0a40e59b9fd', 0);

-- Add sample vendors
INSERT INTO public.vendors (id, tenant_id, name, description, category_id, contact_name, contact_email, contact_phone, address, rating, status, created_by) VALUES
  ('v0000001-0000-0000-0000-000000000001', 'd0d0d0d0-0000-0000-0000-000000000001', 'ABC Plumbing', 'Full service plumbing contractor', 'c0c0c0c0-0000-0000-0000-000000000007', 'Alice Brown', 'alice@abcplumbing.com', '(555) 123-4567', '123 Main St, San Francisco, CA', 4.8, 'active', 'fca922b4-a9e7-402d-8137-6904b07aeb72'),
  ('v0000001-0000-0000-0000-000000000002', 'd0d0d0d0-0000-0000-0000-000000000001', 'Elite Electric', 'Commercial and residential electrical services', 'c0c0c0c0-0000-0000-0000-000000000008', 'Eddie Volt', 'eddie@eliteelectric.com', '(555) 234-5678', '456 Oak Ave, San Francisco, CA', 4.5, 'active', 'fca922b4-a9e7-402d-8137-6904b07aeb72'),
  ('v0000001-0000-0000-0000-000000000003', 'd0d0d0d0-0000-0000-0000-000000000001', 'Pro Painters', 'Interior and exterior painting specialists', NULL, 'Paul Painter', 'paul@propainters.com', '(555) 345-6789', '789 Pine St, San Francisco, CA', 4.9, 'active', '5c2f282b-7d2c-4007-8bd5-f0a40e59b9fd');