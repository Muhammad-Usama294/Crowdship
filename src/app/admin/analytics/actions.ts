'use server'

import { createClient } from '@/lib/supabase/server'

export async function getShipmentStats(startDate: string, endDate: string) {
    const supabase = await createClient()

    // Get all shipments in date range
    const { data: shipments, error } = await supabase
        .from('shipments')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

    if (error) {
        console.error('Error fetching shipments:', error)
        return { error: error.message }
    }

    // Calculate statistics
    const total = shipments?.length || 0
    const delivered = shipments?.filter(s => s.status === 'delivered').length || 0
    const pending = shipments?.filter(s => s.status === 'pending').length || 0
    const accepted = shipments?.filter(s => s.status === 'accepted').length || 0
    const in_transit = shipments?.filter(s => s.status === 'in_transit').length || 0
    const cancelled = shipments?.filter(s => s.status === 'cancelled').length || 0

    const successRate = total > 0 ? ((delivered / total) * 100).toFixed(1) : '0'

    return {
        total,
        delivered,
        pending,
        accepted,
        in_transit,
        cancelled,
        successRate,
        shipments: shipments || []
    }
}

export async function getRevenueStats(startDate: string, endDate: string) {
    const supabase = await createClient()

    const { data: shipments, error } = await supabase
        .from('shipments')
        .select('offer_price, status, created_at')
        .eq('status', 'delivered')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

    if (error) {
        console.error('Error fetching revenue:', error)
        return { error: error.message }
    }

    const totalRevenue = shipments?.reduce((sum, s) => sum + (s.offer_price || 0), 0) || 0
    const avgShipmentValue = shipments?.length ? (totalRevenue / shipments.length).toFixed(2) : '0'
    const transactionCount = shipments?.length || 0

    return {
        totalRevenue: totalRevenue.toFixed(2),
        avgShipmentValue,
        transactionCount,
        shipments: shipments || []
    }
}

export async function getKYCStats(startDate: string, endDate: string) {
    const supabase = await createClient()

    const { data: documents, error } = await supabase
        .from('kyc_documents')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

    if (error) {
        console.error('Error fetching KYC stats:', error)
        return { error: error.message }
    }

    const total = documents?.length || 0
    const approved = documents?.filter(d => d.status === 'approved').length || 0
    const rejected = documents?.filter(d => d.status === 'rejected').length || 0
    const pending = documents?.filter(d => d.status === 'pending').length || 0

    const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(1) : '0'

    return {
        total,
        approved,
        rejected,
        pending,
        approvalRate
    }
}

export async function getUserStats(startDate: string, endDate: string) {
    const supabase = await createClient()

    const { data: users, error } = await supabase
        .from('users')
        .select('id, created_at, is_kyc_verified')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

    if (error) {
        console.error('Error fetching user stats:', error)
        return { error: error.message }
    }

    const newUsers = users?.length || 0
    const verifiedUsers = users?.filter(u => u.is_kyc_verified).length || 0
    const unverifiedUsers = newUsers - verifiedUsers

    return {
        newUsers,
        verifiedUsers,
        unverifiedUsers
    }
}

export async function getTopTravelers(startDate: string, endDate: string, limit: number = 5) {
    const supabase = await createClient()

    // Get delivered shipments with traveler info
    const { data: shipments, error } = await supabase
        .from('shipments')
        .select('traveler_id, offer_price')
        .eq('status', 'delivered')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .not('traveler_id', 'is', null)

    if (error) {
        console.error('Error fetching top travelers:', error)
        return { error: error.message }
    }

    // Group by traveler and calculate earnings
    const travelerEarnings = new Map<string, number>()
    shipments?.forEach(s => {
        const current = travelerEarnings.get(s.traveler_id!) || 0
        travelerEarnings.set(s.traveler_id!, current + (s.offer_price || 0))
    })

    // Convert to array and sort
    const topTravelers = Array.from(travelerEarnings.entries())
        .map(([traveler_id, earnings]) => ({ traveler_id, earnings }))
        .sort((a, b) => b.earnings - a.earnings)
        .slice(0, limit)

    // Fetch traveler names
    const travelerIds = topTravelers.map(t => t.traveler_id)
    const { data: travelers } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', travelerIds)

    // Merge data
    const result = topTravelers.map(t => {
        const traveler = travelers?.find(tr => tr.id === t.traveler_id)
        return {
            traveler_id: t.traveler_id,
            name: traveler?.full_name || 'Unknown',
            earnings: t.earnings.toFixed(2)
        }
    })

    return { topTravelers: result }
}

export async function getShipmentsOverTime(startDate: string, endDate: string) {
    const supabase = await createClient()

    const { data: shipments, error } = await supabase
        .from('shipments')
        .select('created_at, status')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching shipments over time:', error)
        return { error: error.message }
    }

    // Group by date
    const dateMap = new Map<string, number>()
    shipments?.forEach(s => {
        const date = new Date(s.created_at).toISOString().split('T')[0]
        dateMap.set(date, (dateMap.get(date) || 0) + 1)
    })

    const chartData = Array.from(dateMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))

    return { chartData }
}
