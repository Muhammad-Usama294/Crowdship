"use client"

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icon in Leaflet with Next.js
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

import { isInPakistan, PAKISTAN_BOUNDS } from '@/lib/geofencing'
import { useToast } from "@/components/ui/use-toast"

function LocationMarker({ value, onChange }: { value: [number, number] | null, onChange: (pos: [number, number]) => void }) {
    const { toast } = useToast()
    const map = useMapEvents({
        click(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;

            if (isInPakistan(lat, lng)) {
                onChange([lat, lng]);
            } else {
                toast({
                    variant: "destructive",
                    title: "Location restriction",
                    description: "Service available only within Pakistan"
                })
            }
        },
    })

    useEffect(() => {
        if (value) {
            map.flyTo(value, map.getZoom())
        }
    }, [value, map])

    return value ? <Marker position={value} /> : null
}

interface MapPickerProps {
    value?: [number, number];
    onChange: (val: [number, number]) => void;
    className?: string;
}

export default function MapPicker({ value, onChange, className }: MapPickerProps) {
    // Default centered on Pakistan
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return <div className="h-[300px] w-full bg-muted animate-pulse rounded-md" />

    // Pakistan bounds for restricting map view (approximate for viewport)
    const pakistanBounds: [[number, number], [number, number]] = [
        [PAKISTAN_BOUNDS.south, PAKISTAN_BOUNDS.west], // Southwest
        [PAKISTAN_BOUNDS.north, PAKISTAN_BOUNDS.east]  // Northeast
    ];

    return (
        <div className={`h-[300px] w-full rounded-md overflow-hidden relative z-0 ${className}`}>
            <MapContainer
                center={value || [30.3753, 69.3451]}
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
                <LocationMarker value={value || null} onChange={onChange} />
            </MapContainer>
        </div>
    )
}
