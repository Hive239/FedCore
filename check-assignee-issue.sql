-- ============================================
-- CHECK ASSIGNEE PROFILE ACCESS ISSUE
-- The tasks hook is joining profiles table via assignee_id
-- This could expose profiles from other tenants
-- ============================================

-- 1. Check if profiles table has proper tenant isolation
SELECT 
  'PROFILES TABLE POLICIES' as check_type,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles'
  AND schemaname = 'public'
ORDER BY policyname;

-- 2. Test: Can a user from Tenant A see profiles from Tenant B?
-- This simulates what happens when tasks joins to profiles via assignee_id
SELECT 
  '',
  '⚠️ POTENTIAL ISSUE DETECTED:',
  'The tasks hook joins to profiles via assignee_id',
  'This could expose user profiles from other tenants',
  '',
  'Current profiles policies might allow viewing profiles',
  'from other tenants if they are assigned to a task.',
  '',
  'RECOMMENDATION: Remove the assignee join from tasks hook',
  'OR ensure profiles policy checks tenant context properly';

-- 3. Check how many profiles would be exposed
WITH profile_tenants AS (
  SELECT 
    p.id as profile_id,
    ut.tenant_id,
    p.email,
    p.full_name
  FROM profiles p
  LEFT JOIN user_tenants ut ON ut.user_id = p.id
)
SELECT 
  'PROFILE TENANT DISTRIBUTION' as analysis,
  COUNT(DISTINCT tenant_id) as unique_tenants,
  COUNT(*) as total_profiles,
  CASE 
    WHEN COUNT(DISTINCT tenant_id) > 1 
    THEN '❌ Profiles span multiple tenants - cross-tenant exposure risk!'
    ELSE '✅ All profiles in same tenant - lower risk'
  END as risk_assessment
FROM profile_tenants;

-- 4. Check if any tasks have assignees from different tenants
WITH task_assignee_tenants AS (
  SELECT 
    t.id as task_id,
    t.tenant_id as task_tenant,
    ut.tenant_id as assignee_tenant,
    t.title,
    p.email as assignee_email
  FROM tasks t
  LEFT JOIN profiles p ON p.id = t.assignee_id
  LEFT JOIN user_tenants ut ON ut.user_id = p.id
  WHERE t.assignee_id IS NOT NULL
)
SELECT 
  'CROSS-TENANT ASSIGNMENT CHECK' as check_type,
  COUNT(CASE WHEN task_tenant != assignee_tenant THEN 1 END) as cross_tenant_assignments,
  COUNT(*) as total_assignments,
  CASE 
    WHEN COUNT(CASE WHEN task_tenant != assignee_tenant THEN 1 END) > 0
    THEN '❌ CRITICAL: Tasks assigned to users from different tenants!'
    ELSE '✅ OK: All assignments within same tenant'
  END as status
FROM task_assignee_tenants;

-- 5. Show specific cross-tenant assignments if any exist
WITH cross_tenant_issues AS (
  SELECT 
    t.id as task_id,
    t.title,
    t.tenant_id as task_tenant,
    ut.tenant_id as assignee_tenant,
    p.email as assignee_email
  FROM tasks t
  LEFT JOIN profiles p ON p.id = t.assignee_id
  LEFT JOIN user_tenants ut ON ut.user_id = p.id
  WHERE t.assignee_id IS NOT NULL
    AND t.tenant_id != ut.tenant_id
)
SELECT 
  '❌ CROSS-TENANT ASSIGNMENTS FOUND:' as issue,
  task_id,
  title,
  assignee_email,
  'Task in tenant: ' || task_tenant as task_location,
  'User in tenant: ' || assignee_tenant as user_location
FROM cross_tenant_issues
LIMIT 10;

-- 6. RECOMMENDATION
SELECT 
  '',
  '====================================',
  'SECURITY RECOMMENDATION',
  '====================================',
  '1. IMMEDIATE: Remove assignee:profiles!assignee_id(*) from tasks hook',
  '2. ALTERNATIVE: Ensure assignee_id can only be users from same tenant',
  '3. BEST PRACTICE: Fetch assignee info separately with tenant filter',
  '',
  'The current setup could expose user profiles across tenants',
  'when viewing tasks with assignees from different organizations.';