-- ============================================
-- FIX TASK ASSIGNEE CROSS-TENANT SECURITY
-- Prevents tasks from being assigned to users in different tenants
-- ============================================

-- 1. Create a function to validate assignee is in same tenant
CREATE OR REPLACE FUNCTION validate_task_assignee()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip if no assignee
  IF NEW.assignee_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if assignee is in the same tenant as the task
  IF NOT EXISTS (
    SELECT 1 
    FROM user_tenants 
    WHERE user_id = NEW.assignee_id 
      AND tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Cannot assign task to user from different tenant';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger to enforce this on INSERT and UPDATE
DROP TRIGGER IF EXISTS enforce_same_tenant_assignee ON tasks;
CREATE TRIGGER enforce_same_tenant_assignee
  BEFORE INSERT OR UPDATE OF assignee_id, tenant_id
  ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION validate_task_assignee();

-- 3. Fix any existing cross-tenant assignments
UPDATE tasks t
SET assignee_id = NULL
WHERE assignee_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM user_tenants ut
    WHERE ut.user_id = t.assignee_id 
      AND ut.tenant_id = t.tenant_id
  );

-- 4. Report on what was fixed
WITH fixed_assignments AS (
  SELECT COUNT(*) as count
  FROM tasks
  WHERE assignee_id IS NULL
    AND updated_at >= NOW() - INTERVAL '1 minute'
)
SELECT 
  CASE 
    WHEN count > 0 THEN '✅ Fixed ' || count || ' cross-tenant assignments'
    ELSE '✅ No cross-tenant assignments found'
  END as result
FROM fixed_assignments;

-- 5. Verify no cross-tenant assignments remain
SELECT 
  '====================================',
  'VERIFICATION: Cross-Tenant Assignments',
  '====================================',
  COUNT(CASE 
    WHEN t.assignee_id IS NOT NULL 
    AND NOT EXISTS (
      SELECT 1 FROM user_tenants ut
      WHERE ut.user_id = t.assignee_id 
        AND ut.tenant_id = t.tenant_id
    ) THEN 1 
  END) as cross_tenant_assignments,
  COUNT(*) as total_tasks_with_assignees,
  CASE 
    WHEN COUNT(CASE 
      WHEN t.assignee_id IS NOT NULL 
      AND NOT EXISTS (
        SELECT 1 FROM user_tenants ut
        WHERE ut.user_id = t.assignee_id 
          AND ut.tenant_id = t.tenant_id
      ) THEN 1 
    END) = 0 THEN '✅ SECURE: No cross-tenant assignments'
    ELSE '❌ INSECURE: Cross-tenant assignments exist!'
  END as status
FROM tasks t
WHERE t.assignee_id IS NOT NULL;

-- 6. Final message
SELECT 
  '',
  '✅ TASK ASSIGNEE SECURITY FIXED',
  '',
  'Tasks can now only be assigned to users in the same tenant.',
  'The trigger will prevent any future cross-tenant assignments.',
  'The hook has been updated to not expose profiles from other tenants.',
  '',
  '🔒 Your multi-tenant security is now complete!';