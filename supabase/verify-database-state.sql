-- Diagnostic script to verify current database state and identify issues

-- 1. Check if vendors table exists and its structure
SELECT 
  'Vendors Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'vendors'
ORDER BY ordinal_position;

-- 2. Check current RLS policies on vendors
SELECT 
  'Vendors RLS Policies' as check_type,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'vendors';

-- 3. Check if RLS is enabled
SELECT 
  'RLS Status' as check_type,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('vendors', 'user_tenants', 'tenants');

-- 4. Check user_tenants policies (for recursion issues)
SELECT 
  'User_Tenants RLS Policies' as check_type,
  policyname,
  permissive,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'user_tenants';

-- 5. Check constraints on vendors table
SELECT
  'Vendors Constraints' as check_type,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.vendors'::regclass;

-- 6. Check for any foreign key references to tenant_id
SELECT
  'Foreign Key Dependencies' as check_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name = 'vendors';

-- 7. Test if a simple insert would work (dry run - rolled back)
BEGIN;
SELECT 'Insert Test' as check_type, 
       'Testing if insert would succeed' as status;

-- This will be rolled back, just testing
INSERT INTO public.vendors (name, contact_type, status)
VALUES ('Test Contact', 'vendor', 'active')
RETURNING id, name;

ROLLBACK;

-- 8. Check current user and permissions
SELECT 
  'Current User Permissions' as check_type,
  current_user,
  has_table_privilege('public.vendors', 'SELECT') as can_select,
  has_table_privilege('public.vendors', 'INSERT') as can_insert,
  has_table_privilege('public.vendors', 'UPDATE') as can_update,
  has_table_privilege('public.vendors', 'DELETE') as can_delete;