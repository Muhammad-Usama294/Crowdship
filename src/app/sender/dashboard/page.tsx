"use client"

import { useEffect, useState } from "react"
import { useUser } from "@/contexts/user-context"
import { createClient } from "@/lib/supabase/client"
import { Shipment } from "@/types/database"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, Plus, AlertCircle, Clock, Star, MessageCircle, Wallet } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RatingDialog } from "@/components/rating-dialog"
import { submitRating, getRating } from "@/app/ratings/actions"
import { CancelShipmentDialog } from "@/components/cancel-shipment-dialog"
import { cancelShipment } from "../actions"
import { ShipmentBidsModal } from "@/components/shipment-bids-modal"
import { useToast } from "@/components/ui/use-toast"
import { ChatDialog } from "@/components/chat-dialog"
import { ChatsListDialog } from "@/components/chats-list-dialog"
import { ShipmentCard } from "@/components/shipment-card"
import { ProfileCompletionGuard } from "@/components/profile-completion-guard"


export default function SenderDashboard() {
    const { user, profile } = useUser()
    const { toast } = useToast()

    const [shipments, setShipments] = useState<Shipment[]>([])
    const [loading, setLoading] = useState(true)
    const [kycStatus, setKycStatus] = useState<string | null>(null)
    const [ratingDialogOpen, setRatingDialogOpen] = useState(false)
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
    const [ratedShipments, setRatedShipments] = useState<Set<string>>(new Set())
    const [bidsModalOpen, setBidsModalOpen] = useState(false)
    const [bidsShipment, setBidsShipment] = useState<Shipment | null>(null)
    const supabase = createClient()

    // Chat state
    const [chatOpen, setChatOpen] = useState(false)
    const [chatShipment, setChatShipment] = useState<Shipment | null>(null)
    const [travelerInfo, setTravelerInfo] = useState<{ id: string, name: string, avatar: string | null } | null>(null)

    // Threads List State
    const [chatsListOpen, setChatsListOpen] = useState(false)
    const [chatsListShipmentId, setChatsListShipmentId] = useState<string | null>(null)

    async function fetchShipments() {
        if (!user) return

        const { data } = await supabase
            .from('shipments')
            .select('*')
            .eq('sender_id', user.id)
            .order('created_at', { ascending: false })

        if (data) setShipments(data)
        setLoading(false)
    }

    async function fetchKYCStatus() {
        if (!user) return

        const { data } = await supabase
            .from('kyc_documents')
            .select('status')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (data) setKycStatus(data.status)
    }

    async function fetchRatings() {
        if (!user || shipments.length === 0) return

        const { data } = await supabase
            .from('ratings')
            .select('shipment_id')
            .in('shipment_id', shipments.map(s => s.id))

        if (data) {
            setRatedShipments(new Set(data.map(r => r.shipment_id)))
        }
    }

    const handleRateShipment = (shipment: Shipment) => {
        setSelectedShipment(shipment)
        setRatingDialogOpen(true)
    }

    const handleSubmitRating = async (rating: number, comment: string) => {
        if (!selectedShipment) return

        const result = await submitRating(selectedShipment.id, rating, comment)

        if (result.error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Error: " + result.error
            })
        } else {
            toast({
                title: "Thanks for your feedback!",
                description: "Your rating has been submitted successfully."
            })
            setRatedShipments(prev => new Set([...prev, selectedShipment.id]))
            setRatingDialogOpen(false)
        }
    }

    // Helper to fetch traveler specific info when chat opens
    const handleOpenChat = async (shipment: Shipment) => {
        if (!shipment.traveler_id) return

        // Fetch traveler profile
        const { data } = await supabase
            .from('users')
            .select('full_name, avatar_url')
            .eq('id', shipment.traveler_id)
            .single()

        if (data) {
            setTravelerInfo({
                id: shipment.traveler_id,
                name: data.full_name || "Traveler",
                avatar: data.avatar_url
            })
            setChatShipment(shipment)
            setChatOpen(true)
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not load traveler information"
            })
        }
    }

    useEffect(() => {
        fetchShipments()
        fetchKYCStatus()

        if (!user) return

        // Subscribe to real-time updates
        const channel = supabase
            .channel('shipments-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'shipments',
                    filter: `sender_id=eq.${user.id}`
                },
                () => {
                    fetchShipments()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user])

    useEffect(() => {
        fetchRatings()
    }, [shipments])

    if (loading) return <div className="container py-10">Loading...</div>

    return (
        <ProfileCompletionGuard>
            <div className="container py-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold">My Shipments</h1>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Link href="/wallet" className="flex-1 sm:flex-none">
                            <Button variant="outline" className="w-full sm:w-auto">
                                <Wallet className="mr-2 h-4 w-4" /> Wallet
                            </Button>
                        </Link>
                        <Link href="/sender/create" className="flex-1 sm:flex-none">
                            <Button className="w-full sm:w-auto">
                                <Plus className="mr-2 h-4 w-4" /> New Shipment
                            </Button>
                        </Link>
                    </div>
                </div>


                {shipments.length === 0 ? (
                    <div className="text-center py-20 border rounded-lg bg-muted/10">
                        <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No shipments yet</h3>
                        <p className="text-muted-foreground mb-4">Create your first shipment to get started</p>
                        <Link href="/sender/create">
                            <Button>Create Shipment</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                        {shipments.map((shipment) => (
                            <ShipmentCard
                                key={shipment.id}
                                shipment={shipment}
                                onRate={handleRateShipment}
                                isRated={ratedShipments.has(shipment.id)}
                                onCancelSuccess={fetchShipments}
                                onViewBids={(shipment) => {
                                    setBidsShipment(shipment)
                                    setBidsModalOpen(true)
                                }}
                                onChat={handleOpenChat}
                                onViewChats={(shipment) => {
                                    setChatsListShipmentId(shipment.id)
                                    setChatsListOpen(true)
                                }}
                                isSenderView={true}
                            />
                        ))}
                    </div>
                )}

                {/* Chat Dialog */}
                {chatShipment && travelerInfo && (
                    <ChatDialog
                        open={chatOpen}
                        onOpenChange={setChatOpen}
                        shipmentId={chatShipment.id}
                        otherUserId={travelerInfo.id}
                        otherUserName={travelerInfo.name}
                        otherUserAvatar={travelerInfo.avatar}
                        isShipmentDelivered={chatShipment.status === 'delivered'}
                        deliveredAt={chatShipment.delivered_at}
                    />
                )}

                {/* Chats List Dialog for pending shipments */}
                {chatsListShipmentId && user && (
                    <ChatsListDialog
                        open={chatsListOpen}
                        onOpenChange={setChatsListOpen}
                        shipmentId={chatsListShipmentId}
                        currentUserId={user.id}
                        onSelectUser={(userInfo) => {
                            setTravelerInfo({ id: userInfo.id, name: userInfo.name, avatar: userInfo.avatar })
                            const shipment = shipments.find(s => s.id === chatsListShipmentId)
                            if (shipment) {
                                setChatShipment(shipment)
                                setChatOpen(true)
                                setChatsListOpen(false)
                            }
                        }}
                    />
                )}

                {/* Rating Dialog */}
                {selectedShipment && (
                    <RatingDialog
                        open={ratingDialogOpen}
                        onOpenChange={setRatingDialogOpen}
                        travelerName={selectedShipment.traveler_id ? "Traveler" : "Unknown"}
                        onSubmit={handleSubmitRating}
                    />
                )}

                {/* Bids Modal */}
                {bidsShipment && (
                    <ShipmentBidsModal
                        open={bidsModalOpen}
                        onOpenChange={setBidsModalOpen}
                        shipmentId={bidsShipment.id}
                        shipmentTitle={bidsShipment.title}
                        initialPrice={bidsShipment.offer_price}
                        onBidAccepted={fetchShipments}
                    />
                )}
            </div>
        </ProfileCompletionGuard>
    )
}
