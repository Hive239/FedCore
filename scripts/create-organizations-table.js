#!/usr/bin/env node

/**
 * Create organizations table as a view of tenants
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createOrganizationsTable() {
  console.log('🚀 Creating organizations table/view...\n')

  try {
    // Method 1: Create organizations as a view of tenants
    console.log('1. Creating organizations view...')
    const { error: viewError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Drop view if it exists
        DROP VIEW IF EXISTS public.organizations;
        
        -- Create organizations view mapping to tenants
        CREATE VIEW public.organizations AS 
        SELECT 
          id,
          name,
          slug,
          created_at,
          updated_at,
          name as organization_name,
          slug as organization_slug
        FROM public.tenants;

        -- Grant permissions
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
        GRANT SELECT ON public.organizations TO anon;
      `
    })

    if (viewError) {
      console.log('⚠️  View creation failed, trying direct SQL...')
      
      // Method 2: Try creating table directly if view doesn't work
      console.log('2. Creating organizations table...')
      const { error: tableError } = await supabase.rpc('exec_sql', {
        sql: `
          -- Create organizations table if view doesn't work
          CREATE TABLE IF NOT EXISTS public.organizations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            organization_name TEXT,
            organization_slug TEXT
          );

          -- Copy data from tenants
          INSERT INTO public.organizations (id, name, slug, created_at, updated_at, organization_name, organization_slug)
          SELECT id, name, slug, created_at, updated_at, name, slug 
          FROM public.tenants
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            slug = EXCLUDED.slug,
            updated_at = NOW(),
            organization_name = EXCLUDED.name,
            organization_slug = EXCLUDED.slug;

          -- Create trigger to sync with tenants
          CREATE OR REPLACE FUNCTION sync_organizations_with_tenants()
          RETURNS TRIGGER AS $$
          BEGIN
            IF TG_OP = 'INSERT' THEN
              INSERT INTO public.organizations (id, name, slug, organization_name, organization_slug)
              VALUES (NEW.id, NEW.name, NEW.slug, NEW.name, NEW.slug);
              RETURN NEW;
            ELSIF TG_OP = 'UPDATE' THEN
              UPDATE public.organizations 
              SET name = NEW.name, slug = NEW.slug, updated_at = NOW(), 
                  organization_name = NEW.name, organization_slug = NEW.slug
              WHERE id = NEW.id;
              RETURN NEW;
            ELSIF TG_OP = 'DELETE' THEN
              DELETE FROM public.organizations WHERE id = OLD.id;
              RETURN OLD;
            END IF;
            RETURN NULL;
          END;
          $$ LANGUAGE plpgsql;

          DROP TRIGGER IF EXISTS sync_organizations_trigger ON public.tenants;
          CREATE TRIGGER sync_organizations_trigger
            AFTER INSERT OR UPDATE OR DELETE ON public.tenants
            FOR EACH ROW EXECUTE FUNCTION sync_organizations_with_tenants();

          -- Grant permissions
          GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
          GRANT SELECT ON public.organizations TO anon;
          GRANT USAGE ON SEQUENCE IF EXISTS organizations_id_seq TO authenticated;
        `
      })

      if (tableError) {
        console.log('❌ Table creation error:', tableError)
        return false
      } else {
        console.log('✅ Organizations table created with sync triggers')
      }
    } else {
      console.log('✅ Organizations view created successfully')
    }

    // Test the organizations table/view
    console.log('3. Testing organizations access...')
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .limit(5)

    if (error) {
      console.log('❌ Test access error:', error.message)
      return false
    } else {
      console.log('✅ Organizations accessible with', data?.length || 0, 'records')
      if (data && data.length > 0) {
        console.log('   Sample record:', data[0])
      }
    }

    console.log('\n✨ Organizations table/view setup complete!')
    console.log('📊 This should resolve the "organizations does not exist" error')

  } catch (error) {
    console.error('❌ Error:', error)
    return false
  }

  return true
}

createOrganizationsTable()