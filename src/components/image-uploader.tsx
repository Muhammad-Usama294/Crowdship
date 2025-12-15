"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { X, Upload, Loader2 } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/components/ui/use-toast"

interface ImageUploaderProps {
    maxImages?: number
    value: string[]
    onChange: (urls: string[]) => void
    userId: string
    folder?: string
}

export function ImageUploader({
    maxImages = 3,
    value = [],
    onChange,
    userId,
    folder = "temp"
}: ImageUploaderProps) {
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()
    const { toast } = useToast()

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        // Check if adding these files would exceed max
        if (value.length + files.length > maxImages) {
            toast({
                variant: "destructive",
                title: "Limit exceeded",
                description: `You can only upload up to ${maxImages} images`
            })
            return
        }

        setUploading(true)

        try {
            const uploadedUrls: string[] = []

            for (let i = 0; i < files.length; i++) {
                const file = files[i]

                // Validate file type
                if (!file.type.startsWith('image/')) {
                    toast({
                        variant: "destructive",
                        title: "Invalid file type",
                        description: `${file.name} is not an image`
                    })
                    continue
                }

                // Validate file size (5MB max)
                if (file.size > 5 * 1024 * 1024) {
                    toast({
                        variant: "destructive",
                        title: "File too large",
                        description: `${file.name} is too large (max 5MB)`
                    })
                    continue
                }

                // Create unique filename
                const timestamp = Date.now()
                const fileExt = file.name.split('.').pop()
                const fileName = `${timestamp}_${i}.${fileExt}`
                const filePath = `${userId}/${folder}/${fileName}`

                // Upload to Supabase Storage
                const { data, error } = await supabase.storage
                    .from('shipment-images')
                    .upload(filePath, file)

                if (error) {
                    console.error('Upload error:', error)
                    toast({
                        variant: "destructive",
                        title: "Upload failed",
                        description: `Failed to upload ${file.name}`
                    })
                    continue
                }

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('shipment-images')
                    .getPublicUrl(filePath)

                uploadedUrls.push(publicUrl)
            }

            // Update parent with new URLs
            onChange([...value, ...uploadedUrls])

        } catch (error) {
            console.error('Upload error:', error)
            toast({
                variant: "destructive",
                title: "Error",
                description: 'Failed to upload images'
            })
        } finally {
            setUploading(false)
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const removeImage = async (index: number) => {
        const urlToRemove = value[index]

        // Extract path from URL
        const url = new URL(urlToRemove)
        const pathParts = url.pathname.split('/shipment-images/')
        if (pathParts.length > 1) {
            const filePath = pathParts[1]

            // Delete from storage
            await supabase.storage
                .from('shipment-images')
                .remove([filePath])
        }

        // Update state
        const newUrls = value.filter((_, i) => i !== index)
        onChange(newUrls)
    }

    return (
        <div className="space-y-4">
            {/* Image Preview Grid */}
            <div className="grid grid-cols-3 gap-4">
                {value.map((url, index) => (
                    <div key={index} className="relative aspect-square border rounded-lg overflow-hidden group">
                        <Image
                            src={url}
                            alt={`Image ${index + 1}`}
                            fill
                            className="object-cover"
                        />
                        <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))}

                {/* Add Image Button */}
                {value.length < maxImages && (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center hover:border-primary hover:bg-accent transition-colors"
                    >
                        {uploading ? (
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        ) : (
                            <>
                                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                <span className="text-sm text-muted-foreground">
                                    Add Image
                                </span>
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
            />

            <p className="text-xs text-muted-foreground">
                Upload up to {maxImages} images (max 5MB each)
            </p>
        </div>
    )
}
