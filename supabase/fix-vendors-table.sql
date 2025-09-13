-- Fix vendors table to support contact types
-- This migration adds the contact_type column if it doesn't exist

-- Add contact_type column to vendors table if it doesn't exist
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS contact_type TEXT DEFAULT 'vendor';

-- Add constraint for valid contact types
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

-- Add company_name column if it doesn't exist
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Ensure status column exists
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Update RLS policies to allow users to manage vendors
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can create vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can update their vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can delete their vendors" ON public.vendors;

-- Enable RLS if not already enabled
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Create new, more permissive policies
CREATE POLICY "Users can view all vendors" ON public.vendors
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create vendors" ON public.vendors
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update vendors they created" ON public.vendors
  FOR UPDATE USING (
    created_by = auth.uid() OR 
    auth.uid() IN (
      SELECT user_id FROM public.user_tenants 
      WHERE role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Users can delete vendors they created" ON public.vendors
  FOR DELETE USING (
    created_by = auth.uid() OR 
    auth.uid() IN (
      SELECT user_id FROM public.user_tenants 
      WHERE role IN ('admin', 'owner')
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_vendors_contact_type ON public.vendors(contact_type);
CREATE INDEX IF NOT EXISTS idx_vendors_created_by ON public.vendors(created_by);

-- Sample data for testing (optional - comment out if not needed)
-- INSERT INTO public.vendors (name, contact_type, contact_email, contact_phone, company_name, status)
-- VALUES 
--   ('John Smith', 'contractor', 'john@example.com', '555-0100', 'Smith Construction', 'active'),
--   ('Sarah Johnson', 'design_professional', 'sarah@example.com', '555-0101', 'Johnson Architects', 'active'),
--   ('Mike Wilson', 'vendor', 'mike@example.com', '555-0102', 'Wilson Supplies', 'active')
-- ON CONFLICT DO NOTHING;