"use client"
import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-routing-machine'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'

interface RouteMapProps {
    start: [number, number] | null
    end: [number, number] | null
    onRouteFound?: (coordinates: [number, number][]) => void
}

export default function RouteMap({ start, end, onRouteFound }: RouteMapProps) {
    const map = useMap()

    useEffect(() => {
        if (!start || !end) return

        // @ts-ignore - leaflet-routing-machine types might be missing or L.Routing not typed
        const routingControl = L.Routing.control({
            waypoints: [
                L.latLng(start[0], start[1]),
                L.latLng(end[0], end[1])
            ],
            lineOptions: {
                styles: [{ color: '#6366f1', opacity: 0.8, weight: 6 }]
            },
            show: false, // hide instructions
            addWaypoints: false,
            routeWhileDragging: false,
            fitSelectedRoutes: true,
            createMarker: function () { return null; } // We'll handle markers ourselves or let it be
        }).addTo(map)

        routingControl.on('routesfound', function (e: any) {
            const routes = e.routes
            const route = routes[0]
            const coordinates = route.coordinates.map((c: any) => [c.lat, c.lng] as [number, number])

            if (onRouteFound) {
                onRouteFound(coordinates)
            }
        })

        return () => {
            try {
                map.removeControl(routingControl)
            } catch (e) {
                // cleanup might fail if map is destroyed
            }
        }
    }, [map, start, end]) // eslint-disable-line react-hooks/exhaustive-deps

    return null
}
