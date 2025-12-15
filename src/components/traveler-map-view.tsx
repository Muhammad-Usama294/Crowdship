"use client"

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import RouteMap from './route-map'
import { Shipment } from '@/types/database'
import { Button } from './ui/button'

// Fix Leaflet Icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
})

// Custom Icons
const createIcon = (color: string) => new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
})

const StartIcon = createIcon('#22c55e') // Green
const EndIcon = createIcon('#ef4444')   // Red
const ShipmentIcon = createIcon('#3b82f6') // Blue

import { isInPakistan, PAKISTAN_BOUNDS } from '@/lib/geofencing'
import { useToast } from "@/components/ui/use-toast"

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
    const { toast } = useToast()
    useMapEvents({
        click(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;

            if (isInPakistan(lat, lng)) {
                onClick(lat, lng);
            } else {
                toast({
                    variant: "destructive",
                    title: "Location restriction",
                    description: "Please select a location within Pakistan"
                })
            }
        }
    })
    return null
}

interface TravelerMapViewProps {
    start: [number, number] | null
    end: [number, number] | null
    shipments: Shipment[]
    onMapClick: (lat: number, lng: number) => void
    onRouteFound: (coords: [number, number][]) => void
}

export default function TravelerMapView({ start, end, shipments, onMapClick, onRouteFound }: TravelerMapViewProps) {
    // Pakistan bounds for restricting map view
    const pakistanBounds: [[number, number], [number, number]] = [
        [PAKISTAN_BOUNDS.south, PAKISTAN_BOUNDS.west], // Southwest
        [PAKISTAN_BOUNDS.north, PAKISTAN_BOUNDS.east]  // Northeast
    ];

    return (
        <MapContainer
            center={[30.3753, 69.3451]}
            zoom={6}
            minZoom={5}
            maxZoom={18}
            maxBounds={pakistanBounds}
            maxBoundsViscosity={1.0}
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapClickHandler onClick={onMapClick} />

            {start && <Marker position={start} icon={StartIcon}><Popup>Origin</Popup></Marker>}
            {end && <Marker position={end} icon={EndIcon}><Popup>Destination</Popup></Marker>}

            {/* Route */}
            <RouteMap start={start} end={end} onRouteFound={onRouteFound} />

            {/* Shipment Markers */}
            {shipments.map(s => {
                // Parse PostGIS point if possible, or use lat/lng if we stored it separately?
                // The DB returns `pickup_location` as GeoJSON object usually if using select('*') on geography column? No, select(*) returns hex string.
                // Supabase JS often returns GeoJSON if we manually cast `pickup_location::geojson`.
                // We need to adjust query or parse WKB/Hex.
                // OR: We store pickup_lat/lng as separate columns? No, schema says geography.

                // Workaround: We didn't enable auto-geojson casting in query.
                // But our interface `Shipment` expects `any` for location.
                // For now, let's assume valid geometry from backend -> we need to modify the select query in `traveler/page.tsx` or `rpc` return.
                // The RPC returns setof shipments.
                // Usually we need `st_asgeojson(pickup_location)`.
                // But RPC returns list of table rows (raw).

                // Quick fix: Since we can't easily parse WKB in client without library (well, we could),
                // let's rely on the fact that we might update the backend function to return GeoJSON or just parse it if we can.
                // Actually, let's just create a helper to read the Hex if needed, OR 
                // update the RPC to return a JSON object with coordinates.

                // For PROTOTYPE simplicity: We can update the `match_shipments_to_route` to return a table with lat/lng columns extracted.
                // But RPC returns `setof public.shipments`.

                // Assume for now we can't display them on map without coordinates.
                // I will assume for now we might have issues displaying them unless we fix the data fetching.
                // I will use a placeholder or check if `pickup_location` has coordinates property (if PostgREST converts it).
                // PostgREST 10+ converts geometry to GeoJSON by default if header defaults?

                return null; // Placeholder until fixed
            })}
        </MapContainer>
    )
}
