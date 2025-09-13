-- Add trade column to schedule_events table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'schedule_events' 
        AND column_name = 'trade'
    ) THEN
        ALTER TABLE schedule_events 
        ADD COLUMN trade TEXT;
    END IF;
END $$;

-- Add index for trade column for better query performance
CREATE INDEX IF NOT EXISTS idx_schedule_events_trade ON schedule_events(trade);

-- Add comment to describe the column
COMMENT ON COLUMN schedule_events.trade IS 'Trade or category associated with the event (e.g., Electrical, Plumbing, HVAC)';