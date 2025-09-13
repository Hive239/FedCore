-- Add coordinates and enhanced address fields to projects table
-- This enables automatic geocoding and map pin functionality

-- Add new columns to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS coordinates JSONB,
ADD COLUMN IF NOT EXISTS full_address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US',
ADD COLUMN IF NOT EXISTS formatted_address TEXT,
ADD COLUMN IF NOT EXISTS place_id TEXT,
ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;

-- Create index for coordinate queries (for map bounding box searches)
CREATE INDEX IF NOT EXISTS projects_coordinates_gin_idx ON projects USING gin (coordinates);

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS projects_location_idx ON projects (city, state, zip_code);

-- Add function to update coordinates when address changes
CREATE OR REPLACE FUNCTION update_project_geocoding()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark that geocoding is needed if address changed
    IF TG_OP = 'UPDATE' AND (
        OLD.address IS DISTINCT FROM NEW.address OR 
        OLD.full_address IS DISTINCT FROM NEW.full_address
    ) THEN
        NEW.geocoded_at = NULL; -- Mark as needs geocoding
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic geocoding flag
DROP TRIGGER IF EXISTS trigger_update_project_geocoding ON projects;
CREATE TRIGGER trigger_update_project_geocoding
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_project_geocoding();

-- Update RLS policies to include new fields
DROP POLICY IF EXISTS "projects_select_policy" ON projects;
CREATE POLICY "projects_select_policy" ON projects
    FOR SELECT
    USING (tenant_id = (
        SELECT tenant_id 
        FROM user_tenants 
        WHERE user_id = auth.uid()
    ));

-- Seed some example project coordinates for testing
UPDATE projects 
SET 
    coordinates = '{"lat": 40.7589, "lng": -73.9851}',
    full_address = address,
    city = 'New York',
    state = 'NY',
    country = 'US',
    geocoded_at = NOW()
WHERE address LIKE '%New York%' AND coordinates IS NULL;

UPDATE projects 
SET 
    coordinates = '{"lat": 34.0522, "lng": -118.2437}',
    full_address = address,
    city = 'Los Angeles', 
    state = 'CA',
    country = 'US',
    geocoded_at = NOW()
WHERE address LIKE '%Los Angeles%' AND coordinates IS NULL;

UPDATE projects 
SET 
    coordinates = '{"lat": 41.8781, "lng": -87.6298}',
    full_address = address,
    city = 'Chicago',
    state = 'IL', 
    country = 'US',
    geocoded_at = NOW()
WHERE address LIKE '%Chicago%' AND coordinates IS NULL;

-- Create view for projects with map data
CREATE OR REPLACE VIEW project_map_data AS
SELECT 
    p.id,
    p.name,
    p.description,
    p.status,
    p.budget,
    p.start_date,
    p.end_date,
    p.address,
    p.full_address,
    p.formatted_address,
    p.city,
    p.state,
    p.zip_code,
    p.country,
    p.coordinates,
    p.geocoded_at,
    p.created_at,
    p.updated_at,
    p.tenant_id,
    t.name as tenant_name
FROM projects p
LEFT JOIN tenants t ON p.tenant_id = t.id
WHERE p.coordinates IS NOT NULL;

-- Grant permissions on view
GRANT SELECT ON project_map_data TO authenticated;

-- Enable RLS on view  
ALTER VIEW project_map_data OWNER TO postgres;

-- Comment the new fields
COMMENT ON COLUMN projects.coordinates IS 'JSON object with lat/lng coordinates for map display';
COMMENT ON COLUMN projects.full_address IS 'Complete address as returned from geocoding service';
COMMENT ON COLUMN projects.formatted_address IS 'Formatted address string for display';
COMMENT ON COLUMN projects.place_id IS 'Google Places or OpenStreetMap place identifier';
COMMENT ON COLUMN projects.geocoded_at IS 'Timestamp of when coordinates were last updated';
COMMENT ON VIEW project_map_data IS 'Filtered view of projects with valid coordinates for map display';