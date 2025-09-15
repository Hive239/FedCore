# FEDCORE Setup Guide

## ✅ Completed Setup

1. **Test Users Created** - The following users are now available in your Supabase Auth:
   - `admin@projectpro.com` / `Admin123!` (Owner role)
   - `john@projectpro.com` / `John123!` (Admin role)
   - `jane@projectpro.com` / `Jane123!` (Member)
   - `bob@projectpro.com` / `Bob123!` (Member)
   - `sarah@projectpro.com` / `Sarah123!` (Member)
   - `mike@projectpro.com` / `Mike123!` (Member)

2. **Environment Variables Configured** - Your `.env.local` file is set up with Supabase credentials

## 📋 Required Manual Steps

### 1. Create Database Schema

1. Go to your [Supabase SQL Editor](https://supabase.com/dashboard/project/ndvlruqscfjsmpdojtnl/sql/new)
2. Copy the entire contents of `supabase/schema.sql`
3. Paste and click "RUN" to create all tables

### 2. Link Users to Tenant

1. In the same SQL Editor
2. Copy the entire contents of `supabase/add_users_to_tenant.sql`
3. Paste and click "RUN" to:
   - Create the demo tenant (Acme Property Management)
   - Link all users to the tenant with appropriate roles
   - Add sample projects, tasks, and vendors

### 3. Add Sample Data

1. Copy the contents of `supabase/seed.sql`
2. Paste and click "RUN" to add:
   - Property associations (Sunset Ridge HOA, Oak Park Condos, etc.)
   - Categories for tasks, projects, documents, events, and vendors
   - Additional sample data

## 🚀 Running the Application

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:3000

3. Log in with any of the test credentials above

## 🎯 What You Can Do Now

- **Projects**: View, create, edit, and delete projects
- **Tasks**: Use the Kanban board with drag-and-drop
- **Documents**: View document management interface (upload coming soon)
- **Vendors**: Browse vendor directory
- **Calendar**: View calendar with events
- **Dashboard**: See overview statistics

## 🔧 Troubleshooting

### "Unauthorized" Error
- Make sure you've run all SQL scripts in order
- Ensure users are linked to tenant via `add_users_to_tenant.sql`

### No Data Showing
- Check that you've run the `seed.sql` script
- Verify RLS policies are created (included in schema.sql)

### Login Issues
- Confirm user was created successfully
- Check browser console for specific error messages
- Try clearing cookies/localStorage

## 📝 Next Development Steps

1. **File Upload**: Implement document upload to Supabase Storage
2. **Real-time**: Add real-time updates for tasks and messages
3. **Search**: Implement global search functionality
4. **Notifications**: Add in-app notifications
5. **Reports**: Build reporting dashboard

## 🔐 Security Notes

- The service role key in `.env.local` should NEVER be exposed client-side
- All database access uses Row Level Security (RLS)
- Users can only see data from their assigned tenant