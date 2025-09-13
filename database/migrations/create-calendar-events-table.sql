-- Create calendar_events table for the Gantt chart integration

CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location TEXT,
    event_type TEXT,
    all_day BOOLEAN DEFAULT FALSE,
    recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT,
    color TEXT,
    reminder_minutes INTEGER,
    attendees JSONB,
    metadata JSONB,
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_calendar_events_tenant ON calendar_events(tenant_id);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX idx_calendar_events_end_time ON calendar_events(end_time);
CREATE INDEX idx_calendar_events_created_by ON calendar_events(created_by);

-- Enable Row Level Security
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view calendar events in their tenant"
    ON calendar_events
    FOR SELECT
    USING (tenant_id = (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Users can create calendar events in their tenant"
    ON calendar_events
    FOR INSERT
    WITH CHECK (tenant_id = (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Users can update calendar events in their tenant"
    ON calendar_events
    FOR UPDATE
    USING (tenant_id = (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Users can delete calendar events in their tenant"
    ON calendar_events
    FOR DELETE
    USING (tenant_id = (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() LIMIT 1));

-- Create trigger for updated_at
CREATE TRIGGER update_calendar_events_updated_at
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();