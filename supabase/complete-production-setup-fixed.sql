-- COMPLETE PRODUCTION SETUP FOR PROJECT PRO (FIXED)
-- This script sets up everything needed for a fully functional system
-- Run this in your Supabase SQL editor or via psql

-- ============================================
-- PART 1: SCHEMA SETUP
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing types if they exist (for clean setup)
DROP TYPE IF EXISTS project_status CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS task_priority CASCADE;
DROP TYPE IF EXISTS vendor_status CASCADE;
DROP TYPE IF EXISTS category_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Create custom types
CREATE TYPE project_status AS ENUM ('new', 'on-track', 'delayed', 'on-hold', 'completed');
CREATE TYPE task_status AS ENUM ('pending', 'in-progress', 'review', 'on-hold', 'completed');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE vendor_status AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE category_type AS ENUM ('task', 'project', 'document', 'event', 'vendor');
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member');

-- ============================================
-- PART 2: CREATE ALL TABLES
-- ============================================

-- Drop tables if they exist (for clean setup) - in reverse dependency order
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.vendors CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.associations CASCADE;
DROP TABLE IF EXISTS public.user_tenants CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  company TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tenants table (organizations/companies)
CREATE TABLE public.tenants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  website TEXT,
  industry TEXT,
  size TEXT,
  settings JSONB DEFAULT '{"notifications": true, "email_updates": true}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_tenants junction table
CREATE TABLE public.user_tenants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  role user_role DEFAULT 'member' NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- Create associations table (clients)
CREATE TABLE public.associations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'client',
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'USA',
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type category_type NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status project_status DEFAULT 'new' NOT NULL,
  budget DECIMAL(12,2),
  spent DECIMAL(12,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  association_id UUID REFERENCES public.associations(id) ON DELETE SET NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'pending' NOT NULL,
  priority task_priority DEFAULT 'medium' NOT NULL,
  due_date DATE,
  completed_date TIMESTAMPTZ,
  estimated_hours DECIMAL(6,2),
  actual_hours DECIMAL(6,2),
  assignee_id UUID REFERENCES public.profiles(id),
  category_id UUID REFERENCES public.categories(id),
  position INTEGER DEFAULT 0,
  checklist JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vendors table
CREATE TABLE public.vendors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  tax_id TEXT,
  insurance_exp DATE,
  license_number TEXT,
  license_exp DATE,
  rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),
  status vendor_status DEFAULT 'pending' NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create documents table
CREATE TABLE public.documents (
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
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  expiry_date DATE,
  version INTEGER DEFAULT 1,
  tags TEXT[],
  is_public BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create events table
CREATE TABLE public.events (
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
  attendees UUID[],
  reminder_minutes INTEGER,
  recurring_pattern TEXT,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_read BOOLEAN DEFAULT FALSE,
  read_by UUID[],
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  participants UUID[] NOT NULL,
  type TEXT DEFAULT 'direct', -- direct, group, project
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- info, success, warning, error
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================
-- Now that all tables exist, we can create indexes

CREATE INDEX idx_user_tenants_user_id ON public.user_tenants(user_id);
CREATE INDEX idx_user_tenants_tenant_id ON public.user_tenants(tenant_id);
CREATE INDEX idx_projects_tenant_id ON public.projects(tenant_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_association_id ON public.projects(association_id);
CREATE INDEX idx_tasks_tenant_id ON public.tasks(tenant_id);
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_documents_tenant_id ON public.documents(tenant_id);
CREATE INDEX idx_documents_project_id ON public.documents(project_id);
CREATE INDEX idx_vendors_tenant_id ON public.vendors(tenant_id);
CREATE INDEX idx_events_tenant_id ON public.events(tenant_id);
CREATE INDEX idx_events_start_date ON public.events(start_date);
CREATE INDEX idx_messages_tenant_id ON public.messages(tenant_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_conversations_tenant_id ON public.conversations(tenant_id);
CREATE INDEX idx_activity_logs_tenant_id ON public.activity_logs(tenant_id);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);

-- ============================================
-- PART 4: ENABLE ROW LEVEL SECURITY
-- ============================================

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
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 5: CREATE RLS POLICIES
-- ============================================

-- Drop existing policies if they exist (for clean setup)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their tenants" ON public.tenants;
DROP POLICY IF EXISTS "Admins can update tenant" ON public.tenants;
DROP POLICY IF EXISTS "Users can view tenant members" ON public.user_tenants;
DROP POLICY IF EXISTS "Users can view tenant projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view tenant tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tenant vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can manage vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can view tenant documents" ON public.documents;
DROP POLICY IF EXISTS "Users can manage documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view tenant events" ON public.events;
DROP POLICY IF EXISTS "Users can manage events" ON public.events;
DROP POLICY IF EXISTS "Users can view tenant associations" ON public.associations;
DROP POLICY IF EXISTS "Users can manage associations" ON public.associations;
DROP POLICY IF EXISTS "Users can view tenant categories" ON public.categories;
DROP POLICY IF EXISTS "Users can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Tenants policies
CREATE POLICY "Users can view their tenants" ON public.tenants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE tenant_id = tenants.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update tenant" ON public.tenants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE tenant_id = tenants.id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- User tenants policies
CREATE POLICY "Users can view tenant members" ON public.user_tenants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.tenant_id = user_tenants.tenant_id 
      AND ut.user_id = auth.uid()
    )
  );

-- Projects policies
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
      WHERE tenant_id = projects.tenant_id 
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Tasks policies
CREATE POLICY "Users can view tenant tasks" ON public.tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE tenant_id = tasks.tenant_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE tenant_id = tasks.tenant_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks" ON public.tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE tenant_id = tasks.tenant_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tasks" ON public.tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE tenant_id = tasks.tenant_id 
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Similar policies for other tables
CREATE POLICY "Users can view tenant vendors" ON public.vendors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE tenant_id = vendors.tenant_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage vendors" ON public.vendors
  FOR ALL USING (
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

CREATE POLICY "Users can manage documents" ON public.documents
  FOR ALL USING (
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

CREATE POLICY "Users can manage events" ON public.events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE tenant_id = events.tenant_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view tenant associations" ON public.associations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE tenant_id = associations.tenant_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage associations" ON public.associations
  FOR ALL USING (
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

CREATE POLICY "Users can manage categories" ON public.categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants
      WHERE tenant_id = categories.tenant_id 
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- PART 6: CREATE TRIGGERS AND FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
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

CREATE TRIGGER set_updated_at_messages
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_conversations
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to log activities
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_action TEXT;
  v_entity_name TEXT;
BEGIN
  -- Get the user ID from auth context
  v_user_id := auth.uid();
  
  -- Determine the action
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
  END IF;
  
  -- Get entity name based on table
  IF TG_TABLE_NAME = 'projects' THEN
    v_entity_name := COALESCE(NEW.name, OLD.name);
  ELSIF TG_TABLE_NAME = 'tasks' THEN
    v_entity_name := COALESCE(NEW.title, OLD.title);
  ELSIF TG_TABLE_NAME = 'vendors' THEN
    v_entity_name := COALESCE(NEW.name, OLD.name);
  END IF;
  
  -- Insert activity log
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.activity_logs (
      tenant_id, user_id, action, entity_type, 
      entity_id, entity_name, details
    ) VALUES (
      COALESCE(NEW.tenant_id, OLD.tenant_id),
      v_user_id,
      v_action,
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      v_entity_name,
      jsonb_build_object('operation', TG_OP)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply activity logging to key tables
CREATE TRIGGER log_project_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER log_task_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.log_activity();

-- ============================================
-- PART 7: CREATE VIEWS FOR COMMON QUERIES
-- ============================================

-- Drop views if they exist
DROP VIEW IF EXISTS public.project_dashboard;
DROP VIEW IF EXISTS public.task_overview;

-- Project dashboard view
CREATE VIEW public.project_dashboard AS
SELECT 
  p.*,
  a.name as association_name,
  COUNT(DISTINCT t.id) as total_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
  COUNT(DISTINCT d.id) as document_count
FROM public.projects p
LEFT JOIN public.associations a ON p.association_id = a.id
LEFT JOIN public.tasks t ON p.id = t.project_id
LEFT JOIN public.documents d ON p.id = d.project_id
GROUP BY p.id, a.name;

-- Task overview view
CREATE VIEW public.task_overview AS
SELECT 
  t.*,
  p.name as project_name,
  u.full_name as assignee_name,
  c.name as category_name,
  c.color as category_color
FROM public.tasks t
LEFT JOIN public.projects p ON t.project_id = p.id
LEFT JOIN public.profiles u ON t.assignee_id = u.id
LEFT JOIN public.categories c ON t.category_id = c.id;

-- Grant permissions on views
GRANT SELECT ON public.project_dashboard TO authenticated;
GRANT SELECT ON public.task_overview TO authenticated;

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Next steps:
-- 1. Create admin user in Supabase Auth
-- 2. Run create-admin-user.sql to set up admin privileges
-- 3. Optionally run seed-production-data.sql for sample data