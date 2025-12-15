"use client"

import { useState, useRef } from "react"
import { useUser } from "@/contexts/user-context"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Loader2, ArrowLeft, MapPin, Package, DollarSign, Locate, ArrowRight, Map as MapIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { LocationSearchInput } from "@/components/location-search-input"
import dynamic from 'next/dynamic'
import { motion } from "framer-motion"
import { ImageUploader } from "@/components/image-uploader"
import { reverseGeocode } from "@/lib/geocoding"
import { ProfileCompletionGuard } from "@/components/profile-completion-guard"

// Dynamically import map to avoid SSR issues
const TravelerMap = dynamic(() => import('@/components/leaflet-traveler-view'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted/20 animate-pulse flex items-center justify-center text-muted-foreground">Loading Map...</div>
})

export default function CreateShipmentPage() {
    const { user } = useUser()
    const router = useRouter()
    const { toast } = useToast()
    const supabase = createClient()

    const [loading, setLoading] = useState(false)
    const [biddingEnabled, setBiddingEnabled] = useState(false)
    const [autoAcceptInitialPrice, setAutoAcceptInitialPrice] = useState(false)

    // Form state
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [weight, setWeight] = useState("")
    const [price, setPrice] = useState("")
    const [pickupAddress, setPickupAddress] = useState("")
    const [dropoffAddress, setDropoffAddress] = useState("")
    const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null)
    const [dropoffCoords, setDropoffCoords] = useState<[number, number] | null>(null)
    const [imageUrls, setImageUrls] = useState<string[]>([])

    // Map selection mode
    const [selectingLocation, setSelectingLocation] = useState<'pickup' | 'dropoff' | null>(null)
    const [showMapModal, setShowMapModal] = useState(false)

    // Scroll to map on mobile when selecting
    const scrollToMap = () => {
        if (window.innerWidth < 768) {
            setShowMapModal(true)
        }
    }

    const handleLocationSelect = (type: 'pickup' | 'dropoff', address: string, coords: [number, number]) => {
        if (type === 'pickup') {
            setPickupAddress(address)
            setPickupCoords(coords)
        } else {
            setDropoffAddress(address)
            setDropoffCoords(coords)
        }
    }

    const handleMapClick = async (lat: number, lng: number) => {
        if (!selectingLocation) return

        // Set coords immediately to show marker
        const tempAddress = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`
        handleLocationSelect(selectingLocation, tempAddress, [lng, lat])

        // Then fetch actual address
        try {
            const address = await reverseGeocode(lat, lng)
            handleLocationSelect(selectingLocation, address, [lng, lat])
        } catch (error) {
            console.error("Failed to reverse geocode:", error)
            // Keep the coordinate string if reverse geocoding fails
        }

        setSelectingLocation(null) // Exit selection mode
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        if (!pickupCoords || !dropoffCoords) {
            toast({
                variant: "destructive",
                title: "Location Required",
                description: "Please select both pickup and dropoff locations."
            })
            return
        }

        // Check wallet balance
        const offerPrice = parseFloat(price)
        const { data: profile } = await supabase
            .from('users')
            .select('wallet_balance')
            .eq('id', user.id)
            .single()

        if (!profile || profile.wallet_balance < offerPrice) {
            toast({
                variant: "destructive",
                title: "Insufficient Balance",
                description: `You need $${offerPrice.toFixed(2)} to create this shipment. Your current balance is $${profile?.wallet_balance?.toFixed(2) || '0.00'}. Please add funds to your wallet.`
            })
            return
        }

        setLoading(true)

        // Generate OTPs
        const pickupOtp = Math.floor(1000 + Math.random() * 9000).toString()
        const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString()

        const { error } = await supabase.from('shipments').insert({
            sender_id: user.id,
            title,
            description,
            pickup_address: pickupAddress,
            dropoff_address: dropoffAddress,
            pickup_location: `POINT(${pickupCoords[0]} ${pickupCoords[1]})`,
            dropoff_location: `POINT(${dropoffCoords[0]} ${dropoffCoords[1]})`,
            weight_kg: parseFloat(weight),
            // Store exact offer price (Sender pays $10, Traveler sees $9)
            offer_price: Number(offerPrice),
            pickup_otp: pickupOtp,
            delivery_otp: deliveryOtp,
            status: 'pending',
            bidding_enabled: biddingEnabled,
            auto_accept_initial_price: biddingEnabled ? autoAcceptInitialPrice : false,
            image_urls: imageUrls.length > 0 ? imageUrls : null,
        })

        setLoading(false)

        if (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message
            })
        } else {
            toast({
                title: "Success",
                description: "Shipment created successfully!"
            })
            router.push('/sender/dashboard')
        }
    }

    return (
        <ProfileCompletionGuard>
            <div className="flex flex-col h-[calc(100vh-4rem)] md:flex-row overflow-hidden bg-background">
                {/* Left Panel: Form */}
                <div className="w-full md:w-[450px] lg:w-[500px] h-full overflow-y-auto p-4 md:p-6 border-r bg-card/30 backdrop-blur-sm z-10 shadow-xl scrollbar-hide">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="flex items-center gap-2 mb-6 cursor-pointer hover:text-primary transition-colors" onClick={() => router.back()}>
                            <div className="bg-primary/10 p-2 rounded-full">
                                <ArrowLeft className="h-4 w-4" />
                            </div>
                            <span className="font-semibold">Back to Dashboard</span>
                        </div>

                        <div className="mb-8">
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Create Shipment</h1>
                            <p className="text-muted-foreground">Fill in the details for your package delivery.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title" className="flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Title</Label>
                                    <Input
                                        id="title"
                                        placeholder="e.g. Laptop for brother"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                        className="bg-background/50 border-input/50 focus:border-primary"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="weight">Weight (kg)</Label>
                                        <div className="relative">
                                            <Input
                                                id="weight"
                                                type="number"
                                                step="0.1"
                                                placeholder="0.0"
                                                value={weight}
                                                onChange={(e) => setWeight(e.target.value)}
                                                required
                                                className="bg-background/50 border-input/50"
                                            />
                                            <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">kg</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="price" className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-green-600" /> Offer Price</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                            <Input
                                                id="price"
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={price}
                                                onChange={(e) => setPrice(e.target.value)}
                                                required
                                                className="pl-7 bg-background/50 border-input/50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Location Inputs */}
                                <div className="space-y-4 pt-4 border-t border-border/50">
                                    <div className="space-y-2">
                                        <Label className="flex items-center justify-between">
                                            <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-blue-500" /> Pickup Location</span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className={`h-6 text-xs ${selectingLocation === 'pickup' ? 'bg-primary/20 text-primary' : ''}`}
                                                onClick={() => {
                                                    setSelectingLocation(selectingLocation === 'pickup' ? null : 'pickup')
                                                    scrollToMap()
                                                }}
                                            >
                                                <Locate className="h-3 w-3 mr-1" />
                                                Select on Map
                                            </Button>
                                        </Label>
                                        <LocationSearchInput
                                            placeholder="Search pickup address..."
                                            address={pickupAddress}
                                            onSelect={(lat, lng, addr) => handleLocationSelect('pickup', addr, [lng, lat])}
                                            value={pickupCoords ? [pickupCoords[1], pickupCoords[0]] : undefined}
                                            isMapMode={selectingLocation === 'pickup'}
                                            onMapClick={() => {
                                                setSelectingLocation(selectingLocation === 'pickup' ? null : 'pickup')
                                                scrollToMap()
                                            }}
                                        />
                                        {pickupCoords && (
                                            <p className="text-xs text-green-600 flex items-center">
                                                ✓ Coordinates set
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="flex items-center justify-between">
                                            <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-purple-500" /> Dropoff Location</span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className={`h-6 text-xs ${selectingLocation === 'dropoff' ? 'bg-primary/20 text-primary' : ''}`}
                                                onClick={() => {
                                                    setSelectingLocation(selectingLocation === 'dropoff' ? null : 'dropoff')
                                                    scrollToMap()
                                                }}
                                            >
                                                <Locate className="h-3 w-3 mr-1" />
                                                Select on Map
                                            </Button>
                                        </Label>
                                        <LocationSearchInput
                                            placeholder="Search dropoff address..."
                                            address={dropoffAddress}
                                            onSelect={(lat, lng, addr) => handleLocationSelect('dropoff', addr, [lng, lat])}
                                            value={dropoffCoords ? [dropoffCoords[1], dropoffCoords[0]] : undefined}
                                            isMapMode={selectingLocation === 'dropoff'}
                                            onMapClick={() => {
                                                setSelectingLocation(selectingLocation === 'dropoff' ? null : 'dropoff')
                                                scrollToMap()
                                            }}
                                        />
                                        {dropoffCoords && (
                                            <p className="text-xs text-green-600 flex items-center">
                                                ✓ Coordinates set
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4 border-t border-border/50">
                                    <Label htmlFor="description">Description (Optional)</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Any additional details..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="bg-background/50 border-input/50"
                                        rows={3}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Images</Label>
                                    <ImageUploader
                                        maxImages={3}
                                        value={imageUrls}
                                        onChange={setImageUrls}
                                        userId={user?.id || ''}
                                        folder="temp"
                                    />
                                </div>

                                <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Allow Bidding</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Travelers can suggest different prices
                                        </p>
                                    </div>
                                    <Switch
                                        checked={biddingEnabled}
                                        onCheckedChange={setBiddingEnabled}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                </div>
                                {biddingEnabled && (
                                    <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20 mt-2">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Auto-accept Initial Price</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Automatically accept bids at your offer price
                                            </p>
                                        </div>
                                        <Switch
                                            checked={autoAcceptInitialPrice}
                                            onCheckedChange={setAutoAcceptInitialPrice}
                                        />
                                    </div>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/25 h-12 text-md font-semibold"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <div className="flex items-center">Create Shipment <ArrowRight className="ml-2 h-5 w-5" /></div>}
                            </Button>
                        </form>
                    </motion.div>
                </div>

                {/* Right Panel: Map (Desktop) */}
                <div className={`hidden md:flex flex-1 relative transition-all duration-300 ${selectingLocation ? 'ring-4 ring-inset ring-primary/50' : ''}`}>
                    <TravelerMap
                        shipments={[]} // No shipments to display, just for selection
                        onMapClick={handleMapClick}
                        start={pickupCoords ? [pickupCoords[1], pickupCoords[0]] : null}
                        end={dropoffCoords ? [dropoffCoords[1], dropoffCoords[0]] : null}
                        onRouteFound={() => { }}
                    />

                    {/* Map interaction hint overlay */}
                    {selectingLocation && (
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg font-medium animate-bounce z-[400] pointer-events-none">
                            Click on map to set {selectingLocation} location
                        </div>
                    )}
                </div>

                {/* Mobile Map Button & Modal */}
                <div className="md:hidden">
                    <Button
                        variant="outline"
                        className="w-full mt-4 flex items-center gap-2"
                        onClick={() => setShowMapModal(true)}
                    >
                        <MapIcon className="h-4 w-4" />
                        {pickupCoords || dropoffCoords ? "View/Edit Locations on Map" : "Select Locations on Map"}
                    </Button>

                    {/* Full Screen Map Modal for Mobile */}
                    {showMapModal && (
                        <div className="fixed inset-0 z-50 bg-background flex flex-col">
                            <div className="flex items-center justify-between p-4 border-b">
                                <h3 className="font-semibold text-lg">Select Locations</h3>
                                <Button size="sm" onClick={() => setShowMapModal(false)}>Done</Button>
                            </div>
                            <div className="relative flex-1">
                                <TravelerMap
                                    shipments={[]}
                                    onMapClick={handleMapClick}
                                    start={pickupCoords ? [pickupCoords[1], pickupCoords[0]] : null}
                                    end={dropoffCoords ? [dropoffCoords[1], dropoffCoords[0]] : null}
                                    onRouteFound={() => { }}
                                />
                                {selectingLocation && (
                                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg font-medium z-[1000] text-sm whitespace-nowrap pointer-events-none">
                                        Tap to set {selectingLocation}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>


            </div>
        </ProfileCompletionGuard >
    )
}
