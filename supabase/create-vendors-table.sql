-- Create vendors table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_type TEXT DEFAULT 'vendor',
  contact_email TEXT,
  contact_phone TEXT,
  company_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraint for contact types
ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS vendors_contact_type_check;
ALTER TABLE public.vendors 
ADD CONSTRAINT vendors_contact_type_check 
CHECK (contact_type IN ('vendor', 'design_professional', 'contractor', 'customer'));

-- Enable RLS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.vendors;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.vendors;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.vendors;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.vendors;
DROP POLICY IF EXISTS "Users can view all vendors" ON public.vendors;
DROP POLICY IF EXISTS "Authenticated users can create vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can update vendors they created" ON public.vendors;
DROP POLICY IF EXISTS "Users can delete vendors they created" ON public.vendors;

-- Create simple, permissive policies for authenticated users
CREATE POLICY "Authenticated users can view all vendors" 
ON public.vendors FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert vendors" 
ON public.vendors FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update vendors" 
ON public.vendors FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete vendors" 
ON public.vendors FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendors_contact_type ON public.vendors(contact_type);
CREATE INDEX IF NOT EXISTS idx_vendors_created_by ON public.vendors(created_by);
CREATE INDEX IF NOT EXISTS idx_vendors_created_at ON public.vendors(created_at DESC);

-- Insert sample data for testing
INSERT INTO public.vendors (name, contact_type, contact_email, contact_phone, company_name, city, state, status)
VALUES 
  ('John Smith', 'contractor', 'john@example.com', '555-0100', 'Smith Construction', 'New York', 'NY', 'active'),
  ('Sarah Johnson', 'design_professional', 'sarah@example.com', '555-0101', 'Johnson Architects', 'Los Angeles', 'CA', 'active'),
  ('Mike Wilson', 'vendor', 'mike@example.com', '555-0102', 'Wilson Supplies', 'Chicago', 'IL', 'active'),
  ('Emily Davis', 'customer', 'emily@example.com', '555-0103', 'Davis Properties', 'Houston', 'TX', 'active')
ON CONFLICT (id) DO NOTHING;