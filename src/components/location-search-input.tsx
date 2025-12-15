"use client"

import { useState, useEffect } from 'react'
import { searchLocations, SearchResult } from '@/lib/geocoding'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MapPin, Search } from 'lucide-react'

interface LocationSearchInputProps {
    value?: [number, number] // [lat, lng]
    address?: string
    placeholder?: string
    onSelect: (lat: number, lng: number, displayName: string) => void
    onMapClick: () => void
    isMapMode: boolean
}

export function LocationSearchInput({
    value,
    address,
    placeholder = "Search location in Pakistan...",
    onSelect,
    onMapClick,
    isMapMode
}: LocationSearchInputProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const [suggestions, setSuggestions] = useState<SearchResult[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [isSearching, setIsSearching] = useState(false)
    const [selectedAddress, setSelectedAddress] = useState("")

    // Update selected address when address prop changes (from map click)
    useEffect(() => {
        if (address && !isMapMode) {
            setSelectedAddress(address)
            setSearchQuery("")
        }
    }, [address, isMapMode])

    // When user focuses on input, show current selection for editing
    const handleFocus = () => {
        if (selectedAddress) {
            setSearchQuery(selectedAddress)
        }
    }

    // When user clicks away without selecting, revert to previous valid selection
    const handleBlur = () => {
        setTimeout(() => {
            if (showSuggestions) return // Don't blur if clicking suggestion
            setSearchQuery("")
            setShowSuggestions(false)
        }, 200)
    }

    // Debounced search
    useEffect(() => {
        if (searchQuery.length < 2) {
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
        }, 300)

        return () => clearTimeout(timer)
    }, [searchQuery])

    const handleSuggestionClick = (result: SearchResult) => {
        const lat = parseFloat(result.lat)
        const lng = parseFloat(result.lon)

        onSelect(lat, lng, result.display_name)
        setSelectedAddress(result.display_name)
        setSearchQuery("")
        setShowSuggestions(false)
    }

    return (
        <div className="relative">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder={selectedAddress || placeholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        className="pl-10"
                    />
                </div>
                <Button
                    type="button"
                    variant={isMapMode ? "default" : "outline"}
                    size="icon"
                    onClick={onMapClick}
                    title={isMapMode ? "Search mode" : "Click on map mode"}
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
    )
}
