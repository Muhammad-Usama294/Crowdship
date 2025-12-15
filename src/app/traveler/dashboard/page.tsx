"use client"

import { useEffect, useState } from "react"
import { useUser } from "@/contexts/user-context"
import { createClient } from "@/lib/supabase/client"
import { Shipment } from "@/types/database"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"

import { Loader2, Package, MapPin, Truck, CheckCircle, Check, X, AlertCircle, Clock, MessageCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { ChatDialog } from "@/components/chat-dialog"
import { TravelerGuard } from "@/components/traveler-guard"

export default function TravelerDashboard() {
    const { user, profile } = useUser()
    const [shipments, setShipments] = useState<Shipment[]>([])
    const [loading, setLoading] = useState(true)
    const [otpInputs, setOtpInputs] = useState<Record<string, string>>({})
    const [kycStatus, setKycStatus] = useState<string | null>(null)
    const [processing, setProcessing] = useState<string | null>(null)
    const supabase = createClient()
    const { toast } = useToast()

    // Chat state
    const [chatOpen, setChatOpen] = useState(false)
    const [chatShipment, setChatShipment] = useState<Shipment | null>(null)
    const [senderInfo, setSenderInfo] = useState<{ id: string, name: string, avatar: string | null } | null>(null)

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
                    filter: `traveler_id=eq.${user.id}`
                },
                fetchShipments
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user])

    async function fetchShipments() {
        if (!user) return
        const { data } = await supabase
            .from('shipments')
            .select('*')
            .eq('traveler_id', user.id)
            .in('status', ['accepted', 'in_transit', 'delivered'])
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

    async function handleAction(shipmentId: string, type: 'pickup' | 'delivery') {
        const otp = otpInputs[shipmentId]
        if (!otp || otp.length !== 4) {
            toast({
                variant: "destructive",
                title: "Invalid OTP",
                description: "Please enter a valid 4-digit OTP"
            })
            return
        }
        setProcessing(shipmentId)

        const rpcName = type === 'pickup' ? 'complete_pickup' : 'complete_delivery'

        const { data, error } = await supabase.rpc(rpcName, {
            shipment_id: shipmentId,
            otp_input: otp
        })

        if (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message
            })
        } else if (data === true) {
            toast({
                title: "Success",
                description: `${type === 'pickup' ? 'Pickup' : 'Delivery'} confirmed!`,
            })
            fetchShipments()
        } else {
            toast({
                variant: "destructive",
                title: "Invalid OTP",
                description: "The OTP you entered is incorrect. Please try again."
            })
        }
        setProcessing(null)
    }

    // Helper to fetch sender specific info when chat opens
    const handleOpenChat = async (shipment: Shipment) => {
        // Fetch sender profile
        const { data } = await supabase
            .from('users')
            .select('full_name, avatar_url')
            .eq('id', shipment.sender_id)
            .single()

        if (data) {
            setSenderInfo({
                id: shipment.sender_id,
                name: data.full_name || "Sender",
                avatar: data.avatar_url
            })
            setChatShipment(shipment)
            setChatOpen(true)
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not load sender information"
            })
        }
    }

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>

    return (
        <TravelerGuard>
            <div className="container py-8">
                <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
                    <Truck className="h-8 w-8" /> Traveler Dashboard
                </h1>

                {/* KYC Verification Alert */}
                {profile && !profile.is_kyc_verified && (
                    <Alert className={`mb-6 ${kycStatus === 'pending' ? 'border-blue-200 bg-blue-50 dark:bg-blue-950' : kycStatus === 'rejected' ? 'border-red-200 bg-red-50 dark:bg-red-950' : 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950'}`}>
                        {kycStatus === 'pending' ? (
                            <Clock className="h-4 w-4 text-blue-600" />
                        ) : kycStatus === 'rejected' ? (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                        ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                        )}
                        <AlertTitle className={kycStatus === 'pending' ? 'text-blue-800 dark:text-blue-200' : kycStatus === 'rejected' ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'}>
                            {kycStatus === 'pending' ? 'KYC Verification Pending' : kycStatus === 'rejected' ? 'KYC Verification Rejected' : 'KYC Verification Required'}
                        </AlertTitle>
                        <AlertDescription className={kycStatus === 'pending' ? 'text-blue-700 dark:text-blue-300' : kycStatus === 'rejected' ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'}>
                            {kycStatus === 'pending' ? (
                                <p>Your documents are being reviewed. This typically takes 1-3 business days. You'll be able to accept shipments once approved.</p>
                            ) : kycStatus === 'rejected' ? (
                                <>
                                    <p className="mb-2">Your submission was rejected. Please upload new documents to start accepting shipments.</p>
                                    <Link href="/kyc/upload">
                                        <Button variant="outline" size="sm" className="bg-red-100 hover:bg-red-200 text-red-800 border-red-300">
                                            Re-submit Documents
                                        </Button>
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <p className="mb-2">You must verify your identity to accept and deliver shipments.</p>
                                    <Link href="/kyc/upload">
                                        <Button variant="outline" size="sm" className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-300">
                                            Upload Documents
                                        </Button>
                                    </Link>
                                </>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                {shipments.length === 0 ? (
                    <div className="text-center py-20 border rounded-lg bg-muted/10">
                        <Truck className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No active deliveries</h3>
                        <p className="text-muted-foreground">Find packages to deliver in the Trip Planner.</p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {shipments.map((shipment) => (
                            <Card key={shipment.id} className={shipment.status === 'delivered' ? 'opacity-70 bg-muted/30' : ''}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg truncate">{shipment.title}</CardTitle>
                                        <Badge>{shipment.status.replace('_', ' ')}</Badge>
                                    </div>
                                    <CardDescription>Earn ${Math.round(shipment.offer_price * 0.90)}</CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm space-y-4">
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="flex items-center gap-1"><MapPin className="h-3 w-3 text-green-500" /> Pickup: {shipment.pickup_address?.split(',')[0]}...</p>
                                                <p className="flex items-center gap-1"><MapPin className="h-3 w-3 text-red-500" /> Dropoff: {shipment.dropoff_address?.split(',')[0]}...</p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 gap-2"
                                                onClick={() => handleOpenChat(shipment)}
                                            >
                                                <MessageCircle className="h-4 w-4" />
                                                Chat
                                            </Button>
                                        </div>
                                    </div>

                                    {shipment.status === 'accepted' && (
                                        <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-md border border-yellow-100 dark:border-yellow-900">
                                            <p className="text-xs font-medium mb-2">Wait for Pickup OTP from Sender</p>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="OTP"
                                                    className="w-20"
                                                    maxLength={4}
                                                    value={otpInputs[shipment.id] || ''}
                                                    onChange={(e) => setOtpInputs({ ...otpInputs, [shipment.id]: e.target.value })}
                                                />
                                                <Button size="sm" onClick={() => handleAction(shipment.id, 'pickup')} disabled={processing === shipment.id}>
                                                    {processing === shipment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Pickup"}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {shipment.status === 'in_transit' && (
                                        <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-md border border-blue-100 dark:border-blue-900">
                                            <p className="text-xs font-medium mb-2">Ask Receiver for Delivery OTP</p>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="OTP"
                                                    className="w-20"
                                                    maxLength={4}
                                                    value={otpInputs[shipment.id] || ''}
                                                    onChange={(e) => setOtpInputs({ ...otpInputs, [shipment.id]: e.target.value })}
                                                />
                                                <Button size="sm" onClick={() => handleAction(shipment.id, 'delivery')} disabled={processing === shipment.id}>
                                                    {processing === shipment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Delivery"}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {shipment.status === 'delivered' && (
                                        <div className="flex items-center gap-2 text-green-600 font-medium">
                                            <CheckCircle className="h-4 w-4" /> Delivered successfully
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Chat Dialog */}
                {chatShipment && senderInfo && (
                    <ChatDialog
                        open={chatOpen}
                        onOpenChange={setChatOpen}
                        shipmentId={chatShipment.id}
                        otherUserId={senderInfo.id}
                        otherUserName={senderInfo.name}
                        otherUserAvatar={senderInfo.avatar}
                        isShipmentDelivered={chatShipment.status === 'delivered'}
                        deliveredAt={chatShipment.status === 'delivered' ? chatShipment.created_at || null : null} // FIXME: using created_at for now
                    />
                )}
            </div>
        </TravelerGuard >
    )
}
