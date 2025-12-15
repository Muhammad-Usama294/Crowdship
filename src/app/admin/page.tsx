"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, BarChart3, ArrowRight, Map, Users, AlertCircle } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export default function AdminDashboardPage() {
    const cards = [
        {
            href: "/admin/kyc",
            title: "KYC Actions",
            description: "Review pending identity verifications and manage user approvals.",
            icon: Shield,
            color: "text-blue-500",
            borderColor: "border-l-blue-500",
            buttonColor: "bg-blue-600 hover:bg-blue-700"
        },
        {
            href: "/admin/analytics",
            title: "Platform Analytics",
            description: "View system health, user growth, shipment stats, and revenue metrics.",
            icon: BarChart3,
            color: "text-purple-500",
            borderColor: "border-l-purple-500",
            buttonColor: "bg-purple-600 hover:bg-purple-700"
        },
        {
            href: "/admin/users",
            title: "User Management",
            description: "View all users, monitor ratings, and manage suspensions or bans.",
            icon: Users,
            color: "text-orange-500",
            borderColor: "border-l-orange-500",
            buttonColor: "bg-orange-600 hover:bg-orange-700"
        },
        {
            href: "/admin/map",
            title: "Live Map",
            description: "Monitor active shipments geographically. View pickup and dropoff locations.",
            icon: Map,
            color: "text-green-500",
            borderColor: "border-l-green-500",
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
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent inline-block">Admin Dashboard</h1>
                <p className="text-lg text-muted-foreground">Welcome back, Admin. Select an area to manage.</p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {cards.map((card, index) => (
                    <motion.div
                        key={card.title}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1, duration: 0.4 }}
                    >
                        <Link href={card.href} className="block h-full">
                            <Card className={`group h-full transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer border-l-4 ${card.borderColor} bg-card/60 backdrop-blur-sm overflow-hidden`}>
                                <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${card.color}`}>
                                    <card.icon className="w-24 h-24" />
                                </div>
                                <CardHeader>
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className={`p-3 rounded-full bg-background/50 shadow-sm ${card.color}`}>
                                            <card.icon className="h-6 w-6" />
                                        </div>
                                        <CardTitle className="text-xl group-hover:text-primary transition-colors">{card.title}</CardTitle>
                                    </div>
                                    <CardDescription className="text-base">
                                        {card.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button className={`w-full ${card.buttonColor} shadow-md`}>
                                        Manage <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </CardContent>
                            </Card>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
