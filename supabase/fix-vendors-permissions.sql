-- Fix Vendors Table Permissions
-- Run this in your Supabase SQL Editor to enable contacts functionality

-- Option 1: Simple fix - Disable RLS (less secure but works immediately)
-- Uncomment the line below to use this option:
-- ALTER TABLE public.vendors DISABLE ROW LEVEL SECURITY;

-- Option 2: Proper RLS setup (recommended for production)
-- This keeps security while allowing authenticated users to manage contacts

-- Enable RLS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can read vendors" ON public.vendors;
DROP POLICY IF EXISTS "Authenticated can manage vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can view all vendors" ON public.vendors;
DROP POLICY IF EXISTS "Authenticated users can create vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can update vendors they created" ON public.vendors;
DROP POLICY IF EXISTS "Users can delete vendors they created" ON public.vendors;
DROP POLICY IF EXISTS "Authenticated users can view all vendors" ON public.vendors;
DROP POLICY IF EXISTS "Authenticated users can insert vendors" ON public.vendors;
DROP POLICY IF EXISTS "Authenticated users can update vendors" ON public.vendors;
DROP POLICY IF EXISTS "Authenticated users can delete vendors" ON public.vendors;

-- Create new simple policies that work
CREATE POLICY "Anyone can read vendors" 
ON public.vendors 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert vendors" 
ON public.vendors 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update vendors" 
ON public.vendors 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete vendors" 
ON public.vendors 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Ensure the contact_type column exists and has the right values
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS contact_type TEXT DEFAULT 'vendor';

-- Add constraint for valid contact types if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'vendors_contact_type_check'
  ) THEN
    ALTER TABLE public.vendors 
    ADD CONSTRAINT vendors_contact_type_check 
    CHECK (contact_type IN ('vendor', 'design_professional', 'contractor', 'customer'));
  END IF;
END $$;

-- Add other columns if they don't exist
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vendors_contact_type ON public.vendors(contact_type);
CREATE INDEX IF NOT EXISTS idx_vendors_created_by ON public.vendors(created_by);
CREATE INDEX IF NOT EXISTS idx_vendors_created_at ON public.vendors(created_at DESC);

-- Verify the setup
SELECT 
  'Vendors table is ready!' as status,
  COUNT(*) as total_contacts,
  COUNT(DISTINCT contact_type) as contact_types
FROM public.vendors;