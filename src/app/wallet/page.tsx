"use client"

import { useEffect, useState } from "react"
import { useUser } from "@/contexts/user-context"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Wallet, ArrowUpCircle, ArrowDownCircle, DollarSign, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"


interface Transaction {
    id: string
    shipment_id: string
    amount: number
    commission_fee: number
    status: string
    created_at: string
}

export default function WalletPage() {
    const { user, profile } = useUser()
    const { toast } = useToast()

    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [addAmount, setAddAmount] = useState("")
    const [processing, setProcessing] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        fetchTransactions()
    }, [user])

    async function fetchTransactions() {
        if (!user) return

        // Get transactions where user is either sender or traveler
        const { data: shipments } = await supabase
            .from('shipments')
            .select('id')
            .or(`sender_id.eq.${user.id},traveler_id.eq.${user.id}`)

        if (!shipments) return

        const shipmentIds = shipments.map(s => s.id)

        const { data } = await supabase
            .from('transactions')
            .select('*')
            .in('shipment_id', shipmentIds)
            .order('created_at', { ascending: false })
            .limit(20)

        if (data) setTransactions(data)
        setLoading(false)
    }

    async function addFunds(amount: number) {
        // In production, integrate with payment gateway (Stripe, PayPal, etc.)
        // For now, simulate adding funds directly
        const { error } = await supabase
            .from('users')
            .update({
                wallet_balance: (profile?.wallet_balance || 0) + amount
            })
            .eq('id', user?.id)
        return { error }
    }

    const handleAddFunds = async (e: React.FormEvent) => {
        e.preventDefault()

        const amount = parseFloat(addAmount)
        if (isNaN(amount) || amount <= 0) {
            toast({
                variant: "destructive",
                title: "Invalid amount",
                description: "Please enter a valid amount"
            })
            return
        }

        setProcessing(true)

        try {
            const { error } = await addFunds(amount)
            if (error) throw new Error(error.message)

            toast({
                title: "Success",
                description: `Successfully added $${amount} to your wallet!`,
            })
            setAddAmount("")
            window.location.reload()
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to add funds: " + error.message
            })
        } finally {
            setProcessing(false)
        }
    }


    if (loading) return <div className="container py-10">Loading...</div>

    return (
        <div className="container py-8 max-w-5xl">
            <h1 className="text-3xl font-bold mb-6">Wallet & Payments</h1>

            {/* Balance Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription className="flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            Available Balance
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-green-600">
                            ${(profile?.wallet_balance || 0).toFixed(2)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription className="flex items-center gap-2">
                            <ArrowDownCircle className="h-4 w-4" />
                            In Escrow
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-orange-600">
                            ${(profile?.escrow_balance || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Held for active deliveries
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Total Earnings
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-blue-600">
                            ${transactions
                                .filter(t => t.status === 'released')
                                .reduce((sum, t) => sum + (t.amount - t.commission_fee), 0)
                                .toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            From completed deliveries
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Add Funds Section */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Add Funds</CardTitle>
                    <CardDescription>
                        Top up your wallet to create shipments (Demo: funds added instantly)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 max-w-md">
                        <div className="flex-1">
                            <Label htmlFor="amount">Amount ($)</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="50.00"
                                value={addAmount}
                                onChange={(e) => setAddAmount(e.target.value)}
                                min="1"
                                step="0.01"
                            />
                        </div>
                        <div className="flex items-end">
                            <Button onClick={handleAddFunds} disabled={processing}>
                                <DollarSign className="mr-2 h-4 w-4" />
                                {processing ? "Processing..." : "Add Funds"}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Transaction History */}
            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>Recent wallet activity</CardDescription>
                </CardHeader>
                <CardContent>
                    {transactions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No transactions yet
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transactions.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${tx.status === 'held' ? 'bg-orange-100 dark:bg-orange-900/30' :
                                            tx.status === 'released' ? 'bg-green-100 dark:bg-green-900/30' :
                                                'bg-red-100 dark:bg-red-900/30'
                                            }`}>
                                            {tx.status === 'held' ? (
                                                <ArrowDownCircle className="h-4 w-4 text-orange-600" />
                                            ) : tx.status === 'released' ? (
                                                <ArrowUpCircle className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <ArrowUpCircle className="h-4 w-4 text-red-600" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium">
                                                {tx.status === 'held' ? 'Escrow Hold' :
                                                    tx.status === 'released' ? 'Payment Released' : 'Refund'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(tx.created_at).toLocaleDateString()} at{' '}
                                                {new Date(tx.created_at).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold ${tx.status === 'released' ? 'text-green-600' :
                                            tx.status === 'held' ? 'text-orange-600' : 'text-red-600'
                                            }`}>
                                            {tx.status === 'released' ? '+' : '-'}${tx.amount.toFixed(2)}
                                        </p>
                                        {tx.commission_fee > 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                Fee: ${tx.commission_fee.toFixed(2)}
                                            </p>
                                        )}
                                        <Badge variant="outline" className="mt-1 text-xs">
                                            {tx.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
