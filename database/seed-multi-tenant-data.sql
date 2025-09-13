-- ============================================
-- Seed Data for Multi-Tenant ProjectPro
-- ============================================

-- Clean up existing data (optional - remove in production)
-- TRUNCATE public.activity_logs, public.task_comments, public.tasks, public.project_teams, public.projects, public.user_tenants, public.profiles, public.tenants CASCADE;

DO $$
DECLARE
  tenant1_id UUID;
  tenant2_id UUID;
  user1_id UUID;
  user2_id UUID;
  user3_id UUID;
  user4_id UUID;
  user5_id UUID;
  project1_id UUID;
  project2_id UUID;
  project3_id UUID;
  task1_id UUID;
  task2_id UUID;
BEGIN
  -- ============================================
  -- 1. Create Tenants (Organizations)
  -- ============================================
  INSERT INTO public.tenants (id, name, slug, plan, subscription_status, settings)
  VALUES 
    (gen_random_uuid(), 'BuildCorp Construction', 'buildcorp', 'enterprise', 'active', 
     '{"features": {"ml_predictions": true, "weather_integration": true, "advanced_analytics": true}}'::jsonb)
  RETURNING id INTO tenant1_id;

  INSERT INTO public.tenants (id, name, slug, plan, subscription_status, settings)
  VALUES 
    (gen_random_uuid(), 'Metro Builders Inc', 'metro-builders', 'professional', 'active',
     '{"features": {"project_limit": 50, "user_limit": 100}}'::jsonb)
  RETURNING id INTO tenant2_id;

  -- ============================================
  -- 2. Create User Profiles
  -- ============================================
  -- Admin user
  user1_id := gen_random_uuid();
  INSERT INTO public.profiles (id, email, name, role, phone, last_login)
  VALUES 
    (user1_id, 'admin@projectpro.com', 'John Administrator', 'admin', '+1-555-0100', NOW());

  -- Project Manager
  user2_id := gen_random_uuid();
  INSERT INTO public.profiles (id, email, name, role, phone, last_login)
  VALUES 
    (user2_id, 'sarah@projectpro.com', 'Sarah Johnson', 'project_manager', '+1-555-0101', NOW() - INTERVAL '2 hours');

  -- Engineers
  user3_id := gen_random_uuid();
  INSERT INTO public.profiles (id, email, name, role, phone, last_login)
  VALUES 
    (user3_id, 'mike@projectpro.com', 'Mike Chen', 'engineer', '+1-555-0102', NOW() - INTERVAL '1 day');

  user4_id := gen_random_uuid();
  INSERT INTO public.profiles (id, email, name, role, phone, last_login)
  VALUES 
    (user4_id, 'lisa@projectpro.com', 'Lisa Park', 'architect', '+1-555-0103', NOW() - INTERVAL '3 days');

  -- Contractor
  user5_id := gen_random_uuid();
  INSERT INTO public.profiles (id, email, name, role, phone, last_login)
  VALUES 
    (user5_id, 'tom@projectpro.com', 'Tom Wilson', 'contractor', '+1-555-0104', NOW() - INTERVAL '5 days');

  -- ============================================
  -- 3. Link Users to Tenants
  -- ============================================
  -- All users to tenant1
  INSERT INTO public.user_tenants (user_id, tenant_id, role)
  VALUES 
    (user1_id, tenant1_id, 'owner'),
    (user2_id, tenant1_id, 'admin'),
    (user3_id, tenant1_id, 'member'),
    (user4_id, tenant1_id, 'member'),
    (user5_id, tenant1_id, 'member');

  -- Some users to tenant2
  INSERT INTO public.user_tenants (user_id, tenant_id, role)
  VALUES 
    (user1_id, tenant2_id, 'admin'),
    (user2_id, tenant2_id, 'manager');

  -- ============================================
  -- 4. Create Projects for Tenant 1
  -- ============================================
  -- Project 1: Active project
  INSERT INTO public.projects (
    id, tenant_id, name, description, status, priority, budget, 
    start_date, end_date, progress, created_by, project_manager,
    address, city, state, country
  ) VALUES (
    gen_random_uuid(), tenant1_id, 'Downtown Office Complex',
    'Construction of a 20-story office building in downtown area',
    'In Progress', 'high', 5000000,
    CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '9 months',
    35, user1_id, user2_id,
    '123 Main Street', 'New York', 'NY', 'USA'
  ) RETURNING id INTO project1_id;

  -- Project 2: Planning phase
  INSERT INTO public.projects (
    id, tenant_id, name, description, status, priority, budget,
    start_date, end_date, progress, created_by, project_manager,
    address, city, state, country
  ) VALUES (
    gen_random_uuid(), tenant1_id, 'Riverside Shopping Mall',
    'New shopping mall construction with 200 retail spaces',
    'Planning', 'medium', 12000000,
    CURRENT_DATE + INTERVAL '1 month', CURRENT_DATE + INTERVAL '18 months',
    5, user1_id, user2_id,
    '456 River Road', 'Los Angeles', 'CA', 'USA'
  ) RETURNING id INTO project2_id;

  -- Project 3: Completed project
  INSERT INTO public.projects (
    id, tenant_id, name, description, status, priority, budget,
    start_date, end_date, actual_end_date, progress, created_by, project_manager,
    address, city, state, country
  ) VALUES (
    gen_random_uuid(), tenant1_id, 'Green Park Residential',
    'Residential complex with 150 units',
    'Completed', 'high', 8000000,
    CURRENT_DATE - INTERVAL '18 months', CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE - INTERVAL '2 months',
    100, user1_id, user2_id,
    '789 Park Avenue', 'Chicago', 'IL', 'USA'
  ) RETURNING id INTO project3_id;

  -- ============================================
  -- 5. Create Tasks for Project 1
  -- ============================================
  -- Task 1: Completed task
  INSERT INTO public.tasks (
    id, tenant_id, project_id, title, description, status, priority,
    assigned_to, start_date, due_date, completed_at, progress,
    estimated_hours, actual_hours, created_by
  ) VALUES (
    gen_random_uuid(), tenant1_id, project1_id,
    'Site Preparation and Excavation',
    'Clear the site and complete excavation for foundation',
    'completed', 'critical',
    user3_id, CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE - INTERVAL '2 months',
    CURRENT_DATE - INTERVAL '2 months', 100,
    240, 220, user2_id
  ) RETURNING id INTO task1_id;

  -- Task 2: In progress task
  INSERT INTO public.tasks (
    id, tenant_id, project_id, title, description, status, priority,
    assigned_to, start_date, due_date, progress,
    estimated_hours, created_by
  ) VALUES (
    gen_random_uuid(), tenant1_id, project1_id,
    'Foundation and Basement Construction',
    'Pour concrete foundation and construct basement levels',
    'in_progress', 'critical',
    user3_id, CURRENT_DATE - INTERVAL '2 months', CURRENT_DATE + INTERVAL '1 month',
    60, 480, user2_id
  ) RETURNING id INTO task2_id;

  -- More tasks for Project 1
  INSERT INTO public.tasks (
    tenant_id, project_id, title, description, status, priority,
    assigned_to, start_date, due_date, progress, estimated_hours, created_by
  ) VALUES 
    (tenant1_id, project1_id, 'Steel Framework Installation', 
     'Install structural steel framework for all floors', 
     'pending', 'high', user3_id,
     CURRENT_DATE + INTERVAL '1 month', CURRENT_DATE + INTERVAL '3 months',
     0, 720, user2_id),
    
    (tenant1_id, project1_id, 'Electrical System Installation',
     'Install main electrical systems and wiring',
     'pending', 'medium', user5_id,
     CURRENT_DATE + INTERVAL '2 months', CURRENT_DATE + INTERVAL '4 months',
     0, 360, user2_id),
    
    (tenant1_id, project1_id, 'Plumbing Installation',
     'Install water supply and drainage systems',
     'pending', 'medium', user5_id,
     CURRENT_DATE + INTERVAL '2 months', CURRENT_DATE + INTERVAL '4 months',
     0, 320, user2_id),
    
    (tenant1_id, project1_id, 'HVAC System Installation',
     'Install heating, ventilation, and air conditioning systems',
     'pending', 'medium', user5_id,
     CURRENT_DATE + INTERVAL '3 months', CURRENT_DATE + INTERVAL '5 months',
     0, 400, user2_id),
    
    (tenant1_id, project1_id, 'Interior Finishing',
     'Complete interior walls, flooring, and finishing',
     'pending', 'low', user4_id,
     CURRENT_DATE + INTERVAL '5 months', CURRENT_DATE + INTERVAL '7 months',
     0, 600, user2_id);

  -- Tasks for Project 2 (Planning phase)
  INSERT INTO public.tasks (
    tenant_id, project_id, title, description, status, priority,
    assigned_to, due_date, progress, estimated_hours, created_by
  ) VALUES 
    (tenant1_id, project2_id, 'Architectural Design Review',
     'Review and finalize architectural designs',
     'in_progress', 'high', user4_id,
     CURRENT_DATE + INTERVAL '2 weeks', 40, 80, user2_id),
    
    (tenant1_id, project2_id, 'Permit Applications',
     'Submit building permit applications to city',
     'pending', 'critical', user2_id,
     CURRENT_DATE + INTERVAL '3 weeks', 0, 40, user1_id),
    
    (tenant1_id, project2_id, 'Contractor Bidding Process',
     'Receive and evaluate contractor bids',
     'pending', 'high', user1_id,
     CURRENT_DATE + INTERVAL '1 month', 0, 60, user2_id);

  -- ============================================
  -- 6. Create Task Comments
  -- ============================================
  INSERT INTO public.task_comments (task_id, user_id, comment)
  VALUES 
    (task1_id, user2_id, 'Excavation completed ahead of schedule. Great work team!'),
    (task1_id, user3_id, 'Site is ready for foundation work.'),
    (task2_id, user3_id, 'Foundation pour for section A completed.'),
    (task2_id, user2_id, 'Please ensure proper curing time before proceeding.'),
    (task2_id, user5_id, 'Weather forecast looks good for next week''s pour.');

  -- ============================================
  -- 7. Create Project Teams
  -- ============================================
  INSERT INTO public.project_teams (project_id, user_id, role)
  VALUES 
    (project1_id, user2_id, 'manager'),
    (project1_id, user3_id, 'lead'),
    (project1_id, user4_id, 'member'),
    (project1_id, user5_id, 'member'),
    (project2_id, user2_id, 'manager'),
    (project2_id, user4_id, 'lead');

  -- ============================================
  -- 8. Create Activity Logs
  -- ============================================
  INSERT INTO public.activity_logs (
    tenant_id, user_id, action, entity_type, entity_id, entity_name, details
  ) VALUES 
    (tenant1_id, user2_id, 'created', 'project', project1_id::text, 'Downtown Office Complex', 
     '{"description": "Created new project"}'::jsonb),
    (tenant1_id, user2_id, 'created', 'task', task1_id::text, 'Site Preparation', 
     '{"project": "Downtown Office Complex"}'::jsonb),
    (tenant1_id, user3_id, 'completed', 'task', task1_id::text, 'Site Preparation',
     '{"hours_saved": 20}'::jsonb),
    (tenant1_id, user3_id, 'updated', 'task', task2_id::text, 'Foundation Construction',
     '{"progress": {"from": 40, "to": 60}}'::jsonb),
    (tenant1_id, user1_id, 'created', 'project', project2_id::text, 'Riverside Shopping Mall',
     '{"budget": 12000000}'::jsonb);

  -- ============================================
  -- Output Summary
  -- ============================================
  RAISE NOTICE 'Seed data created successfully!';
  RAISE NOTICE 'Tenant 1 ID: %', tenant1_id;
  RAISE NOTICE 'Tenant 2 ID: %', tenant2_id;
  RAISE NOTICE 'Admin User ID: %', user1_id;
  RAISE NOTICE 'Project 1 ID: %', project1_id;
  RAISE NOTICE 'Created 2 tenants, 5 users, 3 projects, 10 tasks';

END $$;