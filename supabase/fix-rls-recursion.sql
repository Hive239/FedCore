-- Fix RLS Infinite Recursion Issue
-- The error "infinite recursion detected in policy for relation user_tenants" 
-- is caused by circular references in RLS policies

-- Step 1: Temporarily disable RLS on affected tables to break the cycle
ALTER TABLE public.user_tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies on user_tenants to start fresh
DROP POLICY IF EXISTS "Users can view their own tenant associations" ON public.user_tenants;
DROP POLICY IF EXISTS "Users can manage their tenant associations" ON public.user_tenants;
DROP POLICY IF EXISTS "Users can view user_tenants" ON public.user_tenants;
DROP POLICY IF EXISTS "Users can insert user_tenants" ON public.user_tenants;
DROP POLICY IF EXISTS "Users can update user_tenants" ON public.user_tenants;
DROP POLICY IF EXISTS "Users can delete user_tenants" ON public.user_tenants;

-- Step 3: Drop all existing policies on vendors
DROP POLICY IF EXISTS "Anyone can read vendors" ON public.vendors;
DROP POLICY IF EXISTS "Authenticated users can insert vendors" ON public.vendors;
DROP POLICY IF EXISTS "Authenticated users can update vendors" ON public.vendors;
DROP POLICY IF EXISTS "Authenticated users can delete vendors" ON public.vendors;

-- Step 4: Re-enable RLS with simple, non-recursive policies
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Simple policies for vendors that don't reference user_tenants
CREATE POLICY "Enable read for authenticated users" 
ON public.vendors FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable insert for authenticated users" 
ON public.vendors FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for authenticated users" 
ON public.vendors FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable delete for authenticated users" 
ON public.vendors FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Step 5: Keep user_tenants RLS disabled or use very simple policies
-- Option A: Keep it disabled (simpler, works fine for most cases)
-- ALTER TABLE public.user_tenants DISABLE ROW LEVEL SECURITY;

-- Option B: Enable with simple policy that doesn't reference other tables
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own records" 
ON public.user_tenants FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own records" 
ON public.user_tenants FOR ALL 
USING (auth.uid() = user_id);

-- Verify the fix
SELECT 
  'RLS policies fixed - no more recursion' as status,
  schemaname,
  tablename,
  policyname
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('vendors', 'user_tenants')
ORDER BY tablename, policyname;