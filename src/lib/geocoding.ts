import { isInPakistan } from './geofencing'

export interface SearchResult {
    display_name: string
    lat: string
    lon: string
    address: {
        city?: string
        state?: string
        country?: string
        road?: string
        suburb?: string
    }
}

/**
 * Search for locations with autocomplete
 * @param query Search query (min 2 characters)
 * @returns Array of up to 5 location results in Pakistan
 */
export async function searchLocations(query: string): Promise<SearchResult[]> {
    // Require minimum 2 characters for search
    if (!query || query.trim().length < 2) {
        return []
    }

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `format=json&q=${encodeURIComponent(query)}&` +
            `countrycodes=pk&limit=10&addressdetails=1&dedupe=0`,
            {
                headers: {
                    'User-Agent': 'AGApp/1.0' // Required by Nominatim
                }
            }
        )

        if (!response.ok) {
            console.error('Search failed:', response.status)
            return []
        }

        const data = await response.json()
        const results = data as SearchResult[]

        // Filter strict polygon check and limit to 5
        return results.filter(r => isInPakistan(parseFloat(r.lat), parseFloat(r.lon))).slice(0, 5)
    } catch (error) {
        console.error('Location search error:', error)
        return []
    }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'AGApp/1.0' // Required by Nominatim
                }
            }
        )

        if (!response.ok) {
            throw new Error('Geocoding failed')
        }

        const data = await response.json()

        // Construct a detailed address
        const addr = data.address
        if (!addr) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`

        // Build comprehensive address: Building/Amenity, House No, Road, Suburb, City, State
        const parts = []

        // Add specific place/building/amenity name if available
        if (data.name && data.name !== addr.road) parts.push(data.name)
        if (addr.amenity) parts.push(addr.amenity)
        if (addr.building) parts.push(addr.building)
        if (addr.shop) parts.push(addr.shop)

        // Add house number and road
        if (addr.house_number && addr.road) {
            parts.push(`${addr.house_number} ${addr.road}`)
        } else if (addr.road) {
            parts.push(addr.road)
        }

        // Add neighborhood/suburb
        if (addr.suburb) parts.push(addr.suburb)
        if (addr.neighbourhood && addr.neighbourhood !== addr.suburb) parts.push(addr.neighbourhood)

        // Add city/town
        const city = addr.city || addr.town || addr.village || addr.municipality
        if (city) parts.push(city)

        // Add state
        if (addr.state) parts.push(addr.state)

        return parts.length > 0 ? parts.join(', ') : data.display_name
    } catch (error) {
        console.error('Reverse geocoding error:', error)
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}` // Fallback to coords
    }
}
