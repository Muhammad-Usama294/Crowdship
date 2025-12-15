"use client"

import { useRef, useEffect, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { searchLocations, SearchResult } from '@/lib/geocoding'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MapPin, Search } from 'lucide-react'
import { isInPakistan, PAKISTAN_BOUNDS } from '@/lib/geofencing'
import { useToast } from "@/components/ui/use-toast"

interface MapLibrePickerProps {
    value?: [number, number] // [lat, lng]
    onChange?: (pos: [number, number]) => void
    placeholder?: string
    enableSearch?: boolean
}

export default function MapLibrePicker({
    value,
    onChange,
    placeholder = "Search location in Pakistan...",
    enableSearch = true
}: MapLibrePickerProps) {
    const { toast } = useToast()
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<maplibregl.Map | null>(null)
    const marker = useRef<maplibregl.Marker | null>(null)
    const [mapLoaded, setMapLoaded] = useState(false)

    // Search state
    const [searchQuery, setSearchQuery] = useState("")
    const [suggestions, setSuggestions] = useState<SearchResult[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [isSearching, setIsSearching] = useState(false)
    const [isMapClickMode, setIsMapClickMode] = useState(false)

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

        map.current.on('load', () => setMapLoaded(true))

        // Add click handler (only when in map click mode)
        map.current.on('click', (e) => {
            if (!isMapClickMode) return

            const { lng, lat } = e.lngLat

            if (isInPakistan(lat, lng)) {
                onChange?.([lat, lng])
            } else {
                toast({
                    variant: "destructive",
                    title: "Location restriction",
                    description: "Please select a location within Pakistan"
                })
            }
        })

        // Cleanup
        return () => {
            if (map.current) {
                map.current.remove()
                map.current = null
            }
        }
    }, [onChange, isMapClickMode])

    // Debounced search
    useEffect(() => {
        if (!enableSearch || searchQuery.length < 3) {
            setSuggestions([])
            setShowSuggestions(false)
            return
        }

        setIsSearching(true)
        const timer = setTimeout(async () => {
            const results = await searchLocations(searchQuery)
            setSuggestions(results)
            setShowSuggestions(results.length > 0)
            setIsSearching(false)
        }, 300) // 300ms debounce

        return () => clearTimeout(timer)
    }, [searchQuery, enableSearch])

    // Update marker when value changes
    useEffect(() => {
        if (!map.current || !mapLoaded) return

        // Remove existing marker
        if (marker.current) {
            marker.current.remove()
        }

        // Add new marker if value exists
        if (value) {
            marker.current = new maplibregl.Marker({ color: '#FF0000' })
                .setLngLat([value[1], value[0]]) // [lng, lat]
                .addTo(map.current)

            map.current.flyTo({
                center: [value[1], value[0]],
                zoom: 14,
                duration: 1000
            })
        }
    }, [value, mapLoaded])

    const handleSuggestionClick = (result: SearchResult) => {
        const lat = parseFloat(result.lat)
        const lng = parseFloat(result.lon)

        if (!isInPakistan(lat, lng)) {
            toast({
                variant: "destructive",
                title: "Location restriction",
                description: "Selected location is outside Pakistan"
            })
            return
        }

        onChange?.([lat, lng])
        setSearchQuery(result.display_name)
        setShowSuggestions(false)
    }

    const toggleMapClickMode = () => {
        setIsMapClickMode(!isMapClickMode)
    }

    return (
        <div className="space-y-2">
            {enableSearch && (
                <div className="relative">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder={placeholder}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button
                            type="button"
                            variant={isMapClickMode ? "default" : "outline"}
                            size="icon"
                            onClick={toggleMapClickMode}
                            title={isMapClickMode ? "Search mode" : "Click on map mode"}
                        >
                            <MapPin className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Suggestions Dropdown */}
                    {showSuggestions && (
                        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                            {isSearching ? (
                                <div className="p-3 text-sm text-muted-foreground">Searching...</div>
                            ) : (
                                suggestions.map((result, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-start gap-2 border-b last:border-b-0"
                                        onClick={() => handleSuggestionClick(result)}
                                    >
                                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">{result.display_name}</div>
                                            {result.address && (
                                                <div className="text-xs text-muted-foreground">
                                                    {[result.address.city, result.address.state].filter(Boolean).join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            <div
                ref={mapContainer}
                style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '300px',
                    cursor: isMapClickMode ? 'crosshair' : 'default'
                }}
            />

            {isMapClickMode && (
                <p className="text-xs text-muted-foreground">
                    Click on the map to set location
                </p>
            )}
        </div>
    )
}
