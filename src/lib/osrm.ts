/**
 * OSRM Routing Utility
 * Uses local API proxy for route generation to avoid CORS
 */

interface OSRMRoute {
    distance: number // meters
    duration: number // seconds
    geometry: {
        coordinates: [number, number][] // [lng, lat]
    }
}

/**
 * Get route between two points using local proxy
 */
export async function getRoute(
    startLng: number,
    startLat: number,
    endLng: number,
    endLat: number
): Promise<OSRMRoute | null> {
    try {
        // Use local API proxy instead of direct call
        const url = `/api/route?start=${startLng},${startLat}&end=${endLng},${endLat}`

        const response = await fetch(url)

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Routing request failed:', response.status, errorText)
            throw new Error(`Routing request failed: ${response.status} ${errorText}`)
        }

        const data = await response.json()

        if (!data.routes || data.routes.length === 0) {
            console.warn('No route found')
            return null
        }

        return data.routes[0]
    } catch (error) {
        console.error('Routing error:', error)
        return null
    }
}

/**
 * Convert OSRM route coordinates to format needed for database
 * Returns WKT LineString
 */
export function routeToLineString(route: OSRMRoute): string {
    const coords = route.geometry.coordinates
        .map(([lng, lat]) => `${lng} ${lat}`)
        .join(', ')

    return `LINESTRING(${coords})`
}

/**
 * Convert route coordinates to [lat, lng] array format
 */
export function routeToLatLngArray(route: OSRMRoute): [number, number][] {
    return route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
}

/**
 * Generate a straight line route between two points
 * Useful as a fallback or for simple visualisations
 */
export function generateStraightLineRoute(lat1: number, lng1: number, lat2: number, lng2: number): string {
    return `LINESTRING(${lng1} ${lat1}, ${lng2} ${lat2})`
}
