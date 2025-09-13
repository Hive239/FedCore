# Performance Monitoring Setup

## Database Setup Required

To enable performance monitoring with real data (no localStorage, no mock data), you need to run the SQL migration.

### Step 1: Run the Migration

Execute the following SQL file in your Supabase SQL Editor:

```bash
supabase/performance-monitoring-schema.sql
```

This will create the following tables:
- `error_logs` - Stores JavaScript and API errors
- `performance_metrics` - Stores Core Web Vitals and performance data
- `user_sessions` - Tracks user session data
- `api_performance` - Monitors API endpoint performance
- `performance_alerts` - Stores performance threshold alerts
- `performance_events` - Custom performance events

### Step 2: Verify Tables Created

Run this query to verify all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'error_logs', 
  'performance_metrics', 
  'user_sessions', 
  'api_performance',
  'performance_alerts',
  'performance_events'
);
```

### Step 3: Verify RPC Functions

Check that the RPC functions are available:

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('log_error', 'record_performance_metrics');
```

## How It Works

### Error Logging Flow
1. JavaScript errors are automatically caught by global error handlers
2. Errors are sent to Supabase via the `log_error` RPC function
3. Errors appear in the Performance page under "Error Logs" tab

### Performance Metrics Flow
1. Core Web Vitals are collected automatically
2. Metrics are sent via `record_performance_metrics` RPC function
3. Data appears in real-time on the Performance dashboard

## Testing

1. Navigate to `/performance`
2. Go to the "Error Logs" tab
3. Use the Error Testing Panel to trigger test errors
4. Click "Refresh" to see errors from the database
5. All data is now stored in PostgreSQL - no localStorage!

## Database Schema

### error_logs table
- Stores all JavaScript, API, and system errors
- Tracks frequency, severity, and resolution status
- Links to user and tenant for multi-tenancy

### performance_metrics table
- Records Core Web Vitals (FCP, LCP, CLS, FID)
- Stores page load times and DOM metrics
- Captures memory, network, and device info

### RPC Functions
- `log_error()` - Logs errors with automatic tenant resolution
- `record_performance_metrics()` - Records performance data

## Important Notes

- **NO localStorage** is used - all data is in PostgreSQL
- **NO mock data** - all metrics are real browser measurements
- Automatic tenant isolation via Row Level Security
- Real-time updates when new data is logged

## Troubleshooting

If errors aren't appearing:
1. Check browser console for any Supabase errors
2. Verify your user has a tenant assigned
3. Ensure RLS policies allow your user to insert/select
4. Check that the RPC functions have EXECUTE permissions

If you see "Error logs table not found":
1. Run the migration SQL file
2. Refresh the Performance page
3. Trigger new errors using the test panel