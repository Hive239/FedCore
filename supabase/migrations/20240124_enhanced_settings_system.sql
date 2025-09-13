-- Enhanced Settings System Migration
-- Adds comprehensive settings storage for profile, notifications, appearance, and system configurations

-- =====================================================
-- User Settings Schema
-- =====================================================

-- Enhanced profile settings
CREATE TABLE IF NOT EXISTS user_profile_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Extended profile details
    job_title TEXT,
    department TEXT,
    bio TEXT,
    timezone TEXT DEFAULT 'UTC',
    location TEXT,
    linkedin_url TEXT,
    website_url TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    work_hours_start TIME DEFAULT '09:00:00',
    work_hours_end TIME DEFAULT '17:00:00',
    preferred_language TEXT DEFAULT 'en',
    date_format TEXT DEFAULT 'MM/dd/yyyy',
    time_format TEXT DEFAULT '12h', -- '12h' or '24h'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, tenant_id)
);

-- Notification settings
CREATE TABLE IF NOT EXISTS user_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Email notifications
    email_enabled BOOLEAN DEFAULT true,
    email_frequency TEXT DEFAULT 'instant', -- 'instant', 'hourly', 'daily', 'weekly'
    email_digest BOOLEAN DEFAULT false,
    email_project_updates BOOLEAN DEFAULT true,
    email_task_reminders BOOLEAN DEFAULT true,
    email_messages BOOLEAN DEFAULT true,
    email_mentions BOOLEAN DEFAULT true,
    email_team_activity BOOLEAN DEFAULT false,
    email_system_alerts BOOLEAN DEFAULT true,
    
    -- Push notifications (browser/mobile)
    push_enabled BOOLEAN DEFAULT true,
    push_messages BOOLEAN DEFAULT true,
    push_mentions BOOLEAN DEFAULT true,
    push_task_reminders BOOLEAN DEFAULT true,
    push_project_updates BOOLEAN DEFAULT false,
    
    -- SMS notifications
    sms_enabled BOOLEAN DEFAULT false,
    sms_urgent_only BOOLEAN DEFAULT true,
    sms_task_deadlines BOOLEAN DEFAULT false,
    sms_system_alerts BOOLEAN DEFAULT false,
    
    -- In-app notifications
    inapp_enabled BOOLEAN DEFAULT true,
    inapp_sound BOOLEAN DEFAULT true,
    inapp_desktop BOOLEAN DEFAULT true,
    
    -- Team-specific notifications
    notify_team_member_joins BOOLEAN DEFAULT true,
    notify_team_member_leaves BOOLEAN DEFAULT true,
    notify_role_changes BOOLEAN DEFAULT true,
    notify_permission_changes BOOLEAN DEFAULT true,
    
    -- Contact notifications
    notify_external_messages BOOLEAN DEFAULT true,
    notify_vendor_updates BOOLEAN DEFAULT false,
    notify_client_communications BOOLEAN DEFAULT true,
    
    -- Dependency notifications
    notify_dependency_delays BOOLEAN DEFAULT true,
    notify_dependency_completions BOOLEAN DEFAULT true,
    notify_critical_path_changes BOOLEAN DEFAULT true,
    
    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    quiet_hours_timezone TEXT DEFAULT 'UTC',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, tenant_id)
);

-- Appearance settings
CREATE TABLE IF NOT EXISTS user_appearance_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Theme settings
    theme TEXT DEFAULT 'system', -- 'light', 'dark', 'system'
    accent_color TEXT DEFAULT '#7c3aed', -- Purple default
    sidebar_collapsed BOOLEAN DEFAULT false,
    
    -- Layout preferences
    layout_density TEXT DEFAULT 'comfortable', -- 'compact', 'comfortable', 'spacious'
    show_sidebar_labels BOOLEAN DEFAULT true,
    show_project_thumbnails BOOLEAN DEFAULT true,
    cards_per_row INTEGER DEFAULT 3,
    
    -- Font settings
    font_family TEXT DEFAULT 'system', -- 'system', 'sans', 'serif', 'mono'
    font_size TEXT DEFAULT 'medium', -- 'small', 'medium', 'large'
    
    -- Dashboard customization
    dashboard_widgets JSONB DEFAULT '[]'::jsonb,
    dashboard_layout TEXT DEFAULT 'grid', -- 'grid', 'list'
    show_welcome_message BOOLEAN DEFAULT true,
    show_recent_activity BOOLEAN DEFAULT true,
    show_quick_stats BOOLEAN DEFAULT true,
    
    -- Table preferences
    table_row_height TEXT DEFAULT 'medium', -- 'compact', 'medium', 'large'
    table_striped_rows BOOLEAN DEFAULT true,
    table_hover_effects BOOLEAN DEFAULT true,
    
    -- Animation preferences
    enable_animations BOOLEAN DEFAULT true,
    reduce_motion BOOLEAN DEFAULT false,
    
    -- Color customization
    custom_colors JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, tenant_id)
);

-- System contact preferences
CREATE TABLE IF NOT EXISTS user_contact_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Contact visibility
    show_offline_contacts BOOLEAN DEFAULT false,
    auto_add_team_members BOOLEAN DEFAULT true,
    show_contact_status BOOLEAN DEFAULT true,
    
    -- Communication preferences
    default_message_method TEXT DEFAULT 'internal', -- 'internal', 'email', 'sms'
    auto_mark_read BOOLEAN DEFAULT false,
    typing_indicators BOOLEAN DEFAULT true,
    read_receipts BOOLEAN DEFAULT true,
    
    -- External contact settings
    allow_external_contacts BOOLEAN DEFAULT true,
    require_approval_external BOOLEAN DEFAULT false,
    auto_sync_vendor_contacts BOOLEAN DEFAULT true,
    auto_sync_client_contacts BOOLEAN DEFAULT true,
    
    -- Group settings
    create_groups_permission BOOLEAN DEFAULT true,
    join_groups_auto BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, tenant_id)
);

-- Team and dependency notification settings
CREATE TABLE IF NOT EXISTS user_team_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Team visibility
    show_team_activity BOOLEAN DEFAULT true,
    show_team_status BOOLEAN DEFAULT true,
    auto_follow_team_projects BOOLEAN DEFAULT false,
    
    -- Collaboration preferences  
    allow_task_assignments BOOLEAN DEFAULT true,
    allow_project_mentions BOOLEAN DEFAULT true,
    auto_share_updates BOOLEAN DEFAULT false,
    
    -- Dependency tracking
    track_dependencies BOOLEAN DEFAULT true,
    notify_dependency_risks BOOLEAN DEFAULT true,
    show_dependency_timeline BOOLEAN DEFAULT true,
    auto_update_dependent_tasks BOOLEAN DEFAULT false,
    
    -- Meeting and calendar
    auto_add_project_events BOOLEAN DEFAULT true,
    sync_task_deadlines BOOLEAN DEFAULT true,
    working_hours_visible BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, tenant_id)
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_profile_settings_user_tenant ON user_profile_settings(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user_tenant ON user_notification_settings(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_appearance_settings_user_tenant ON user_appearance_settings(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_contact_settings_user_tenant ON user_contact_settings(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_team_settings_user_tenant ON user_team_settings(user_id, tenant_id);

-- =====================================================
-- Row Level Security Policies
-- =====================================================

-- Enable RLS on all settings tables
ALTER TABLE user_profile_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_appearance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_contact_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_team_settings ENABLE ROW LEVEL SECURITY;

-- Profile settings policies
CREATE POLICY "Users can view their own profile settings" ON user_profile_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile settings" ON user_profile_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile settings" ON user_profile_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile settings" ON user_profile_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Notification settings policies
CREATE POLICY "Users can view their own notification settings" ON user_notification_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings" ON user_notification_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings" ON user_notification_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification settings" ON user_notification_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Appearance settings policies
CREATE POLICY "Users can view their own appearance settings" ON user_appearance_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own appearance settings" ON user_appearance_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appearance settings" ON user_appearance_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own appearance settings" ON user_appearance_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Contact settings policies
CREATE POLICY "Users can view their own contact settings" ON user_contact_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contact settings" ON user_contact_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contact settings" ON user_contact_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contact settings" ON user_contact_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Team settings policies
CREATE POLICY "Users can view their own team settings" ON user_team_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own team settings" ON user_team_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own team settings" ON user_team_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own team settings" ON user_team_settings
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to get or create user settings with defaults
CREATE OR REPLACE FUNCTION get_user_settings(p_user_id UUID, p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}';
    profile_settings RECORD;
    notification_settings RECORD;
    appearance_settings RECORD;
    contact_settings RECORD;
    team_settings RECORD;
BEGIN
    -- Get profile settings
    SELECT * INTO profile_settings 
    FROM user_profile_settings 
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;
    
    IF NOT FOUND THEN
        INSERT INTO user_profile_settings (user_id, tenant_id) 
        VALUES (p_user_id, p_tenant_id)
        RETURNING * INTO profile_settings;
    END IF;
    
    -- Get notification settings
    SELECT * INTO notification_settings 
    FROM user_notification_settings 
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;
    
    IF NOT FOUND THEN
        INSERT INTO user_notification_settings (user_id, tenant_id) 
        VALUES (p_user_id, p_tenant_id)
        RETURNING * INTO notification_settings;
    END IF;
    
    -- Get appearance settings
    SELECT * INTO appearance_settings 
    FROM user_appearance_settings 
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;
    
    IF NOT FOUND THEN
        INSERT INTO user_appearance_settings (user_id, tenant_id) 
        VALUES (p_user_id, p_tenant_id)
        RETURNING * INTO appearance_settings;
    END IF;
    
    -- Get contact settings
    SELECT * INTO contact_settings 
    FROM user_contact_settings 
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;
    
    IF NOT FOUND THEN
        INSERT INTO user_contact_settings (user_id, tenant_id) 
        VALUES (p_user_id, p_tenant_id)
        RETURNING * INTO contact_settings;
    END IF;
    
    -- Get team settings
    SELECT * INTO team_settings 
    FROM user_team_settings 
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;
    
    IF NOT FOUND THEN
        INSERT INTO user_team_settings (user_id, tenant_id) 
        VALUES (p_user_id, p_tenant_id)
        RETURNING * INTO team_settings;
    END IF;
    
    -- Build result JSON
    result := jsonb_build_object(
        'profile', row_to_json(profile_settings),
        'notifications', row_to_json(notification_settings),
        'appearance', row_to_json(appearance_settings),
        'contacts', row_to_json(contact_settings),
        'team', row_to_json(team_settings)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update settings section
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
            INSERT INTO user_profile_settings (user_id, tenant_id, job_title, department, bio, timezone, location, linkedin_url, website_url, emergency_contact_name, emergency_contact_phone, work_hours_start, work_hours_end, preferred_language, date_format, time_format)
            VALUES (
                p_user_id, 
                p_tenant_id,
                (p_settings->>'job_title'),
                (p_settings->>'department'),
                (p_settings->>'bio'),
                (p_settings->>'timezone'),
                (p_settings->>'location'),
                (p_settings->>'linkedin_url'),
                (p_settings->>'website_url'),
                (p_settings->>'emergency_contact_name'),
                (p_settings->>'emergency_contact_phone'),
                (p_settings->>'work_hours_start')::TIME,
                (p_settings->>'work_hours_end')::TIME,
                (p_settings->>'preferred_language'),
                (p_settings->>'date_format'),
                (p_settings->>'time_format')
            )
            ON CONFLICT (user_id, tenant_id) DO UPDATE SET
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
            INSERT INTO user_notification_settings (user_id, tenant_id, email_enabled, email_frequency, email_digest, email_project_updates, email_task_reminders, email_messages, email_mentions, email_team_activity, email_system_alerts, push_enabled, push_messages, push_mentions, push_task_reminders, push_project_updates, sms_enabled, sms_urgent_only, sms_task_deadlines, sms_system_alerts, inapp_enabled, inapp_sound, inapp_desktop, notify_team_member_joins, notify_team_member_leaves, notify_role_changes, notify_permission_changes, notify_external_messages, notify_vendor_updates, notify_client_communications, notify_dependency_delays, notify_dependency_completions, notify_critical_path_changes, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_timezone)
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
                (p_settings->>'quiet_hours_start')::TIME,
                (p_settings->>'quiet_hours_end')::TIME,
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
            INSERT INTO user_appearance_settings (user_id, tenant_id, theme, accent_color, sidebar_collapsed, layout_density, show_sidebar_labels, show_project_thumbnails, cards_per_row, font_family, font_size, dashboard_widgets, dashboard_layout, show_welcome_message, show_recent_activity, show_quick_stats, table_row_height, table_striped_rows, table_hover_effects, enable_animations, reduce_motion, custom_colors)
            VALUES (
                p_user_id,
                p_tenant_id,
                (p_settings->>'theme'),
                (p_settings->>'accent_color'),
                (p_settings->>'sidebar_collapsed')::BOOLEAN,
                (p_settings->>'layout_density'),
                (p_settings->>'show_sidebar_labels')::BOOLEAN,
                (p_settings->>'show_project_thumbnails')::BOOLEAN,
                (p_settings->>'cards_per_row')::INTEGER,
                (p_settings->>'font_family'),
                (p_settings->>'font_size'),
                (p_settings->'dashboard_widgets'),
                (p_settings->>'dashboard_layout'),
                (p_settings->>'show_welcome_message')::BOOLEAN,
                (p_settings->>'show_recent_activity')::BOOLEAN,
                (p_settings->>'show_quick_stats')::BOOLEAN,
                (p_settings->>'table_row_height'),
                (p_settings->>'table_striped_rows')::BOOLEAN,
                (p_settings->>'table_hover_effects')::BOOLEAN,
                (p_settings->>'enable_animations')::BOOLEAN,
                (p_settings->>'reduce_motion')::BOOLEAN,
                (p_settings->'custom_colors')
            )
            ON CONFLICT (user_id, tenant_id) DO UPDATE SET
                theme = EXCLUDED.theme,
                accent_color = EXCLUDED.accent_color,
                sidebar_collapsed = EXCLUDED.sidebar_collapsed,
                layout_density = EXCLUDED.layout_density,
                show_sidebar_labels = EXCLUDED.show_sidebar_labels,
                show_project_thumbnails = EXCLUDED.show_project_thumbnails,
                cards_per_row = EXCLUDED.cards_per_row,
                font_family = EXCLUDED.font_family,
                font_size = EXCLUDED.font_size,
                dashboard_widgets = EXCLUDED.dashboard_widgets,
                dashboard_layout = EXCLUDED.dashboard_layout,
                show_welcome_message = EXCLUDED.show_welcome_message,
                show_recent_activity = EXCLUDED.show_recent_activity,
                show_quick_stats = EXCLUDED.show_quick_stats,
                table_row_height = EXCLUDED.table_row_height,
                table_striped_rows = EXCLUDED.table_striped_rows,
                table_hover_effects = EXCLUDED.table_hover_effects,
                enable_animations = EXCLUDED.enable_animations,
                reduce_motion = EXCLUDED.reduce_motion,
                custom_colors = EXCLUDED.custom_colors,
                updated_at = NOW();
        
        WHEN 'contacts' THEN
            INSERT INTO user_contact_settings (user_id, tenant_id, show_offline_contacts, auto_add_team_members, show_contact_status, default_message_method, auto_mark_read, typing_indicators, read_receipts, allow_external_contacts, require_approval_external, auto_sync_vendor_contacts, auto_sync_client_contacts, create_groups_permission, join_groups_auto)
            VALUES (
                p_user_id,
                p_tenant_id,
                (p_settings->>'show_offline_contacts')::BOOLEAN,
                (p_settings->>'auto_add_team_members')::BOOLEAN,
                (p_settings->>'show_contact_status')::BOOLEAN,
                (p_settings->>'default_message_method'),
                (p_settings->>'auto_mark_read')::BOOLEAN,
                (p_settings->>'typing_indicators')::BOOLEAN,
                (p_settings->>'read_receipts')::BOOLEAN,
                (p_settings->>'allow_external_contacts')::BOOLEAN,
                (p_settings->>'require_approval_external')::BOOLEAN,
                (p_settings->>'auto_sync_vendor_contacts')::BOOLEAN,
                (p_settings->>'auto_sync_client_contacts')::BOOLEAN,
                (p_settings->>'create_groups_permission')::BOOLEAN,
                (p_settings->>'join_groups_auto')::BOOLEAN
            )
            ON CONFLICT (user_id, tenant_id) DO UPDATE SET
                show_offline_contacts = EXCLUDED.show_offline_contacts,
                auto_add_team_members = EXCLUDED.auto_add_team_members,
                show_contact_status = EXCLUDED.show_contact_status,
                default_message_method = EXCLUDED.default_message_method,
                auto_mark_read = EXCLUDED.auto_mark_read,
                typing_indicators = EXCLUDED.typing_indicators,
                read_receipts = EXCLUDED.read_receipts,
                allow_external_contacts = EXCLUDED.allow_external_contacts,
                require_approval_external = EXCLUDED.require_approval_external,
                auto_sync_vendor_contacts = EXCLUDED.auto_sync_vendor_contacts,
                auto_sync_client_contacts = EXCLUDED.auto_sync_client_contacts,
                create_groups_permission = EXCLUDED.create_groups_permission,
                join_groups_auto = EXCLUDED.join_groups_auto,
                updated_at = NOW();
        
        WHEN 'team' THEN
            INSERT INTO user_team_settings (user_id, tenant_id, show_team_activity, show_team_status, auto_follow_team_projects, allow_task_assignments, allow_project_mentions, auto_share_updates, track_dependencies, notify_dependency_risks, show_dependency_timeline, auto_update_dependent_tasks, auto_add_project_events, sync_task_deadlines, working_hours_visible)
            VALUES (
                p_user_id,
                p_tenant_id,
                (p_settings->>'show_team_activity')::BOOLEAN,
                (p_settings->>'show_team_status')::BOOLEAN,
                (p_settings->>'auto_follow_team_projects')::BOOLEAN,
                (p_settings->>'allow_task_assignments')::BOOLEAN,
                (p_settings->>'allow_project_mentions')::BOOLEAN,
                (p_settings->>'auto_share_updates')::BOOLEAN,
                (p_settings->>'track_dependencies')::BOOLEAN,
                (p_settings->>'notify_dependency_risks')::BOOLEAN,
                (p_settings->>'show_dependency_timeline')::BOOLEAN,
                (p_settings->>'auto_update_dependent_tasks')::BOOLEAN,
                (p_settings->>'auto_add_project_events')::BOOLEAN,
                (p_settings->>'sync_task_deadlines')::BOOLEAN,
                (p_settings->>'working_hours_visible')::BOOLEAN
            )
            ON CONFLICT (user_id, tenant_id) DO UPDATE SET
                show_team_activity = EXCLUDED.show_team_activity,
                show_team_status = EXCLUDED.show_team_status,
                auto_follow_team_projects = EXCLUDED.auto_follow_team_projects,
                allow_task_assignments = EXCLUDED.allow_task_assignments,
                allow_project_mentions = EXCLUDED.allow_project_mentions,
                auto_share_updates = EXCLUDED.auto_share_updates,
                track_dependencies = EXCLUDED.track_dependencies,
                notify_dependency_risks = EXCLUDED.notify_dependency_risks,
                show_dependency_timeline = EXCLUDED.show_dependency_timeline,
                auto_update_dependent_tasks = EXCLUDED.auto_update_dependent_tasks,
                auto_add_project_events = EXCLUDED.auto_add_project_events,
                sync_task_deadlines = EXCLUDED.sync_task_deadlines,
                working_hours_visible = EXCLUDED.working_hours_visible,
                updated_at = NOW();
                
        ELSE
            RETURN FALSE;
    END CASE;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Triggers for automatic updates
-- =====================================================

CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all settings tables
CREATE TRIGGER update_user_profile_settings_updated_at
    BEFORE UPDATE ON user_profile_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_settings_updated_at();

CREATE TRIGGER update_user_notification_settings_updated_at
    BEFORE UPDATE ON user_notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_settings_updated_at();

CREATE TRIGGER update_user_appearance_settings_updated_at
    BEFORE UPDATE ON user_appearance_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_settings_updated_at();

CREATE TRIGGER update_user_contact_settings_updated_at
    BEFORE UPDATE ON user_contact_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_settings_updated_at();

CREATE TRIGGER update_user_team_settings_updated_at
    BEFORE UPDATE ON user_team_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_settings_updated_at();