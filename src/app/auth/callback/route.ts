import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'
    const cookieStore = await cookies()

    console.log('=== Auth Callback Debug ===')
    console.log('Code present:', !!code)
    console.log('Token hash present:', !!token_hash)
    console.log('Type:', type)
    console.log('URL:', request.url)

    const redirectUrl = new URL(request.url)
    redirectUrl.pathname = next
    redirectUrl.search = ''

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch (e) {
                        console.error('Cookie error:', e)
                    }
                },
            },
        }
    )

    let data = null
    let error = null

    // Method 1: PKCE Code Exchange (Standard for Supabase Auth mostly now)
    if (code) {
        console.log('Exchanging code for session...')
        const result = await supabase.auth.exchangeCodeForSession(code)
        data = result.data
        error = result.error
    }
    // Method 2: Token Hash Verification (Magic Links / Old Flow)
    else if (token_hash && type) {
        console.log('Verifying OTP hash...')
        const result = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })
        data = result.data
        error = result.error
    } else {
        console.log('No code or token_hash found')
        redirectUrl.pathname = '/auth/auth-code-error'
        redirectUrl.searchParams.set('error', 'Missing authentication code')
        return NextResponse.redirect(redirectUrl)
    }

    console.log('Verification result:', {
        hasData: !!data,
        hasUser: !!data?.user,
        userId: data?.user?.id,
        error: error?.message
    })

    if (error) {
        console.error('Auth verification error:', error)
        redirectUrl.pathname = '/auth/auth-code-error'
        redirectUrl.searchParams.set('error', error.message)
        return NextResponse.redirect(redirectUrl)
    }

    if (data?.user) {
        console.log('User verified, checking profile...')
        // Ensure user profile exists in public.users
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('id')
            .eq('id', data.user.id)
            .single()

        console.log('Profile check:', { hasProfile: !!profile, profileError: profileError?.message })

        // If profile doesn't exist, create it
        if (profileError || !profile) {
            console.log('Creating user profile...')
            const { error: insertError } = await supabase.from('users').insert({
                id: data.user.id,
                full_name: data.user.email?.split('@')[0] || 'User',
                avatar_url: null,
            })
            console.log('Profile creation result:', { error: insertError?.message })
        }

        console.log('Redirecting to dashboard...')
        // Typically redirect to sender dashboard
        redirectUrl.pathname = '/sender/dashboard'
        return NextResponse.redirect(redirectUrl)
    }

    console.log('Falling through to error page (No user found)')
    redirectUrl.pathname = '/auth/auth-code-error'
    return NextResponse.redirect(redirectUrl)
}
