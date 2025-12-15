"use client"
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { UserProfile } from '@/types/database'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'

type UserContextType = {
    user: User | null
    profile: UserProfile | null
    isLoading: boolean
    isTravelerMode: boolean
    toggleTravelerMode: () => void
    signOut: () => Promise<void>
    refreshProfile: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isTravelerMode, setIsTravelerMode] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (session?.user) {
                setUser(session.user)
                const { data } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single()
                setProfile(data)
            }
            setIsLoading(false)
        }

        fetchUser()

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session?.user && session.user.id !== user?.id) {
                    setUser(session.user)
                    const { data } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', session.user.id)
                        .single()
                    setProfile(data)
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null)
                setProfile(null)
                setIsTravelerMode(false)
            }
        })

        // Realtime Profile Sync
        const channel = supabase
            .channel('profile-changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'users',
                    filter: user?.id ? `id=eq.${user.id}` : undefined
                },
                (payload) => {
                    console.log('Realtime profile update received:', payload)
                    setProfile(payload.new as UserProfile)
                    router.refresh()
                }
            )
            .subscribe()

        return () => {
            authListener.subscription.unsubscribe()
            supabase.removeChannel(channel)
        }
    }, [supabase, user?.id])

    const toggleTravelerMode = async () => {
        // If trying to switch TO traveler mode, check requirements
        if (!isTravelerMode) {
            // 1. Check Basic Info (Name, Phone, Avatar)
            if (!profile?.full_name || !profile?.phone_number || !profile?.avatar_url) {
                toast({
                    title: "Profile Incomplete",
                    description: "You must complete your profile (Name, Phone, and Photo) to access Traveler Mode.",
                    action: (
                        <button
                            onClick={() => router.push('/account')}
                            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                            Complete Profile
                        </button>
                    ),
                })
                return
            }

            // 2. Check KYC Verification
            if (!profile?.is_kyc_verified) {
                // Check current KYC submission status
                const { data: kycDoc } = await supabase
                    .from('kyc_documents')
                    .select('status')
                    .eq('user_id', user?.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single()

                const kycStatus = kycDoc?.status || null

                // Show different toast based on status
                const title = kycStatus === 'pending'
                    ? "KYC Verification Pending"
                    : kycStatus === 'rejected'
                        ? "KYC Verification Rejected"
                        : "KYC Verification Required"

                const description = kycStatus === 'pending'
                    ? "Your documents are being reviewed. You'll be able to access Traveler mode once approved (typically 1-3 business days)."
                    : kycStatus === 'rejected'
                        ? "Your previous submission was rejected. Please upload new documents to access Traveler mode."
                        : "You must verify your identity to access Traveler mode. Upload your documents to get verified."

                toast({
                    title,
                    description,
                    action: (
                        <button
                            onClick={() => router.push('/kyc/upload')}
                            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                            {kycStatus === 'rejected' ? 'Re-submit' : 'Upload KYC'}
                        </button>
                    ),
                })
                // Don't switch mode if not verified
                if (profile && !profile.is_kyc_verified) return;
            }
        }
        setIsTravelerMode((prev) => !prev)
        // Refresh the page to update UI with new mode
        router.refresh()
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        router.refresh()
    }

    const refreshProfile = async () => {
        if (!user) return
        const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()
        if (data) setProfile(data)
    }

    return (
        <UserContext.Provider value={{ user, profile, isLoading, isTravelerMode, toggleTravelerMode, signOut, refreshProfile }}>
            {children}
        </UserContext.Provider>
    )
}

export const useUser = () => {
    const context = useContext(UserContext)
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider')
    }
    return context
}
