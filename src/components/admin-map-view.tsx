"use client"

import { useRef, useEffect, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { parsePostGISPoint } from '@/lib/parse-wkb'
import { Shipment } from '@/types/database'

const PAKISTAN_BOUNDS = {
    north: 37.0,
    south: 23.5,
    east: 77.5,
    west: 60.0
}

interface AdminMapViewProps {
    shipments: Shipment[]
}

export default function AdminMapView({ shipments }: AdminMapViewProps) {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<maplibregl.Map | null>(null)
    const [mapLoaded, setMapLoaded] = useState(false)
    const markersRef = useRef<maplibregl.Marker[]>([])
    const linesRef = useRef<string[]>([]) // Track line layer IDs

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
        })

        return () => {
            if (map.current) {
                map.current.remove()
                map.current = null
            }
        }
    }, [])

    // Helper to extract coords
    const getCoords = (loc: any): [number, number] | null => {
        if (!loc) return null

        // Try WKB Hex
        if (typeof loc === 'string' && /^[0-9A-Fa-f]+$/.test(loc.replace(/^0x/, ''))) {
            const parsed = parsePostGISPoint(loc)
            if (parsed) return parsed.coordinates // [lng, lat] !! parsePostGISPoint returns [lng, lat]
        }

        // Try WKT
        if (typeof loc === 'string' && loc.startsWith('POINT')) {
            const match = loc.match(/POINT\s*\(([-\d.]+)\s+([-\d.]+)\)/i)
            if (match) {
                return [parseFloat(match[1]), parseFloat(match[2])] // [lng, lat] (WKT usually lng lat)
            }
        }

        if (loc && loc.coordinates && Array.isArray(loc.coordinates)) {
            return loc.coordinates as [number, number]
        }

        return null
    }

    // Render shipments
    useEffect(() => {
        if (!map.current || !mapLoaded) return

        // Cleanup
        markersRef.current.forEach(m => m.remove())
        markersRef.current = []

        linesRef.current.forEach(id => {
            if (map.current?.getLayer(id)) map.current.removeLayer(id)
            if (map.current?.getSource(id)) map.current.removeSource(id)
        })
        linesRef.current = []

        if (shipments.length === 0) return

        const bounds = new maplibregl.LngLatBounds()

        shipments.forEach(shipment => {
            const pickup = getCoords(shipment.pickup_location)
            const dropoff = getCoords(shipment.dropoff_location)

            if (pickup) {
                // Pickup Marker (Blue)
                const el = document.createElement('div')
                el.className = 'w-4 h-4 bg-blue-500 rounded-full border border-white shadow-sm'

                const marker = new maplibregl.Marker({ element: el })
                    .setLngLat(pickup)
                    .setPopup(new maplibregl.Popup().setHTML(`<b>Pickup:</b> ${shipment.title}`))
                    .addTo(map.current!)

                markersRef.current.push(marker)
                bounds.extend(pickup)
            }

            if (dropoff) {
                // Dropoff Marker (Orange)
                const el = document.createElement('div')
                el.className = 'w-4 h-4 bg-orange-500 rounded-full border border-white shadow-sm'

                const marker = new maplibregl.Marker({ element: el })
                    .setLngLat(dropoff)
                    .setPopup(new maplibregl.Popup().setHTML(`<b>Dropoff:</b> ${shipment.title}`))
                    .addTo(map.current!)

                markersRef.current.push(marker)
                bounds.extend(dropoff)
            }

            // Draw connecting line
            if (pickup && dropoff) {
                const lineId = `line-${shipment.id}`
                linesRef.current.push(lineId)

                map.current!.addSource(lineId, {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'LineString',
                            coordinates: [pickup, dropoff]
                        }
                    }
                })

                map.current!.addLayer({
                    id: lineId,
                    type: 'line',
                    source: lineId,
                    paint: {
                        'line-color': '#6b7280', // Gray
                        'line-width': 2,
                        'line-dasharray': [2, 2],
                        'line-opacity': 0.6
                    }
                })
            }
        })

        // Fit bounds if we have points
        if (!bounds.isEmpty()) {
            map.current.fitBounds(bounds, { padding: 50, maxZoom: 12 })
        }

    }, [shipments, mapLoaded])

    return (
        <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    )
}
