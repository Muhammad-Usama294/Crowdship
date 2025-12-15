"use client"

import { Shipment } from "@/types/database"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, MapPin, Calendar, DollarSign, MessageCircle, AlertCircle, Star, XCircle, Eye } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { CancelShipmentDialog } from "@/components/cancel-shipment-dialog"
import { useState } from "react"
import { motion } from "framer-motion"
import { cancelShipment } from "@/app/sender/actions"

interface ShipmentCardProps {
    shipment: Shipment
    onRate: (shipment: Shipment) => void
    isRated: boolean
    onCancelSuccess: () => void
    onViewBids: (shipment: Shipment) => void
    onChat: (shipment: Shipment) => void
    onViewChats: (shipment: Shipment) => void
}

export function ShipmentCard({
    shipment,
    onRate,
    isRated,
    onCancelSuccess,
    onViewBids,
    onChat,
    onViewChats
}: ShipmentCardProps) {

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
            case 'accepted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
            case 'in_transit': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
            case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
        }
    }

    const [isHovered, setIsHovered] = useState(false)

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
        >
            <Card className={`h-full border-l-4 transition-all duration-300 shadow-sm hover:shadow-xl bg-card/60 backdrop-blur-sm overflow-hidden 
                ${shipment.status === 'delivered' ? 'border-l-green-500' :
                    shipment.status === 'in_transit' ? 'border-l-purple-500' :
                        shipment.status === 'accepted' ? 'border-l-blue-500' :
                            shipment.status === 'cancelled' ? 'border-l-red-500' : 'border-l-yellow-500'}`}
            >
                <CardHeader className="pb-3 pt-4">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <h3 className="font-bold text-lg leading-none group-hover:text-primary transition-colors flex items-center gap-2">
                                <Package className="h-4 w-4 text-primary" />
                                {shipment.title}
                            </h3>
                            <div className="flex items-center text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDistanceToNow(new Date(shipment.created_at), { addSuffix: true })}
                            </div>
                        </div>
                        <Badge variant="outline" className={`${getStatusColor(shipment.status)} border-0 font-medium px-2 py-1`}>
                            {shipment.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="pb-3 text-sm space-y-3">
                    <div className="grid grid-cols-[16px_1fr] gap-2 items-center">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        <span className="truncate" title={shipment.pickup_address || "N/A"}>{shipment.pickup_address || "N/A"}</span>
                    </div>
                    <div className="grid grid-cols-[16px_1fr] gap-2 items-center">
                        <MapPin className="h-4 w-4 text-purple-500" />
                        <span className="truncate" title={shipment.dropoff_address || "N/A"}>{shipment.dropoff_address || "N/A"}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div className="flex items-center gap-1 font-semibold text-green-600 dark:text-green-400">
                            <DollarSign className="h-4 w-4" />
                            {shipment.offer_price}
                        </div>
                        <div className="text-muted-foreground text-xs">
                            {shipment.weight_kg} kg
                        </div>
                    </div>

                    {/* OTP Codes for accepted/in-transit shipments */}
                    {(shipment.status === 'accepted' || shipment.status === 'in_transit') && (
                        <div className="mt-3 p-3 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20">
                            <p className="text-xs font-semibold text-primary mb-2">Verification Codes:</p>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase">Pickup OTP</p>
                                    <p className="text-lg font-mono font-bold text-primary tracking-wider">
                                        {shipment.pickup_otp || 'N/A'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase">Delivery OTP</p>
                                    <p className="text-lg font-mono font-bold text-primary tracking-wider">
                                        {shipment.delivery_otp || 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-2">
                                Share pickup OTP with traveler. Traveler will provide delivery OTP upon completion.
                            </p>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="pt-0 pb-4 gap-2 flex-wrap">
                    {/* Actions based on status */}
                    {shipment.status === 'pending' && (
                        <>
                            <CancelShipmentDialog
                                shipmentId={shipment.id}
                                status={shipment.status}
                                offerPrice={shipment.offer_price}
                                onCancel={() => cancelShipment(shipment.id)}
                                onSuccess={onCancelSuccess}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={() => onViewChats(shipment)}
                            >
                                <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Chats
                            </Button>
                            {shipment.bidding_enabled && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 ml-auto border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300"
                                    onClick={() => onViewBids(shipment)}
                                >
                                    <Eye className="h-3.5 w-3.5 mr-1.5" /> Bids
                                </Button>
                            )}
                        </>
                    )}

                    {(shipment.status === 'accepted' || shipment.status === 'in_transit') && (
                        <>
                            <Button
                                variant="default"
                                size="sm"
                                className="h-8 bg-primary hover:bg-primary/90"
                                onClick={() => onChat(shipment)}
                            >
                                <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Chat
                            </Button>
                            {shipment.status === 'accepted' && (
                                <CancelShipmentDialog
                                    shipmentId={shipment.id}
                                    status={shipment.status}
                                    offerPrice={shipment.offer_price}
                                    onCancel={() => cancelShipment(shipment.id)}
                                    onSuccess={onCancelSuccess}
                                />
                            )}
                        </>
                    )}

                    {shipment.status === 'delivered' && (
                        <>
                            {/* Chat available for 24 hours after delivery */}
                            {(() => {
                                // If delivered_at exists, check if within 24 hours
                                if (shipment.delivered_at) {
                                    const hoursSinceDelivery = (new Date().getTime() - new Date(shipment.delivered_at).getTime()) / (1000 * 60 * 60)
                                    return hoursSinceDelivery < 24
                                }
                                // Fallback: if no delivered_at, assume it's recent and allow chat
                                return true
                            })() && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8"
                                        onClick={() => onChat(shipment)}
                                    >
                                        <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Chat
                                    </Button>
                                )}
                            {!isRated && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-8 ml-auto bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    onClick={() => onRate(shipment)}
                                >
                                    <Star className="h-3.5 w-3.5 mr-1.5" /> Rate
                                </Button>
                            )}
                        </>
                    )}
                </CardFooter>
            </Card>
        </motion.div>
    )
}
