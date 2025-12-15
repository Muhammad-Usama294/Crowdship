"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getMyBids, withdrawBid } from "../bid-actions"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Package, MapPin, DollarSign, X } from "lucide-react"
import Link from "next/link"
import { TravelerGuard } from "@/components/traveler-guard"

interface BidWithShipment {
    id: string
    offered_price: number
    status: string
    created_at: string
    shipments: {
        id: string
        title: string
        pickup_address: string
        dropoff_address: string
        offer_price: number
        status: string
    }
}

export default function MyBidsPage() {
    const [bids, setBids] = useState<BidWithShipment[]>([])
    const [loading, setLoading] = useState(true)
    const [withdrawingBidId, setWithdrawingBidId] = useState<string | null>(null)
    const { toast } = useToast()

    useEffect(() => {
        loadBids()
    }, [])

    const loadBids = async () => {
        setLoading(true)
        const result = await getMyBids()

        if (result.success) {
            setBids(result.data as BidWithShipment[])
        } else {
            toast({
                variant: "destructive",
                title: "Failed to Load Bids",
                description: result.error,
            })
        }
        setLoading(false)
    }

    const handleWithdrawBid = async (bidId: string) => {
        setWithdrawingBidId(bidId)
        const result = await withdrawBid(bidId)

        if (result.success) {
            toast({
                title: "Bid Withdrawn",
                description: "Your bid has been cancelled.",
            })
            loadBids() // Refresh list
        } else {
            toast({
                variant: "destructive",
                title: "Failed to Withdraw Bid",
                description: result.error,
            })
        }
        setWithdrawingBidId(null)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>
            case 'accepted':
                return <Badge className="bg-green-600">Accepted</Badge>
            case 'rejected':
                return <Badge variant="destructive">Rejected</Badge>
            case 'withdrawn':
                return <Badge variant="outline">Withdrawn</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const pendingBids = bids.filter(b => b.status === 'pending')
    const otherBids = bids.filter(b => b.status !== 'pending')

    return (
        <TravelerGuard>
            <div className="container max-w-4xl py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold">My Bids</h1>
                        <p className="text-muted-foreground">Track your offers on shipments</p>
                    </div>
                    <Link href="/traveler">
                        <Button variant="outline">Back to Planner</Button>
                    </Link>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : bids.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">You haven't made any bids yet.</p>
                            <Link href="/traveler">
                                <Button className="mt-4">Find Shipments</Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {/* Pending Bids */}
                        {pendingBids.length > 0 && (
                            <div>
                                <h2 className="text-xl font-semibold mb-3">Pending Bids ({pendingBids.length})</h2>
                                <div className="grid gap-4">
                                    {pendingBids.map((bid) => (
                                        <Card key={bid.id}>
                                            <CardContent className="p-6">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h3 className="font-semibold text-lg">{bid.shipments.title}</h3>
                                                            {getStatusBadge(bid.status)}
                                                        </div>

                                                        <div className="space-y-2 text-sm text-muted-foreground">
                                                            <div className="flex items-center gap-2">
                                                                <MapPin className="h-4 w-4 text-blue-600" />
                                                                <span className="font-medium">From:</span>
                                                                <span>{bid.shipments.pickup_address}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <MapPin className="h-4 w-4 text-orange-600" />
                                                                <span className="font-medium">To:</span>
                                                                <span>{bid.shipments.dropoff_address}</span>
                                                            </div>
                                                        </div>

                                                        <div className="mt-3 flex items-center gap-4 text-sm">
                                                            <div>
                                                                <span className="text-muted-foreground">Initial Price:</span>
                                                                <span className="ml-2 font-semibold">${bid.shipments.offer_price}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground">Your Offer:</span>
                                                                <span className="ml-2 font-bold text-green-600">${bid.offered_price}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleWithdrawBid(bid.id)}
                                                        disabled={withdrawingBidId === bid.id}
                                                    >
                                                        {withdrawingBidId === bid.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <X className="h-4 w-4 mr-1" />
                                                                Withdraw
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Other Bids (Accepted/Rejected/Withdrawn) */}
                        {otherBids.length > 0 && (
                            <div>
                                <h2 className="text-xl font-semibold mb-3">Past Bids ({otherBids.length})</h2>
                                <div className="grid gap-4">
                                    {otherBids.map((bid) => (
                                        <Card key={bid.id} className="opacity-70">
                                            <CardContent className="p-6">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h3 className="font-semibold">{bid.shipments.title}</h3>
                                                            {getStatusBadge(bid.status)}
                                                        </div>

                                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                            <div>
                                                                <span>Your Offer:</span>
                                                                <span className="ml-2 font-semibold">${bid.offered_price}</span>
                                                            </div>
                                                            <div className="text-xs">
                                                                {new Date(bid.created_at).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </TravelerGuard>
    )
}
