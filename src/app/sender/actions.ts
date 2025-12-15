"use server"

import { createClient } from "@/lib/supabase/server"

interface CancelShipmentResult {
    success: boolean
    error?: string
    penalty?: number
}

export async function cancelShipment(shipmentId: string): Promise<CancelShipmentResult> {
    try {
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
            console.error("Fetch error:", fetchError)
            return { success: false, error: `Shipment not found: ${fetchError?.message || 'Unknown'}` }
        }

        // Verify user is the sender
        if (shipment.sender_id !== user.id) {
            return { success: false, error: "Not authorized" }
        }

        // Check if cancellation is allowed
        if (shipment.status === 'delivered' || shipment.status === 'cancelled') {
            return { success: false, error: `Cannot cancel ${shipment.status} shipment` }
        }

        // Calculate penalty based on status
        let penalty = 0
        if (shipment.status === 'accepted') {
            penalty = shipment.offer_price * 0.20 // 20% penalty
        } else if (shipment.status === 'in_transit') {
            penalty = shipment.offer_price * 0.50 // 50% penalty
        }
        // pending = no penalty

        // Get user's wallet balance
        const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('wallet_balance')
            .eq('id', user.id)
            .single()

        if (profileError || !userProfile) {
            console.error("Profile error:", profileError)
            return { success: false, error: `Unable to verify wallet: ${profileError?.message || 'Unknown'}` }
        }

        if (userProfile.wallet_balance < penalty) {
            return {
                success: false,
                error: `Insufficient funds. Need $${penalty.toFixed(2)}, have $${userProfile.wallet_balance.toFixed(2)}`
            }
        }

        // Update shipment status
        const { error: updateError } = await supabase
            .from('shipments')
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                cancelled_by: user.id,
                cancellation_penalty: penalty
            })
            .eq('id', shipmentId)

        if (updateError) {
            console.error("Update error:", updateError)
            return { success: false, error: `Update failed: ${updateError.message}` }
        }

        // Deduct penalty from sender's wallet
        if (penalty > 0) {
            const { error: walletError } = await supabase
                .from('users')
                .update({
                    wallet_balance: userProfile.wallet_balance - penalty
                })
                .eq('id', user.id)

            if (walletError) {
                console.error("Wallet deduction failed:", walletError)
                return { success: false, error: `Wallet update failed: ${walletError.message}` }
            }

            // Credit penalty to traveler as compensation
            if (shipment.traveler_id) {
                const { data: traveler } = await supabase
                    .from('users')
                    .select('wallet_balance')
                    .eq('id', shipment.traveler_id)
                    .single()

                if (traveler) {
                    await supabase
                        .from('users')
                        .update({
                            wallet_balance: (traveler.wallet_balance || 0) + penalty
                        })
                        .eq('id', shipment.traveler_id)
                }
            }
        }

        // Send email notification to traveler if shipment was accepted (non-blocking)
        if (shipment.traveler_id && shipment.status === 'accepted') {
            Promise.all([
                import('@/lib/email'),
                import('@/lib/supabase/server')
            ]).then(async ([{ sendShipmentCancelledToTravelerEmail }, { createAdminClient }]) => {
                try {
                    const adminClient = await createAdminClient()

                    // Get traveler's email and name
                    const { data: travelerData } = await adminClient
                        .from('users')
                        .select('full_name')
                        .eq('id', shipment.traveler_id)
                        .single()

                    const { data: authData } = await adminClient.auth.admin.getUserById(shipment.traveler_id)

                    if (authData?.user?.email) {
                        const travelerName = travelerData?.full_name || authData.user.email.split('@')[0]
                        await sendShipmentCancelledToTravelerEmail(
                            authData.user.email,
                            travelerName,
                            shipment.title,
                            shipment.id
                        )
                    }
                } catch (emailError) {
                    console.error('Failed to send cancellation email to traveler:', emailError)
                    // Don't fail the operation if email fails
                }
            }).catch(err => {
                console.error('Failed to send cancellation email:', err)
            })
        }

        return {
            success: true,
            penalty
        }
    } catch (error: any) {
        console.error("Unexpected error:", error)
        return { success: false, error: `Unexpected error: ${error.message}` }
    }
}
