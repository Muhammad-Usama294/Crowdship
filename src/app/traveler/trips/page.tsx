"use client"

import { useEffect, useState } from "react"
import { getMyTrips, canModifyTrip, deleteTrip, editTrip } from "../actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shipment } from "@/types/database"
import { Package, MapPin, DollarSign, Calendar, Trash2, Edit } from "lucide-react"
import { format } from "date-fns"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { parsePostGISPoint } from "@/lib/parse-wkb"
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

export default function TravelerTripsPage() {
    const [currentTrip, setCurrentTrip] = useState<any[]>([])
    const [pastTrips, setPastTrips] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [canModify, setCanModify] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    useEffect(() => {
        loadTrips()
    }, [])

    const loadTrips = async () => {
        setLoading(true)
        const data = await getMyTrips()
        setCurrentTrip(data.currentTrip)
        setPastTrips(data.pastTrips)

        // Check if current trip can be modified
        if (data.currentTrip.length > 0) {
            const shipmentIds = data.currentTrip.map((s: any) => s.id)
            const result = await canModifyTrip(shipmentIds)
            setCanModify(result.canModify)
        } else {
            setCanModify(false)
        }

        setLoading(false)
    }

    const handleDeleteTrip = async () => {
        const shipmentIds = currentTrip.map(s => s.id)
        const result = await deleteTrip(shipmentIds)

        if (result.success) {
            toast({
                title: "Trip Deleted",
                description: result.message,
            })
            setShowDeleteDialog(false)
            loadTrips() // Refresh
        } else {
            toast({
                variant: "destructive",
                title: "Failed to Delete Trip",
                description: result.error,
            })
        }
    }

    const handleEditTrip = async () => {
        // Don't release shipments yet - just show current route on map
        // Shipments will be released when user searches for new packages

        // Get first and last shipment to determine route
        if (currentTrip.length === 0) return

        const firstShipment = currentTrip[0]
        const lastShipment = currentTrip[currentTrip.length - 1]

        // Extract coordinates helper
        const extractCoords = (loc: any): [number, number] | null => {
            if (!loc) return null

            // Try WKB Hex parsing (most likely)
            if (typeof loc === 'string' && /^[0-9A-Fa-f]+$/.test(loc.replace(/^0x/, ''))) {
                const parsed = parsePostGISPoint(loc)
                if (parsed) return [parsed.coordinates[1], parsed.coordinates[0]] // [lat, lng]
            }

            // Try WKT parsing (POINT(lng lat))
            if (typeof loc === 'string' && loc.startsWith('POINT')) {
                const match = loc.match(/POINT\s*\(([-\d.]+)\s+([-\d.]+)\)/i)
                if (match) {
                    return [parseFloat(match[2]), parseFloat(match[1])] // [lat, lng]
                }
            }

            // Try object with coordinates
            if (loc && loc.coordinates && Array.isArray(loc.coordinates)) {
                return [loc.coordinates[1], loc.coordinates[0]] // [lat, lng]
            }

            return null
        }

        const origin = extractCoords(firstShipment.pickup_location)
        const destination = extractCoords(lastShipment.dropoff_location)

        console.log('Edit Trip Debug:')
        console.log('First shipment:', firstShipment)
        console.log('Last shipment:', lastShipment)
        console.log('Origin coords:', origin)
        console.log('Destination coords:', destination)
        console.log('Origin address:', firstShipment.pickup_address)
        console.log('Dest address:', lastShipment.dropoff_address)

        // Pass current trip data to planner via URL params
        const params = new URLSearchParams({
            editing: 'true',
            shipmentIds: currentTrip.map((s: any) => s.id).join(',')
        })

        if (origin) {
            params.append('originLat', origin[0].toString())
            params.append('originLng', origin[1].toString())
        }
        if (firstShipment.pickup_address) {
            params.append('originAddress', firstShipment.pickup_address)
        }

        if (destination) {
            params.append('destLat', destination[0].toString())
            params.append('destLng', destination[1].toString())
        }
        if (lastShipment.dropoff_address) {
            params.append('destAddress', lastShipment.dropoff_address)
        }

        console.log('Final URL params:', params.toString())
        router.push(`/traveler?${params.toString()}`)
    }

    const getTotalEarnings = (shipments: any[]) => {
        return shipments.reduce((sum, s) => sum + (s.offer_price || 0), 0)
    }

    const getStatusBadge = (status: string) => {
        const variants: Record<string, any> = {
            'accepted': 'default',
            'in_transit': 'secondary',
            'delivered': 'success',
            'cancelled': 'destructive'
        }
        return <Badge variant={variants[status] || 'default'}>{status}</Badge>
    }

    if (loading) {
        return <div className="container py-10">Loading trips...</div>
    }

    return (
        <TravelerGuard>
            <div className="container py-10 space-y-8">
                <div>
                    <h1 className="text-3xl font-bold">My Trips</h1>
                    <p className="text-muted-foreground">View your current and past deliveries</p>
                </div>

                {/* Current Trip */}
                {currentTrip.length > 0 && (
                    <div>
                        <h2 className="text-2xl font-semibold mb-4">Current Trip</h2>
                        <Card className="border-primary">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5" />
                                    Active Deliveries
                                </CardTitle>
                                <CardDescription>
                                    {currentTrip.length} package{currentTrip.length !== 1 ? 's' : ''} |
                                    ${getTotalEarnings(currentTrip).toFixed(2)} total
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {currentTrip.map((shipment) => (
                                    <div
                                        key={shipment.id}
                                        className="p-4 border rounded-lg space-y-2"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-semibold">{shipment.title}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    From: {shipment.sender?.full_name || 'Unknown'}
                                                </p>
                                            </div>
                                            {getStatusBadge(shipment.status)}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="flex items-start gap-2">
                                                <MapPin className="h-4 w-4 text-green-500 mt-0.5" />
                                                <div>
                                                    <p className="font-medium">Pickup</p>
                                                    <p className="text-muted-foreground">{shipment.pickup_address}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <MapPin className="h-4 w-4 text-red-500 mt-0.5" />
                                                <div>
                                                    <p className="font-medium">Dropoff</p>
                                                    <p className="text-muted-foreground">{shipment.dropoff_address}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t">
                                            <div className="flex items-center gap-1 text-sm">
                                                <DollarSign className="h-4 w-4" />
                                                <span className="font-semibold">${shipment.offer_price}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <Calendar className="h-4 w-4" />
                                                {format(new Date(shipment.created_at), 'MMM dd, yyyy')}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {/* Trip Actions */}
                                <div className="pt-4 border-t space-y-3">
                                    {canModify ? (
                                        <>
                                            <p className="text-sm text-muted-foreground">
                                                ✓ Trip can be modified (no pickups confirmed yet)
                                            </p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Button
                                                    variant="outline"
                                                    className="w-full"
                                                    onClick={handleEditTrip}
                                                >
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Edit Trip
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    className="w-full"
                                                    onClick={() => setShowDeleteDialog(true)}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete Trip
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            🔒 Trip locked (pickup has started - cannot modify)
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Past Trips */}
                <div>
                    <h2 className="text-2xl font-semibold mb-4">Past Trips</h2>
                    {pastTrips.length === 0 ? (
                        <Card>
                            <CardContent className="py-10 text-center text-muted-foreground">
                                No past trips yet
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {pastTrips.map((shipment) => (
                                <Card key={shipment.id}>
                                    <CardContent className="pt-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-semibold">{shipment.title}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {shipment.pickup_address} → {shipment.dropoff_address}
                                                </p>
                                            </div>
                                            {getStatusBadge(shipment.status)}
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-1">
                                                <DollarSign className="h-4 w-4" />
                                                <span className="font-semibold">${shipment.offer_price}</span>
                                            </div>
                                            <div className="text-muted-foreground">
                                                {format(new Date(shipment.created_at), 'MMM dd, yyyy')}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Delete Trip Confirmation Dialog */}
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Trip?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will release all {currentTrip.length} shipment{currentTrip.length !== 1 ? 's' : ''} back to the marketplace.
                                Other travelers will be able to accept them.
                                <br /><br />
                                <strong>No penalty</strong> - since you haven't picked up any packages yet.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteTrip}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Delete Trip
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </TravelerGuard>
    )
}
