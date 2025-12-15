"use client"

import { useEffect, useState } from "react"
import { Shipment } from "@/types/database"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getAllActiveShipments } from "../actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const AdminMapView = dynamic(() => import("@/components/admin-map-view"), {
    ssr: false,
    loading: () => <div className="h-[500px] w-full bg-muted animate-pulse rounded-md" />
})

type StatusFilter = 'all' | 'pending' | 'accepted' | 'delivered' | 'cancelled'

export default function AdminMapPage() {
    const [shipments, setShipments] = useState<Shipment[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')

    useEffect(() => {
        fetchActiveShipments()
    }, [statusFilter, startDate, endDate])

    const fetchActiveShipments = async () => {
        setLoading(true)
        setError(null)

        const result = await getAllActiveShipments(statusFilter, startDate, endDate)

        if (result.success) {
            setShipments(result.data as Shipment[])
        } else {
            setError(result.error || 'Failed to fetch shipments')
            console.error('Error fetching shipments:', result.error)
        }

        setLoading(false)
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500'
            case 'accepted': return 'bg-blue-500'
            case 'delivered': return 'bg-green-500'
            case 'cancelled': return 'bg-red-500'
            default: return 'bg-gray-500'
        }
    }

    const filters: { value: StatusFilter; label: string }[] = [
        { value: 'all', label: 'All' },
        { value: 'pending', label: 'Pending' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'cancelled', label: 'Cancelled' },
    ]

    return (
        <div className="container py-8 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/k4jhf4jd82jd92jd">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">Live Shipment Map</h1>
                    <p className="text-muted-foreground">Real-time view of {shipments.length} shipments.</p>
                </div>
            </div>

            {/* Filter Buttons */}
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {filters.map((filter) => (
                                <Button
                                    key={filter.value}
                                    variant={statusFilter === filter.value ? "default" : "outline"}
                                    onClick={() => {
                                        setStatusFilter(filter.value)
                                        // Reset dates when changing filter
                                        if (filter.value !== 'delivered' && filter.value !== 'cancelled') {
                                            setStartDate('')
                                            setEndDate('')
                                        }
                                    }}
                                    className="min-w-[100px]"
                                >
                                    {filter.label}
                                    {statusFilter === filter.value && (
                                        <Badge variant="secondary" className="ml-2">
                                            {shipments.length}
                                        </Badge>
                                    )}
                                </Button>
                            ))}
                        </div>

                        {/* Date Range Picker for Delivered/Cancelled */}
                        {(statusFilter === 'delivered' || statusFilter === 'cancelled') && (
                            <div className="flex gap-4 items-end pt-2 border-t">
                                <div className="flex-1">
                                    <Label htmlFor="startDate">Start Date</Label>
                                    <Input
                                        id="startDate"
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                <div className="flex-1">
                                    <Label htmlFor="endDate">End Date</Label>
                                    <Input
                                        id="endDate"
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                {(startDate || endDate) && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setStartDate('')
                                            setEndDate('')
                                        }}
                                    >
                                        Clear Dates
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Map Card */}
            <Card className="h-[600px] overflow-hidden border-2">
                <AdminMapView shipments={shipments} />
            </Card>

            {/* Shipment List */}
            <Card>
                <CardHeader>
                    <CardTitle>Active Shipments List</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {loading ? (
                            <p>Loading active shipments...</p>
                        ) : error ? (
                            <div className="text-center py-8">
                                <p className="text-destructive font-semibold">Error: {error}</p>
                                <Button onClick={fetchActiveShipments} className="mt-4" variant="outline">
                                    Retry
                                </Button>
                            </div>
                        ) : shipments.length === 0 ? (
                            <p className="text-muted-foreground">No active shipments found.</p>
                        ) : (
                            <div className="grid gap-4">
                                {shipments.map((shipment) => (
                                    <div key={shipment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-primary/10 p-2 rounded-full">
                                                <Package className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">{shipment.title}</h3>
                                                <div className="text-sm text-muted-foreground flex gap-2">
                                                    <span className="text-blue-600 font-medium">From:</span> {shipment.pickup_address || 'N/A'}
                                                </div>
                                                <div className="text-sm text-muted-foreground flex gap-2">
                                                    <span className="text-orange-600 font-medium">To:</span> {shipment.dropoff_address || 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <Badge className={getStatusColor(shipment.status)}>
                                                {shipment.status.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                            <span className="font-mono font-bold text-green-600">
                                                PKR {shipment.offer_price}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
