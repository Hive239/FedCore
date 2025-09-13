-- Add customer_id to projects table to link directly to customer contacts
-- This allows projects to be associated with customers from the vendors table

-- Add customer_id column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON public.projects(customer_id);

-- Add a comment explaining the relationship
COMMENT ON COLUMN public.projects.customer_id IS 'Links to a customer contact in the vendors table (contact_type = customer)';

-- Verify the change
SELECT 
  'Customer ID column added to projects table' as status,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'projects'
  AND column_name = 'customer_id';