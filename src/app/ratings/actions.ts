'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitRating(shipmentId: string, rating: number, comment: string) {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    // Get shipment details
    const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .select('sender_id, traveler_id, status')
        .eq('id', shipmentId)
        .single()

    if (shipmentError || !shipment) {
        return { error: 'Shipment not found' }
    }

    // Verify user is the sender and shipment is delivered
    if (shipment.sender_id !== user.id) {
        return { error: 'Only the sender can rate this shipment' }
    }

    if (shipment.status !== 'delivered') {
        return { error: 'Can only rate delivered shipments' }
    }

    if (!shipment.traveler_id) {
        return { error: 'No traveler assigned to this shipment' }
    }

    // Check if rating already exists
    const { data: existingRating } = await supabase
        .from('ratings')
        .select('id')
        .eq('shipment_id', shipmentId)
        .single()

    if (existingRating) {
        return { error: 'You have already rated this shipment' }
    }

    // Create rating
    const { error: insertError } = await supabase
        .from('ratings')
        .insert({
            shipment_id: shipmentId,
            sender_id: user.id,
            traveler_id: shipment.traveler_id,
            rating,
            comment: comment.trim() || null
        })

    if (insertError) {
        console.error('Rating insert error:', insertError)
        return { error: insertError.message }
    }

    revalidatePath('/sender/dashboard')
    return { success: true }
}

export async function getRating(shipmentId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('shipment_id', shipmentId)
        .single()

    if (error) {
        return { error: error.message }
    }

    return { data }
}

export async function getTravelerRatings(travelerId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('ratings')
        .select('*, shipments(title)')
        .eq('traveler_id', travelerId)
        .order('created_at', { ascending: false })
        .limit(10)

    if (error) {
        return { error: error.message }
    }

    return { data }
}
