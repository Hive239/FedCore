-- Add missing columns to existing tables
-- This migration safely adds columns that may be missing

-- 1. Check and add columns to tenants table
DO $$
BEGIN
  -- Check if subscription_plan column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tenants' 
    AND column_name = 'subscription_plan'
  ) THEN
    ALTER TABLE public.tenants ADD COLUMN subscription_plan TEXT DEFAULT 'free';
  END IF;

  -- Check if slug column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tenants' 
    AND column_name = 'slug'
  ) THEN
    ALTER TABLE public.tenants ADD COLUMN slug TEXT;
  END IF;

  -- Check if created_at column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tenants' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.tenants ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Check if updated_at column exists  
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tenants' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.tenants ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 2. Generate slugs for any existing tenants that don't have one
UPDATE public.tenants 
SET slug = LOWER(REPLACE(name, ' ', '-')) || '-' || LEFT(id::text, 8)
WHERE slug IS NULL;

-- 3. Try to make slug unique (only if not already unique)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'UNIQUE' 
    AND table_name = 'tenants' 
    AND constraint_name = 'tenants_slug_unique'
  ) THEN
    ALTER TABLE public.tenants ADD CONSTRAINT tenants_slug_unique UNIQUE (slug);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;