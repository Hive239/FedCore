# Database Setup Instructions

## Required Database Changes

To ensure the calendar functionality works properly, please run the following SQL command in your Supabase SQL editor:

```sql
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
```

## How to Apply

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the SQL command above
4. Click "Run" to execute the migration

This will add the necessary `trade` column to support trade categorization in calendar events.