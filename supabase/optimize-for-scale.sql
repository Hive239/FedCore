-- ============================================
-- OPTIMIZATION FOR 10,000+ USERS
-- ============================================
-- Run this after your initial setup to optimize for scale

-- ============================================
-- PART 1: ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================

-- User lookup optimization
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_company ON public.profiles(company);

-- Tenant slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);

-- User-tenant relationship optimization
CREATE INDEX IF NOT EXISTS idx_user_tenants_role ON public.user_tenants(role);
CREATE INDEX IF NOT EXISTS idx_user_tenants_is_default ON public.user_tenants(is_default);

-- Project performance indexes
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_dates ON public.projects(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_projects_completion ON public.projects(completion_percentage);

-- Task performance indexes  
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_position ON public.tasks(position);

-- Document search optimization
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON public.documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_mime_type ON public.documents(mime_type);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON public.documents USING GIN(tags);

-- Message performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- Conversation optimization
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON public.conversations USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);

-- Activity log performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);

-- Notification performance
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================
-- PART 2: PARTITIONING FOR LARGE TABLES
-- ============================================

-- Partition activity_logs by month (for high-volume logging)
-- This is commented out by default - enable when you reach high volume
/*
-- Create partitioned table
CREATE TABLE public.activity_logs_partitioned (
  LIKE public.activity_logs INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create partitions for next 12 months
DO $$
DECLARE
  start_date date;
  end_date date;
  partition_name text;
BEGIN
  FOR i IN 0..11 LOOP
    start_date := date_trunc('month', CURRENT_DATE + (i || ' months')::interval);
    end_date := date_trunc('month', CURRENT_DATE + ((i+1) || ' months')::interval);
    partition_name := 'activity_logs_' || to_char(start_date, 'YYYY_MM');
    
    EXECUTE format('CREATE TABLE public.%I PARTITION OF public.activity_logs_partitioned
                    FOR VALUES FROM (%L) TO (%L)',
                    partition_name, start_date, end_date);
  END LOOP;
END $$;
*/

-- ============================================
-- PART 3: CONNECTION POOLING SETTINGS
-- ============================================

-- These settings help handle concurrent connections
-- Apply these in Supabase Dashboard > Settings > Database

-- Recommended settings for 10,000 users:
-- max_connections = 200
-- pgbouncer pool_mode = transaction
-- pgbouncer default_pool_size = 25
-- pgbouncer max_client_conn = 500

-- ============================================
-- PART 4: QUERY OPTIMIZATION VIEWS
-- ============================================

-- Materialized view for dashboard stats (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.dashboard_stats AS
SELECT 
  t.id as tenant_id,
  COUNT(DISTINCT p.id) as total_projects,
  COUNT(DISTINCT CASE WHEN p.status = 'on-track' THEN p.id END) as projects_on_track,
  COUNT(DISTINCT CASE WHEN p.status = 'delayed' THEN p.id END) as projects_delayed,
  COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as projects_completed,
  COUNT(DISTINCT tk.id) as total_tasks,
  COUNT(DISTINCT CASE WHEN tk.status = 'completed' THEN tk.id END) as tasks_completed,
  COUNT(DISTINCT v.id) as total_vendors,
  COUNT(DISTINCT d.id) as total_documents,
  SUM(p.budget) as total_budget,
  SUM(p.spent) as total_spent
FROM public.tenants t
LEFT JOIN public.projects p ON t.id = p.tenant_id
LEFT JOIN public.tasks tk ON t.id = tk.tenant_id
LEFT JOIN public.vendors v ON t.id = v.tenant_id
LEFT JOIN public.documents d ON t.id = d.tenant_id
GROUP BY t.id;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_dashboard_stats_tenant ON public.dashboard_stats(tenant_id);

-- Grant permissions
GRANT SELECT ON public.dashboard_stats TO authenticated;

-- Function to refresh dashboard stats
CREATE OR REPLACE FUNCTION public.refresh_dashboard_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 5: PERFORMANCE MONITORING
-- ============================================

-- Create table for monitoring slow queries
CREATE TABLE IF NOT EXISTS public.performance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query_text TEXT,
  execution_time INTERVAL,
  calls BIGINT,
  mean_time INTERVAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to log slow queries (> 1 second)
CREATE OR REPLACE FUNCTION public.log_slow_queries()
RETURNS void AS $$
BEGIN
  INSERT INTO public.performance_logs (query_text, execution_time, calls, mean_time)
  SELECT 
    query,
    total_exec_time * INTERVAL '1 millisecond',
    calls,
    mean_exec_time * INTERVAL '1 millisecond'
  FROM pg_stat_statements
  WHERE mean_exec_time > 1000  -- queries taking more than 1 second
  ORDER BY mean_exec_time DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 6: CLEANUP AND MAINTENANCE
-- ============================================

-- Function to clean old activity logs (keep last 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.activity_logs 
  WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
  
  DELETE FROM public.notifications
  WHERE is_read = true AND created_at < CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to vacuum and analyze tables
CREATE OR REPLACE FUNCTION public.optimize_tables()
RETURNS void AS $$
BEGIN
  VACUUM ANALYZE public.projects;
  VACUUM ANALYZE public.tasks;
  VACUUM ANALYZE public.documents;
  VACUUM ANALYZE public.messages;
  VACUUM ANALYZE public.activity_logs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 7: RATE LIMITING
-- ============================================

-- Table for API rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  requests INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_lookup ON public.rate_limits(user_id, endpoint, window_start);

-- Function to check rate limit (100 requests per minute)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_limit INTEGER DEFAULT 100
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count requests in the last minute
  SELECT COUNT(*) INTO v_count
  FROM public.rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start > NOW() - INTERVAL '1 minute';
  
  IF v_count >= p_limit THEN
    RETURN FALSE; -- Rate limit exceeded
  END IF;
  
  -- Log this request
  INSERT INTO public.rate_limits (user_id, endpoint)
  VALUES (p_user_id, p_endpoint);
  
  -- Clean old entries
  DELETE FROM public.rate_limits
  WHERE window_start < NOW() - INTERVAL '5 minutes';
  
  RETURN TRUE; -- Request allowed
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 8: SCHEDULED JOBS (via pg_cron or external)
-- ============================================

-- These should be scheduled to run periodically:
-- 1. REFRESH MATERIALIZED VIEW dashboard_stats; -- Every 5 minutes
-- 2. SELECT public.cleanup_old_logs(); -- Daily at 2 AM
-- 3. SELECT public.optimize_tables(); -- Weekly on Sunday at 3 AM

-- ============================================
-- MONITORING QUERIES (for reference - run separately)
-- ============================================

-- These are example queries to monitor your database
-- Run them separately in SQL editor when needed

/*
-- Check database size
SELECT 
  pg_database_size(current_database()) / 1024 / 1024 as size_mb,
  pg_size_pretty(pg_database_size(current_database())) as size_pretty;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Active connections
SELECT 
  COUNT(*) as total_connections,
  COUNT(*) FILTER (WHERE state = 'active') as active_connections,
  COUNT(*) FILTER (WHERE state = 'idle') as idle_connections
FROM pg_stat_activity;
*/

-- ============================================
-- BACKUP STRATEGY RECOMMENDATION
-- ============================================
-- 1. Enable Point-in-Time Recovery (PITR) in Supabase
-- 2. Set up daily backups with 30-day retention
-- 3. Test restore procedures monthly
-- 4. Monitor backup sizes and adjust retention as needed

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Optimization setup complete! Your database is ready for 10,000+ users.';
  RAISE NOTICE 'Remember to:';
  RAISE NOTICE '1. Set up scheduled jobs for maintenance';
  RAISE NOTICE '2. Monitor performance regularly';
  RAISE NOTICE '3. Adjust connection pool settings in Supabase dashboard';
  RAISE NOTICE '4. Enable PITR backups';
END $$;