"use client"

import { useUser } from "@/contexts/user-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Package, Truck, Shield, MapPin, ArrowRight, History as HistoryIcon, AlertCircle, Clock, CheckCircle, Lock, Smartphone } from "lucide-react"
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
      <div className="min-h-[calc(100vh-4rem)] bg-background">
        {/* Hero Section */}
        <div className="container mx-auto px-4 pt-16 pb-24 md:pt-28 md:pb-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="max-w-xl space-y-8">
              <h1 className="text-5xl md:text-6xl font-bold text-primary leading-tight tracking-tight">
                Send anything.<br />Earn on every trip.
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Pakistan's first crowd-powered delivery network — no couriers, just community. Safe, verified, and affordable.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/login">
                  <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                    Get Started
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6 h-14 border-2 font-medium bg-transparent">
                    See how it works
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative mt-8 md:mt-0">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-border/50 relative bg-muted">
                <img 
                  src="/hero-traveler.png" 
                  alt="A trustworthy Pakistani traveler holding a package" 
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Trust Badge Overlay */}
              <div className="absolute -bottom-6 -left-6 bg-card p-4 rounded-xl shadow-xl border flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                  <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">100% Verified</p>
                  <p className="text-xs text-muted-foreground">Travelers & Escrow</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div id="how-it-works" className="bg-muted/30 border-y py-24">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground tracking-tight">How CrowdShip Works</h2>
              <p className="text-lg text-muted-foreground">A simple, secure process that protects both senders and travelers end-to-end.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12 relative max-w-5xl mx-auto">
              {/* Connecting line for desktop */}
              <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-border -z-10"></div>
              
              <div className="text-center space-y-4">
                <div className="w-24 h-24 mx-auto bg-card rounded-full flex items-center justify-center border-4 border-background shadow-sm">
                  <Package className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">1. Post or Find</h3>
                <p className="text-muted-foreground">Senders post packages with an offer. Travelers search for packages along their planned routes.</p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="w-24 h-24 mx-auto bg-card rounded-full flex items-center justify-center border-4 border-background shadow-sm">
                  <CheckCircle className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">2. Match & Escrow</h3>
                <p className="text-muted-foreground">A traveler accepts the bid. The sender's payment is held safely in escrow until delivery is confirmed.</p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="w-24 h-24 mx-auto bg-card rounded-full flex items-center justify-center border-4 border-background shadow-sm">
                  <MapPin className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">3. OTP Delivery</h3>
                <p className="text-muted-foreground">Handover is verified via secure OTP at both pickup and dropoff. Funds are released automatically.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Mechanics Section */}
        <div className="container mx-auto px-4 py-24">
           <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
             <div className="space-y-8">
               <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Built on Trust.</h2>
               <p className="text-lg text-muted-foreground">We handle the mechanics of trust so you can transact with confidence. Our system is designed from the ground up to prevent fraud and ensure safe deliveries.</p>
               
               <div className="space-y-8 pt-4">
                 <div className="flex gap-4">
                   <div className="mt-1 bg-primary/10 p-3 rounded-xl h-fit">
                     <Shield className="h-6 w-6 text-primary" />
                   </div>
                   <div>
                     <h4 className="text-xl font-semibold mb-1">Identity Verification</h4>
                     <p className="text-muted-foreground">Every traveler must pass strict KYC identity verification before they can carry a single package.</p>
                   </div>
                 </div>
                 
                 <div className="flex gap-4">
                   <div className="mt-1 bg-primary/10 p-3 rounded-xl h-fit">
                     <Lock className="h-6 w-6 text-primary" />
                   </div>
                   <div>
                     <h4 className="text-xl font-semibold mb-1">Escrow Protection</h4>
                     <p className="text-muted-foreground">Your money is held safely in escrow. Travelers only get paid after successful delivery.</p>
                   </div>
                 </div>
                 
                 <div className="flex gap-4">
                   <div className="mt-1 bg-primary/10 p-3 rounded-xl h-fit">
                     <Smartphone className="h-6 w-6 text-primary" />
                   </div>
                   <div>
                     <h4 className="text-xl font-semibold mb-1">OTP Confirmation</h4>
                     <p className="text-muted-foreground">Secure numeric codes must be exchanged at pickup and dropoff to prove handover.</p>
                   </div>
                 </div>
               </div>
             </div>
             
             {/* Visual Proof / UI Snippet */}
             <div className="bg-muted/50 p-8 md:p-12 rounded-3xl border flex items-center justify-center">
               <div className="w-full max-w-sm space-y-4">
                 <div className="bg-card p-4 rounded-xl shadow-sm border flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="bg-green-100 dark:bg-green-900/30 p-2.5 rounded-full">
                       <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                     </div>
                     <div>
                       <div className="font-semibold text-sm">KYC Approved</div>
                       <div className="text-xs text-muted-foreground">Identity verified</div>
                     </div>
                   </div>
                 </div>
                 
                 <div className="bg-card p-4 rounded-xl shadow-sm border flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-full">
                       <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                     </div>
                     <div>
                       <div className="font-semibold text-sm">Funds in Escrow</div>
                       <div className="text-xs text-muted-foreground">$15.00 secured</div>
                     </div>
                   </div>
                 </div>
                 
                 <div className="bg-card p-4 rounded-xl shadow-sm border flex items-center justify-between opacity-80">
                   <div className="flex items-center gap-3">
                     <div className="bg-orange-100 dark:bg-orange-900/30 p-2.5 rounded-full">
                       <Smartphone className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                     </div>
                     <div>
                       <div className="font-semibold text-sm">Awaiting Delivery OTP</div>
                       <div className="text-xs text-muted-foreground">Ask recipient for code</div>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </div>
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

      <div className="grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 max-w-4xl xl:max-w-6xl 2xl:max-w-7xl mx-auto">
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

      <div className="text-center mt-12 p-6 bg-muted/50 rounded-lg max-w-2xl xl:max-w-3xl 2xl:max-w-4xl mx-auto">
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
