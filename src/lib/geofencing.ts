
import * as turf from '@turf/turf'
import pakistanGeoJson from '@/data/pakistan.json'

// Helper to check if a valid coordinate is inside Pakistan
export function isInPakistan(lat: number, lng: number): boolean {
    try {
        const pt = turf.point([lng, lat])

        // Check against features in the GeoJSON
        for (const feature of (pakistanGeoJson as any).features) {
            if (feature.geometry.type === 'Polygon') {
                const poly = turf.polygon(feature.geometry.coordinates)
                if (turf.booleanPointInPolygon(pt, poly)) return true
            } else if (feature.geometry.type === 'MultiPolygon') {
                const poly = turf.multiPolygon(feature.geometry.coordinates)
                if (turf.booleanPointInPolygon(pt, poly)) return true
            }
        }

        return false
    } catch (error) {
        console.error('Geofencing error:', error)
        // Default to safe side (allow? or deny?) 
        // User requested strict enforcement, so maybe deny. 
        // But for robustness, if check fails, log and maybe false.
        return false
    }
}

export const PAKISTAN_CENTER = { lat: 30.3753, lng: 69.3451 }

// Tightened bounds for Pakistan to cut closer to the border
export const PAKISTAN_BOUNDS = {
    north: 37.5,    // Slightly increased to catch northern areas
    south: 23.5,    // Coastal line
    east: 77.5,     // Eastern border
    west: 60.5      // Western border
}
