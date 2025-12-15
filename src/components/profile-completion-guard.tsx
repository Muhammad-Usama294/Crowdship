"use client"

import { useUser } from "@/contexts/user-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, ArrowRight } from "lucide-react"
import Link from "next/link"

interface ProfileCompletionGuardProps {
    children: React.ReactNode
}

export function ProfileCompletionGuard({ children }: ProfileCompletionGuardProps) {
    const { profile, isLoading } = useUser()

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Loading profile...</div>
    }

    const hasName = !!profile?.full_name
    const hasPhone = !!profile?.phone_number

    if (hasName && hasPhone) {
        return <>{children}</>
    }

    return (
        <div className="container flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-md w-full border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 shadow-lg">
                <CardHeader>
                    <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center mb-4 text-orange-600 dark:text-orange-400">
                        <AlertCircle className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">Profile Completion Required</CardTitle>
                    <CardDescription className="text-base text-muted-foreground">
                        Please complete your profile to access this feature. We need your contact details to facilitate secure shipments.
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
                    </div>

                    <Link href="/account" className="block">
                        <Button className="w-full group">
                            Complete Profile
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    )
}
