-- ============================================
-- COMPLETE VERIFICATION QUERY
-- Run this to verify all tables and features are properly set up
-- ============================================

-- 1. Check all assignment and notification tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name LIKE '%team_member%' THEN '👥 Team Assignment'
    WHEN table_name LIKE '%vendor%' THEN '🏢 Vendor Assignment'
    WHEN table_name LIKE '%event%' THEN '📅 Calendar/Events'
    WHEN table_name LIKE '%update_log%' THEN '📝 Update Logs'
    WHEN table_name LIKE '%notification%' THEN '🔔 Notifications'
    ELSE '📦 Other'
  END as category,
  CASE 
    WHEN table_name IN (
      'project_team_members', 'project_vendors',
      'task_team_members', 'task_vendors',
      'schedule_events', 'event_team_attendees', 'event_vendor_attendees',
      'update_logs', 'update_log_team_mentions', 'update_log_vendor_mentions',
      'notifications', 'notification_templates'
    ) THEN '✅ Required'
    ELSE '📌 Supporting'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
  table_name LIKE '%team_member%' OR
  table_name LIKE '%vendor%' OR
  table_name LIKE '%event%' OR
  table_name LIKE '%update_log%' OR
  table_name LIKE '%notification%'
)
ORDER BY category, table_name;

-- 2. Verify notification columns were added to existing tables
SELECT 
  '✅ Profiles Table' as table_check,
  column_name,
  data_type,
  CASE 
    WHEN column_name IN ('mobile_phone', 'notification_preferences', 'is_active') 
    THEN '✅ Added for notifications'
    ELSE '📌 Existing column'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name IN ('mobile_phone', 'notification_preferences', 'is_active', 'email', 'full_name')
UNION ALL
SELECT 
  '✅ Vendors Table' as table_check,
  column_name,
  data_type,
  CASE 
    WHEN column_name IN ('notification_email', 'notification_phone', 'notification_preferences', 'vendor_type') 
    THEN '✅ Added for notifications'
    ELSE '📌 Existing column'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'vendors'
AND column_name IN ('notification_email', 'notification_phone', 'notification_preferences', 'vendor_type', 'name', 'contact_email')
ORDER BY table_check, column_name;

-- 3. Check indexes were created
SELECT 
  schemaname,
  tablename,
  indexname,
  CASE 
    WHEN indexname LIKE 'idx_%' THEN '✅ Custom Index'
    ELSE '📌 System Index'
  END as index_type
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
  'project_team_members', 'project_vendors',
  'task_team_members', 'task_vendors',
  'schedule_events', 'event_team_attendees', 'event_vendor_attendees',
  'update_logs', 'update_log_team_mentions', 'update_log_vendor_mentions',
  'notifications'
)
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 4. Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'project_team_members', 'project_vendors',
  'task_team_members', 'task_vendors',
  'schedule_events', 'event_team_attendees', 'event_vendor_attendees',
  'update_logs', 'update_log_team_mentions', 'update_log_vendor_mentions',
  'notifications'
)
ORDER BY tablename;

-- 5. Check RLS policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN permissive = 'PERMISSIVE' THEN '✅ Permissive'
    ELSE '⚠️ Restrictive'
  END as policy_type,
  cmd as applies_to
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'project_team_members', 'project_vendors',
  'task_team_members', 'task_vendors',
  'schedule_events', 'event_team_attendees', 'event_vendor_attendees',
  'update_logs', 'update_log_team_mentions', 'update_log_vendor_mentions',
  'notifications'
)
ORDER BY tablename, policyname;

-- 6. Summary Report
WITH table_counts AS (
  SELECT 
    COUNT(*) FILTER (WHERE table_name IN ('project_team_members', 'project_vendors')) as project_tables,
    COUNT(*) FILTER (WHERE table_name IN ('task_team_members', 'task_vendors')) as task_tables,
    COUNT(*) FILTER (WHERE table_name IN ('schedule_events', 'event_team_attendees', 'event_vendor_attendees')) as event_tables,
    COUNT(*) FILTER (WHERE table_name IN ('update_logs', 'update_log_team_mentions', 'update_log_vendor_mentions')) as update_tables,
    COUNT(*) FILTER (WHERE table_name IN ('notifications', 'notification_templates')) as notification_tables,
    COUNT(*) as total_feature_tables
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN (
    'project_team_members', 'project_vendors',
    'task_team_members', 'task_vendors',
    'schedule_events', 'event_team_attendees', 'event_vendor_attendees',
    'update_logs', 'update_log_team_mentions', 'update_log_vendor_mentions',
    'notifications', 'notification_templates'
  )
)
SELECT 
  '🎯 FEATURE VERIFICATION SUMMARY' as report_title,
  CASE WHEN project_tables = 2 THEN '✅' ELSE '❌' END || ' Project Assignments (' || project_tables || '/2)' as projects,
  CASE WHEN task_tables = 2 THEN '✅' ELSE '❌' END || ' Task Assignments (' || task_tables || '/2)' as tasks,
  CASE WHEN event_tables = 3 THEN '✅' ELSE '❌' END || ' Calendar/Events (' || event_tables || '/3)' as events,
  CASE WHEN update_tables = 3 THEN '✅' ELSE '❌' END || ' Update Logs (' || update_tables || '/3)' as updates,
  CASE WHEN notification_tables = 2 THEN '✅' ELSE '❌' END || ' Notifications (' || notification_tables || '/2)' as notifications,
  CASE WHEN total_feature_tables = 12 THEN '✅ ALL FEATURES READY!' ELSE '⚠️ Missing ' || (12 - total_feature_tables) || ' tables' END as overall_status
FROM table_counts;

-- 7. Test Query - Get all potential recipients for notifications
SELECT 
  'NOTIFICATION RECIPIENTS TEST' as test_name,
  'Team Members' as recipient_type,
  COUNT(*) as count
FROM public.profiles
WHERE is_active = true
UNION ALL
SELECT 
  'NOTIFICATION RECIPIENTS TEST' as test_name,
  'Active Vendors' as recipient_type,
  COUNT(*) as count
FROM public.vendors
WHERE status = 'active';

-- 8. Check if helper function exists
SELECT 
  'Helper Functions' as category,
  proname as function_name,
  CASE 
    WHEN proname = 'get_project_recipients' THEN '✅ Project recipients function exists'
    ELSE '📌 ' || proname
  END as status
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('get_project_recipients', 'create_notification')
ORDER BY proname;