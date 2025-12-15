"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getShipmentBids, acceptBid, rejectBid } from "@/app/sender/bid-actions"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Star, TrendingUp, TrendingDown, Check, X, MessageCircle } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { ChatDialog } from "@/components/chat-dialog"

interface Bid {
    id: string
    offered_price: number
    status: string
    created_at: string
    users: {
        id: string
        full_name: string
        avatar_url: string | null
        trust_score: number
    }
}

interface ShipmentBidsModalProps {
    shipmentId: string | null
    shipmentTitle: string
    initialPrice: number
    open: boolean
    onOpenChange: (open: boolean) => void
    onBidAccepted?: () => void
}

export function ShipmentBidsModal({
    shipmentId,
    shipmentTitle,
    initialPrice,
    open,
    onOpenChange,
    onBidAccepted
}: ShipmentBidsModalProps) {
    const [bids, setBids] = useState<Bid[]>([])
    const [loading, setLoading] = useState(false)
    const [processingBidId, setProcessingBidId] = useState<string | null>(null)
    const { toast } = useToast()

    // Chat state
    const [chatOpen, setChatOpen] = useState(false)
    const [chatUser, setChatUser] = useState<{ id: string, name: string, avatar: string | null } | null>(null)

    useEffect(() => {
        if (open && shipmentId) {
            loadBids()
        }
    }, [open, shipmentId])

    const loadBids = async () => {
        if (!shipmentId) return

        setLoading(true)
        const result = await getShipmentBids(shipmentId)

        if (result.success) {
            setBids(result.data as Bid[])
        } else {
            toast({
                variant: "destructive",
                title: "Failed to Load Bids",
                description: result.error,
            })
        }
        setLoading(false)
    }

    const handleAcceptBid = async (bidId: string) => {
        setProcessingBidId(bidId)
        const result = await acceptBid(bidId)

        if (result.success) {
            toast({
                title: "Bid Accepted!",
                description: "The traveler has been notified and the shipment is now assigned.",
            })
            onOpenChange(false)
            onBidAccepted?.()
        } else {
            toast({
                variant: "destructive",
                title: "Failed to Accept Bid",
                description: result.error,
            })
        }
        setProcessingBidId(null)
    }

    const handleRejectBid = async (bidId: string) => {
        setProcessingBidId(bidId)
        const result = await rejectBid(bidId)

        if (result.success) {
            toast({
                title: "Bid Rejected",
                description: "The traveler has been notified.",
            })
            loadBids() // Refresh list
        } else {
            toast({
                variant: "destructive",
                title: "Failed to Reject Bid",
                description: result.error,
            })
        }
        setProcessingBidId(null)
    }

    const openChat = (user: { id: string, full_name: string, avatar_url: string | null }) => {
        setChatUser({
            id: user.id,
            name: user.full_name,
            avatar: user.avatar_url
        })
        setChatOpen(true)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">{shipmentTitle}</DialogTitle>
                    <DialogDescription>
                        Initial Price: <span className="font-semibold text-primary">${initialPrice}</span> • {bids.length} {bids.length === 1 ? 'Bid' : 'Bids'} Received
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : bids.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">No bids yet</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {bids.map((bid) => {
                            const priceDiff = bid.offered_price - initialPrice
                            const isPriceHigher = priceDiff > 0
                            const isPriceLower = priceDiff < 0

                            return (
                                <div
                                    key={bid.id}
                                    className={`p-4 rounded-lg border-2 transition-all ${bid.status === 'accepted'
                                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                        : bid.status === 'rejected'
                                            ? 'border-muted bg-muted/50 opacity-60'
                                            : 'border-border hover:border-primary/50 bg-card'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 flex-1">
                                            <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                                                <AvatarImage src={bid.users.avatar_url || undefined} />
                                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                    {bid.users.full_name?.charAt(0).toUpperCase() || 'T'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-semibold text-base">{bid.users.full_name}</h4>
                                                    <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary">
                                                        <Star className="h-3 w-3 mr-1 fill-current" />
                                                        {bid.users.trust_score}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {new Date(bid.created_at).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="flex items-center gap-2 justify-end mb-1">
                                                <span className="text-2xl font-bold text-primary">
                                                    ${bid.offered_price}
                                                </span>
                                                {isPriceHigher && (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
                                                        <TrendingUp className="h-3 w-3 mr-1" />
                                                        +${priceDiff}
                                                    </Badge>
                                                )}
                                                {isPriceLower && (
                                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">
                                                        <TrendingDown className="h-3 w-3 mr-1" />
                                                        ${priceDiff}
                                                    </Badge>
                                                )}
                                            </div>
                                            {bid.status !== 'pending' && (
                                                <Badge
                                                    variant={bid.status === 'accepted' ? 'default' : 'secondary'}
                                                    className={
                                                        bid.status === 'accepted'
                                                            ? 'bg-primary hover:bg-primary/90'
                                                            : 'bg-muted'
                                                    }
                                                >
                                                    {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {bid.status === 'pending' && (
                                        <>
                                            <Separator className="my-4" />
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openChat(bid.users)}
                                                    className="flex-1 gap-2"
                                                >
                                                    <MessageCircle className="h-4 w-4" />
                                                    Chat
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleRejectBid(bid.id)}
                                                    disabled={processingBidId === bid.id}
                                                    className="text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/10"
                                                >
                                                    {processingBidId === bid.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <X className="h-4 w-4 mr-1" />
                                                            Reject
                                                        </>
                                                    )}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleAcceptBid(bid.id)}
                                                    disabled={processingBidId === bid.id}
                                                    className="bg-primary hover:bg-primary/90 gap-2"
                                                >
                                                    {processingBidId === bid.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Check className="h-4 w-4" />
                                                            Accept
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Chat Dialog */}
                {chatUser && shipmentId && (
                    <ChatDialog
                        open={chatOpen}
                        onOpenChange={setChatOpen}
                        shipmentId={shipmentId}
                        otherUserId={chatUser.id}
                        otherUserName={chatUser.name}
                        otherUserAvatar={chatUser.avatar}
                        isShipmentDelivered={false}
                        deliveredAt={null}
                    />
                )}
            </DialogContent>
        </Dialog>
    )
}
