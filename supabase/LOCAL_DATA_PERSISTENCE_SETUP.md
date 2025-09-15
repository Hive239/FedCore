# Local Data Persistence Setup for FEDCORE

## Overview
This guide will help you set up persistent data storage on your local server so you can test with real data that persists between sessions.

## Step 1: Apply the Enhanced Schema

### 1.1 Run the enhanced team and notifications schema:
Go to your Supabase dashboard (https://uaruyrkcisljnkwjwygn.supabase.co) and run this SQL:

```sql
-- First, run the enhanced schema for team members and notifications
-- Copy and paste the content from: supabase/enhanced-team-notifications-schema.sql
```

### 1.2 Verify the tables were created:
Run this query to check:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('contacts', 'task_team_members', 'schedule_events', 
                   'schedule_event_attendees', 'update_logs', 'notifications')
ORDER BY table_name;
```

## Step 2: Set Up Data Retention

### 2.1 Create Data Backup Tables
```sql
-- Create backup tables for important data
CREATE TABLE IF NOT EXISTS public.data_backups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  data JSONB NOT NULL,
  backup_date TIMESTAMPTZ DEFAULT NOW(),
  environment TEXT DEFAULT 'local'
);

-- Function to backup data
CREATE OR REPLACE FUNCTION backup_table_data(p_table_name TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE format(
    'INSERT INTO public.data_backups (table_name, data) 
     SELECT %L, jsonb_agg(row_to_json(t)) FROM public.%I t',
    p_table_name, p_table_name
  );
END;
$$ LANGUAGE plpgsql;
```

### 2.2 Create Automatic Backup Triggers
```sql
-- Trigger to backup data before truncate/delete operations
CREATE OR REPLACE FUNCTION prevent_data_loss()
RETURNS event_trigger AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() 
  WHERE command_tag IN ('DROP TABLE', 'TRUNCATE')
  LOOP
    RAISE EXCEPTION 'Direct table drops/truncates are disabled. Use soft deletes instead.';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create event trigger (requires superuser, may not work on Supabase)
-- CREATE EVENT TRIGGER prevent_data_loss_trigger 
-- ON ddl_command_end 
-- EXECUTE FUNCTION prevent_data_loss();
```

## Step 3: Local Development Data Storage

### 3.1 Set up local environment variables
Create or update your `.env.local` file:

```bash
# Local Development Database (for persistent testing)
NEXT_PUBLIC_SUPABASE_URL=https://uaruyrkcisljnkwjwygn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Environment flag
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_PRESERVE_DATA=true
```

### 3.2 Create Test Data Seeds
Run this SQL to create test data that will persist:

```sql
-- Create test tenant if not exists
INSERT INTO public.tenants (id, name, slug)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'Test Company',
  'test-company'
) ON CONFLICT (id) DO NOTHING;

-- Create test contacts
INSERT INTO public.contacts (tenant_id, first_name, last_name, email, phone, company, title)
VALUES 
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'John', 'Smith', 'john.smith@example.com', '555-0001', 'ABC Construction', 'Project Manager'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Jane', 'Doe', 'jane.doe@example.com', '555-0002', 'XYZ Architects', 'Lead Architect'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Mike', 'Johnson', 'mike.j@example.com', '555-0003', 'Electric Co', 'Electrician'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Sarah', 'Williams', 'sarah.w@example.com', '555-0004', 'Plumbing Plus', 'Plumber'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Tom', 'Brown', 'tom.brown@example.com', '555-0005', 'HVAC Services', 'HVAC Specialist')
ON CONFLICT DO NOTHING;

-- Sample schedule events (you'll need to update tenant_id)
INSERT INTO public.schedule_events (tenant_id, title, description, start_time, end_time, event_type, location)
SELECT 
  t.id,
  'Site Inspection',
  'Monthly safety and progress inspection',
  NOW() + INTERVAL '3 days',
  NOW() + INTERVAL '3 days 2 hours',
  'inspection',
  '123 Main St, Construction Site A'
FROM public.tenants t
WHERE t.slug = 'test-company'
LIMIT 1;

INSERT INTO public.schedule_events (tenant_id, title, description, start_time, end_time, event_type, location)
SELECT 
  t.id,
  'Client Meeting',
  'Progress review with client',
  NOW() + INTERVAL '7 days',
  NOW() + INTERVAL '7 days 1 hour',
  'meeting',
  'Conference Room B'
FROM public.tenants t
WHERE t.slug = 'test-company'
LIMIT 1;
```

## Step 4: Data Management Commands

### 4.1 Backup Current Data
```sql
-- Backup all important tables
SELECT backup_table_data('projects');
SELECT backup_table_data('tasks');
SELECT backup_table_data('contacts');
SELECT backup_table_data('schedule_events');
```

### 4.2 Restore Data from Backup
```sql
-- Function to restore data
CREATE OR REPLACE FUNCTION restore_table_data(
  p_table_name TEXT,
  p_backup_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_data JSONB;
BEGIN
  -- Get the latest backup or specific date
  SELECT data INTO v_data
  FROM public.data_backups
  WHERE table_name = p_table_name
  AND (p_backup_date IS NULL OR backup_date = p_backup_date)
  ORDER BY backup_date DESC
  LIMIT 1;
  
  IF v_data IS NOT NULL THEN
    -- Clear existing data
    EXECUTE format('TRUNCATE TABLE public.%I CASCADE', p_table_name);
    
    -- Restore data
    EXECUTE format(
      'INSERT INTO public.%I SELECT * FROM jsonb_populate_recordset(null::public.%I, %L)',
      p_table_name, p_table_name, v_data
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Example: Restore projects table
-- SELECT restore_table_data('projects');
```

## Step 5: Testing Data Persistence

### 5.1 Verify Local Data Persistence
1. Start your local server: `npm run dev`
2. Go to http://localhost:3000
3. Log in with admin@projectpro.com
4. Create a new project or task
5. Refresh the page - data should persist
6. Stop and restart the server - data should still be there

### 5.2 Check Data in Supabase
Go to your Supabase dashboard and run:
```sql
-- Check projects
SELECT id, name, status, created_at FROM public.projects ORDER BY created_at DESC LIMIT 5;

-- Check tasks
SELECT id, title, status, created_at FROM public.tasks ORDER BY created_at DESC LIMIT 5;

-- Check contacts
SELECT id, first_name, last_name, email FROM public.contacts ORDER BY created_at DESC LIMIT 5;
```

## Step 6: Common Issues & Solutions

### Issue: Data not persisting
**Solution:** Check that RLS policies are properly set:
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- If needed, disable RLS temporarily for testing
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
-- Remember to re-enable for production!
```

### Issue: Cannot create data
**Solution:** Ensure user has proper tenant assignment:
```sql
-- Check user's tenant assignment
SELECT * FROM public.user_tenants WHERE user_id = 'YOUR_USER_ID';

-- If missing, add it
INSERT INTO public.user_tenants (user_id, tenant_id, role)
VALUES ('YOUR_USER_ID', 'TENANT_ID', 'admin');
```

### Issue: Notifications table doesn't exist
**Solution:** Run the enhanced schema:
```sql
-- Copy and run the entire content from:
-- supabase/enhanced-team-notifications-schema.sql
```

## Step 7: Development Workflow

### Daily Workflow:
1. **Morning**: Start local server with `npm run dev`
2. **During Development**: All data changes persist in Supabase
3. **Before Major Changes**: Backup data with SQL commands above
4. **End of Day**: Data automatically persists in cloud

### Weekly Maintenance:
1. Run backup of all tables
2. Clean up old test data if needed
3. Review and optimize slow queries

### Data Reset (if needed):
```sql
-- To start fresh (BE CAREFUL!)
-- First backup everything
SELECT backup_table_data('projects');
SELECT backup_table_data('tasks');
SELECT backup_table_data('contacts');

-- Then truncate (this preserves structure)
TRUNCATE TABLE public.tasks CASCADE;
TRUNCATE TABLE public.projects CASCADE;
TRUNCATE TABLE public.contacts CASCADE;

-- Re-seed with test data using the SQL above
```

## Important Notes

1. **Data is LIVE**: Even on localhost, you're using the real Supabase database
2. **Be Careful with Deletes**: All deletes are permanent unless you've backed up
3. **Use Soft Deletes**: Consider adding `deleted_at` columns instead of hard deletes
4. **Regular Backups**: Use the backup functions before major changes
5. **Environment Separation**: Consider creating separate Supabase projects for dev/staging/prod

## Next Steps

1. Apply the enhanced schema (if not done)
2. Create test data using the seeds above
3. Test team member assignment in the UI
4. Set up email notifications (requires email service configuration)
5. Test data persistence across server restarts