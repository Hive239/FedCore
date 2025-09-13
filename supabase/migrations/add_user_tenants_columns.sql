-- Add missing columns to user_tenants table

DO $$
BEGIN
  -- Check if status column exists in user_tenants
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_tenants' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.user_tenants ADD COLUMN status TEXT DEFAULT 'active';
  END IF;

  -- Check if role column exists in user_tenants
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_tenants' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE public.user_tenants ADD COLUMN role TEXT DEFAULT 'member';
  END IF;

  -- Check if created_at column exists in user_tenants
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_tenants' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.user_tenants ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;