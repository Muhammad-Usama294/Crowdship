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

import { Loader2, Package, MapPin, Truck, CheckCircle, Check, X, AlertCircle, Clock, MessageCircle, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import dynamic from "next/dynamic"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const TravelerMap = dynamic(() => import("@/components/leaflet-traveler-view"), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted/20 animate-pulse flex items-center justify-center text-muted-foreground">Loading Map...</div>
}) as React.ComponentType<any>;
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
            <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] overflow-hidden">
                {/* Left Sidebar - Active Deliveries */}
                <div className="w-full md:w-[450px] flex flex-col bg-background border-r h-full z-10 shadow-lg shrink-0">
                    <div className="p-4 md:p-6 pb-2 shrink-0">
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Truck className="h-6 w-6 text-primary" /> Active Deliveries
                        </h1>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">

                {/* KYC Verification Alert */}
                {profile && !profile.is_kyc_verified && (
                    <div className="p-4 md:px-6 pt-0 shrink-0">
                        <Alert className={`mb-0 ${kycStatus === 'pending' ? 'border-blue-200 bg-blue-50 dark:bg-blue-950' : kycStatus === 'rejected' ? 'border-red-200 bg-red-50 dark:bg-red-950' : 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950'}`}>
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
                                    <p className="text-xs">Your documents are being reviewed. This typically takes 1-3 business days. You'll be able to accept shipments once approved.</p>
                                ) : kycStatus === 'rejected' ? (
                                    <>
                                        <p className="mb-2 text-xs">Your submission was rejected. Please upload new documents to start accepting shipments.</p>
                                        <Link href="/kyc/upload">
                                            <Button variant="outline" size="sm" className="bg-red-100 hover:bg-red-200 text-red-800 border-red-300 h-7 text-xs">
                                                Re-submit Documents
                                            </Button>
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <p className="mb-2 text-xs">You must verify your identity to accept and deliver shipments.</p>
                                        <Link href="/kyc/upload">
                                            <Button variant="outline" size="sm" className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-300 h-7 text-xs">
                                                Upload Documents
                                            </Button>
                                        </Link>
                                    </>
                                )}
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                {shipments.length === 0 ? (
                    <div className="text-center py-10 px-4 border rounded-lg bg-muted/10 mx-4 md:mx-6 mt-4">
                        <Truck className="mx-auto h-10 w-10 text-muted-foreground/50" />
                        <h3 className="mt-3 text-base font-semibold">No active deliveries</h3>
                        <p className="text-sm text-muted-foreground mt-1">Find packages to deliver in the Trip Planner.</p>
                        <Link href="/traveler">
                            <Button className="mt-4 w-full" size="sm">Find Packages</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {shipments.map((shipment) => (
                            <Card key={shipment.id} className={`transition-all ${shipment.status === 'delivered' ? 'opacity-70 bg-muted/30' : 'hover:border-primary/50 shadow-sm'}`}>
                                <CardHeader className="pb-2 p-4">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-base truncate group-hover:text-primary transition-colors flex items-center gap-2">
                                            <Package className="h-4 w-4 text-primary" />
                                            {shipment.title}
                                        </CardTitle>
                                        <Badge variant="outline" className={`border-0 font-medium px-2 py-0.5 ${
                                            shipment.status === 'accepted' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                            shipment.status === 'in_transit' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                                            shipment.status === 'delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                            'bg-muted text-muted-foreground'
                                        }`}>
                                            {shipment.status.replace('_', ' ').toUpperCase()}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-sm font-semibold text-green-600 dark:text-green-400 flex items-center">
                                            Earn ${Math.round(shipment.offer_price * 0.90)}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{shipment.weight_kg} kg</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="text-sm p-4 pt-0 space-y-4">
                                    <div className="grid grid-cols-[16px_1fr] gap-x-2 gap-y-3 text-xs mt-3 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-1 pt-1">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 box-content border-2 border-background" />
                                            <div className="w-0.5 h-6 bg-border" />
                                            <div className="w-2 h-2 rounded-full bg-orange-500 box-content border-2 border-background" />
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <span className="block font-medium text-foreground">Pickup</span>
                                                <span className="line-clamp-1">{shipment.pickup_address}</span>
                                            </div>
                                            <div>
                                                <span className="block font-medium text-foreground">Dropoff</span>
                                                <span className="line-clamp-1">{shipment.dropoff_address}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end border-t border-border/50 pt-3">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 gap-1.5 px-3"
                                            onClick={() => handleOpenChat(shipment)}
                                        >
                                            <MessageCircle className="h-3.5 w-3.5" />
                                            Chat
                                        </Button>
                                    </div>

                                    {shipment.status === 'accepted' && (
                                        <div className="bg-primary/5 dark:bg-primary/10 p-3 rounded-lg border border-primary/20 mt-2">
                                            <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
                                                Wait for Pickup OTP from Sender
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Info className="h-3 w-3 text-primary/70 cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-[200px] text-xs">When you arrive at the pickup location, ask the sender for their 4-digit Pickup OTP to verify you have the package.</TooltipContent>
                                                </Tooltip>
                                            </p>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="OTP"
                                                    className="w-full h-9 font-mono tracking-widest text-center"
                                                    maxLength={4}
                                                    value={otpInputs[shipment.id] || ''}
                                                    onChange={(e) => setOtpInputs({ ...otpInputs, [shipment.id]: e.target.value })}
                                                />
                                                <Button size="sm" className="h-9 whitespace-nowrap" onClick={() => handleAction(shipment.id, 'pickup')} disabled={processing === shipment.id || !otpInputs[shipment.id] || otpInputs[shipment.id].length !== 4}>
                                                    {processing === shipment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Pickup"}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {shipment.status === 'in_transit' && (
                                        <div className="bg-purple-50 dark:bg-purple-900/10 p-3 rounded-lg border border-purple-200 dark:border-purple-900 mt-2">
                                            <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-1">
                                                Ask Receiver for Delivery OTP
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Info className="h-3 w-3 text-purple-700/70 dark:text-purple-300/70 cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-[200px] text-xs">When you arrive at the dropoff location, ask the receiver for their Delivery OTP to confirm successful delivery and release your payment.</TooltipContent>
                                                </Tooltip>
                                            </p>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="OTP"
                                                    className="w-full h-9 font-mono tracking-widest text-center border-purple-200 focus-visible:ring-purple-500"
                                                    maxLength={4}
                                                    value={otpInputs[shipment.id] || ''}
                                                    onChange={(e) => setOtpInputs({ ...otpInputs, [shipment.id]: e.target.value })}
                                                />
                                                <Button size="sm" className="h-9 whitespace-nowrap bg-purple-600 hover:bg-purple-700" onClick={() => handleAction(shipment.id, 'delivery')} disabled={processing === shipment.id || !otpInputs[shipment.id] || otpInputs[shipment.id].length !== 4}>
                                                    {processing === shipment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Delivery"}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {shipment.status === 'delivered' && (
                                        <div className="flex items-center gap-2 text-green-600 font-medium text-xs bg-green-50 dark:bg-green-900/10 p-2 rounded-md border border-green-100 dark:border-green-900">
                                            <CheckCircle className="h-4 w-4" /> Delivered successfully
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
                    </div>
                </div>

                {/* Right Area - Map */}
                <div className="hidden md:flex flex-1 h-full relative bg-muted/20 z-0">
                    <TravelerMap 
                        start={null} 
                        end={null} 
                        shipments={shipments} 
                        onMapClick={() => {}} 
                        onRouteFound={() => {}} 
                    />
                </div>

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
