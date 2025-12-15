import { Star } from "lucide-react"

interface RatingDisplayProps {
    rating: number
    totalRatings?: number
    showCount?: boolean
    size?: "sm" | "md" | "lg"
}

export function RatingDisplay({ rating, totalRatings, showCount = true, size = "sm" }: RatingDisplayProps) {
    const starSize = size === "sm" ? "h-4 w-4" : size === "md" ? "h-5 w-5" : "h-6 w-6"
    const textSize = size === "sm" ? "text-sm" : size === "md" ? "text-base" : "text-lg"

    return (
        <div className="flex items-center gap-1">
            <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`${starSize} ${star <= Math.round(rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                            }`}
                    />
                ))}
            </div>
            <span className={`${textSize} font-medium ml-1`}>
                {rating > 0 ? rating.toFixed(1) : "No ratings"}
            </span>
            {showCount && totalRatings !== undefined && totalRatings > 0 && (
                <span className={`${textSize} text-muted-foreground`}>
                    ({totalRatings})
                </span>
            )}
        </div>
    )
}
