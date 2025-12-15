"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, TrendingUp, DollarSign, ArrowUpRight } from "lucide-react"
import { BusinessWallet, BusinessWalletTransaction } from "@/types/database"
import { formatDistanceToNow } from "date-fns"

interface BusinessWalletCardProps {
    wallet: BusinessWallet;
    recentTransactions: BusinessWalletTransaction[];
}

export function BusinessWalletCard({ wallet, recentTransactions }: BusinessWalletCardProps) {
    return (
        <Card className="col-span-full border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-primary/10">
                            <Wallet className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl">Business Wallet</CardTitle>
                            <CardDescription>Platform commission earnings</CardDescription>
                        </div>
                    </div>
                    <Badge variant="secondary" className="text-sm">
                        10% Commission
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Balance Display */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-background border-2 border-primary/20">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <DollarSign className="h-4 w-4" />
                            <span className="text-sm font-medium">Current Balance</span>
                        </div>
                        <p className="text-3xl font-bold text-primary">
                            ${wallet.balance.toFixed(2)}
                        </p>
                    </div>

                    <div className="p-4 rounded-lg bg-background border">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-sm font-medium">Total Earned</span>
                        </div>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                            ${wallet.total_earned.toFixed(2)}
                        </p>
                    </div>

                    <div className="p-4 rounded-lg bg-background border">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <ArrowUpRight className="h-4 w-4" />
                            <span className="text-sm font-medium">Total Withdrawn</span>
                        </div>
                        <p className="text-3xl font-bold">
                            ${wallet.total_withdrawn.toFixed(2)}
                        </p>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div>
                    <h3 className="text-lg font-semibold mb-3">Recent Transactions</h3>
                    <div className="space-y-2">
                        {recentTransactions.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No transactions yet
                            </p>
                        ) : (
                            recentTransactions.map((transaction) => (
                                <div
                                    key={transaction.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-background border hover:border-primary/50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{transaction.description}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-green-600 dark:text-green-400">
                                            +${transaction.amount.toFixed(2)}
                                        </p>
                                        <Badge variant="outline" className="text-xs">
                                            {transaction.type}
                                        </Badge>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
