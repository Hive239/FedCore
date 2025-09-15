# FedCore Database Migration Order

This document outlines the proper order for applying database schemas after running `complete-production-setup-fixed.sql`.

## Prerequisites

1. **First**, run your base schema:
   ```sql
   -- Run in Supabase SQL Editor
   supabase/complete-production-setup-fixed.sql
   ```

## Themed Schema Migration Order

Apply these schemas in the **exact order** listed below. Each schema builds upon the previous ones and may have dependencies.

### 0. Schema Utilities (Optional but Recommended)
**File:** `00-schema-utilities.sql`
- Helper functions for safe schema operations
- Prevents duplicate policy/index errors
- Includes schema verification functions

### 1. Enterprise & Scaling Features
**File:** `04-enterprise-scaling.sql`
- Adds resource usage tracking
- Enhances tenants table with quotas and enterprise features
- Connection pooling and performance optimizations
- Required for multi-tenant scaling

### 2. Performance Monitoring
**File:** `03-performance-monitoring.sql`
- System health and performance tracking
- Error logging and analytics
- User session monitoring
- Prerequisite for other monitoring features

### 3. Security & Compliance
**File:** `06-security-compliance.sql`
- Advanced security event tracking
- Compliance and audit systems
- GDPR and data protection features
- Must be applied before user-facing features

### 4. ML/AI System
**File:** `01-ml-ai-system.sql`
- Machine learning models and predictions
- AI-powered insights and recommendations
- Training pipelines and feedback systems
- Core for Nexus intelligence features

### 5. Nexus Analytics
**File:** `02-nexus-analytics.sql`
- Weather data and schedule conflicts
- Construction intelligence features
- Learned principles and recommendations
- **Depends on:** ML/AI System

### 6. Messaging & Communication
**File:** `07-messaging-communication.sql`
- Enhanced messaging system
- Email integration and templates
- Notification management
- User communication features

### 7. Architecture & Code Quality
**File:** `08-architecture-quality.sql`
- Code analysis and quality metrics
- Architecture monitoring
- Refactoring suggestions
- Development workflow enhancements

### 8. Reporting & Analytics
**File:** `09-reporting-analytics.sql`
- Advanced reporting capabilities
- Custom dashboards and KPIs
- Data exports and business intelligence
- **Depends on:** Performance monitoring for BI cache

### 9. Billing & Subscriptions
**File:** `05-billing-subscriptions.sql`
- Complete billing system
- Subscription management
- Usage tracking and invoicing
- **Depends on:** Enterprise scaling features

### 10. System Administration
**File:** `10-system-administration.sql`
- Calendar events with work locations
- System maintenance and monitoring
- Asset and license management
- Final administrative features

### 11. Critical Missing Tables
**File:** `11-critical-missing-tables.sql`
- Essential business tables (contacts, calendar_events, task_dependencies)
- File uploads and project locations
- Time tracking and resource allocations
- User sessions and activity logs
- **CRITICAL**: Required for core application functionality

### 12. Performance Indexes
**File:** `12-performance-indexes.sql`
- High-performance indexes for all critical query paths
- Full-text search indexes for projects, tasks, vendors
- Composite indexes for multi-tenant operations
- Statistics optimization and maintenance functions
- **CRITICAL**: Required for acceptable performance

### 13. Enhanced Messaging System
**File:** `13-enhanced-messaging-system.sql`
- Complete internal messaging system
- Message threads and direct conversations
- System announcements and notifications
- Message search and draft functionality

### 14. Tenant Management Enhancements
**File:** `14-tenant-management-enhancements.sql`
- Advanced tenant features and limits
- API key management and webhooks
- Custom domains and branding
- Usage analytics and audit configuration

### 15. Database Validation & Monitoring
**File:** `15-database-validation-monitoring.sql`
- Comprehensive validation functions
- Performance monitoring utilities
- Data integrity checks and maintenance
- **RECOMMENDED**: Run after all schemas for validation

## Quick Migration Commands

```bash
# Navigate to themed schemas directory
cd database/themed-schemas/

# Apply in order (copy and paste each file content into Supabase SQL Editor)
# Or use psql if you have direct database access:

# Core schemas (original themed schemas)
psql -h your-host -d your-db -f 04-enterprise-scaling.sql
psql -h your-host -d your-db -f 03-performance-monitoring.sql
psql -h your-host -d your-db -f 06-security-compliance.sql
psql -h your-host -d your-db -f 01-ml-ai-system.sql
psql -h your-host -d your-db -f 02-nexus-analytics.sql
psql -h your-host -d your-db -f 07-messaging-communication.sql
psql -h your-host -d your-db -f 08-architecture-quality.sql
psql -h your-host -d your-db -f 09-reporting-analytics.sql
psql -h your-host -d your-db -f 05-billing-subscriptions.sql
psql -h your-host -d your-db -f 10-system-administration.sql

# Critical missing functionality (apply these for full functionality)
psql -h your-host -d your-db -f 11-critical-missing-tables.sql
psql -h your-host -d your-db -f 12-performance-indexes.sql
psql -h your-host -d your-db -f 13-enhanced-messaging-system.sql
psql -h your-host -d your-db -f 14-tenant-management-enhancements.sql
psql -h your-host -d your-db -f 15-database-validation-monitoring.sql
```

## Schema Summary

| Schema | Tables Added | Key Features |
|--------|--------------|--------------|
| Enterprise Scaling | 10+ | Resource quotas, connection pooling, multi-region |
| Performance Monitoring | 12+ | Error tracking, metrics, user analytics |
| Security & Compliance | 15+ | Security events, GDPR, audit logs |
| ML/AI System | 18+ | ML models, predictions, AI insights |
| Nexus Analytics | 9+ | Weather data, conflict detection, recommendations |
| Messaging & Communication | 14+ | Email integration, conversations, notifications |
| Architecture & Quality | 11+ | Code analysis, metrics, refactoring |
| Reporting & Analytics | 12+ | Dashboards, KPIs, business intelligence |
| Billing & Subscriptions | 12+ | Complete billing system, subscriptions |
| System Administration | 11+ | Calendar, maintenance, asset management |

## Dependency Graph

```
Base Schema (complete-production-setup-fixed.sql)
├── Enterprise Scaling (required by Billing)
├── Performance Monitoring (required by Reporting)
├── Security & Compliance (foundational)
├── ML/AI System (required by Nexus)
│   └── Nexus Analytics
├── Messaging & Communication
├── Architecture & Quality
├── Reporting & Analytics
│   └── Billing & Subscriptions
└── System Administration
```

## Post-Migration Verification

After applying all schemas, verify the installation:

```sql
-- Check table counts by schema theme
SELECT 
  schemaname,
  COUNT(*) as table_count
FROM pg_tables 
WHERE schemaname = 'public'
GROUP BY schemaname;

-- Verify RLS policies are enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true;

-- Check for any missing foreign key constraints
SELECT 
  conname,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint 
WHERE contype = 'f'
ORDER BY table_name;
```

## Rollback Strategy

If you need to rollback any schema:

```sql
-- Get list of tables added by each schema
-- Then drop in reverse dependency order
-- Example for ML/AI System:
DROP TABLE IF EXISTS nexus_feedback CASCADE;
DROP TABLE IF EXISTS nexus_ai_insights CASCADE;
-- ... (continue in reverse creation order)
```

## Notes

- All tables include proper RLS (Row Level Security) policies
- Indexes are optimized for tenant-based queries
- Foreign key constraints maintain referential integrity
- Each schema is designed to be atomic and reversible
- Consider your specific needs - not all schemas may be required

## Support

If you encounter issues during migration:
1. Check the error message for missing dependencies
2. Verify the base schema was applied correctly
3. Ensure proper order was followed
4. Check for conflicting table names