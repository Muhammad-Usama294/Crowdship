"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { createClient } from "@/lib/supabase/client"
import { Shipment } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Navigation, Package, Search, Map as MapIcon, History, MessageCircle, DollarSign, Clock, ArrowRight } from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { reverseGeocode, searchLocations } from "@/lib/geocoding"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ChatDialog } from "@/components/chat-dialog"
import { useUser } from "@/contexts/user-context"
import { TravelerGuard } from "@/components/traveler-guard"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"

import Image from "next/image"
import { LocationSearchInput } from "@/components/location-search-input"
import { useSearchParams } from "next/navigation"
import { editTrip } from "./actions"
import { MakeBidDialog } from "@/components/make-bid-dialog"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"

// Dynamic import for MapLibre Map component
const TravelerMap = dynamic(() => import("@/components/leaflet-traveler-view"), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted/20 animate-pulse flex items-center justify-center text-muted-foreground">Loading Map...</div>
}) as React.ComponentType<any>;

function TravelerContent() {
    const [start, setStart] = useState<[number, number] | null>(null)
    const [end, setEnd] = useState<[number, number] | null>(null)
    const { toast } = useToast()
    const [shipmentToAccept, setShipmentToAccept] = useState<string | null>(null)

    // Track original coordinates to detect changes
    const [originalStart, setOriginalStart] = useState<[number, number] | null>(null)
    const [originalEnd, setOriginalEnd] = useState<[number, number] | null>(null)

    const [startAddress, setStartAddress] = useState<string>("")
    const [endAddress, setEndAddress] = useState<string>("")
    const [selectionMode, setSelectionMode] = useState<'start' | 'end' | null>(null)
    const [routeCoords, setRouteCoords] = useState<[number, number][]>([])
    const [shipments, setShipments] = useState<Shipment[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const supabase = createClient()
    const searchParams = useSearchParams()

    // Check if we're in editing mode
    const isEditing = searchParams.get('editing') === 'true'
    const oldShipmentIds = searchParams.get('shipmentIds')?.split(',') || []

    // State for viewing images
    const [viewingImagesFor, setViewingImagesFor] = useState<Shipment | null>(null)
    // State for bidding
    const [biddingShipment, setBiddingShipment] = useState<Shipment | null>(null)

    // Chat State
    const { user } = useUser()
    const [chatOpen, setChatOpen] = useState(false)
    const [chatUser, setChatUser] = useState<{ id: string, name: string, avatar: string | null } | null>(null)
    const [chatShipmentId, setChatShipmentId] = useState<string | null>(null)

    // Mobile Sidebar State
    const [showMobileList, setShowMobileList] = useState(false)
    const [showMapModal, setShowMapModal] = useState(false)

    // Handle Open Chat
    const handleOpenChat = async (shipment: Shipment) => {
        if (!user) {
            toast({
                variant: "destructive",
                title: "Authentication required",
                description: "Please log in to chat with the sender"
            })
            return
        }

        // Fetch sender profile
        const { data } = await supabase
            .from('users')
            .select('full_name, avatar_url')
            .eq('id', shipment.sender_id)
            .single()

        if (data) {
            setChatUser({
                id: shipment.sender_id,
                name: data.full_name || "Sender",
                avatar: data.avatar_url
            })
            setChatShipmentId(shipment.id)
            setChatOpen(true)
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not load sender information"
            })
        }
    }

    // Realtime subscription to remove accepted/non-pending shipments
    useEffect(() => {
        const channel = supabase
            .channel('traveler_view_changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'shipments',
                },
                (payload) => {
                    const updatedShipment = payload.new as Shipment
                    // If a displayed shipment is no longer pending (e.g. accepted by sender), remove it
                    if (updatedShipment.status !== 'pending') {
                        setShipments((currentShipments) =>
                            currentShipments.filter(s => s.id !== updatedShipment.id)
                        )
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    // Load current trip data from URL params if editing
    useEffect(() => {
        if (isEditing) {
            const originLat = searchParams.get('originLat')
            const originLng = searchParams.get('originLng')
            const originAddress = searchParams.get('originAddress')
            const destLat = searchParams.get('destLat')
            const destLng = searchParams.get('destLng')
            const destAddress = searchParams.get('destAddress')

            if (originLat && originLng) {
                const coords: [number, number] = [parseFloat(originLat), parseFloat(originLng)]
                setStart(coords)
                setOriginalStart(coords)
                // Use address from URL if available, otherwise reverse geocode
                if (originAddress) {
                    setStartAddress(originAddress)
                } else {
                    reverseGeocode(coords[0], coords[1]).then(setStartAddress)
                }
            } else if (originAddress) {
                // Address exists but coords missing - geocode it
                setStartAddress(originAddress)
                searchLocations(originAddress).then(results => {
                    if (results && results.length > 0) {
                        const first = results[0]
                        const coords: [number, number] = [parseFloat(first.lat), parseFloat(first.lon)]
                        setStart(coords)
                        setOriginalStart(coords)
                    }
                })
            }

            if (destLat && destLng) {
                const coords: [number, number] = [parseFloat(destLat), parseFloat(destLng)]
                setEnd(coords)
                setOriginalEnd(coords)
                // Use address from URL if available, otherwise reverse geocode
                if (destAddress) {
                    setEndAddress(destAddress)
                } else {
                    reverseGeocode(coords[0], coords[1]).then(setEndAddress)
                }
            } else if (destAddress) {
                // Address exists but coords missing - geocode it
                setEndAddress(destAddress)
                searchLocations(destAddress).then(results => {
                    if (results && results.length > 0) {
                        const first = results[0]
                        const coords: [number, number] = [parseFloat(first.lat), parseFloat(first.lon)]
                        setEnd(coords)
                        setOriginalEnd(coords)
                    }
                })
            }
        }
    }, [isEditing, searchParams])

    const handleMapClick = useCallback(async (lat: number, lng: number) => {
        if (selectionMode === 'start') {
            setStart([lat, lng])
            setSelectionMode(null)
            const addr = await reverseGeocode(lat, lng)
            setStartAddress(addr)
        } else if (selectionMode === 'end') {
            setEnd([lat, lng])
            setSelectionMode(null)
            const addr = await reverseGeocode(lat, lng)
            setEndAddress(addr)
        }
    }, [selectionMode])

    const handleRouteFound = useCallback((coords: [number, number][]) => {
        setRouteCoords(coords)
    }, [])

    const searchPackages = async () => {
        setIsSearching(true)

        // If editing existing trip, check if route CHANGED before releasing
        if (isEditing && oldShipmentIds.length > 0) {
            // Helper to check if coords are different logic
            const isDifferent = (c1: [number, number] | null, c2: [number, number] | null) => {
                if (!c1 && !c2) return false // both null = same
                if (!c1 || !c2) return true // one null = different
                // Check if lat/long are significantly different (e.g. > 0.0001 deg ~ 11 meters)
                return Math.abs(c1[0] - c2[0]) > 0.0001 || Math.abs(c1[1] - c2[1]) > 0.0001
            }

            const originChanged = isDifferent(start, originalStart)
            const destChanged = isDifferent(end, originalEnd)

            if (originChanged || destChanged) {
                const result = await editTrip(oldShipmentIds)
                if (!result.success) {
                    toast({
                        variant: "destructive",
                        title: "Error",
                        description: 'Failed to release old shipments: ' + result.error
                    })
                    setIsSearching(false)
                    return
                }
            }
        }

        const { data, error } = await supabase
            .from('shipments')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (error) {
            console.error(error)
            toast({
                variant: "destructive",
                title: "Search Error",
                description: "Error searching packages: " + error.message
            })
        } else {
            setShipments(data as Shipment[] || [])
            if (data && data.length === 0) {
                toast({
                    description: "No available packages found."
                })
            } else {
                // Show list on mobile after successful search with results
                setShowMobileList(true)
            }
        }
        setIsSearching(false)
    }

    const [filteredShipmentIds, setFilteredShipmentIds] = useState<Set<string> | null>(null)

    const handleFilteredShipmentsChange = useCallback((ids: string[]) => {
        setFilteredShipmentIds(new Set(ids))
    }, [])

    // Derived state for list display
    // If we have a filter set (from map), use it. Otherwise show all.
    const displayedShipments = filteredShipmentIds
        ? shipments.filter(s => filteredShipmentIds.has(s.id))
        : shipments

    const handleAcceptShipment = (shipmentId: string) => {
        setShipmentToAccept(shipmentId)
    }

    const confirmAcceptShipment = async () => {
        if (!shipmentToAccept) return

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            toast({
                variant: "destructive",
                title: "Authentication required",
                description: "Please log in to accept shipments"
            })
            setShipmentToAccept(null)
            return
        }

        const { error } = await supabase
            .from('shipments')
            .update({
                traveler_id: user.id,
                status: 'accepted'
            })
            .eq('id', shipmentToAccept)
            .eq('status', 'pending')

        if (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to accept shipment: " + error.message
            })
        } else {
            toast({
                title: "Success",
                description: "Shipment accepted! You are now responsible for delivery."
            })
            // Refresh list
            setShipments(prev => prev.filter(s => s.id !== shipmentToAccept))
        }
        setShipmentToAccept(null)
    }

    // Real-time subscription to handle shipment updates
    useEffect(() => {
        const channel = supabase
            .channel('all-shipment-updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'shipments'
                },
                (payload) => {
                    // Remove cancelled or accepted shipments from current search results
                    if (payload.new && (payload.new.status === 'cancelled' || payload.new.status === 'accepted')) {
                        setShipments(prev => prev.filter(s => s.id !== payload.new.id))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, []) // Empty dependency array - subscribe once

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] md:flex-row overflow-hidden bg-background relative">

            {/* Left Sidebar (Desktop) / Bottom Sheet (Mobile) - Controls & List */}
            <div className={`w-full md:w-[400px] lg:w-[450px] z-20 flex flex-col bg-card/40 backdrop-blur-xl border-r h-full absolute md:relative transition-transform duration-300 ${showMobileList ? 'translate-y-0' : 'translate-y-[calc(100%-80px)]'} md:translate-y-0`}>

                {/* Mobile Handle */}
                <div className="md:hidden h-6 w-full flex items-center justify-center cursor-pointer bg-muted/50 border-t md:border-t-0" onClick={() => setShowMobileList(!showMobileList)}>
                    <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
                </div>

                <div className="p-4 md:p-6 flex flex-col h-full overflow-hidden">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Find Packages</h1>
                        <p className="text-sm text-muted-foreground">Select your route to find matching shipments.</p>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Origin</Label>
                            <div className="relative">
                                <LocationSearchInput
                                    value={start || undefined}
                                    address={startAddress}
                                    placeholder="City, Airport, or Address"
                                    isMapMode={selectionMode === 'start'}
                                    onSelect={(lat, lng, displayName) => {
                                        setStart([lat, lng])
                                        setStartAddress(displayName)
                                        setSelectionMode(null)
                                    }}
                                    onMapClick={() => setSelectionMode(selectionMode === 'start' ? null : 'start')}
                                />
                                <div className={`absolute right-3 top-2.5 h-2 w-2 rounded-full ${start ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-muted-foreground/30'}`} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destination</Label>
                            <div className="relative">
                                <LocationSearchInput
                                    value={end || undefined}
                                    address={endAddress}
                                    placeholder="City, Airport, or Address"
                                    isMapMode={selectionMode === 'end'}
                                    onSelect={(lat, lng, displayName) => {
                                        setEnd([lat, lng])
                                        setEndAddress(displayName)
                                        setSelectionMode(null)
                                    }}
                                    onMapClick={() => setSelectionMode(selectionMode === 'end' ? null : 'end')}
                                />
                                <div className={`absolute right-3 top-2.5 h-2 w-2 rounded-full ${end ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-muted-foreground/30'}`} />
                            </div>
                        </div>

                        <Button
                            className="w-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all font-semibold"
                            size="lg"
                            disabled={!start || !end || isSearching}
                            onClick={searchPackages}
                        >
                            {isSearching ? <Package className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            Find Available Shipments
                        </Button>

                        {/* Mobile Map Toggle */}
                        <Button
                            variant="outline"
                            className="w-full mt-2 md:hidden"
                            onClick={() => setShowMapModal(true)}
                        >
                            <MapIcon className="mr-2 h-4 w-4" />
                            View Map
                        </Button>
                    </div>

                    {/* Results Count & Filter Info */}
                    {(shipments.length > 0) && (
                        <div className="flex items-center justify-between py-2 border-b border-border/50 mb-2">
                            <span className="text-sm font-medium">{displayedShipments.length} Packages Found</span>
                            {filteredShipmentIds && (
                                <Badge variant="outline" className="text-xs font-normal bg-primary/5 border-primary/20 text-primary">
                                    Filtered by Map view
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* Scrollable List */}
                    <div className="flex-1 overflow-y-auto pr-1 space-y-3 pb-20 md:pb-0 scrollbar-hide">
                        <AnimatePresence>
                            {displayedShipments.length === 0 && !isSearching && start && end && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-10"
                                >
                                    <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Search className="h-8 w-8 text-muted-foreground/50" />
                                    </div>
                                    <p className="text-muted-foreground text-sm">No packages found for this route yet.</p>
                                    <Button variant="link" size="sm" className="mt-2 text-primary" onClick={() => setShipments([])}>Clear Search</Button>
                                </motion.div>
                            )}

                            {displayedShipments.map((pkg, index) => (
                                <motion.div
                                    key={pkg.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card className="hover:border-primary/50 transition-all duration-300 hover:shadow-md bg-card/60 backdrop-blur-sm group">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-bold text-base group-hover:text-primary transition-colors line-clamp-1">{pkg.title}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-muted text-muted-foreground border-0">
                                                            <Package className="h-3 w-3 mr-1" /> {pkg.weight_kg}kg
                                                        </Badge>
                                                        {pkg.bidding_enabled && (
                                                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                                                                Bidding Open
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-bold text-green-600 dark:text-green-400">${Math.round(pkg.offer_price * 0.90)}</div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-[20px_1fr] gap-x-2 gap-y-3 text-xs my-3 text-muted-foreground">
                                                <div className="flex flex-col items-center gap-1 pt-1">
                                                    <div className="w-2 h-2 rounded-full bg-green-500 box-content border-2 border-background" />
                                                    <div className="w-0.5 h-6 bg-border" />
                                                    <div className="w-2 h-2 rounded-full bg-red-500 box-content border-2 border-background" />
                                                </div>
                                                <div className="space-y-3">
                                                    <div>
                                                        <span className="block font-medium text-foreground">Pickup</span>
                                                        <span className="line-clamp-1">{pkg.pickup_address}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block font-medium text-foreground">Dropoff</span>
                                                        <span className="line-clamp-1">{pkg.dropoff_address}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="flex-1 h-8 text-xs font-medium"
                                                    onClick={() => setViewingImagesFor(pkg)}
                                                >
                                                    View Images
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 px-3 text-xs font-medium gap-1.5"
                                                    onClick={() => handleOpenChat(pkg)}
                                                >
                                                    <MessageCircle className="h-3.5 w-3.5" />
                                                    Chat
                                                </Button>
                                                {pkg.bidding_enabled ? (
                                                    <Button
                                                        size="sm"
                                                        className="flex-1 h-8 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white"
                                                        onClick={() => setBiddingShipment(pkg)}
                                                    >
                                                        Make Offer
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        className="flex-1 h-8 text-xs font-medium bg-primary hover:bg-primary/90"
                                                        onClick={() => handleAcceptShipment(pkg.id)}
                                                    >
                                                        Accept
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Map Area */}
            <div className={`${showMapModal ? 'fixed inset-0 z-[50] flex flex-col bg-background' : 'hidden md:flex flex-1 h-full relative z-10 w-full'}`}>
                {/* Mobile Map Header */}
                <div className="md:hidden flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-md absolute top-0 left-0 right-0 z-[1001]">
                    <h3 className="font-semibold text-lg">Route Map</h3>
                    <Button size="sm" onClick={() => setShowMapModal(false)}>Done</Button>
                </div>
                {/* Search Hint Overlay */}
                {selectionMode && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-background/90 backdrop-blur-md px-6 py-3 rounded-full shadow-xl border-2 border-primary text-sm font-semibold animate-in fade-in slide-in-from-top-4 flex items-center gap-2 text-primary">
                        <MapPin className="h-4 w-4 animate-bounce" />
                        Click map to set {selectionMode === 'start' ? 'Origin' : 'Destination'}
                    </div>
                )}

                <TravelerMap
                    start={start}
                    end={end}
                    shipments={shipments}
                    onMapClick={handleMapClick}
                    onRouteFound={handleRouteFound}
                    onFilteredShipmentsChange={handleFilteredShipmentsChange}
                />
            </div>

            {/* Dialogs */}
            <Dialog open={!!viewingImagesFor} onOpenChange={(open) => !open && setViewingImagesFor(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto bg-card/95 backdrop-blur-xl border-border/50">
                    <DialogHeader>
                        <DialogTitle>Package Images: {viewingImagesFor?.title}</DialogTitle>
                        <DialogDescription>
                            Photos provided by the sender.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {(() => {
                            if (!viewingImagesFor) return null
                            const images = viewingImagesFor.image_urls && viewingImagesFor.image_urls.length > 0 ? viewingImagesFor.image_urls : []
                            if (images.length === 0) return <div className="col-span-2 text-center py-8 text-muted-foreground">No images available</div>
                            return images.map((url, idx) => (
                                <div key={idx} className="relative aspect-video bg-muted rounded-lg overflow-hidden border shadow-sm">
                                    <Image src={url} alt={`Package image ${idx + 1}`} fill className="object-cover" unoptimized />
                                </div>
                            ))
                        })()}
                    </div>
                </DialogContent>
            </Dialog>

            <MakeBidDialog
                shipment={biddingShipment}
                open={!!biddingShipment}
                onOpenChange={(open) => !open && setBiddingShipment(null)}
                onSuccess={() => searchPackages()}
            />

            <AlertDialog open={!!shipmentToAccept} onOpenChange={(open) => !open && setShipmentToAccept(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You will be committed to delivering this package.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmAcceptShipment} className="bg-primary">Confirm</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {chatUser && chatShipmentId && (
                <ChatDialog
                    open={chatOpen}
                    onOpenChange={setChatOpen}
                    shipmentId={chatShipmentId}
                    otherUserId={chatUser.id}
                    otherUserName={chatUser.name}
                    otherUserAvatar={chatUser.avatar}
                />
            )}
        </div>
    )
}

export default function TravelerPage() {
    return (
        <TravelerGuard>
            <Suspense fallback={<div className="h-screen w-full flex items-center justify-center">Loading...</div>}>
                <TravelerContent />
            </Suspense>
        </TravelerGuard>
    )
}
