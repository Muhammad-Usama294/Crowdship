"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Get all bids for a specific shipment (sender only)
 */
export async function getShipmentBids(shipmentId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated', data: [] }
    }

    // Verify user owns the shipment
    const { data: shipment } = await supabase
        .from('shipments')
        .select('sender_id')
        .eq('id', shipmentId)
        .single()

    if (!shipment || shipment.sender_id !== user.id) {
        return { success: false, error: 'Not authorized', data: [] }
    }

    // Fetch all bids with traveler info
    const { data, error } = await supabase
        .from('bids')
        .select(`
            *,
            users:traveler_id (
                id,
                full_name,
                avatar_url,
                trust_score
            )
        `)
        .eq('shipment_id', shipmentId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Get shipment bids error:', error)
        return { success: false, error: 'Failed to fetch bids', data: [] }
    }

    return { success: true, data: data || [] }
}

/**
 * Accept a bid (locks the deal)
 */
export async function acceptBid(bidId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Get bid details
    // Get bid details
    const { data: bid, error: bidError } = await supabase
        .from('bids')
        .select('*')
        .eq('id', bidId)
        .single()

    if (bidError || !bid) {
        return { success: false, error: 'Bid not found' }
    }

    // Get shipment details to verify ownership and status
    const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .select('id, sender_id, status, title')
        .eq('id', bid.shipment_id)
        .single()

    if (shipmentError || !shipment || shipment.sender_id !== user.id) {
        return { success: false, error: 'Not authorized' }
    }

    if (shipment.status !== 'pending') {
        return { success: false, error: 'Shipment is no longer available' }
    }

    if (bid.status !== 'pending') {
        return { success: false, error: 'Bid is no longer pending' }
    }

    // Update the accepted bid
    const { error: updateBidError } = await supabase
        .from('bids')
        .update({ status: 'accepted' })
        .eq('id', bidId)

    if (updateBidError) {
        console.error('Update bid error:', updateBidError)
        return { success: false, error: 'Failed to accept bid' }
    }

    // Update shipment
    const { error: updateShipmentError } = await supabase
        .from('shipments')
        .update({
            status: 'accepted',
            traveler_id: bid.traveler_id,
            accepted_bid_id: bidId,
            offer_price: bid.offered_price // Update to accepted bid price
        })
        .eq('id', bid.shipment_id)

    if (updateShipmentError) {
        console.error('Update shipment error:', updateShipmentError)
        return { success: false, error: 'Failed to update shipment' }
    }

    // Reject all other pending bids for this shipment
    const { error: rejectError } = await supabase
        .from('bids')
        .update({ status: 'rejected' })
        .eq('shipment_id', bid.shipment_id)
        .eq('status', 'pending')
        .neq('id', bidId)

    if (rejectError) {
        console.error('Reject other bids error:', rejectError)
        // Don't fail the operation if this fails
    }

    // Send notification to winning traveler
    try {
        const { data: traveler } = await supabase
            .from('users')
            .select('email, full_name')
            .eq('id', bid.traveler_id)
            .single()

        if (traveler?.email) {
            const { Resend } = await import('resend')
            const resend = new Resend(process.env.RESEND_API_KEY)

            await resend.emails.send({
                from: 'CrowdShip <onboarding@resend.dev>',
                to: traveler.email,
                subject: `Your bid for "${shipment.title}" has been accepted!`,
                html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Bid Accepted!</h1>
    </div>
    
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">Hi ${traveler.full_name || 'Traveler'},</p>
        
        <p style="font-size: 16px;">
            Congratulations! Your bid of <strong style="color: #667eea;">$${bid.offered_price}</strong> for 
            <strong>"${shipment.title}"</strong> has been accepted!
        </p>
        
        <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 25px 0;">
            <p style="margin: 0; color: #065f46; font-weight: 600;">✓ Next Steps:</p>
            <ul style="margin: 10px 0 0 0; color: #065f46;">
                <li>Log in to your dashboard to view shipment details</li>
                <li>Coordinate pickup with the sender</li>
                <li>Complete the delivery to earn your payment</li>
            </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/traveler/dashboard" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                View Shipment →
            </a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            Thank you for using CrowdShip!<br>
            <strong>The CrowdShip Team</strong>
        </p>
    </div>
</body>
</html>
                `
            })
            console.log('✅ Bid acceptance email sent to:', traveler.email)
        }
    } catch (emailError) {
        console.error('Failed to send acceptance email:', emailError)
        // Don't fail the operation if email fails
    }

    return { success: true }
}

/**
 * Reject a specific bid
 */
export async function rejectBid(bidId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Get bid details to verify ownership
    // Get bid details first
    const { data: bid, error: bidError } = await supabase
        .from('bids')
        .select('id, shipment_id, status')
        .eq('id', bidId)
        .single()

    if (bidError || !bid) {
        console.error('Bid search error:', bidError)
        return { success: false, error: 'Bid not found: ' + (bidError?.message || 'Unknown error') }
    }

    // Verify ownership of the shipment
    const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .select('sender_id')
        .eq('id', bid.shipment_id)
        .single()

    if (shipmentError || !shipment || shipment.sender_id !== user.id) {
        return { success: false, error: 'Not authorized to manage this shipment' }
    }

    // Update bid status
    const { error } = await supabase
        .from('bids')
        .update({ status: 'rejected' })
        .eq('id', bidId)
        .eq('status', 'pending')

    if (error) {
        console.error('Reject bid error:', error)
        return { success: false, error: error.message }
    }

    // TODO: Send rejection email to traveler

    return { success: true }
}

/**
 * Reject all pending bids for a shipment
 */
export async function rejectAllBids(shipmentId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Verify ownership
    const { data: shipment } = await supabase
        .from('shipments')
        .select('sender_id')
        .eq('id', shipmentId)
        .single()

    if (!shipment || shipment.sender_id !== user.id) {
        return { success: false, error: 'Not authorized' }
    }

    // Reject all pending bids
    const { error } = await supabase
        .from('bids')
        .update({ status: 'rejected' })
        .eq('shipment_id', shipmentId)
        .eq('status', 'pending')

    if (error) {
        console.error('Reject all bids error:', error)
        return { success: false, error: 'Failed to reject bids' }
    }

    return { success: true }
}
