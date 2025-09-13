-- Add missing profile fields to user_profile_settings table
ALTER TABLE user_profile_settings 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update the update_user_settings function to handle these new fields
CREATE OR REPLACE FUNCTION update_user_settings(
    p_user_id UUID,
    p_tenant_id UUID,
    p_section TEXT,
    p_settings JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
    CASE p_section
        WHEN 'profile' THEN
            -- First update the profiles table for basic info
            UPDATE profiles SET
                full_name = COALESCE(p_settings->>'full_name', full_name),
                email = COALESCE(p_settings->>'email', email),
                company = COALESCE(p_settings->>'company', company),
                phone = COALESCE(p_settings->>'phone', phone),
                updated_at = NOW()
            WHERE id = p_user_id;
            
            -- Then update or insert the extended profile settings
            INSERT INTO user_profile_settings (
                user_id, tenant_id, 
                full_name, email, company, phone, avatar_url,
                job_title, department, bio, timezone, location, 
                linkedin_url, website_url, 
                emergency_contact_name, emergency_contact_phone, 
                work_hours_start, work_hours_end, 
                preferred_language, date_format, time_format
            )
            VALUES (
                p_user_id, 
                p_tenant_id,
                (p_settings->>'full_name'),
                (p_settings->>'email'),
                (p_settings->>'company'),
                (p_settings->>'phone'),
                (p_settings->>'avatar_url'),
                (p_settings->>'job_title'),
                (p_settings->>'department'),
                (p_settings->>'bio'),
                (p_settings->>'timezone'),
                (p_settings->>'location'),
                (p_settings->>'linkedin_url'),
                (p_settings->>'website_url'),
                (p_settings->>'emergency_contact_name'),
                (p_settings->>'emergency_contact_phone'),
                CASE WHEN p_settings->>'work_hours_start' IS NOT NULL 
                     THEN (p_settings->>'work_hours_start')::TIME 
                     ELSE NULL END,
                CASE WHEN p_settings->>'work_hours_end' IS NOT NULL 
                     THEN (p_settings->>'work_hours_end')::TIME 
                     ELSE NULL END,
                (p_settings->>'preferred_language'),
                (p_settings->>'date_format'),
                (p_settings->>'time_format')
            )
            ON CONFLICT (user_id, tenant_id) DO UPDATE SET
                full_name = EXCLUDED.full_name,
                email = EXCLUDED.email,
                company = EXCLUDED.company,
                phone = EXCLUDED.phone,
                avatar_url = EXCLUDED.avatar_url,
                job_title = EXCLUDED.job_title,
                department = EXCLUDED.department,
                bio = EXCLUDED.bio,
                timezone = EXCLUDED.timezone,
                location = EXCLUDED.location,
                linkedin_url = EXCLUDED.linkedin_url,
                website_url = EXCLUDED.website_url,
                emergency_contact_name = EXCLUDED.emergency_contact_name,
                emergency_contact_phone = EXCLUDED.emergency_contact_phone,
                work_hours_start = EXCLUDED.work_hours_start,
                work_hours_end = EXCLUDED.work_hours_end,
                preferred_language = EXCLUDED.preferred_language,
                date_format = EXCLUDED.date_format,
                time_format = EXCLUDED.time_format,
                updated_at = NOW();
                
        WHEN 'notifications' THEN
            INSERT INTO user_notification_settings (
                user_id, tenant_id, 
                email_enabled, email_frequency, email_digest, 
                email_project_updates, email_task_reminders, email_messages, 
                email_mentions, email_team_activity, email_system_alerts, 
                push_enabled, push_messages, push_mentions, push_task_reminders, 
                push_project_updates, sms_enabled, sms_urgent_only, 
                sms_task_deadlines, sms_system_alerts, inapp_enabled, 
                inapp_sound, inapp_desktop, notify_team_member_joins, 
                notify_team_member_leaves, notify_role_changes, 
                notify_permission_changes, notify_external_messages, 
                notify_vendor_updates, notify_client_communications, 
                notify_dependency_delays, notify_dependency_completions, 
                notify_critical_path_changes, quiet_hours_enabled, 
                quiet_hours_start, quiet_hours_end, quiet_hours_timezone
            )
            VALUES (
                p_user_id,
                p_tenant_id,
                (p_settings->>'email_enabled')::BOOLEAN,
                (p_settings->>'email_frequency'),
                (p_settings->>'email_digest')::BOOLEAN,
                (p_settings->>'email_project_updates')::BOOLEAN,
                (p_settings->>'email_task_reminders')::BOOLEAN,
                (p_settings->>'email_messages')::BOOLEAN,
                (p_settings->>'email_mentions')::BOOLEAN,
                (p_settings->>'email_team_activity')::BOOLEAN,
                (p_settings->>'email_system_alerts')::BOOLEAN,
                (p_settings->>'push_enabled')::BOOLEAN,
                (p_settings->>'push_messages')::BOOLEAN,
                (p_settings->>'push_mentions')::BOOLEAN,
                (p_settings->>'push_task_reminders')::BOOLEAN,
                (p_settings->>'push_project_updates')::BOOLEAN,
                (p_settings->>'sms_enabled')::BOOLEAN,
                (p_settings->>'sms_urgent_only')::BOOLEAN,
                (p_settings->>'sms_task_deadlines')::BOOLEAN,
                (p_settings->>'sms_system_alerts')::BOOLEAN,
                (p_settings->>'inapp_enabled')::BOOLEAN,
                (p_settings->>'inapp_sound')::BOOLEAN,
                (p_settings->>'inapp_desktop')::BOOLEAN,
                (p_settings->>'notify_team_member_joins')::BOOLEAN,
                (p_settings->>'notify_team_member_leaves')::BOOLEAN,
                (p_settings->>'notify_role_changes')::BOOLEAN,
                (p_settings->>'notify_permission_changes')::BOOLEAN,
                (p_settings->>'notify_external_messages')::BOOLEAN,
                (p_settings->>'notify_vendor_updates')::BOOLEAN,
                (p_settings->>'notify_client_communications')::BOOLEAN,
                (p_settings->>'notify_dependency_delays')::BOOLEAN,
                (p_settings->>'notify_dependency_completions')::BOOLEAN,
                (p_settings->>'notify_critical_path_changes')::BOOLEAN,
                (p_settings->>'quiet_hours_enabled')::BOOLEAN,
                CASE WHEN p_settings->>'quiet_hours_start' IS NOT NULL 
                     THEN (p_settings->>'quiet_hours_start')::TIME 
                     ELSE NULL END,
                CASE WHEN p_settings->>'quiet_hours_end' IS NOT NULL 
                     THEN (p_settings->>'quiet_hours_end')::TIME 
                     ELSE NULL END,
                (p_settings->>'quiet_hours_timezone')
            )
            ON CONFLICT (user_id, tenant_id) DO UPDATE SET
                email_enabled = EXCLUDED.email_enabled,
                email_frequency = EXCLUDED.email_frequency,
                email_digest = EXCLUDED.email_digest,
                email_project_updates = EXCLUDED.email_project_updates,
                email_task_reminders = EXCLUDED.email_task_reminders,
                email_messages = EXCLUDED.email_messages,
                email_mentions = EXCLUDED.email_mentions,
                email_team_activity = EXCLUDED.email_team_activity,
                email_system_alerts = EXCLUDED.email_system_alerts,
                push_enabled = EXCLUDED.push_enabled,
                push_messages = EXCLUDED.push_messages,
                push_mentions = EXCLUDED.push_mentions,
                push_task_reminders = EXCLUDED.push_task_reminders,
                push_project_updates = EXCLUDED.push_project_updates,
                sms_enabled = EXCLUDED.sms_enabled,
                sms_urgent_only = EXCLUDED.sms_urgent_only,
                sms_task_deadlines = EXCLUDED.sms_task_deadlines,
                sms_system_alerts = EXCLUDED.sms_system_alerts,
                inapp_enabled = EXCLUDED.inapp_enabled,
                inapp_sound = EXCLUDED.inapp_sound,
                inapp_desktop = EXCLUDED.inapp_desktop,
                notify_team_member_joins = EXCLUDED.notify_team_member_joins,
                notify_team_member_leaves = EXCLUDED.notify_team_member_leaves,
                notify_role_changes = EXCLUDED.notify_role_changes,
                notify_permission_changes = EXCLUDED.notify_permission_changes,
                notify_external_messages = EXCLUDED.notify_external_messages,
                notify_vendor_updates = EXCLUDED.notify_vendor_updates,
                notify_client_communications = EXCLUDED.notify_client_communications,
                notify_dependency_delays = EXCLUDED.notify_dependency_delays,
                notify_dependency_completions = EXCLUDED.notify_dependency_completions,
                notify_critical_path_changes = EXCLUDED.notify_critical_path_changes,
                quiet_hours_enabled = EXCLUDED.quiet_hours_enabled,
                quiet_hours_start = EXCLUDED.quiet_hours_start,
                quiet_hours_end = EXCLUDED.quiet_hours_end,
                quiet_hours_timezone = EXCLUDED.quiet_hours_timezone,
                updated_at = NOW();
                
        WHEN 'appearance' THEN
            INSERT INTO user_appearance_settings (
                user_id, tenant_id, theme, sidebar_position, sidebar_collapsed, 
                compact_mode, show_animations, font_size, color_scheme, 
                show_breadcrumbs, show_task_numbers, show_project_icons, 
                calendar_default_view, calendar_start_day, calendar_time_format, 
                date_display_format, chart_style, map_default_view, 
                dashboard_layout, dashboard_widgets
            )
            VALUES (
                p_user_id,
                p_tenant_id,
                (p_settings->>'theme'),
                (p_settings->>'sidebar_position'),
                (p_settings->>'sidebar_collapsed')::BOOLEAN,
                (p_settings->>'compact_mode')::BOOLEAN,
                (p_settings->>'show_animations')::BOOLEAN,
                (p_settings->>'font_size'),
                (p_settings->>'color_scheme'),
                (p_settings->>'show_breadcrumbs')::BOOLEAN,
                (p_settings->>'show_task_numbers')::BOOLEAN,
                (p_settings->>'show_project_icons')::BOOLEAN,
                (p_settings->>'calendar_default_view'),
                (p_settings->>'calendar_start_day')::INTEGER,
                (p_settings->>'calendar_time_format'),
                (p_settings->>'date_display_format'),
                (p_settings->>'chart_style'),
                (p_settings->>'map_default_view'),
                (p_settings->>'dashboard_layout'),
                (p_settings->>'dashboard_widgets')::JSONB
            )
            ON CONFLICT (user_id, tenant_id) DO UPDATE SET
                theme = EXCLUDED.theme,
                sidebar_position = EXCLUDED.sidebar_position,
                sidebar_collapsed = EXCLUDED.sidebar_collapsed,
                compact_mode = EXCLUDED.compact_mode,
                show_animations = EXCLUDED.show_animations,
                font_size = EXCLUDED.font_size,
                color_scheme = EXCLUDED.color_scheme,
                show_breadcrumbs = EXCLUDED.show_breadcrumbs,
                show_task_numbers = EXCLUDED.show_task_numbers,
                show_project_icons = EXCLUDED.show_project_icons,
                calendar_default_view = EXCLUDED.calendar_default_view,
                calendar_start_day = EXCLUDED.calendar_start_day,
                calendar_time_format = EXCLUDED.calendar_time_format,
                date_display_format = EXCLUDED.date_display_format,
                chart_style = EXCLUDED.chart_style,
                map_default_view = EXCLUDED.map_default_view,
                dashboard_layout = EXCLUDED.dashboard_layout,
                dashboard_widgets = EXCLUDED.dashboard_widgets,
                updated_at = NOW();
                
        ELSE
            RETURN FALSE;
    END CASE;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;