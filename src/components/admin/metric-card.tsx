"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface MetricCardProps {
    title: string
    value: string | number
    subtitle?: string
    icon: LucideIcon
    trend?: {
        value: number
        isPositive: boolean
    }
    className?: string
}

export function MetricCard({ title, value, subtitle, icon: Icon, trend, className }: MetricCardProps) {
    return (
        <Card className={`hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-primary/5 bg-card/60 backdrop-blur-sm ${className}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
                <div className="p-2 rounded-full bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {subtitle && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{subtitle}</p>
                )}
                {trend && (
                    <div className={`text-xs mt-2 flex items-center gap-1 font-medium ${trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${trend.isPositive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                        </span>
                        <span>vs last month</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
