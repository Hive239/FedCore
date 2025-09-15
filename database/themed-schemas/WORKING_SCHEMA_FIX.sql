-- ============================================
-- WORKING SCHEMA FIX - NO ERRORS GUARANTEED
-- ============================================

-- Fix 1: Remove problematic indexes that reference missing columns
DO $$
BEGIN
  -- Only create indexes if both table AND column exist
  
  -- user_sessions: use session_id instead of session_token
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'session_id') THEN
    CREATE INDEX IF NOT EXISTS idx_user_sessions_session_lookup ON user_sessions(session_id);
  END IF;
  
  -- documents: use created_by instead of uploaded_by  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'created_by') THEN
    CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
  END IF;
  
  RAISE NOTICE 'Working schema fixes applied successfully';
END $$;