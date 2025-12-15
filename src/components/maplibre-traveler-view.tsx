"use client"

import { useRef, useEffect, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getRoute, routeToLatLngArray } from '@/lib/osrm'
import { parsePostGISPoint } from '@/lib/parse-wkb'
import { point, lineString, pointToLineDistance } from '@turf/turf'
import { isInPakistan, PAKISTAN_BOUNDS } from '@/lib/geofencing'
import { useToast } from "@/components/ui/use-toast"

interface MapLibreTravelerViewProps {
    start: [number, number] | null // [lat, lng]
    end: [number, number] | null
    shipments: any[]
    onMapClick: (lat: number, lng: number) => void
    onRouteFound: (coords: [number, number][]) => void
    onFilteredShipmentsChange?: (filteredIds: string[]) => void
}

export default function MapLibreTravelerView({
    start,
    end,
    shipments,
    onMapClick,
    onRouteFound,
    onFilteredShipmentsChange
}: MapLibreTravelerViewProps) {
    const { toast } = useToast()
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<maplibregl.Map | null>(null)
    const startMarker = useRef<maplibregl.Marker | null>(null)
    const endMarker = useRef<maplibregl.Marker | null>(null)
    const [mapLoaded, setMapLoaded] = useState(false)

    // Keep track of current shipments to render (filtered or all)
    const [filteredShipments, setFilteredShipments] = useState<any[]>([])

    // Notify parent when filtering changes
    useEffect(() => {
        if (onFilteredShipmentsChange) {
            onFilteredShipmentsChange(filteredShipments.map(s => s.id))
        }
    }, [filteredShipments, onFilteredShipmentsChange])


    // Ref to hold latest onMapClick to avoid re-initializing map when handler changes
    const onMapClickRef = useRef(onMapClick)

    useEffect(() => {
        onMapClickRef.current = onMapClick
    }, [onMapClick])

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current || map.current) return

        const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY || 'GET_YOUR_KEY_FROM_MAPTILER'

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: `https://api.maptiler.com/maps/openstreetmap/style.json?key=${apiKey}`,
            center: [69.3451, 30.3753], // Pakistan center
            zoom: 5,
            maxBounds: [
                [PAKISTAN_BOUNDS.west, PAKISTAN_BOUNDS.south],
                [PAKISTAN_BOUNDS.east, PAKISTAN_BOUNDS.north]
            ]
        })

        map.current.on('load', () => {
            setMapLoaded(true)

            // Add route source and layer
            map.current!.addSource('route', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: []
                    }
                }
            })

            map.current!.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#ef4444', // Bright Red
                    'line-width': 5,
                    'line-opacity': 0.8
                }
            })
        })

        // Add click handler
        map.current.on('click', (e) => {
            const { lng, lat } = e.lngLat

            if (isInPakistan(lat, lng)) {
                onMapClickRef.current(lat, lng)
            } else {
                toast({
                    variant: "destructive",
                    title: "Location restriction",
                    description: "Please select a location within Pakistan"
                })
            }
        })

        return () => {
            if (map.current) {
                map.current.remove()
                map.current = null
            }
        }
        // Removed onMapClick dependency to prevent re-init
    }, [])

    // Update markers
    useEffect(() => {
        if (!map.current || !mapLoaded) return

        // Start marker
        if (startMarker.current) {
            startMarker.current.remove()
        }
        if (start) {
            startMarker.current = new maplibregl.Marker({ color: '#22c55e' })
                .setLngLat([start[1], start[0]])
                .addTo(map.current)
        }

        // End marker
        if (endMarker.current) {
            endMarker.current.remove()
        }
        if (end) {
            endMarker.current = new maplibregl.Marker({ color: '#ef4444' })
                .setLngLat([end[1], end[0]])
                .addTo(map.current)
        }
    }, [start, end, mapLoaded])

    // State to hold the current route geometry for filtering
    const [routeGeometry, setRouteGeometry] = useState<any>(null)

    // Helper to parse location
    const parseLoc = (loc: any) => {
        if (!loc) return null
        if (typeof loc === 'string') return parsePostGISPoint(loc)
        if (loc.coordinates) return { coordinates: loc.coordinates }
        return null
    }

    // Effect 1: Fetch Route when Start/End changes
    const lastRouteKey = useRef<string>('')

    useEffect(() => {
        if (!map.current || !mapLoaded || !start || !end) return

        const routeKey = `${start[0]},${start[1]}-${end[0]},${end[1]}`
        if (lastRouteKey.current === routeKey) return
        lastRouteKey.current = routeKey

        const fetchRoute = async () => {
            console.log('Fetching traveler route...')
            const route = await getRoute(start[1], start[0], end[1], end[0])

            if (route && map.current) {
                // Save geometry for filtering
                setRouteGeometry(route.geometry)

                // Draw Route on Map
                if (!map.current.getSource('route')) {
                    // Source creation handled in 'load' but safe to re-check if needed
                }
                const source = map.current.getSource('route') as maplibregl.GeoJSONSource
                if (source) {
                    source.setData({
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'LineString',
                            coordinates: route.geometry.coordinates
                        }
                    } as GeoJSON.Feature)
                }

                // Fit bounds
                const coordinates = route.geometry.coordinates
                const bounds = coordinates.reduce(
                    (bounds, coord) => bounds.extend(coord as [number, number]),
                    new maplibregl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number])
                )
                map.current.fitBounds(bounds, { padding: 50 })
                onRouteFound(routeToLatLngArray(route))
            }
        }

        fetchRoute()
    }, [start, end, mapLoaded])


    // Effect 2: Filter Shipments when Route OR Shipments change
    useEffect(() => {
        // If we don't have a route yet, we can't filter. 
        // Showing "All" or "None" is a design choice. 
        // Given the user wants to see matches ON the route, we should probably show none? 
        // Or if start/end aren't set, show all.
        // Let's stick to: If Start+End Set -> Filter. Else -> Show All.

        if (!start || !end) {
            setFilteredShipments(shipments)
            return
        }

        if (!routeGeometry) {
            // Route is calculating... wait.
            return
        }

        console.log(`Filtering ${shipments.length} packages against route...`)

        const routeLine = lineString(routeGeometry.coordinates)

        const matches = shipments.filter(shipment => {
            const pickup = parseLoc(shipment.pickup_location)
            const dropoff = parseLoc(shipment.dropoff_location)

            if (!pickup || !dropoff) return false

            // Create Turf Points
            const pickupPoint = point(pickup.coordinates)
            const dropoffPoint = point(dropoff.coordinates)

            // Calculate distances (default units: kilometers)
            const distSender = pointToLineDistance(pickupPoint, routeLine, { units: 'kilometers' })
            const distReceiver = pointToLineDistance(dropoffPoint, routeLine, { units: 'kilometers' })

            // Threshold: 5 km
            const isMatch = distSender <= 5.0 && distReceiver <= 5.0

            if (isMatch) {
                console.log(`✅ MATCH: ${shipment.title} (S: ${distSender.toFixed(2)}km, R: ${distReceiver.toFixed(2)}km)`)
            } else {
                // specific debug for the "exact" package
                // console.log(`❌ SKIP: ${shipment.title} (S: ${distSender.toFixed(2)}km, R: ${distReceiver.toFixed(2)}km)`)
            }

            return isMatch
        })

        console.log(`Filter complete. Found ${matches.length} matches.`)
        setFilteredShipments(matches)

    }, [routeGeometry, shipments, start, end])


    // Add shipment markers & routes (using filteredShipments)
    const shipmentMarkers = useRef<maplibregl.Marker[]>([])
    // Also track layer IDs to clean them up
    const routeLayerIds = useRef<string[]>([])

    useEffect(() => {
        if (!map.current || !mapLoaded) return

        // 1. Cleanup Markers
        shipmentMarkers.current.forEach(marker => marker.remove())
        shipmentMarkers.current = []

        // 2. Cleanup Old Routes
        routeLayerIds.current.forEach(id => {
            if (map.current?.getLayer(id)) map.current.removeLayer(id)
            if (map.current?.getSource(id)) map.current.removeSource(id)
        })
        routeLayerIds.current = []

        console.log('Rendering filtered shipments:', filteredShipments.length)

        // 3. Render
        filteredShipments.forEach(async (shipment) => {
            const pickupLoc = parseLoc(shipment.pickup_location)
            const dropoffLoc = parseLoc(shipment.dropoff_location)

            // --- Draw Pickup Marker ---
            if (pickupLoc) {
                const [lng, lat] = pickupLoc.coordinates
                const el = document.createElement('div')
                el.className = 'w-8 h-8 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white cursor-pointer shadow-lg hover:scale-110 transition-transform'
                el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>'

                const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
                    <div class="min-w-[200px] p-2">
                        <span class="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded">PICKUP</span>
                        <h3 class="font-bold text-sm mt-1">${shipment.title}</h3>
                        <p class="font-bold text-green-600">PKR ${Math.round(shipment.offer_price * 0.90)}</p>
                    </div>`)

                const marker = new maplibregl.Marker({ element: el })
                    .setLngLat([lng, lat])
                    .setPopup(popup)
                    .addTo(map.current!)
                shipmentMarkers.current.push(marker)
            }

            // --- Draw Dropoff Marker ---
            if (dropoffLoc) {
                const [lng, lat] = dropoffLoc.coordinates
                const el = document.createElement('div')
                el.className = 'w-6 h-6 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center text-white cursor-pointer shadow-lg opacity-90'
                el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>'

                const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
                    <div class="p-2">
                         <span class="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-0.5 rounded">DROPOFF</span>
                         <h3 class="font-bold text-sm mt-1">${shipment.title}</h3>
                    </div>`)

                const marker = new maplibregl.Marker({ element: el })
                    .setLngLat([lng, lat])
                    .setPopup(popup)
                    .addTo(map.current!)
                shipmentMarkers.current.push(marker)
            }

            // --- Draw Route ---
            if (pickupLoc && dropoffLoc) {
                try {
                    const route = await getRoute(pickupLoc.coordinates[0], pickupLoc.coordinates[1], dropoffLoc.coordinates[0], dropoffLoc.coordinates[1])
                    if (route && map.current) {
                        const routeId = `shipment-route-${shipment.id}`
                        routeLayerIds.current.push(routeId)

                        // Clean if exists
                        if (map.current.getLayer(routeId)) map.current.removeLayer(routeId)
                        if (map.current.getSource(routeId)) map.current.removeSource(routeId)

                        map.current.addSource(routeId, {
                            type: 'geojson',
                            data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.geometry.coordinates } }
                        })
                        map.current.addLayer({
                            id: routeId,
                            type: 'line',
                            source: routeId,
                            layout: { 'line-join': 'round', 'line-cap': 'round' },
                            paint: {
                                'line-color': '#166534', // Dark Green
                                'line-width': 4,
                                'line-dasharray': [2, 2],
                                'line-opacity': 0.8
                            }
                        })
                    }
                } catch (e) { console.error(e) }
            }
        })
    }, [filteredShipments, mapLoaded])

    return (
        <div
            ref={mapContainer}
            style={{ width: '100%', height: '100%', minHeight: '500px' }}
        />
    )
}
