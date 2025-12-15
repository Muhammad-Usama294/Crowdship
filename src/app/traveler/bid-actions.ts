"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Create a new bid on a shipment
 */
export async function createBid(shipmentId: string, offeredPrice: number) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Validate price
    if (offeredPrice <= 0) {
        return { success: false, error: 'Price must be greater than 0' }
    }

    // Check if shipment exists and is biddable
    const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .select('id, sender_id, status, bidding_enabled, offer_price')
        .eq('id', shipmentId)
        .single()

    if (shipmentError || !shipment) {
        return { success: false, error: 'Shipment not found' }
    }

    if (shipment.sender_id === user.id) {
        return { success: false, error: 'Cannot bid on your own shipment' }
    }

    if (shipment.status !== 'pending') {
        return { success: false, error: 'Shipment is no longer available' }
    }

    if (!shipment.bidding_enabled) {
        return { success: false, error: 'Bidding is not enabled for this shipment' }
    }

    // Check for existing pending bid
    const { data: existingPending, error: pendingError } = await supabase
        .from('bids')
        .select('id')
        .eq('shipment_id', shipmentId)
        .eq('traveler_id', user.id)
        .eq('status', 'pending')
        .single() // Returns row if found, null/error if not

    if (existingPending) {
        return { success: false, error: 'You already have a pending bid. Please wait for the sender to respond.' }
    }

    // Check bid count limit (Max 3)
    const { count, error: countError } = await supabase
        .from('bids')
        .select('*', { count: 'exact', head: true })
        .eq('shipment_id', shipmentId)
        .eq('traveler_id', user.id)

    if (countError) {
        console.error('Bid count error:', countError)
        return { success: false, error: 'Failed to verify bid limit' }
    }

    if (count !== null && count >= 3) {
        return { success: false, error: 'Maximum bid limit reached (3 bids allowed per shipment).' }
    }

    // Create the bid
    const { data: bid, error: bidError } = await supabase
        .from('bids')
        .insert({
            shipment_id: shipmentId,
            traveler_id: user.id,
            offered_price: offeredPrice,
            status: 'pending'
        })
        .select()
        .single()

    if (bidError) {
        console.error('Bid creation error:', bidError)
        return { success: false, error: 'Failed to create bid: ' + bidError.message }
    }

    // TODO: Send email notification to sender
    // import('@/lib/email').then(({ sendNewBidNotificationEmail }) => {
    //     // Send email to sender
    // })

    return { success: true, data: bid }
}

/**
 * Accept the initial price (instant accept)
 */
export async function acceptInitialPrice(shipmentId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Get shipment details
    const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .select('*')
        .eq('id', shipmentId)
        .single()

    if (shipmentError || !shipment) {
        return { success: false, error: 'Shipment not found' }
    }

    if (shipment.sender_id === user.id) {
        return { success: false, error: 'Cannot accept your own shipment' }
    }

    if (shipment.status !== 'pending') {
        return { success: false, error: 'Shipment is no longer available' }
    }

    if (!shipment.auto_accept_initial_price) {
        return { success: false, error: 'Auto-accept is not enabled. Please submit a bid instead.' }
    }

    // Create bid at initial price and auto-accept
    const { data: bid, error: bidError } = await supabase
        .from('bids')
        .insert({
            shipment_id: shipmentId,
            traveler_id: user.id,
            offered_price: shipment.offer_price,
            status: 'accepted'
        })
        .select()
        .single()

    if (bidError) {
        console.error('Bid creation error:', bidError)
        return { success: false, error: 'Failed to accept shipment' }
    }

    // Update shipment
    const { error: updateError } = await supabase
        .from('shipments')
        .update({
            status: 'accepted',
            traveler_id: user.id,
            accepted_bid_id: bid.id
        })
        .eq('id', shipmentId)

    if (updateError) {
        console.error('Shipment update error:', updateError)
        return { success: false, error: 'Failed to update shipment' }
    }

    return { success: true, data: bid }
}

/**
 * Withdraw a pending bid
 */
export async function withdrawBid(bidId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    const { error } = await supabase
        .from('bids')
        .update({ status: 'withdrawn' })
        .eq('id', bidId)
        .eq('traveler_id', user.id)
        .eq('status', 'pending')

    if (error) {
        console.error('Withdraw bid error:', error)
        return { success: false, error: 'Failed to withdraw bid' }
    }

    return { success: true }
}

/**
 * Get all bids made by the current traveler
 */
export async function getMyBids() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated', data: [] }
    }

    const { data, error } = await supabase
        .from('bids')
        .select(`
            *,
            shipments (
                id,
                title,
                pickup_address,
                dropoff_address,
                offer_price,
                status
            )
        `)
        .eq('traveler_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Get bids error:', error)
        return { success: false, error: 'Failed to fetch bids', data: [] }
    }

    return { success: true, data: data || [] }
}
