-- ============================================
-- DELETE OLD ADMIN USER
-- ============================================
-- This script removes the admin@projectpro.com user
-- Run this in Supabase SQL Editor
-- ============================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find the user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'admin@projectpro.com';

  IF v_user_id IS NOT NULL THEN
    RAISE NOTICE 'Found user with ID: %', v_user_id;
    
    -- Update projects to remove the created_by reference (set to NULL or reassign)
    UPDATE public.projects 
    SET created_by = NULL 
    WHERE created_by = v_user_id;
    RAISE NOTICE '✓ Updated projects created by user';
    
    -- Update tasks if they reference the user
    UPDATE public.tasks 
    SET assigned_to = NULL 
    WHERE assigned_to = v_user_id;
    RAISE NOTICE '✓ Updated tasks assigned to user';
    
    -- Delete from calendar_events if user is owner
    DELETE FROM public.calendar_events WHERE created_by = v_user_id;
    RAISE NOTICE '✓ Deleted calendar events';
    
    -- Delete from task_comments
    DELETE FROM public.task_comments WHERE user_id = v_user_id;
    RAISE NOTICE '✓ Deleted task comments';
    
    -- Delete from user_tenants
    DELETE FROM public.user_tenants WHERE user_id = v_user_id;
    RAISE NOTICE '✓ Deleted user tenant associations';
    
    -- Delete from profiles
    DELETE FROM public.profiles WHERE id = v_user_id;
    RAISE NOTICE '✓ Deleted user profile';
    
    -- Finally delete from auth.users
    DELETE FROM auth.users WHERE id = v_user_id;
    RAISE NOTICE '✓ Deleted auth user';
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Successfully deleted admin@projectpro.com user and all references';
  ELSE
    RAISE NOTICE '⚠ User admin@projectpro.com not found';
  END IF;
END $$;