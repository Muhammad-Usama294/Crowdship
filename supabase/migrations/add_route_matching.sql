-- Add route geometry column to shipments table
ALTER TABLE shipments
ADD COLUMN IF NOT EXISTS pickup_route GEOMETRY(LineString, 4326);

-- Create spatial index for faster route queries
CREATE INDEX IF NOT EXISTS idx_shipments_pickup_route 
ON shipments USING GIST(pickup_route);

-- Create RPC function to match shipments along a traveler's route
CREATE OR REPLACE FUNCTION match_shipments_to_route(
    route_geometry TEXT,
    radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
    id UUID,
    sender_id UUID,
    title TEXT,
    description TEXT,
    weight_kg NUMERIC,
    pickup_address TEXT,
    pickup_location GEOMETRY,
    dropoff_address TEXT,
    dropoff_location GEOMETRY,
    status TEXT,
    offer_price NUMERIC,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.sender_id,
        s.title,
        s.description,
        s.weight_kg,
        s.pickup_address,
        s.pickup_location,
        s.dropoff_address,
        s.dropoff_location,
        s.status,
        s.offer_price,
        s.created_at
    FROM shipments s
    WHERE s.status = 'pending'
    AND s.traveler_id IS NULL
    AND (
        -- Check if pickup point is within radius of the route
        ST_DWithin(
            s.pickup_location::geography,
            ST_GeomFromText(route_geometry, 4326)::geography,
            radius_meters
        )
        OR
        -- Check if dropoff point is within radius of the route
        ST_DWithin(
            s.dropoff_location::geography,
            ST_GeomFromText(route_geometry, 4326)::geography,
            radius_meters
        )
    )
    ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
