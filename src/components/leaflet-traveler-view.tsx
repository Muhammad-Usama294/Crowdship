
"use client"

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { getRoute, routeToLatLngArray } from '@/lib/osrm'
import { parsePostGISPoint } from '@/lib/parse-wkb'
import { point, lineString, pointToLineDistance } from '@turf/turf'
import { PAKISTAN_BOUNDS, isInPakistan } from '@/lib/geofencing'
import { useToast } from "@/components/ui/use-toast"
import { Layers } from "lucide-react"
import { Button } from "@/components/ui/button"

// Fix Leaflet's default icon path issues in Next.js
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LeafletTravelerViewProps {
    start: [number, number] | null // [lat, lng]
    end: [number, number] | null // [lat, lng]
    shipments: any[]
    onMapClick: (lat: number, lng: number) => void
    onRouteFound: (coords: [number, number][]) => void
    onFilteredShipmentsChange?: (filteredIds: string[]) => void
}

// Controller component to handle map events and view updates
function MapController({
    start,
    end,
    routeCoords,
    onMapClick
}: {
    start: [number, number] | null,
    end: [number, number] | null,
    routeCoords: [number, number][],
    onMapClick: (lat: number, lng: number) => void
}) {
    const map = useMap()
    const { toast } = useToast()

    useMapEvents({
        click(e) {
            // Check if inside Pakistan
            if (!isInPakistan(e.latlng.lat, e.latlng.lng)) {
                toast({
                    variant: "destructive",
                    title: "Location not supported",
                    description: "Please select a location within Pakistan."
                })
                return
            }
            onMapClick(e.latlng.lat, e.latlng.lng)
        }
    })

    useEffect(() => {
        if (routeCoords.length > 0) {
            const bounds = L.latLngBounds(routeCoords)
            map.fitBounds(bounds, { padding: [50, 50] })
        } else if (start && end) {
            const bounds = L.latLngBounds([start, end])
            map.fitBounds(bounds, { padding: [50, 50] })
        } else if (start) {
            // Only set view if not already close to start (prevent annoying snaps)
            const currentCenter = map.getCenter()
            const dist = map.distance(currentCenter, L.latLng(start))
            if (dist > 1000) { // Only recenter if > 1km away
                map.setView(start, 12)
            }
        }
    }, [start?.[0], start?.[1], end?.[0], end?.[1], routeCoords, map])

    return null
}

export default function LeafletTravelerView({
    start,
    end,
    shipments,
    onMapClick,
    onRouteFound,
    onFilteredShipmentsChange
}: LeafletTravelerViewProps) {
    const [filteredShipments, setFilteredShipments] = useState<any[]>([])
    const [routeGeometry, setRouteGeometry] = useState<any>(null) // [lng, lat] for Turf
    const [displayRoute, setDisplayRoute] = useState<[number, number][]>([]) // [lat, lng] for Leaflet
    const [mapStyle, setMapStyle] = useState<'esri' | 'osm'>('esri')

    // Effect: Fetch Route
    const lastRouteKey = useRef<string>('')
    useEffect(() => {
        if (!start || !end) {
            setDisplayRoute([])
            setRouteGeometry(null)
            return
        }

        const routeKey = `${start[0]},${start[1]}-${end[0]},${end[1]}`
        if (lastRouteKey.current === routeKey) return
        lastRouteKey.current = routeKey

        const fetchRoute = async () => {
            console.log('Fetching traveler route (Leaflet)...')
            // OSRM expects [lng, lat]
            const route = await getRoute(start[1], start[0], end[1], end[0])

            if (route) {
                setRouteGeometry(route.geometry)

                // Convert to [lat, lng] for Leaflet
                const latLngs = route.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number])
                setDisplayRoute(latLngs)
                onRouteFound(latLngs)
            }
        }

        fetchRoute()
    }, [start, end, onRouteFound])

    // Effect: Filter Shipments
    useEffect(() => {
        if (!start || !end) {
            setFilteredShipments(shipments)
            return
        }

        if (!routeGeometry) return

        console.log(`Filtering ${shipments.length} packages against route...`)
        const routeLine = lineString(routeGeometry.coordinates)

        const matches = shipments.filter(shipment => {
            const pickup = parseLoc(shipment.pickup_location)
            const dropoff = parseLoc(shipment.dropoff_location)

            if (!pickup || !dropoff) return false

            const pickupPoint = point(pickup.coordinates) // [lng, lat]
            const dropoffPoint = point(dropoff.coordinates)

            const distSender = pointToLineDistance(pickupPoint, routeLine, { units: 'kilometers' })
            const distReceiver = pointToLineDistance(dropoffPoint, routeLine, { units: 'kilometers' })

            return distSender <= 5.0 && distReceiver <= 5.0
        })

        setFilteredShipments(matches)
        if (onFilteredShipmentsChange) {
            onFilteredShipmentsChange(matches.map(s => s.id))
        }

    }, [routeGeometry, shipments, start, end, onFilteredShipmentsChange])

    // State for shipment routes
    const [shipmentRoutes, setShipmentRoutes] = useState<Record<string, [number, number][]>>({})

    // Effect: Fetch individual shipment routes
    useEffect(() => {
        const fetchShipmentRoutes = async () => {
            const newRoutes: Record<string, [number, number][]> = {}

            // Process in parallel
            await Promise.all(filteredShipments.map(async (shipment) => {
                const pickup = parseLoc(shipment.pickup_location)
                const dropoff = parseLoc(shipment.dropoff_location)

                if (pickup && dropoff) {
                    // getRoute expects [lng, lat], and pickup/dropoff.coordinates is [lng, lat]
                    const route = await getRoute(pickup.coordinates[0], pickup.coordinates[1], dropoff.coordinates[0], dropoff.coordinates[1])
                    if (route) {
                        // Convert to [lat, lng] for Leaflet
                        newRoutes[shipment.id] = route.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number])
                    }
                }
            }))

            setShipmentRoutes(newRoutes)
        }

        if (filteredShipments.length > 0) {
            fetchShipmentRoutes()
        } else {
            setShipmentRoutes({})
        }
    }, [filteredShipments])

    // Helper to parse location
    const parseLoc = (loc: any) => {
        if (!loc) return null
        if (typeof loc === 'string') return parsePostGISPoint(loc)
        if (loc.coordinates) return { coordinates: loc.coordinates }
        return null
    }

    // Custom Icons
    const createCustomIcon = (color: string, label: string) => {
        return L.divIcon({
            className: 'custom-div-icon',
            html: `
                <div class="relative w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white" style="background-color: ${color}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        ${label === 'PICKUP'
                    ? '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>'
                    : '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>'}
                    </svg>
                </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        })
    }

    const pickupIcon = createCustomIcon('#3b82f6', 'PICKUP')
    const dropoffIcon = createCustomIcon('#f97316', 'DROPOFF')
    const startIcon = createCustomIcon('#22c55e', 'PICKUP') // Reusing shape for Start
    const endIcon = createCustomIcon('#ef4444', 'DROPOFF') // Reusing shape for End

    return (
        <MapContainer
            center={[30.3753, 69.3451]} // Pakistan Center
            zoom={6}
            minZoom={6}
            style={{ width: '100%', height: '100%' }}
            maxBounds={[
                [PAKISTAN_BOUNDS.south, PAKISTAN_BOUNDS.west],
                [PAKISTAN_BOUNDS.north, PAKISTAN_BOUNDS.east]
            ]}
            maxBoundsViscosity={1.0}
        >

            <TileLayer
                attribution={mapStyle === 'esri'
                    ? 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
                    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }
                url={mapStyle === 'esri'
                    ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                }
            />

            {/* Map Style Switcher Control */}
            <div className="leaflet-top leaflet-right">
                <div
                    className="leaflet-control leaflet-bar m-4"
                    ref={(node) => {
                        if (node) {
                            L.DomEvent.disableClickPropagation(node)
                        }
                    }}
                >
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-10 w-10 bg-background/90 backdrop-blur-sm shadow-md hover:bg-background border-2 border-muted"
                        onClick={(e) => {
                            e.stopPropagation() // Prevent React bubbling
                            setMapStyle(prev => prev === 'esri' ? 'osm' : 'esri')
                        }}
                        title={`Switch to ${mapStyle === 'esri' ? 'OpenStreetMap' : 'Esri Street Map'}`}
                    >
                        <Layers className="h-5 w-5 text-foreground" />
                    </Button>
                </div>
            </div>

            <MapController
                start={start}
                end={end}
                routeCoords={displayRoute}
                onMapClick={onMapClick}
            />

            {/* Start/End Markers */}
            {start && <Marker position={start} icon={startIcon} />}
            {end && <Marker position={end} icon={endIcon} />}

            {/* Route Polyline (Traveler) */}
            {displayRoute.length > 0 && (
                <Polyline
                    positions={displayRoute}
                    color="#ef4444"
                    weight={5}
                    opacity={0.8}
                />
            )}

            {/* Shipment Routes (Green Dashed) */}
            {Object.entries(shipmentRoutes).map(([id, positions]) => (
                <Polyline
                    key={`route-${id}`}
                    positions={positions}
                    color="#166534" // Dark Green
                    weight={4}
                    opacity={0.8}
                    dashArray={[10, 10]} // Dashed line
                />
            ))}

            {/* Shipment Markers */}
            {filteredShipments.map(shipment => {
                const pickupLoc = parseLoc(shipment.pickup_location)
                const dropoffLoc = parseLoc(shipment.dropoff_location)

                return (
                    <div key={shipment.id}>
                        {pickupLoc && (
                            <Marker
                                position={[pickupLoc.coordinates[1], pickupLoc.coordinates[0]]}
                                icon={pickupIcon}
                            >
                                <Popup>
                                    <div className="min-w-[200px] p-2">
                                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded">PICKUP</span>
                                        <h3 className="font-bold text-sm mt-1">{shipment.title}</h3>
                                        <p className="font-bold text-green-600">PKR {Math.round(shipment.offer_price * 0.90)}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        )}
                        {dropoffLoc && (
                            <Marker
                                position={[dropoffLoc.coordinates[1], dropoffLoc.coordinates[0]]}
                                icon={dropoffIcon}
                            >
                                <Popup>
                                    <div className="p-2">
                                        <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-0.5 rounded">DROPOFF</span>
                                        <h3 className="font-bold text-sm mt-1">{shipment.title}</h3>
                                    </div>
                                </Popup>
                            </Marker>
                        )}
                    </div>
                )
            })}
        </MapContainer>
    )
}
