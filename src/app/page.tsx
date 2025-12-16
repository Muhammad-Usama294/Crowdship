"use client"

import { useUser } from "@/contexts/user-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Package, Truck, Shield, MapPin, ArrowRight, History as HistoryIcon, AlertCircle, Clock, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"

export default function HomePage() {
  const { user, isLoading, isTravelerMode, profile } = useUser()
  const [kycStatus, setKycStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none')
  const supabase = createClient()

  useEffect(() => {
    async function fetchKycStatus() {
      if (!user?.id) return

      const { data } = await supabase
        .from('kyc_documents')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        setKycStatus(data.status as 'pending' | 'approved' | 'rejected')
      } else {
        setKycStatus('none')
      }
    }
    fetchKycStatus()
  }, [user?.id, supabase])

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user) {
    return (
      <div className="container py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">Welcome to CrowdShip</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Peer-to-peer logistics platform connecting senders and travelers
          </p>
          <Link href="/login">
            <Button size="lg" className="text-lg px-8 py-6">
              Get Started
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <Package className="h-12 w-12 mb-4 text-primary" />
              <CardTitle>Send Packages</CardTitle>
              <CardDescription>
                Post your delivery requests and connect with travelers heading your way
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Truck className="h-12 w-12 mb-4 text-primary" />
              <CardTitle>Earn as Traveler</CardTitle>
              <CardDescription>
                Make money by delivering packages along your existing routes
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-12 w-12 mb-4 text-primary" />
              <CardTitle>Secure & Verified</CardTitle>
              <CardDescription>
                KYC verification and OTP-based pickup/delivery confirmation
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  // Logged in user dashboard
  return (
    <div className="container py-20">
      {/* KYC Status Alert - Top of page */}
      {user && kycStatus !== 'approved' && (
        <div className="max-w-3xl mx-auto mb-8">
          {kycStatus === 'none' && (
            <Alert className="border-primary/20 bg-primary/5 dark:bg-primary/10">
              <AlertCircle className="h-5 w-5 text-primary" />
              <AlertTitle className="text-lg font-semibold">KYC Verification Required</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-3">Submit your documents to unlock Traveler mode and start earning.</p>
                <Link href="/kyc/upload">
                  <Button size="sm" className="gap-2">
                    <Shield className="h-4 w-4" />
                    Upload Documents
                  </Button>
                </Link>
              </AlertDescription>
            </Alert>
          )}
          {kycStatus === 'pending' && (
            <Alert className="border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-lg font-semibold text-blue-900 dark:text-blue-100">Pending Verification</AlertTitle>
              <AlertDescription className="text-blue-800 dark:text-blue-200 mt-2">
                Your documents are being reviewed. This typically takes 1-3 business days.
              </AlertDescription>
            </Alert>
          )}
          {kycStatus === 'rejected' && (
            <Alert className="border-destructive/20 bg-destructive/5 dark:bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <AlertTitle className="text-lg font-semibold text-destructive">Verification Rejected</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-3 text-destructive/90 dark:text-destructive/80">Your submission was rejected. Please upload new documents.</p>
                <Link href="/kyc/upload">
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Shield className="h-4 w-4" />
                    Re-submit Documents
                  </Button>
                </Link>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Welcome back!</h1>
        <p className="text-xl text-muted-foreground">
          {isTravelerMode ? "You're in Traveler Mode" : "You're in Sender Mode"}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {!isTravelerMode && (
          <>
            <Link href="/sender/create">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <Package className="h-12 w-12 mb-4 text-primary" />
                  <CardTitle>Create New Shipment</CardTitle>
                  <CardDescription>
                    Post a package delivery request
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">
                    Create Shipment <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>

            <Link href="/sender/dashboard">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <MapPin className="h-12 w-12 mb-4 text-primary" />
                  <CardTitle>My Shipments</CardTitle>
                  <CardDescription>
                    View and manage your active deliveries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    View Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </>
        )}

        {isTravelerMode && (
          <>
            <Link href="/traveler">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <Truck className="h-12 w-12 mb-4 text-primary" />
                  <CardTitle>Plan Trip & Find Packages</CardTitle>
                  <CardDescription>
                    Set your route and discover delivery opportunities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">
                    Trip Planner <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>

            <Link href="/traveler/dashboard">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <Package className="h-12 w-12 mb-4 text-primary" />
                  <CardTitle>My Deliveries</CardTitle>
                  <CardDescription>
                    Manage accepted shipments and OTP verification
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    View Deliveries <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>

            <Link href="/traveler/trips">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <HistoryIcon className="h-12 w-12 mb-4 text-primary" />
                  <CardTitle>My Trips</CardTitle>
                  <CardDescription>
                    View your past and upcoming trips history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    View History <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </>
        )}
      </div>

      <div className="text-center mt-12 p-6 bg-muted/50 rounded-lg max-w-2xl mx-auto">
        <p className="text-sm text-muted-foreground mb-2">
          💡 <strong>Tip:</strong> Use the toggle switch in the top navigation to switch between Sender and Traveler modes
        </p>
        {!isTravelerMode && profile && (!profile.is_kyc_verified || !profile.full_name || !profile.phone_number || !profile.avatar_url) && (
          <p className="text-xs text-muted-foreground">
            Note: Traveler mode requires KYC verification and Profile Completion; you cannot switch to traveler mode and earn until you have verified both.
          </p>
        )}
      </div>
    </div>
  )
}
