/**
 * Generate a straight-line route between two points
 * Returns WKT LineString format for PostGIS
 */
export function generateStraightLineRoute(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
): string {
    // Create a simple two-point LineString (straight line)
    // Format: LINESTRING(lng lat, lng lat)
    return `LINESTRING(${startLng} ${startLat}, ${endLng} ${endLat})`
}

/**
 * Convert coordinate array to WKT LineString
 * Used for traveler routes from map
 */
export function coordsToLineString(coords: [number, number][]): string {
    // coords are [lat, lng], WKT needs lng lat
    const wktCoords = coords.map(c => `${c[1]} ${c[0]}`).join(', ')
    return `LINESTRING(${wktCoords})`
}
