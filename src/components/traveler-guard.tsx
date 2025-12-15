"use client"

import { useUser } from "@/contexts/user-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Shield, User } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface TravelerGuardProps {
    children: React.ReactNode
}

export function TravelerGuard({ children }: TravelerGuardProps) {
    const { profile, isLoading } = useUser()
    const [kycStatus, setKycStatus] = useState<'pending' | 'rejected' | null>(null)
    const supabase = createClient()

    useEffect(() => {
        async function checkKyc() {
            if (!profile?.id || profile.is_kyc_verified) return

            const { data } = await supabase
                .from('kyc_documents')
                .select('status')
                .eq('user_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            if (data) {
                setKycStatus(data.status as 'pending' | 'rejected')
            }
        }
        checkKyc()
    }, [profile?.id, profile?.is_kyc_verified, supabase])

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Loading profile...</div>
    }

    // Check profile completion
    const hasName = !!profile?.full_name
    const hasPhone = !!profile?.phone_number
    const hasAvatar = !!profile?.avatar_url
    const isProfileComplete = hasName && hasPhone && hasAvatar

    if (!isProfileComplete) {
        return (
            <div className="container flex items-center justify-center min-h-[60vh]">
                <Card className="max-w-md w-full border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 shadow-lg">
                    <CardHeader>
                        <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center mb-4 text-orange-600 dark:text-orange-400">
                            <User className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-xl">Complete Your Profile</CardTitle>
                        <CardDescription className="text-base text-muted-foreground">
                            You must complete your profile to access Traveler features. We need your contact details and photo for safety.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2 text-sm">
                            <div className={`flex items-center gap-2 ${hasName ? 'text-green-600' : 'text-red-500'}`}>
                                <div className={`w-2 h-2 rounded-full ${hasName ? 'bg-green-600' : 'bg-red-500'}`} />
                                {hasName ? 'Full Name set' : 'Full Name missing'}
                            </div>
                            <div className={`flex items-center gap-2 ${hasPhone ? 'text-green-600' : 'text-red-500'}`}>
                                <div className={`w-2 h-2 rounded-full ${hasPhone ? 'bg-green-600' : 'bg-red-500'}`} />
                                {hasPhone ? 'Phone Number set' : 'Phone Number missing'}
                            </div>
                            <div className={`flex items-center gap-2 ${hasAvatar ? 'text-green-600' : 'text-red-500'}`}>
                                <div className={`w-2 h-2 rounded-full ${hasAvatar ? 'bg-green-600' : 'bg-red-500'}`} />
                                {hasAvatar ? 'Profile Photo set' : 'Profile Photo missing'}
                            </div>
                        </div>

                        <Link href="/account" className="block">
                            <Button className="w-full">
                                Complete Profile
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Check KYC verification
    if (!profile.is_kyc_verified) {
        const title = kycStatus === 'pending'
            ? "KYC Verification Pending"
            : kycStatus === 'rejected'
                ? "KYC Verification Rejected"
                : "KYC Verification Required"

        const description = kycStatus === 'pending'
            ? "Your documents are being reviewed. You'll be able to access Traveler features once approved (typically 1-3 business days)."
            : kycStatus === 'rejected'
                ? "Your previous submission was rejected. Please upload new documents to access Traveler features."
                : "You must verify your identity to access Traveler features. Upload your documents to get verified."

        const buttonText = kycStatus === 'rejected' ? 'Re-submit Documents' : 'Upload KYC Documents'

        return (
            <div className="container flex items-center justify-center min-h-[60vh]">
                <Card className="max-w-md w-full border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 shadow-lg">
                    <CardHeader>
                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                            <Shield className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-xl">{title}</CardTitle>
                        <CardDescription className="text-base text-muted-foreground">
                            {description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/kyc/upload" className="block">
                            <Button className="w-full">
                                {buttonText}
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return <>{children}</>
}
