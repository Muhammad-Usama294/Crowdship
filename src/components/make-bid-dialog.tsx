"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shipment } from "@/types/database"
import { createBid, acceptInitialPrice } from "@/app/traveler/bid-actions"
import { useToast } from "@/components/ui/use-toast"
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react"

interface MakeBidDialogProps {
    shipment: Shipment | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function MakeBidDialog({ shipment, open, onOpenChange, onSuccess }: MakeBidDialogProps) {
    const [offeredPrice, setOfferedPrice] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { toast } = useToast()

    if (!shipment) return null

    const initialPrice = shipment.offer_price
    const suggestedPrices = [
        { label: "-20%", value: initialPrice * 0.8 },
        { label: "-10%", value: initialPrice * 0.9 },
        { label: "+10%", value: initialPrice * 1.1 },
        { label: "+20%", value: initialPrice * 1.2 },
    ]

    const handleAcceptInitialPrice = async () => {
        setIsSubmitting(true)
        const result = await acceptInitialPrice(shipment.id)

        if (result.success) {
            toast({
                title: "Shipment Accepted!",
                description: `You've accepted the shipment at $${initialPrice}`,
            })
            onOpenChange(false)
            onSuccess?.()
        } else {
            toast({
                variant: "destructive",
                title: "Failed to Accept",
                description: result.error,
            })
        }
        setIsSubmitting(false)
    }

    const handleSubmitBid = async () => {
        const price = parseFloat(offeredPrice)

        if (isNaN(price) || price <= 0) {
            toast({
                variant: "destructive",
                title: "Invalid Price",
                description: "Please enter a valid price",
            })
            return
        }

        setIsSubmitting(true)
        const result = await createBid(shipment.id, price)

        if (result.success) {
            toast({
                title: "Bid Submitted!",
                description: `Your offer of $${price} has been sent to the sender`,
            })
            onOpenChange(false)
            setOfferedPrice("")
            onSuccess?.()
        } else {
            toast({
                variant: "destructive",
                title: "Failed to Submit Bid",
                description: result.error,
            })
        }
        setIsSubmitting(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Make an Offer</DialogTitle>
                    <DialogDescription>
                        {shipment.title}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Current Price */}
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <span className="text-sm font-medium">Sender's Price:</span>
                        <span className="text-2xl font-bold text-green-600">${initialPrice}</span>
                    </div>

                    {/* Quick Accept */}
                    {shipment.auto_accept_initial_price && (
                        <Button
                            onClick={handleAcceptInitialPrice}
                            disabled={isSubmitting}
                            className="w-full bg-green-600 hover:bg-green-700"
                            size="lg"
                        >
                            <DollarSign className="mr-2 h-5 w-5" />
                            Accept ${initialPrice} (Instant)
                        </Button>
                    )}

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or make a counter-offer
                            </span>
                        </div>
                    </div>

                    {/* Custom Offer */}
                    <div className="space-y-2">
                        <Label htmlFor="offer">Your Offer ($)</Label>
                        <Input
                            id="offer"
                            type="number"
                            step="1"
                            placeholder="Enter your price"
                            value={offeredPrice}
                            onChange={(e) => setOfferedPrice(e.target.value)}
                        />
                    </div>

                    {/* Suggested Prices */}
                    <div className="space-y-2">
                        <Label>Quick Suggestions:</Label>
                        <div className="grid grid-cols-4 gap-2">
                            {suggestedPrices.map((suggestion) => (
                                <Button
                                    key={suggestion.label}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setOfferedPrice(suggestion.value.toFixed(0))}
                                    className="flex flex-col h-auto py-2"
                                >
                                    {suggestion.label.startsWith('-') ? (
                                        <TrendingDown className="h-3 w-3 text-red-500" />
                                    ) : (
                                        <TrendingUp className="h-3 w-3 text-green-500" />
                                    )}
                                    <span className="text-xs">{suggestion.label}</span>
                                    <span className="font-semibold text-xs">${suggestion.value.toFixed(0)}</span>
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmitBid}
                        disabled={isSubmitting || !offeredPrice}
                    >
                        {isSubmitting ? "Submitting..." : "Submit Offer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
