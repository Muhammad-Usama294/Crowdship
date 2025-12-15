"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

import { Suspense } from "react"

function AuthErrorContent() {
    const searchParams = useSearchParams()
    const [errorMessage, setErrorMessage] = useState<string>("")

    useEffect(() => {
        // Check URL hash for error (Supabase redirects with hash params)
        const hash = window.location.hash
        const hashParams = new URLSearchParams(hash.substring(1))
        const hashError = hashParams.get('error_description') || hashParams.get('error')

        // Check search params
        const searchError = searchParams.get('error')

        const finalError = hashError || searchError || "Unknown authentication error"
        setErrorMessage(finalError.replace(/\+/g, ' '))
    }, [searchParams])

    return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <div className="text-center p-8 border rounded-lg max-w-md w-full">
                <h1 className="text-2xl font-bold mb-4 text-red-600">Authentication Error</h1>
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-800 dark:text-red-200">
                        {errorMessage}
                    </p>
                </div>
                <p className="text-muted-foreground mb-6">
                    {errorMessage.includes('expired')
                        ? "The magic link has expired. Please request a new one."
                        : "Please try logging in again."}
                </p>
                <Link href="/login">
                    <Button className="w-full">
                        Back to Login
                    </Button>
                </Link>
            </div>
        </div>
    )
}

export default function AuthErrorPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
            <AuthErrorContent />
        </Suspense>
    )
}
