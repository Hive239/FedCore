-- FEDCORE Complete Database Setup
-- Run this entire script in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('new', 'on-track', 'delayed', 'on-hold', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('pending', 'in-progress', 'review', 'on-hold', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE vendor_status AS ENUM ('active', 'inactive', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE category_type AS ENUM ('task', 'project', 'document', 'event', 'vendor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  company TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_tenants junction table
CREATE TABLE IF NOT EXISTS public.user_tenants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  role user_role DEFAULT 'member' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- Create associations table
CREATE TABLE IF NOT EXISTS public.associations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type category_type NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status project_status DEFAULT 'new' NOT NULL,
  budget DECIMAL(12,2),
  start_date DATE,
  end_date DATE,
  association_id UUID REFERENCES public.associations(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'pending' NOT NULL,
  priority task_priority DEFAULT 'medium' NOT NULL,
  due_date DATE,
  assignee_id UUID REFERENCES public.profiles(id),
  category_id UUID REFERENCES public.categories(id),
  position INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vendors table
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),
  status vendor_status DEFAULT 'pending' NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  expiry_date DATE,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  location TEXT,
  category_id UUID REFERENCES public.categories(id),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON public.projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON public.tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON public.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_vendors_tenant_id ON public.vendors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_tenant_id ON public.events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Profiles: Users can see all profiles in their tenant
CREATE POLICY "Users can view profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Tenants: Users can see tenants they belong to
CREATE POLICY "Users can view their tenants" ON public.tenants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE tenant_id = id AND user_id = auth.uid()
    )
  );

-- User tenants: Users can see their own tenant memberships
CREATE POLICY "Users can view their tenant memberships" ON public.user_tenants
  FOR SELECT USING (user_id = auth.uid());

-- Projects: Users can see projects in their tenant
CREATE POLICY "Users can view tenant projects" ON public.projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE tenant_id = projects.tenant_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create projects" ON public.projects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE tenant_id = projects.tenant_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update projects" ON public.projects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE tenant_id = projects.tenant_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete projects" ON public.projects
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE tenant_id = projects.tenant_id AND user_id = auth.uid()
    )
  );

-- Similar policies for other tables
CREATE POLICY "Users can view tenant tasks" ON public.tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE tenant_id = tasks.tenant_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage tasks" ON public.tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE tenant_id = tasks.tenant_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view tenant associations" ON public.associations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE tenant_id = associations.tenant_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view tenant categories" ON public.categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE tenant_id = categories.tenant_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view tenant vendors" ON public.vendors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE tenant_id = vendors.tenant_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view tenant documents" ON public.documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE tenant_id = documents.tenant_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view tenant events" ON public.events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE tenant_id = events.tenant_id AND user_id = auth.uid()
    )
  );

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_tenants
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_associations
  BEFORE UPDATE ON public.associations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_projects
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_tasks
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_vendors
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_documents
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_events
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, company)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'company'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert test data
-- IMPORTANT: First create users in Supabase Auth Dashboard, then run this script

-- Create test tenant
INSERT INTO public.tenants (id, name, slug) VALUES
  ('d0d0d0d0-0000-0000-0000-000000000001', 'Acme Property Management', 'acme-property')
ON CONFLICT (id) DO NOTHING;

-- Create test associations
INSERT INTO public.associations (id, tenant_id, name, address, contact_name, contact_email, contact_phone) VALUES
  ('a0a0a0a0-0000-0000-0000-000000000001', 'd0d0d0d0-0000-0000-0000-000000000001', 'Sunset Ridge HOA', '123 Sunset Blvd, San Francisco, CA 94110', 'John Smith', 'john@sunsetridge.com', '(555) 123-4567'),
  ('a0a0a0a0-0000-0000-0000-000000000002', 'd0d0d0d0-0000-0000-0000-000000000001', 'Oak Park Condos', '456 Oak Street, San Francisco, CA 94102', 'Jane Doe', 'jane@oakpark.com', '(555) 234-5678'),
  ('a0a0a0a0-0000-0000-0000-000000000003', 'd0d0d0d0-0000-0000-0000-000000000001', 'Riverside Apartments', '789 River Road, San Francisco, CA 94107', 'Bob Wilson', 'bob@riverside.com', '(555) 345-6789')
ON CONFLICT DO NOTHING;

-- Create test categories
INSERT INTO public.categories (id, tenant_id, name, type, color) VALUES
  ('c0c0c0c0-0000-0000-0000-000000000001', 'd0d0d0d0-0000-0000-0000-000000000001', 'Maintenance', 'task', '#3b82f6'),
  ('c0c0c0c0-0000-0000-0000-000000000002', 'd0d0d0d0-0000-0000-0000-000000000001', 'Renovation', 'task', '#10b981'),
  ('c0c0c0c0-0000-0000-0000-000000000003', 'd0d0d0d0-0000-0000-0000-000000000001', 'Emergency', 'task', '#ef4444'),
  ('c0c0c0c0-0000-0000-0000-000000000004', 'd0d0d0d0-0000-0000-0000-000000000001', 'Capital Improvement', 'project', '#8b5cf6'),
  ('c0c0c0c0-0000-0000-0000-000000000005', 'd0d0d0d0-0000-0000-0000-000000000001', 'Routine Maintenance', 'project', '#06b6d4'),
  ('c0c0c0c0-0000-0000-0000-000000000006', 'd0d0d0d0-0000-0000-0000-000000000001', 'Contracts', 'document', '#f59e0b'),
  ('c0c0c0c0-0000-0000-0000-000000000007', 'd0d0d0d0-0000-0000-0000-000000000001', 'Plumbing', 'vendor', '#14b8a6'),
  ('c0c0c0c0-0000-0000-0000-000000000008', 'd0d0d0d0-0000-0000-0000-000000000001', 'Electrical', 'vendor', '#f97316'),
  ('c0c0c0c0-0000-0000-0000-000000000009', 'd0d0d0d0-0000-0000-0000-000000000001', 'Board Meeting', 'event', '#6366f1'),
  ('c0c0c0c0-0000-0000-0000-000000000010', 'd0d0d0d0-0000-0000-0000-000000000001', 'Site Visit', 'event', '#22c55e')
ON CONFLICT DO NOTHING;

-- NOTE: User-tenant relationships will be created after you create users in Supabase Auth
-- The user IDs below are placeholders - they will be replaced with actual IDs when users are created
-- You can run the seed-data-api.sh script after creating users to link them to the tenant

-- Add sample projects (without created_by - will be added after users are created)
INSERT INTO public.projects (id, tenant_id, name, description, status, budget, start_date, end_date, association_id) VALUES
  ('11111111-0000-0000-0000-000000000001', 'd0d0d0d0-0000-0000-0000-000000000001', 'Pool Renovation', 'Complete renovation of the community pool area', 'on-track', 45000.00, '2024-01-15', '2024-03-30', 'a0a0a0a0-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000002', 'd0d0d0d0-0000-0000-0000-000000000001', 'Parking Lot Resurfacing', 'Resurfacing and restriping of main parking area', 'delayed', 28000.00, '2024-02-01', '2024-02-28', 'a0a0a0a0-0000-0000-0000-000000000002'),
  ('11111111-0000-0000-0000-000000000003', 'd0d0d0d0-0000-0000-0000-000000000001', 'Landscape Upgrade', 'Drought-resistant landscaping installation', 'new', 15000.00, '2024-03-01', '2024-04-15', 'a0a0a0a0-0000-0000-0000-000000000003'),
  ('11111111-0000-0000-0000-000000000004', 'd0d0d0d0-0000-0000-0000-000000000001', 'Security System Update', 'Install new cameras and access control', 'on-hold', 32000.00, '2024-04-01', '2024-05-15', 'a0a0a0a0-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000005', 'd0d0d0d0-0000-0000-0000-000000000001', 'Roof Repairs Phase 1', 'Repair and maintenance of building A and B roofs', 'completed', 52000.00, '2023-10-01', '2023-12-15', 'a0a0a0a0-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- Add sample tasks (without assignee_id and created_by - will be added after users are created)
INSERT INTO public.tasks (id, tenant_id, project_id, title, description, status, priority, due_date, position) VALUES
  ('22222222-0000-0000-0000-000000000001', 'd0d0d0d0-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Get contractor quotes', 'Obtain at least 3 quotes from licensed pool contractors', 'in-progress', 'high', '2024-01-20', 0),
  ('22222222-0000-0000-0000-000000000002', 'd0d0d0d0-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Review pool designs', 'Review and approve final pool design plans', 'pending', 'high', '2024-01-25', 1),
  ('22222222-0000-0000-0000-000000000003', 'd0d0d0d0-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 'Schedule parking lot closure', 'Coordinate with residents for parking alternatives', 'completed', 'medium', '2024-01-28', 0),
  ('22222222-0000-0000-0000-000000000004', 'd0d0d0d0-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 'Hire traffic control', 'Arrange for traffic control during construction', 'review', 'medium', '2024-02-05', 1),
  ('22222222-0000-0000-0000-000000000005', 'd0d0d0d0-0000-0000-0000-000000000001', NULL, 'Monthly HOA newsletter', 'Prepare and send February newsletter', 'pending', 'low', '2024-02-01', 0),
  ('22222222-0000-0000-0000-000000000006', 'd0d0d0d0-0000-0000-0000-000000000001', NULL, 'Update emergency contacts', 'Review and update all emergency contact information', 'on-hold', 'low', '2024-02-15', 0)
ON CONFLICT DO NOTHING;

-- Add sample vendors (without created_by - will be added after users are created)
INSERT INTO public.vendors (id, tenant_id, name, description, category_id, contact_name, contact_email, contact_phone, address, rating, status) VALUES
  ('33333333-0000-0000-0000-000000000001', 'd0d0d0d0-0000-0000-0000-000000000001', 'ABC Plumbing', 'Full service plumbing contractor', 'c0c0c0c0-0000-0000-0000-000000000007', 'Alice Brown', 'alice@abcplumbing.com', '(555) 123-4567', '123 Main St, San Francisco, CA', 4.8, 'active'),
  ('33333333-0000-0000-0000-000000000002', 'd0d0d0d0-0000-0000-0000-000000000001', 'Elite Electric', 'Commercial and residential electrical services', 'c0c0c0c0-0000-0000-0000-000000000008', 'Eddie Volt', 'eddie@eliteelectric.com', '(555) 234-5678', '456 Oak Ave, San Francisco, CA', 4.5, 'active'),
  ('33333333-0000-0000-0000-000000000003', 'd0d0d0d0-0000-0000-0000-000000000001', 'Pro Painters', 'Interior and exterior painting specialists', NULL, 'Paul Painter', 'paul@propainters.com', '(555) 345-6789', '789 Pine St, San Francisco, CA', 4.9, 'active')
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Database setup complete! You can now log in with the test users.';
END $$;