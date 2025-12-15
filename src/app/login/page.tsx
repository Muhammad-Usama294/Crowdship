"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)
    const supabase = createClient()
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        if (isSignUp) {
            // Check if email already exists using database function
            const { data: emailExists, error: checkError } = await supabase
                .rpc('check_email_exists', { email_input: email })

            if (emailExists) {
                setMessage({
                    type: 'error',
                    text: 'This email is already registered. Please sign in instead or use a different email.'
                })
                setLoading(false)
                return
            }

            // Sign up
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${location.origin}/auth/callback`,
                },
            })

            if (error) {
                // Check if user already exists (fallback)
                if (error.message.toLowerCase().includes('already registered') ||
                    error.message.toLowerCase().includes('user already registered') ||
                    error.message.toLowerCase().includes('already exists')) {
                    setMessage({
                        type: 'error',
                        text: 'This email is already registered. Please sign in instead or use a different email.'
                    })
                } else {
                    setMessage({ type: 'error', text: error.message })
                }
            } else if (data.user) {
                // Check if this is actually a new user or existing user
                const userCreatedAt = new Date(data.user.created_at).getTime()
                const isNewUser = (Date.now() - userCreatedAt) < 5000 // Created within last 5 seconds

                if (!isNewUser) {
                    // This is an existing user, not a new registration
                    setMessage({
                        type: 'error',
                        text: 'This email is already registered. Please sign in instead or use a different email.'
                    })
                } else if (!data.session) {
                    setMessage({
                        type: 'success',
                        text: 'Account created! Please check your email to verify your account.'
                    })
                } else {
                    // Account created and auto-confirmed
                    setMessage({ type: 'success', text: 'Account created! Logging you in...' })
                    setTimeout(() => router.push('/'), 1000)
                }
            }
        } else {
            // Sign in
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                setMessage({ type: 'error', text: error.message })
            } else {
                router.push('/')
            }
        }
        setLoading(false)
    }

    return (
        <div className="relative flex items-center justify-center min-h-[calc(100vh-4rem)] overflow-hidden bg-background">
            {/* Animated Background */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md px-4"
            >
                <Card className="border-2 border-primary/10 shadow-xl backdrop-blur-sm bg-card/80">
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                            {isSignUp ? 'Create Account' : 'Welcome Back'}
                        </CardTitle>
                        <CardDescription>
                            {isSignUp ? 'Enter your details to get started' : 'Enter your credentials to access your account'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {message && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className={`p-4 mb-4 rounded-md border text-sm font-medium ${message.type === 'error'
                                    ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-200'
                                    : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-200'
                                    }`}
                            >
                                {message.text}
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-background/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="bg-background/50"
                                />
                                {isSignUp && (
                                    <p className="text-xs text-muted-foreground">
                                        Password must be at least 6 characters
                                    </p>
                                )}
                            </div>

                            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 transition-all duration-300" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSignUp ? 'Sign Up' : 'Sign In'}
                                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                            </Button>
                        </form>

                        <div className="mt-6 text-center text-sm">
                            <span className="text-muted-foreground">
                                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSignUp(!isSignUp)
                                    setMessage(null)
                                }}
                                className="text-primary font-semibold hover:underline underline-offset-4"
                            >
                                {isSignUp ? 'Sign in' : "Sign up"}
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}
