# Database Migration Required

The "Offline - Please check your connection" error is likely because the database needs to be updated with the new task enhancements schema.

## To fix this issue:

### Option 1: Run Migration via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/uaruyrkcisljnkwjwygn
2. Navigate to the SQL Editor
3. Copy and paste the contents of `/supabase/task-enhancements.sql`
4. Click "Run" to execute the migration

### Option 2: Run Migration via Supabase CLI

```bash
cd /Users/mpari/Desktop/HIVE239/Project\ Pro/ProjectPro

# First, link to your project
npx supabase link --project-ref uaruyrkcisljnkwjwygn

# Then push the migration
npx supabase db push --db-url "postgresql://postgres:[YOUR-DB-PASSWORD]@db.uaruyrkcisljnkwjwygn.supabase.co:5432/postgres"
```

### Option 3: Manual SQL Execution

If the above options don't work, you can manually run the SQL commands in the Supabase SQL editor:

1. First, check if the contact_type enum exists:
```sql
SELECT * FROM pg_type WHERE typname = 'contact_type';
```

2. If it doesn't exist, run the migration SQL from `/supabase/task-enhancements.sql`

## After Migration

Once the migration is complete:
1. Refresh your browser at http://localhost:3000
2. Navigate to the Tasks page
3. The "Add Task" button should now work with all the new features:
   - Contact tagging (vendors, design professionals, contractors)
   - Task dependencies
   - AI-powered suggestions when tasks are completed

## Features Added

✅ **Contact Tagging**: Tag vendors, design professionals, and contractors to tasks
✅ **Task Dependencies**: Set up finish-to-start, start-to-start, and other dependency types
✅ **AI Suggestions**: Get intelligent next task suggestions based on construction phases
✅ **Construction Templates**: Pre-built task templates for common construction workflows

## Troubleshooting

If you still see errors after running the migration:

1. **Check browser console** (F12) for specific error messages
2. **Verify Supabase connection**:
   - Check that your `.env.local` file has the correct SUPABASE_URL and SUPABASE_ANON_KEY
   - Ensure your Supabase project is active and not paused

3. **Clear browser cache**:
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
   - Or go to http://localhost:3000/clear-sw to clear service workers

4. **Check RLS policies**: Make sure you're logged in with a valid user account

If the issue persists, the error might be related to Row Level Security (RLS) policies or missing data in the database.