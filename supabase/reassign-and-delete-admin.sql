-- ============================================
-- REASSIGN DATA AND DELETE OLD ADMIN USER
-- ============================================
-- This script reassigns all data from admin@projectpro.com 
-- to mparish@meridianswl.com then deletes the old admin
-- ============================================

DO $$
DECLARE
  v_old_user_id UUID;
  v_new_user_id UUID;
BEGIN
  -- Find the old admin user ID
  SELECT id INTO v_old_user_id
  FROM auth.users
  WHERE email = 'admin@projectpro.com';

  -- Find the new admin user ID  
  SELECT id INTO v_new_user_id
  FROM auth.users
  WHERE email = 'mparish@meridianswl.com';

  IF v_old_user_id IS NULL THEN
    RAISE NOTICE '⚠ Old admin user (admin@projectpro.com) not found';
    RETURN;
  END IF;

  IF v_new_user_id IS NULL THEN
    RAISE NOTICE '⚠ New admin user (mparish@meridianswl.com) not found';
    RAISE NOTICE 'Please create the new user first before running this script';
    RETURN;
  END IF;

  RAISE NOTICE 'Reassigning data from % to %', v_old_user_id, v_new_user_id;
  
  -- Reassign projects to new user
  UPDATE public.projects 
  SET created_by = v_new_user_id 
  WHERE created_by = v_old_user_id;
  RAISE NOTICE '✓ Reassigned projects to new user';
  
  -- Reassign tasks to new user
  UPDATE public.tasks 
  SET assigned_to = v_new_user_id 
  WHERE assigned_to = v_old_user_id;
  RAISE NOTICE '✓ Reassigned tasks to new user';
  
  -- Reassign calendar events to new user
  UPDATE public.calendar_events 
  SET created_by = v_new_user_id 
  WHERE created_by = v_old_user_id;
  RAISE NOTICE '✓ Reassigned calendar events to new user';
  
  -- Reassign task comments to new user
  UPDATE public.task_comments 
  SET user_id = v_new_user_id 
  WHERE user_id = v_old_user_id;
  RAISE NOTICE '✓ Reassigned task comments to new user';
  
  -- Now delete the old user's associations
  DELETE FROM public.user_tenants WHERE user_id = v_old_user_id;
  RAISE NOTICE '✓ Deleted old user tenant associations';
  
  -- Delete from profiles
  DELETE FROM public.profiles WHERE id = v_old_user_id;
  RAISE NOTICE '✓ Deleted old user profile';
  
  -- Finally delete from auth.users
  DELETE FROM auth.users WHERE id = v_old_user_id;
  RAISE NOTICE '✓ Deleted old auth user';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Successfully reassigned all data and deleted admin@projectpro.com';
  RAISE NOTICE 'All projects, tasks, and events have been transferred to mparish@meridianswl.com';
END $$;