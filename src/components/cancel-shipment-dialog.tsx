"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface CancelShipmentDialogProps {
    shipmentId: string
    status: string
    offerPrice: number
    onCancel: () => Promise<{ success: boolean; error?: string; penalty?: number }>
    onSuccess: () => void
}

export function CancelShipmentDialog({
    shipmentId,
    status,
    offerPrice,
    onCancel,
    onSuccess
}: CancelShipmentDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    // Calculate penalty
    let penalty = 0
    if (status === 'accepted') penalty = offerPrice * 0.10
    else if (status === 'in_transit') penalty = offerPrice * 0.50

    const handleCancel = async () => {
        setLoading(true)
        const result = await onCancel()
        setLoading(false)

        if (result.success) {
            setOpen(false)
            onSuccess()
            toast({
                title: "Shipment Cancelled",
                description: "Your shipment has been cancelled successfully."
            })
        } else {
            toast({
                variant: "destructive",
                title: "Cancellation Failed",
                description: result.error || "Failed to cancel shipment"
            })
        }
    }

    return (
        <>
            <Button
                variant="destructive"
                size="sm"
                className="h-8"
                onClick={() => setOpen(true)}
            >
                Cancel Shipment
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Cancel Shipment?
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-3 pt-2">
                                <p className="text-base">Are you sure you want to cancel this shipment?</p>

                                {penalty > 0 && (
                                    <div className="p-4 bg-destructive/5 dark:bg-destructive/10 border-2 border-destructive/20 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertTriangle className="h-4 w-4 text-destructive" />
                                            <div className="font-semibold text-destructive text-base">Cancellation Penalty</div>
                                        </div>
                                        <div className="text-sm text-destructive/90 dark:text-destructive/80 mt-2 space-y-1">
                                            <p>A <strong className="font-bold">${penalty.toFixed(2)}</strong> ({(penalty / offerPrice * 100).toFixed(0)}%) penalty will be deducted from your wallet.</p>
                                            <p className="text-xs pt-1 opacity-80">
                                                This compensates the traveler for accepting your shipment.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {penalty === 0 && (
                                    <div className="p-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg">
                                        <p className="text-sm text-primary font-medium">
                                            ✓ No penalty - shipment hasn't been accepted yet
                                        </p>
                                    </div>
                                )}
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                            className="flex-1"
                        >
                            Keep Shipment
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleCancel}
                            disabled={loading}
                            className="flex-1"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {penalty > 0 ? `Pay $${penalty.toFixed(2)} & Cancel` : 'Cancel Shipment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
