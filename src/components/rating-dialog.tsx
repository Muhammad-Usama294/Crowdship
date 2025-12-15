"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

interface RatingDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (rating: number, comment: string) => Promise<void>
    travelerName?: string
}

export function RatingDialog({ open, onOpenChange, onSubmit, travelerName }: RatingDialogProps) {
    const [rating, setRating] = useState(0)
    const [hoveredRating, setHoveredRating] = useState(0)
    const [comment, setComment] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { toast } = useToast()

    const handleSubmit = async () => {
        if (rating === 0) {
            toast({
                variant: "destructive",
                title: "Rating required",
                description: "Please select a rating to continue"
            })
            return
        }

        setIsSubmitting(true)
        try {
            await onSubmit(rating, comment)
            // Reset form
            setRating(0)
            setComment("")
            onOpenChange(false)
        } catch (error) {
            console.error("Error submitting rating:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Rate Your Traveler</DialogTitle>
                    <DialogDescription>
                        How was your experience with {travelerName || "this traveler"}?
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Star Rating */}
                    <div className="space-y-2">
                        <Label>Rating</Label>
                        <div className="flex gap-2 justify-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoveredRating(star)}
                                    onMouseLeave={() => setHoveredRating(0)}
                                    className="transition-transform hover:scale-110 focus:outline-none"
                                >
                                    <Star
                                        className={`h-8 w-8 ${star <= (hoveredRating || rating)
                                            ? "fill-yellow-400 text-yellow-400"
                                            : "text-gray-300"
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>
                        {rating > 0 && (
                            <p className="text-center text-sm text-muted-foreground">
                                {rating === 1 && "Poor"}
                                {rating === 2 && "Fair"}
                                {rating === 3 && "Good"}
                                {rating === 4 && "Very Good"}
                                {rating === 5 && "Excellent"}
                            </p>
                        )}
                    </div>

                    {/* Comment */}
                    <div className="space-y-2">
                        <Label htmlFor="comment">Comment (Optional)</Label>
                        <Textarea
                            id="comment"
                            placeholder="Share your experience..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={4}
                            maxLength={500}
                        />
                        <p className="text-xs text-muted-foreground text-right">
                            {comment.length}/500
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
                        {isSubmitting ? "Submitting..." : "Submit Rating"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
