"use server"

import { createClient } from "@/lib/supabase/server"

interface CancelTripResult {
    success: boolean
    error?: string
    penalty?: number
}

export async function cancelTripShipment(shipmentId: string): Promise<CancelTripResult> {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: "Not authenticated" }
    }

    // Fetch shipment details
    const { data: shipment, error: fetchError } = await supabase
        .from('shipments')
        .select('*')
        .eq('id', shipmentId)
        .single()

    if (fetchError || !shipment) {
        return { success: false, error: "Shipment not found" }
    }

    // Verify user is the traveler
    if (shipment.traveler_id !== user.id) {
        return { success: false, error: "Not authorized" }
    }

    // Check if cancellation is allowed
    if (shipment.status === 'delivered' || shipment.status === 'cancelled') {
        return { success: false, error: `Cannot cancel ${shipment.status} shipment` }
    }

    if (shipment.status === 'pending') {
        return { success: false, error: "Cannot cancel shipment you haven't accepted" }
    }

    // Calculate penalty based on status
    let penalty = 0
    if (shipment.status === 'accepted') {
        penalty = shipment.offer_price * 0.20 // 20% penalty
    } else if (shipment.status === 'in_transit') {
        penalty = shipment.offer_price * 0.50 // 50% penalty
    }

    // Get traveler's wallet balance
    const { data: userProfile } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', user.id)
        .single()

    if (!userProfile || userProfile.wallet_balance < penalty) {
        return {
            success: false,
            error: `Insufficient funds. Cancellation penalty: $${penalty.toFixed(2)}`
        }
    }

    // Update shipment status
    const { error: updateError } = await supabase
        .from('shipments')
        .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancelled_by: user.id,
            cancellation_penalty: penalty,
            traveler_id: null // Unassign traveler
        })
        .eq('id', shipmentId)

    if (updateError) {
        return { success: false, error: "Failed to cancel shipment" }
    }

    // Deduct penalty from traveler's wallet
    if (penalty > 0) {
        const { error: walletError } = await supabase
            .from('users')
            .update({
                wallet_balance: userProfile.wallet_balance - penalty
            })
            .eq('id', user.id)

        if (walletError) {
            console.error("Wallet deduction failed:", walletError)
            return { success: false, error: "Failed to process penalty" }
        }

        // Credit penalty to sender as compensation
        const { data: sender } = await supabase
            .from('users')
            .select('wallet_balance')
            .eq('id', shipment.sender_id)
            .single()

        if (sender) {
            await supabase
                .from('users')
                .update({
                    wallet_balance: (sender.wallet_balance || 0) + penalty
                })
                .eq('id', shipment.sender_id)
        }
    }

    return {
        success: true,
        penalty
    }
}

export async function getMyTrips() {
    console.log("Fetching trips...")
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        console.log("No user found")
        return { currentTrip: [], pastTrips: [] }
    }

    console.log("User ID:", user.id)

    // Get all shipments where user is traveler - Simplified query first
    const { data: shipments, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('traveler_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching trips:", error)
        return { currentTrip: [], pastTrips: [] }
    }

    console.log(`Found ${shipments?.length || 0} shipments for traveler`)

    if (!shipments) return { currentTrip: [], pastTrips: [] }

    // Separate current vs past
    const currentTrip = shipments.filter(s =>
        s.status === 'accepted' || s.status === 'in_transit'
    )

    const pastTrips = shipments.filter(s =>
        s.status === 'delivered' || s.status === 'cancelled'
    )

    return { currentTrip, pastTrips }
}

/**
 * Check if a trip can be modified (all shipments must be in 'accepted' status)
 * @param shipmentIds Array of shipment IDs in the trip
 */
export async function canModifyTrip(shipmentIds: string[]) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { canModify: false, reason: 'Not authenticated' }

    const { data: shipments, error } = await supabase
        .from('shipments')
        .select('id, status, traveler_id')
        .in('id', shipmentIds)

    if (error || !shipments) {
        return { canModify: false, reason: 'Failed to fetch shipments' }
    }

    // Check all shipments belong to this traveler
    const allOwnedByUser = shipments.every(s => s.traveler_id === user.id)
    if (!allOwnedByUser) {
        return { canModify: false, reason: 'Not authorized' }
    }

    // Check all shipments are in 'accepted' status
    const allAccepted = shipments.every(s => s.status === 'accepted')
    if (!allAccepted) {
        return {
            canModify: false,
            reason: 'Cannot modify trip after pickup has started'
        }
    }

    return { canModify: true }
}

/**
 * Delete a trip by unassigning traveler from all shipments
 * Only allowed when all shipments are in 'accepted' status (before OTP/pickup)
 */
export async function deleteTrip(shipmentIds: string[]) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    // First check if modification is allowed
    const canModify = await canModifyTrip(shipmentIds)
    if (!canModify.canModify) {
        return { success: false, error: canModify.reason }
    }

    // Fetch shipment details before releasing (to get sender info for emails)
    const { data: shipmentsData, error: fetchError } = await supabase
        .from('shipments')
        .select('id, title, sender_id')
        .in('id', shipmentIds)
        .eq('traveler_id', user.id)
        .eq('status', 'accepted')

    if (fetchError) {
        console.error('Error fetching shipments:', fetchError)
        return { success: false, error: 'Failed to fetch shipment details' }
    }

    // Unassign traveler from all shipments (revert to pending)
    const { error } = await supabase
        .from('shipments')
        .update({
            traveler_id: null,
            status: 'pending'
        })
        .in('id', shipmentIds)
        .eq('traveler_id', user.id) // Safety check
        .eq('status', 'accepted') // Safety check

    if (error) {
        console.error('Delete trip error:', error)
        return { success: false, error: 'Failed to delete trip' }
    }

    // Send email notifications to senders (non-blocking)
    if (shipmentsData && shipmentsData.length > 0) {
        // Import email function and admin client dynamically
        Promise.all([
            import('@/lib/email'),
            import('@/lib/supabase/server')
        ]).then(async ([{ sendShipmentReleasedEmail }, { createAdminClient }]) => {
            const adminClient = await createAdminClient()

            for (const shipment of shipmentsData) {
                try {
                    // Get sender's email and name using admin client
                    const { data: senderData } = await adminClient
                        .from('users')
                        .select('full_name')
                        .eq('id', shipment.sender_id)
                        .single()

                    const { data: authData } = await adminClient.auth.admin.getUserById(shipment.sender_id)

                    if (authData?.user?.email) {
                        const senderName = senderData?.full_name || authData.user.email.split('@')[0]
                        await sendShipmentReleasedEmail(
                            authData.user.email,
                            senderName,
                            shipment.title,
                            shipment.id
                        )
                    }
                } catch (emailError) {
                    console.error('Failed to send email for shipment:', shipment.id, emailError)
                    // Don't fail the entire operation if email fails
                }
            }
        }).catch(err => {
            console.error('Failed to send release emails:', err)
        })
    }

    return {
        success: true,
        message: `Trip deleted. ${shipmentIds.length} shipment(s) released.`
    }
}

/**
 * Edit a trip by releasing all current shipments
 * Same as delete - releases shipments so traveler can plan new route
 */
export async function editTrip(shipmentIds: string[]) {
    // Edit trip = release shipments + redirect to planner
    // Use same logic as delete since we're releasing all shipments
    return await deleteTrip(shipmentIds)
}
