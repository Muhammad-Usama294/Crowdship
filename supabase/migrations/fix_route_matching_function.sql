-- Drop existing function
DROP FUNCTION IF EXISTS match_shipments_to_route(TEXT, INTEGER);

-- Create improved function with correct type casting
CREATE OR REPLACE FUNCTION match_shipments_to_route(
    route_geometry TEXT,
    radius_meters INTEGER DEFAULT 5000
)
RETURNS SETOF shipments AS $$
BEGIN
    RETURN QUERY
    SELECT s.*
    FROM shipments s
    WHERE s.status = 'pending'
    AND s.traveler_id IS NULL
    AND (
        -- BOTH pickup AND dropoff must be within radius of the route
        ST_DWithin(
            s.pickup_location::geography,
            ST_GeomFromText(route_geometry, 4326)::geography,
            radius_meters::double precision
        )
        AND
        ST_DWithin(
            s.dropoff_location::geography,
            ST_GeomFromText(route_geometry, 4326)::geography,
            radius_meters::double precision
        )
        AND
        -- Pickup should come before dropoff along the route (direction check)
        -- Both arguments must be geometry type for ST_LineLocatePoint
        ST_LineLocatePoint(
            ST_GeomFromText(route_geometry, 4326),
            s.pickup_location::geometry
        ) < ST_LineLocatePoint(
            ST_GeomFromText(route_geometry, 4326),
            s.dropoff_location::geometry
        )
    )
    ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
