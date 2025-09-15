-- ============================================
-- FINAL DEPLOYMENT GUIDE - ZERO-ERROR EXECUTION
-- Apply schemas in this exact order for guaranteed success
-- ============================================

-- Step 1: REQUIRED - Apply compatibility fixes first
-- Copy and run this in Supabase SQL Editor:
\i SCHEMA_COMPATIBILITY_FIX.sql

-- Step 2: CRITICAL - Apply essential missing business tables
-- These are required for core app functionality:
\i 11-critical-missing-tables.sql

-- Step 3: CRITICAL - Apply performance indexes  
-- These are required for acceptable query performance:
\i 12-performance-indexes.sql

-- Step 4: Validate critical deployment
-- Run this to ensure core functionality works:
SELECT * FROM check_themed_schema_prerequisites();

-- Step 5: OPTIONAL - Apply enhanced features (in order)
-- Add these based on your feature priorities:

-- Enhanced messaging system (recommended)
\i 13-enhanced-messaging-system.sql

-- Advanced tenant management (recommended)  
\i 14-tenant-management-enhancements.sql

-- Database monitoring (recommended)
\i 15-database-validation-monitoring.sql

-- Advanced AI/ML features (optional)
\i 01-ml-ai-system.sql

-- Construction analytics (optional)
\i 02-nexus-analytics.sql

-- Performance monitoring (optional)
\i 03-performance-monitoring.sql

-- Enterprise scaling (optional)
\i 04-enterprise-scaling.sql

-- Billing system (optional)
\i 05-billing-subscriptions.sql

-- Security compliance (optional)
\i 06-security-compliance.sql

-- Advanced messaging (optional) 
\i 07-messaging-communication.sql

-- Code quality monitoring (optional)
\i 08-architecture-quality.sql

-- Business intelligence (optional)
\i 09-reporting-analytics.sql

-- System administration (optional)
\i 10-system-administration.sql

-- Final Step: Run complete validation
SELECT * FROM run_complete_database_validation();

-- ============================================
-- TROUBLESHOOTING COMMON ERRORS
-- ============================================

/*
ERROR: column "session_token" does not exist
SOLUTION: This is expected - base schema uses "session_id". 
          Compatibility layer handles this automatically.

ERROR: relation "idx_something" already exists  
SOLUTION: All schemas use IF NOT EXISTS. This is harmless.

ERROR: policy "something" already exists
SOLUTION: All policies wrapped in exception handlers. This is harmless.

ERROR: table "some_table" does not exist
SOLUTION: Apply 11-critical-missing-tables.sql first.
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check which tables were created:
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name NOT LIKE 'pg_%'
ORDER BY table_name;

-- Check performance indexes:
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- Check RLS policies:
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Performance validation:
SELECT * FROM check_index_usage() LIMIT 20;

RAISE NOTICE '🎉 Database deployment guide ready! Apply schemas in the order shown above.';