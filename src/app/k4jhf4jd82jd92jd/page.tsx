"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, BarChart3, ArrowRight, Map, Users } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { BusinessWallet, BusinessWalletTransaction } from "@/types/database"
import { BusinessWalletCard } from "@/components/business-wallet-card"

export default function AdminDashboardPage() {
    const [businessWallet, setBusinessWallet] = useState<BusinessWallet | null>(null)
    const [recentTransactions, setRecentTransactions] = useState<BusinessWalletTransaction[]>([])
    const supabase = createClient()

    useEffect(() => {
        fetchBusinessWallet()
    }, [])

    async function fetchBusinessWallet() {
        // Fetch wallet data
        const { data: wallet } = await supabase
            .from('business_wallet')
            .select('*')
            .single()

        if (wallet) setBusinessWallet(wallet)

        // Fetch recent transactions
        const { data: transactions } = await supabase
            .from('business_wallet_transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10)

        if (transactions) setRecentTransactions(transactions)
    }

    const cards = [
        {
            href: "/k4jhf4jd82jd92jd/kyc",
            title: "KYC Actions",
            description: "Review pending identity verifications and manage user approvals.",
            icon: Shield,
            color: "text-blue-500",
            buttonColor: "bg-blue-600 hover:bg-blue-700"
        },
        {
            href: "/k4jhf4jd82jd92jd/analytics",
            title: "Platform Analytics",
            description: "View system health, user growth, shipment stats, and revenue metrics.",
            icon: BarChart3,
            color: "text-purple-500",
            buttonColor: "bg-purple-600 hover:bg-purple-700"
        },
        {
            href: "/k4jhf4jd82jd92jd/users",
            title: "User Management",
            description: "View all users, monitor ratings, and manage suspensions or bans.",
            icon: Users,
            color: "text-orange-500",
            buttonColor: "bg-orange-600 hover:bg-orange-700"
        },
        {
            href: "/k4jhf4jd82jd92jd/map",
            title: "Live Map",
            description: "Monitor active shipments geographically. View pickup and dropoff locations.",
            icon: Map,
            color: "text-green-500",
            buttonColor: "bg-green-600 hover:bg-green-700"
        }
    ]

    return (
        <div className="container py-10 min-h-[calc(100vh-4rem)]">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-10 text-center md:text-left"
            >
                <h1 className="text-4xl font-bold mb-2 text-foreground inline-block">Admin Dashboard</h1>
                <p className="text-lg text-muted-foreground">Welcome back, Admin. Select an area to manage.</p>
            </motion.div>

            {/* Business Wallet Card */}
            {businessWallet && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="mb-8"
                >
                    <BusinessWalletCard
                        wallet={businessWallet}
                        recentTransactions={recentTransactions}
                    />
                </motion.div>
            )}

            <div className="max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold tracking-tight">System Modules</h2>
                </div>

                <div className="border rounded-xl overflow-hidden bg-card/60 backdrop-blur-sm shadow-sm">
                    <div className="grid grid-cols-1 divide-y divide-border/50">
                        {cards.map((card, index) => (
                            <motion.div
                                key={card.title}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05, duration: 0.3 }}
                            >
                                <Link href={card.href} className="flex items-center p-4 sm:p-5 hover:bg-muted/50 transition-colors group">
                                    <div className={`p-2.5 rounded-md bg-background/50 border shadow-sm mr-4 shrink-0 ${card.color}`}>
                                        <card.icon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0 pr-4">
                                        <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{card.title}</h3>
                                        <p className="text-sm text-muted-foreground truncate">{card.description}</p>
                                    </div>
                                    <div className="shrink-0">
                                        <Button variant="ghost" size="sm" className="h-8 gap-1 group-hover:bg-background shadow-sm border border-transparent group-hover:border-border transition-all">
                                            Manage <ArrowRight className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
