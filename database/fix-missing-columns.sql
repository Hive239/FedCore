-- Fix missing columns in existing tables
-- This adds essential columns that may be missing

-- ============================================
-- CHECK AND ADD MISSING COLUMNS
-- ============================================

-- Add project_id to tasks table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tasks' AND column_name='project_id') THEN
        ALTER TABLE tasks ADD COLUMN project_id UUID;
        
        -- Add foreign key constraint if projects table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='projects') THEN
            ALTER TABLE tasks ADD CONSTRAINT fk_tasks_project 
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
        END IF;
        
        RAISE NOTICE 'Added project_id column to tasks table';
    END IF;
END $$;

-- Add assigned_to to tasks table if it doesn't exist  
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tasks' AND column_name='assigned_to') THEN
        ALTER TABLE tasks ADD COLUMN assigned_to UUID;
        
        -- Add foreign key constraint if profiles table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='profiles') THEN
            ALTER TABLE tasks ADD CONSTRAINT fk_tasks_assigned_to 
            FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL;
        END IF;
        
        RAISE NOTICE 'Added assigned_to column to tasks table';
    END IF;
END $$;

-- Add tenant_id to tasks table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tasks' AND column_name='tenant_id') THEN
        ALTER TABLE tasks ADD COLUMN tenant_id UUID;
        
        -- Add foreign key constraint if tenants/organizations table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='organizations') THEN
            ALTER TABLE tasks ADD CONSTRAINT fk_tasks_tenant 
            FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE CASCADE;
        ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tenants') THEN
            ALTER TABLE tasks ADD CONSTRAINT fk_tasks_tenant 
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
        END IF;
        
        RAISE NOTICE 'Added tenant_id column to tasks table';
    END IF;
END $$;

-- Add due_date to tasks table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tasks' AND column_name='due_date') THEN
        ALTER TABLE tasks ADD COLUMN due_date DATE;
        RAISE NOTICE 'Added due_date column to tasks table';
    END IF;
END $$;

-- Add created_by to tasks table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tasks' AND column_name='created_by') THEN
        ALTER TABLE tasks ADD COLUMN created_by UUID;
        
        -- Add foreign key constraint if profiles table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='profiles') THEN
            ALTER TABLE tasks ADD CONSTRAINT fk_tasks_created_by 
            FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
        END IF;
        
        RAISE NOTICE 'Added created_by column to tasks table';
    END IF;
END $$;

-- Add progress to tasks table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tasks' AND column_name='progress') THEN
        ALTER TABLE tasks ADD COLUMN progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);
        RAISE NOTICE 'Added progress column to tasks table';
    END IF;
END $$;

-- Add tenant_id to projects table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='projects' AND column_name='tenant_id') THEN
        ALTER TABLE projects ADD COLUMN tenant_id UUID;
        
        -- Add foreign key constraint if tenants/organizations table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='organizations') THEN
            ALTER TABLE projects ADD CONSTRAINT fk_projects_tenant 
            FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE CASCADE;
        ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tenants') THEN
            ALTER TABLE projects ADD CONSTRAINT fk_projects_tenant 
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
        END IF;
        
        RAISE NOTICE 'Added tenant_id column to projects table';
    END IF;
END $$;

-- Add created_by to projects table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='projects' AND column_name='created_by') THEN
        ALTER TABLE projects ADD COLUMN created_by UUID;
        
        -- Add foreign key constraint if profiles table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='profiles') THEN
            ALTER TABLE projects ADD CONSTRAINT fk_projects_created_by 
            FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
        END IF;
        
        RAISE NOTICE 'Added created_by column to projects table';
    END IF;
END $$;

-- ============================================
-- POPULATE MISSING DATA
-- ============================================

-- If project_id was just added to tasks, try to assign tasks to projects
DO $$
DECLARE
    default_project_id UUID;
BEGIN
    -- Only proceed if project_id column exists and has nulls
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='tasks' AND column_name='project_id') THEN
        
        -- Check if there are tasks without projects
        IF EXISTS (SELECT 1 FROM tasks WHERE project_id IS NULL) THEN
            
            -- Try to find or create a default project
            SELECT id INTO default_project_id FROM projects LIMIT 1;
            
            IF default_project_id IS NULL THEN
                -- Create a default project if none exists
                INSERT INTO projects (name, description, status, created_at, updated_at)
                VALUES ('Default Project', 'Default project for unassigned tasks', 'active', NOW(), NOW())
                RETURNING id INTO default_project_id;
                
                RAISE NOTICE 'Created default project with ID: %', default_project_id;
            END IF;
            
            -- Assign all orphaned tasks to the default project
            UPDATE tasks 
            SET project_id = default_project_id 
            WHERE project_id IS NULL;
            
            RAISE NOTICE 'Assigned orphaned tasks to project: %', default_project_id;
        END IF;
    END IF;
END $$;

-- ============================================
-- CREATE INDEXES FOR NEW COLUMNS
-- ============================================

-- Create indexes for the newly added columns
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_status ON projects(tenant_id, status);

-- ============================================
-- VERIFY SCHEMA
-- ============================================

-- Display the current schema for verification
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count 
    FROM information_schema.columns 
    WHERE table_name = 'tasks';
    
    RAISE NOTICE 'Tasks table now has % columns', col_count;
    
    SELECT COUNT(*) INTO col_count 
    FROM information_schema.columns 
    WHERE table_name = 'projects';
    
    RAISE NOTICE 'Projects table now has % columns', col_count;
END $$;

-- Show current table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;

COMMENT ON SCHEMA public IS 'Schema updated with essential missing columns for project-task relationships';