-- ============================================
-- PRODUCTION DATA SEEDING SCRIPT
-- ============================================
-- This script adds initial data to get your system running
-- Run this AFTER create-admin-user.sql

-- Get the admin user and tenant IDs (adjust email if needed)
DO $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_cat_construction UUID;
  v_cat_renovation UUID;
  v_cat_maintenance UUID;
  v_cat_electrical UUID;
  v_cat_plumbing UUID;
  v_cat_hvac UUID;
  v_cat_documents UUID;
  v_cat_meetings UUID;
  v_association_id1 UUID;
  v_association_id2 UUID;
  v_association_id3 UUID;
  v_project_id1 UUID;
  v_project_id2 UUID;
  v_project_id3 UUID;
BEGIN
  -- Get admin user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'admin@projectpro.com'
  LIMIT 1;

  -- Get tenant ID
  SELECT tenant_id INTO v_tenant_id
  FROM public.user_tenants
  WHERE user_id = v_user_id AND role = 'owner'
  LIMIT 1;

  IF v_user_id IS NULL OR v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Admin user or tenant not found. Run create-admin-user.sql first.';
  END IF;

  -- ============================================
  -- CATEGORIES
  -- ============================================
  
  -- Project Categories
  INSERT INTO public.categories (id, tenant_id, name, type, color, icon)
  VALUES 
    (gen_random_uuid(), v_tenant_id, 'Construction', 'project', '#10B981', 'hammer')
    RETURNING id INTO v_cat_construction;
    
  INSERT INTO public.categories (id, tenant_id, name, type, color, icon)
  VALUES 
    (gen_random_uuid(), v_tenant_id, 'Renovation', 'project', '#3B82F6', 'paint-brush')
    RETURNING id INTO v_cat_renovation;
    
  INSERT INTO public.categories (id, tenant_id, name, type, color, icon)
  VALUES 
    (gen_random_uuid(), v_tenant_id, 'Maintenance', 'project', '#F59E0B', 'wrench')
    RETURNING id INTO v_cat_maintenance;

  -- Vendor Categories
  INSERT INTO public.categories (id, tenant_id, name, type, color, icon)
  VALUES 
    (gen_random_uuid(), v_tenant_id, 'Electrical', 'vendor', '#FBBF24', 'zap')
    RETURNING id INTO v_cat_electrical;
    
  INSERT INTO public.categories (id, tenant_id, name, type, color, icon)
  VALUES 
    (gen_random_uuid(), v_tenant_id, 'Plumbing', 'vendor', '#06B6D4', 'droplet')
    RETURNING id INTO v_cat_plumbing;
    
  INSERT INTO public.categories (id, tenant_id, name, type, color, icon)
  VALUES 
    (gen_random_uuid(), v_tenant_id, 'HVAC', 'vendor', '#8B5CF6', 'wind')
    RETURNING id INTO v_cat_hvac;

  -- Document Categories
  INSERT INTO public.categories (id, tenant_id, name, type, color)
  VALUES 
    (gen_random_uuid(), v_tenant_id, 'Contracts', 'document', '#EF4444')
    RETURNING id INTO v_cat_documents;

  -- Event Categories
  INSERT INTO public.categories (id, tenant_id, name, type, color)
  VALUES 
    (gen_random_uuid(), v_tenant_id, 'Site Meetings', 'event', '#14B8A6')
    RETURNING id INTO v_cat_meetings;

  -- Task Categories
  INSERT INTO public.categories (tenant_id, name, type, color)
  VALUES 
    (v_tenant_id, 'Urgent', 'task', '#DC2626'),
    (v_tenant_id, 'Planning', 'task', '#7C3AED'),
    (v_tenant_id, 'Execution', 'task', '#059669'),
    (v_tenant_id, 'Review', 'task', '#0891B2');

  -- ============================================
  -- ASSOCIATIONS (CLIENTS)
  -- ============================================
  
  INSERT INTO public.associations (id, tenant_id, name, type, address, city, state, zip, contact_name, contact_email, contact_phone)
  VALUES 
    (gen_random_uuid(), v_tenant_id, 'Smith Residence', 'client', 
     '123 Oak Street', 'Springfield', 'IL', '62701',
     'John Smith', 'john.smith@email.com', '(555) 123-4567')
    RETURNING id INTO v_association_id1;
    
  INSERT INTO public.associations (id, tenant_id, name, type, address, city, state, zip, contact_name, contact_email, contact_phone)
  VALUES 
    (gen_random_uuid(), v_tenant_id, 'ABC Corporation', 'client',
     '456 Business Plaza', 'Chicago', 'IL', '60601',
     'Sarah Johnson', 'sarah@abccorp.com', '(555) 234-5678')
    RETURNING id INTO v_association_id2;
    
  INSERT INTO public.associations (id, tenant_id, name, type, address, city, state, zip, contact_name, contact_email, contact_phone)
  VALUES 
    (gen_random_uuid(), v_tenant_id, 'Green Valley Mall', 'client',
     '789 Commerce Drive', 'Naperville', 'IL', '60540',
     'Mike Davis', 'mdavis@greenvalley.com', '(555) 345-6789')
    RETURNING id INTO v_association_id3;

  -- ============================================
  -- PROJECTS
  -- ============================================
  
  -- Active Project 1
  INSERT INTO public.projects (
    id, tenant_id, name, description, status, budget, spent,
    start_date, end_date, completion_percentage,
    association_id, address, city, state, zip,
    created_by
  ) VALUES (
    gen_random_uuid(), v_tenant_id,
    'Smith Kitchen Renovation',
    'Complete kitchen remodel including new cabinets, countertops, appliances, and flooring',
    'on-track',
    75000.00,
    32500.00,
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE + INTERVAL '60 days',
    45,
    v_association_id1,
    '123 Oak Street', 'Springfield', 'IL', '62701',
    v_user_id
  ) RETURNING id INTO v_project_id1;

  -- Active Project 2
  INSERT INTO public.projects (
    id, tenant_id, name, description, status, budget, spent,
    start_date, end_date, completion_percentage,
    association_id, address, city, state, zip,
    created_by
  ) VALUES (
    gen_random_uuid(), v_tenant_id,
    'ABC Corp Office Buildout',
    'New office space construction - 5000 sq ft including conference rooms and open workspace',
    'delayed',
    250000.00,
    180000.00,
    CURRENT_DATE - INTERVAL '90 days',
    CURRENT_DATE + INTERVAL '30 days',
    72,
    v_association_id2,
    '456 Business Plaza', 'Chicago', 'IL', '60601',
    v_user_id
  ) RETURNING id INTO v_project_id2;

  -- Planning Project
  INSERT INTO public.projects (
    id, tenant_id, name, description, status, budget,
    start_date, end_date, completion_percentage,
    association_id, address, city, state, zip,
    created_by
  ) VALUES (
    gen_random_uuid(), v_tenant_id,
    'Green Valley Retail Space',
    'Retail store renovation - updating storefront, lighting, and interior fixtures',
    'new',
    150000.00,
    CURRENT_DATE + INTERVAL '14 days',
    CURRENT_DATE + INTERVAL '120 days',
    0,
    v_association_id3,
    '789 Commerce Drive', 'Naperville', 'IL', '60540',
    v_user_id
  ) RETURNING id INTO v_project_id3;

  -- Completed Project
  INSERT INTO public.projects (
    tenant_id, name, description, status, budget, spent,
    start_date, end_date, actual_start_date, actual_end_date,
    completion_percentage, association_id, created_by
  ) VALUES (
    v_tenant_id,
    'Downtown Condo Bathroom Remodel',
    'Master bathroom complete renovation with luxury fixtures',
    'completed',
    35000.00,
    34250.00,
    CURRENT_DATE - INTERVAL '180 days',
    CURRENT_DATE - INTERVAL '90 days',
    CURRENT_DATE - INTERVAL '180 days',
    CURRENT_DATE - INTERVAL '92 days',
    100,
    v_association_id1,
    v_user_id
  );

  -- ============================================
  -- TASKS
  -- ============================================
  
  -- Tasks for Project 1 (Kitchen Renovation)
  INSERT INTO public.tasks (
    tenant_id, project_id, title, description, status, priority,
    due_date, assignee_id, position, created_by
  ) VALUES 
    (v_tenant_id, v_project_id1, 'Order kitchen cabinets', 
     'Contact supplier and place order for custom cabinets', 
     'completed', 'high', CURRENT_DATE - INTERVAL '20 days', 
     v_user_id, 1, v_user_id),
    
    (v_tenant_id, v_project_id1, 'Schedule electrical inspection',
     'Coordinate with city inspector for rough-in electrical',
     'in-progress', 'high', CURRENT_DATE + INTERVAL '5 days',
     v_user_id, 2, v_user_id),
    
    (v_tenant_id, v_project_id1, 'Install backsplash tile',
     'Subway tile installation after countertops are in',
     'pending', 'medium', CURRENT_DATE + INTERVAL '30 days',
     v_user_id, 3, v_user_id),
    
    (v_tenant_id, v_project_id1, 'Final walkthrough with client',
     'Review all work and create punch list',
     'pending', 'high', CURRENT_DATE + INTERVAL '55 days',
     v_user_id, 4, v_user_id);

  -- Tasks for Project 2 (Office Buildout)
  INSERT INTO public.tasks (
    tenant_id, project_id, title, description, status, priority,
    due_date, assignee_id, position, created_by
  ) VALUES 
    (v_tenant_id, v_project_id2, 'HVAC system installation',
     'Install new commercial HVAC units for office space',
     'in-progress', 'high', CURRENT_DATE + INTERVAL '10 days',
     v_user_id, 1, v_user_id),
    
    (v_tenant_id, v_project_id2, 'Network cabling infrastructure',
     'Run CAT6 cabling throughout office space',
     'in-progress', 'high', CURRENT_DATE + INTERVAL '7 days',
     v_user_id, 2, v_user_id),
    
    (v_tenant_id, v_project_id2, 'Conference room AV setup',
     'Install projectors, screens, and audio systems',
     'pending', 'medium', CURRENT_DATE + INTERVAL '20 days',
     v_user_id, 3, v_user_id);

  -- Standalone tasks (not project-specific)
  INSERT INTO public.tasks (
    tenant_id, title, description, status, priority,
    due_date, assignee_id, created_by
  ) VALUES 
    (v_tenant_id, 'Update contractor insurance certificates',
     'Collect and file updated insurance docs from all subs',
     'pending', 'high', CURRENT_DATE + INTERVAL '15 days',
     v_user_id, v_user_id),
    
    (v_tenant_id, 'Equipment maintenance - Truck #3',
     'Schedule routine maintenance for company truck',
     'pending', 'low', CURRENT_DATE + INTERVAL '30 days',
     v_user_id, v_user_id);

  -- ============================================
  -- VENDORS
  -- ============================================
  
  INSERT INTO public.vendors (
    tenant_id, name, description, category_id,
    contact_name, contact_email, contact_phone,
    address, city, state, zip,
    rating, status, created_by
  ) VALUES 
    (v_tenant_id, 'Elite Electric LLC',
     'Licensed electrical contractor specializing in commercial and residential',
     v_cat_electrical,
     'Tom Wilson', 'tom@eliteelectric.com', '(555) 456-7890',
     '321 Industrial Way', 'Chicago', 'IL', '60602',
     4.8, 'active', v_user_id),
    
    (v_tenant_id, 'Precision Plumbing Services',
     'Full service plumbing - new construction and repairs',
     v_cat_plumbing,
     'Maria Garcia', 'maria@precisionplumb.com', '(555) 567-8901',
     '654 Service Road', 'Springfield', 'IL', '62702',
     4.5, 'active', v_user_id),
    
    (v_tenant_id, 'Climate Control HVAC',
     'Commercial HVAC installation and maintenance',
     v_cat_hvac,
     'Robert Chen', 'rchen@climatecontrol.com', '(555) 678-9012',
     '987 Tech Park', 'Naperville', 'IL', '60541',
     4.9, 'active', v_user_id),
    
    (v_tenant_id, 'BuildRight Materials',
     'Construction materials supplier - lumber, drywall, concrete',
     NULL,
     'Steve Brown', 'sales@buildright.com', '(555) 789-0123',
     '111 Supply Drive', 'Chicago', 'IL', '60603',
     4.2, 'active', v_user_id),
    
    (v_tenant_id, 'Custom Cabinets Plus',
     'Custom kitchen and bath cabinetry',
     NULL,
     'Jennifer Lee', 'jlee@customcabinets.com', '(555) 890-1234',
     '222 Woodwork Lane', 'Oak Park', 'IL', '60301',
     4.7, 'active', v_user_id);

  -- ============================================
  -- EVENTS
  -- ============================================
  
  INSERT INTO public.events (
    tenant_id, title, description,
    start_date, end_date, all_day,
    location, category_id, project_id,
    created_by
  ) VALUES 
    (v_tenant_id, 'Kitchen Project - Client Meeting',
     'Review cabinet samples and finalize selections',
     CURRENT_DATE + INTERVAL '2 days' + TIME '14:00',
     CURRENT_DATE + INTERVAL '2 days' + TIME '15:30',
     false,
     '123 Oak Street, Springfield',
     v_cat_meetings, v_project_id1, v_user_id),
    
    (v_tenant_id, 'Office Buildout - Progress Review',
     'Weekly progress meeting with ABC Corp team',
     CURRENT_DATE + INTERVAL '3 days' + TIME '10:00',
     CURRENT_DATE + INTERVAL '3 days' + TIME '11:00',
     false,
     '456 Business Plaza, Chicago',
     v_cat_meetings, v_project_id2, v_user_id),
    
    (v_tenant_id, 'City Inspector - Electrical',
     'Rough-in electrical inspection for kitchen project',
     CURRENT_DATE + INTERVAL '5 days' + TIME '09:00',
     CURRENT_DATE + INTERVAL '5 days' + TIME '10:00',
     false,
     '123 Oak Street, Springfield',
     NULL, v_project_id1, v_user_id),
    
    (v_tenant_id, 'Vendor Lunch Meeting',
     'Discuss new supplier partnership opportunities',
     CURRENT_DATE + INTERVAL '7 days' + TIME '12:00',
     CURRENT_DATE + INTERVAL '7 days' + TIME '13:30',
     false,
     'Downtown Restaurant',
     NULL, NULL, v_user_id),
    
    (v_tenant_id, 'Team Safety Training',
     'Quarterly safety training for all crew members',
     CURRENT_DATE + INTERVAL '14 days' + TIME '08:00',
     CURRENT_DATE + INTERVAL '14 days' + TIME '12:00',
     false,
     'Main Office Conference Room',
     NULL, NULL, v_user_id);

  -- ============================================
  -- ACTIVITY LOGS (Sample recent activities)
  -- ============================================
  
  INSERT INTO public.activity_logs (
    tenant_id, user_id, action, entity_type, entity_id, entity_name, details
  ) VALUES 
    (v_tenant_id, v_user_id, 'created', 'projects', v_project_id1, 'Smith Kitchen Renovation',
     '{"type": "project_creation", "budget": 75000}'),
    
    (v_tenant_id, v_user_id, 'updated', 'projects', v_project_id2, 'ABC Corp Office Buildout',
     '{"type": "status_change", "from": "on-track", "to": "delayed"}'),
    
    (v_tenant_id, v_user_id, 'created', 'tasks', gen_random_uuid(), 'Order kitchen cabinets',
     '{"type": "task_creation", "priority": "high"}'),
    
    (v_tenant_id, v_user_id, 'completed', 'tasks', gen_random_uuid(), 'Order kitchen cabinets',
     '{"type": "task_completion", "completed_date": "' || CURRENT_DATE || '"}');

  -- ============================================
  -- NOTIFICATIONS (Sample notifications)
  -- ============================================
  
  INSERT INTO public.notifications (
    user_id, tenant_id, title, message, type, is_read
  ) VALUES 
    (v_user_id, v_tenant_id, 
     'Task Due Soon',
     'Schedule electrical inspection is due in 5 days',
     'warning', false),
    
    (v_user_id, v_tenant_id,
     'Project Update',
     'ABC Corp Office Buildout status changed to delayed',
     'info', false),
    
    (v_user_id, v_tenant_id,
     'New Vendor Added',
     'Climate Control HVAC has been added to your vendor list',
     'success', true);

  RAISE NOTICE 'Production data seeded successfully!';
  RAISE NOTICE 'Tenant ID: %', v_tenant_id;
  RAISE NOTICE 'Admin User ID: %', v_user_id;
  
END $$;