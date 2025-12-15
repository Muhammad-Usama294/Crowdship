"use client"

import { useState, useEffect } from "react"
import { format, startOfDay, endOfDay } from "date-fns"
import { Package, DollarSign, CheckCircle, Users, TrendingUp, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricCard } from "@/components/admin/metric-card"
import { DateRangePicker } from "@/components/admin/date-range-picker"
import {
    getShipmentStats,
    getRevenueStats,
    getKYCStats,
    getUserStats,
    getTopTravelers,
    getShipmentsOverTime
} from "./actions"
import dynamic from "next/dynamic"

// Dynamically import Recharts to avoid SSR issues
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false })
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false })
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false })
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })

export default function AnalyticsPage() {
    const [startDate, setStartDate] = useState(startOfDay(new Date()))
    const [endDate, setEndDate] = useState(endOfDay(new Date()))
    const [loading, setLoading] = useState(true)

    // Stats state
    const [shipmentStats, setShipmentStats] = useState<any>(null)
    const [revenueStats, setRevenueStats] = useState<any>(null)
    const [kycStats, setKYCStats] = useState<any>(null)
    const [userStats, setUserStats] = useState<any>(null)
    const [topTravelers, setTopTravelers] = useState<any[]>([])
    const [chartData, setChartData] = useState<any[]>([])

    const fetchData = async () => {
        setLoading(true)
        const start = startDate.toISOString()
        const end = endDate.toISOString()

        try {
            const [shipments, revenue, kyc, users, travelers, overTime] = await Promise.all([
                getShipmentStats(start, end),
                getRevenueStats(start, end),
                getKYCStats(start, end),
                getUserStats(start, end),
                getTopTravelers(start, end),
                getShipmentsOverTime(start, end)
            ])

            setShipmentStats(shipments)
            setRevenueStats(revenue)
            setKYCStats(kyc)
            setUserStats(users)
            setTopTravelers(travelers.topTravelers || [])
            setChartData(overTime.chartData || [])
        } catch (error) {
            console.error('Error fetching analytics:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleDateRangeChange = (start: Date, end: Date) => {
        setStartDate(start)
        setEndDate(end)
        setTimeout(() => fetchData(), 100)
    }

    const handleExportPDF = async () => {
        const { jsPDF } = await import('jspdf')
        const autoTable = (await import('jspdf-autotable')).default

        const doc = new jsPDF() as any

        // Title
        doc.setFontSize(20)
        doc.text('Admin Analytics Report', 14, 20)

        // Date Range
        doc.setFontSize(12)
        doc.text(`Period: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`, 14, 30)

        let yPos = 40

        // Shipment Stats
        doc.setFontSize(14)
        doc.text('Shipment Statistics', 14, yPos)
        yPos += 10
        doc.setFontSize(10)
        if (shipmentStats) {
            doc.text(`Total Shipments: ${shipmentStats.total}`, 14, yPos)
            doc.text(`Delivered: ${shipmentStats.delivered}`, 14, yPos + 6)
            doc.text(`Pending: ${shipmentStats.pending}`, 14, yPos + 12)
            doc.text(`Success Rate: ${shipmentStats.successRate}%`, 14, yPos + 18)
            yPos += 30
        }

        // Revenue Stats
        doc.setFontSize(14)
        doc.text('Revenue Statistics', 14, yPos)
        yPos += 10
        doc.setFontSize(10)
        if (revenueStats) {
            doc.text(`Total Revenue: $${revenueStats.totalRevenue}`, 14, yPos)
            doc.text(`Avg Shipment Value: $${revenueStats.avgShipmentValue}`, 14, yPos + 6)
            doc.text(`Transactions: ${revenueStats.transactionCount}`, 14, yPos + 12)
            yPos += 25
        }

        // KYC Stats
        doc.setFontSize(14)
        doc.text('KYC Statistics', 14, yPos)
        yPos += 10
        doc.setFontSize(10)
        if (kycStats) {
            doc.text(`Total Submissions: ${kycStats.total}`, 14, yPos)
            doc.text(`Approved: ${kycStats.approved}`, 14, yPos + 6)
            doc.text(`Rejected: ${kycStats.rejected}`, 14, yPos + 12)
            doc.text(`Pending: ${kycStats.pending}`, 14, yPos + 18)
            doc.text(`Approval Rate: ${kycStats.approvalRate}%`, 14, yPos + 24)
            yPos += 35
        }

        // User Stats
        doc.setFontSize(14)
        doc.text('User Statistics', 14, yPos)
        yPos += 10
        doc.setFontSize(10)
        if (userStats) {
            doc.text(`New Users: ${userStats.newUsers}`, 14, yPos)
            doc.text(`Verified: ${userStats.verifiedUsers}`, 14, yPos + 6)
            doc.text(`Unverified: ${userStats.unverifiedUsers}`, 14, yPos + 12)
            yPos += 25
        }

        // Top Travelers Table
        if (topTravelers.length > 0 && yPos < 250) {
            doc.setFontSize(14)
            doc.text('Top Travelers', 14, yPos)
            yPos += 5

            autoTable(doc, {
                startY: yPos,
                head: [['Traveler', 'Earnings']],
                body: topTravelers.map(t => [t.name, `$${t.earnings}`]),
            })
        }

        // Save
        doc.save(`analytics-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
    }

    const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444']

    const statusData = shipmentStats ? [
        { name: 'Delivered', value: shipmentStats.delivered },
        { name: 'Pending', value: shipmentStats.pending },
        { name: 'Accepted', value: shipmentStats.accepted },
        { name: 'In Transit', value: shipmentStats.in_transit },
        { name: 'Cancelled', value: shipmentStats.cancelled },
    ].filter(item => item.value > 0) : []

    if (loading) {
        return <div className="container py-10">Loading analytics...</div>
    }

    return (
        <div className="container py-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                    <p className="text-muted-foreground">Monitor your platform performance</p>
                </div>
                <Button onClick={handleExportPDF}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export PDF
                </Button>
            </div>

            {/* Date Range Picker */}
            <div className="mb-8 p-4 bg-muted/20 rounded-lg">
                <DateRangePicker onRangeChange={handleDateRangeChange} />
            </div>

            {/* Metric Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <MetricCard
                    title="Total Shipments"
                    value={shipmentStats?.total || 0}
                    subtitle={`${shipmentStats?.successRate || 0}% success rate`}
                    icon={Package}
                />
                <MetricCard
                    title="Total Revenue"
                    value={`$${revenueStats?.totalRevenue || '0.00'}`}
                    subtitle={`${revenueStats?.transactionCount || 0} transactions`}
                    icon={DollarSign}
                />
                <MetricCard
                    title="KYC Approvals"
                    value={kycStats?.approved || 0}
                    subtitle={`${kycStats?.approvalRate || 0}% approval rate`}
                    icon={CheckCircle}
                />
                <MetricCard
                    title="New Users"
                    value={userStats?.newUsers || 0}
                    subtitle={`${userStats?.verifiedUsers || 0} verified`}
                    icon={Users}
                />
            </div>

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2 mb-8">
                {/* Shipments Over Time */}
                <Card>
                    <CardHeader>
                        <CardTitle>Shipments Over Time</CardTitle>
                        <CardDescription>Daily shipment creation trend</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    No data for selected period
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Status Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>Shipment Status Breakdown</CardTitle>
                        <CardDescription>Distribution by status</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            {statusData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={(entry) => entry.name}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    No data for selected period
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top Travelers Table */}
            {topTravelers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Top Travelers</CardTitle>
                        <CardDescription>Highest earning travelers in selected period</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-2">#</th>
                                        <th className="text-left p-2">Traveler</th>
                                        <th className="text-right p-2">Earnings</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topTravelers.map((traveler, index) => (
                                        <tr key={traveler.traveler_id} className="border-b">
                                            <td className="p-2">{index + 1}</td>
                                            <td className="p-2">{traveler.name}</td>
                                            <td className="p-2 text-right font-medium text-green-600">
                                                ${traveler.earnings}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
