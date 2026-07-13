"use client"

import { Shipment } from "@/types/database"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, MapPin, Calendar, DollarSign, MessageCircle, AlertCircle, Star, XCircle, Eye, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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
    isSenderView?: boolean
    variant?: 'grid' | 'list'
}

export function ShipmentCard({
    shipment,
    onRate,
    isRated,
    onCancelSuccess,
    onViewBids,
    onChat,
    onViewChats,
    isSenderView = false,
    variant = 'grid'
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

    // Calculate display price
    // If sender view, show full price (Total Cost)
    // If traveler view (default), show net earnings (Total * 0.90)
    const displayPrice = isSenderView
        ? shipment.offer_price
        : Math.round(shipment.offer_price * 0.90)

    if (variant === 'list') {
        return (
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-xl bg-card/40 hover:bg-card/80 transition-colors gap-4"
            >
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`${getStatusColor(shipment.status)} border-0 font-medium px-2 py-0.5`}>
                            {shipment.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <h3 className="font-semibold text-base flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            {shipment.title}
                        </h3>
                        <span className="text-xs text-muted-foreground flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDistanceToNow(new Date(shipment.created_at), { addSuffix: true })}
                        </span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-blue-500" />
                            <span className="truncate max-w-[200px]" title={shipment.pickup_address || "N/A"}>{shipment.pickup_address?.split(',')[0] || "N/A"}</span>
                        </div>
                        <div className="hidden sm:block text-border">→</div>
                        <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-purple-500" />
                            <span className="truncate max-w-[200px]" title={shipment.dropoff_address || "N/A"}>{shipment.dropoff_address?.split(',')[0] || "N/A"}</span>
                        </div>
                    </div>

                    {(shipment.status === 'accepted' || shipment.status === 'in_transit') && (
                        <div className="flex gap-4 mt-2 p-2 bg-primary/5 rounded-md border border-primary/10 w-fit">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                Pickup OTP: <strong className="text-primary font-mono">{shipment.pickup_otp || 'N/A'}</strong>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-3.5 w-3.5 text-muted-foreground/70 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[200px] text-xs">Share this with the traveler when they arrive to pick up your package.</TooltipContent>
                                </Tooltip>
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                Delivery OTP: <strong className="text-primary font-mono">{shipment.delivery_otp || 'N/A'}</strong>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-3.5 w-3.5 text-muted-foreground/70 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[200px] text-xs">Share this with the receiver. The traveler will ask them for this code at dropoff.</TooltipContent>
                                </Tooltip>
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3">
                    <div className="text-right">
                        <div className="font-semibold text-green-600 dark:text-green-400 flex items-center justify-end">
                            <DollarSign className="h-4 w-4" />{displayPrice}
                        </div>
                        <div className="text-xs text-muted-foreground">{shipment.weight_kg} kg</div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        {shipment.status === 'pending' && (
                            <>
                                <CancelShipmentDialog
                                    shipmentId={shipment.id}
                                    status={shipment.status}
                                    offerPrice={shipment.offer_price}
                                    onCancel={() => cancelShipment(shipment.id)}
                                    onSuccess={onCancelSuccess}
                                />
                                <Button variant="outline" size="sm" className="h-8" onClick={() => onViewChats(shipment)}>
                                    <MessageCircle className="h-3.5 w-3.5 mr-1" /> Chats
                                </Button>
                                {shipment.bidding_enabled && (
                                    <Button variant="outline" size="sm" className="h-8 border-blue-200 text-blue-700 bg-blue-50" onClick={() => onViewBids(shipment)}>
                                        <Eye className="h-3.5 w-3.5 mr-1" /> Bids
                                    </Button>
                                )}
                            </>
                        )}
                        {(shipment.status === 'accepted' || shipment.status === 'in_transit') && (
                            <>
                                <Button variant="default" size="sm" className="h-8" onClick={() => onChat(shipment)}>
                                    <MessageCircle className="h-3.5 w-3.5 mr-1" /> Chat
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
                                {shipment.delivered_at && ((new Date().getTime() - new Date(shipment.delivered_at).getTime()) / (1000 * 60 * 60) < 24) && (
                                    <Button variant="outline" size="sm" className="h-8" onClick={() => onChat(shipment)}>
                                        <MessageCircle className="h-3.5 w-3.5 mr-1" /> Chat
                                    </Button>
                                )}
                                {!isRated && (
                                    <Button variant="secondary" size="sm" className="h-8 bg-yellow-100 text-yellow-800" onClick={() => onRate(shipment)}>
                                        <Star className="h-3.5 w-3.5 mr-1" /> Rate
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
        >
            <Card className="h-full transition-all duration-300 shadow-sm hover:shadow-xl bg-card/60 backdrop-blur-sm overflow-hidden border border-border/50">
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
                            {displayPrice}
                            {isSenderView && <span className="text-xs text-muted-foreground ml-1">(My Offer)</span>}
                        </div>
                        <div className="text-muted-foreground text-xs">
                            {shipment.weight_kg} kg
                        </div>
                    </div>

                    {/* OTP Codes for accepted/in-transit shipments */}
                    {(shipment.status === 'accepted' || shipment.status === 'in_transit') && (
                        <div className="mt-3 p-3 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20">
                            <div className="flex items-center gap-1 mb-2">
                                <p className="text-xs font-semibold text-primary">Verification Codes:</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                                        Pickup OTP
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Info className="h-3 w-3 text-muted-foreground/70 cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-[200px] text-xs">Share this with the traveler when they arrive to pick up your package.</TooltipContent>
                                        </Tooltip>
                                    </p>
                                    <p className="text-lg font-mono font-bold text-primary tracking-wider">
                                        {shipment.pickup_otp || 'N/A'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                                        Delivery OTP
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Info className="h-3 w-3 text-muted-foreground/70 cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-[200px] text-xs">Share this with the receiver. The traveler will ask them for this code at dropoff.</TooltipContent>
                                        </Tooltip>
                                    </p>
                                    <p className="text-lg font-mono font-bold text-primary tracking-wider">
                                        {shipment.delivery_otp || 'N/A'}
                                    </p>
                                </div>
                            </div>
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
