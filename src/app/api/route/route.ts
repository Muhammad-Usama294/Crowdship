import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start') // lng,lat
    const end = searchParams.get('end')     // lng,lat

    if (!start || !end) {
        return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })
    }

    const [startLng, startLat] = start.split(',')
    const [endLng, endLat] = end.split(',')

    // Get API key from env
    const apiKey = process.env.NEXT_PUBLIC_GRAPHHOPPER_KEY

    // Fallback if no key is provided (though GraphHopper needs one)
    if (!apiKey) {
        return NextResponse.json({
            error: 'Configuration Error: NEXT_PUBLIC_GRAPHHOPPER_KEY is missing in .env.local'
        }, { status: 500 })
    }

    try {
        // GraphHopper API
        // Format: point=lat,lng&point=lat,lng
        const url = `https://graphhopper.com/api/1/route?point=${startLat},${startLng}&point=${endLat},${endLng}&vehicle=car&locale=en&key=${apiKey}&points_encoded=false`

        console.log('Fetching route from GraphHopper...')

        const response = await fetch(url)

        if (!response.ok) {
            const errorText = await response.text()
            console.error('GraphHopper Error:', response.status, errorText)
            throw new Error(`GraphHopper responded with ${response.status}`)
        }

        const data = await response.json()

        // Transform GraphHopper response to match OSRM structure for frontend compatibility
        // GraphHopper returns: { paths: [{ points: { type: "LineString", coordinates: [...] }, ... }] }
        // OSRM expects: { routes: [{ geometry: { coordinates: [...] }, ... }] }

        if (!data.paths || data.paths.length === 0) {
            return NextResponse.json({ routes: [] })
        }

        const path = data.paths[0]
        const transformedData = {
            routes: [{
                distance: path.distance,
                duration: path.time / 1000, // GH uses ms, OSRM uses seconds
                geometry: path.points // Already GeoJSON if points_encoded=false
            }]
        }

        return NextResponse.json(transformedData)

    } catch (error) {
        console.error('Proxy Error:', error)
        return NextResponse.json({ error: 'Failed to fetch route' }, { status: 500 })
    }
}
