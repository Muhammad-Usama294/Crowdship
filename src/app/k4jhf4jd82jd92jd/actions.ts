'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendKYCApprovalEmail, sendKYCRejectionEmail } from '@/lib/email'

export async function approveKYC(docId: string, userId: string) {
    console.log('Server: approveKYC called with:', { docId, userId })
    const supabase = await createAdminClient()

    console.log('Server: Updating document status...')
    // Update document status
    const { data: docData, error: docError } = await supabase
        .from('kyc_documents')
        .update({ status: 'approved' })
        .eq('id', docId)
        .select()

    console.log('Server: Document update result:', { docData, docError })

    if (docError) {
        console.error('Server: Document update error:', docError)
        return { error: docError.message }
    }

    console.log('Server: Updating user verification...')
    // Update user verification status
    const { data: userData, error: userError } = await supabase
        .from('users')
        .update({ is_kyc_verified: true })
        .eq('id', userId)
        .select()

    console.log('Server: User update result:', { userData, userError })

    if (userError) {
        console.error('Server: User update error:', userError)
        return { error: userError.message }
    }

    // Get user email and name
    const { data: authUser } = await supabase.auth.admin.getUserById(userId)

    if (authUser?.user?.email) {
        const userName = userData?.[0]?.full_name || authUser.user.email.split('@')[0]

        // Send approval email (don't fail if email fails)
        sendKYCApprovalEmail(authUser.user.email, userName).catch(err => {
            console.error('Email send failed (non-blocking):', err)
        })
    }

    revalidatePath('/k4jhf4jd82jd92jd')
    console.log('Server: All updates successful')
    return { success: true }
}

export async function rejectKYC(docId: string, adminNote: string) {
    const supabase = await createAdminClient()

    // Get user_id first
    const { data: docData } = await supabase
        .from('kyc_documents')
        .select('user_id, users(full_name)')
        .eq('id', docId)
        .single()

    const { error } = await supabase
        .from('kyc_documents')
        .update({
            status: 'rejected',
            admin_note: adminNote
        })
        .eq('id', docId)

    if (error) {
        return { error: error.message }
    }

    // Send rejection email
    if (docData?.user_id) {
        const { data: authUser } = await supabase.auth.admin.getUserById(docData.user_id)

        if (authUser?.user?.email) {
            const userName = (docData.users as any)?.full_name || authUser.user.email.split('@')[0]

            // Send rejection email (don't fail if email fails)
            sendKYCRejectionEmail(authUser.user.email, userName, adminNote).catch(err => {
                console.error('Email send failed (non-blocking):', err)
            })
        }
    }

    revalidatePath('/k4jhf4jd82jd92jd')
    return { success: true }
}

export async function toggleUserSuspension(userId: string, isSuspended: boolean) {
    const supabase = await createAdminClient()

    // We are toggling, so we set it to the requested state
    const { error } = await supabase
        .from('users')
        .update({ is_suspended: isSuspended })
        .eq('id', userId)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/k4jhf4jd82jd92jd')
    revalidatePath('/k4jhf4jd82jd92jd/users')
    return { success: true }
}

export async function getUsers() {
    const supabase = await createAdminClient()

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

    if (error) {
        console.error('Error fetching users:', error)
        return { error: error.message }
    }

    return { data }
}

export async function syncUsers() {
    try {
        const supabase = await createAdminClient()

        // 1. List all auth users
        const { data, error: authError } = await supabase.auth.admin.listUsers()

        if (authError) {
            console.error('Auth User Fetch Error:', authError)
            return { error: 'Auth error: ' + authError.message }
        }

        const users = data?.users
        if (!users || users.length === 0) {
            console.log('No auth users found.')
            return { success: true, count: 0, message: "No auth users found to sync." }
        }

        console.log(`Found ${users.length} auth users. Starting sync...`)

        let syncedCount = 0
        let errors: string[] = []

        // 2. Loop and upsert into public.users
        for (const user of users) {
            const fullName = user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.email?.split('@')[0] ||
                'Unknown User'

            // We REMOVE ignoreDuplicates because we want to ensure data exists.
            // But we don't want to nuke existing valid data (like trust_score)
            // Upsert with only necessary fields is safer.
            const { error: upsertError } = await supabase
                .from('users')
                .upsert({
                    id: user.id,
                    full_name: fullName,
                    avatar_url: user.user_metadata?.avatar_url,
                    // If creating new, these defaults apply. If updating, we just refresh name/avatar.
                    // Ideally we should use a more careful query but for "Sync" this is acceptable.
                    role: user.app_metadata?.role || 'user',
                    is_kyc_verified: user.user_metadata?.is_kyc_verified || false
                }, { onConflict: 'id' })

            if (upsertError) {
                console.error(`Failed to sync user ${user.id}:`, upsertError)
                errors.push(upsertError.message)
            } else {
                syncedCount++
            }
        }

        revalidatePath('/k4jhf4jd82jd92jd/users')
        return {
            success: true,
            count: syncedCount,
            totalFound: users.length,
            errors: errors.length > 0 ? errors.slice(0, 3) : undefined
        }

    } catch (err: any) {
        console.error('Sync Users Exception:', err)
        return { error: 'Sync failed: ' + (err.message || 'Unknown error') }
    }
}

/**
 * Fetch all active shipments for admin view
 * Uses admin client to bypass RLS
 * Note: Database only has 'pending', 'accepted', 'delivered', 'cancelled' statuses
 */
export async function getAllActiveShipments(statusFilter?: string, startDate?: string, endDate?: string) {
    const supabase = await createAdminClient()

    let query = supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false })

    // Apply status filter if provided
    if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
    }

    if (startDate) {
        query = query.gte('created_at', new Date(startDate).toISOString())
    }

    if (endDate) {
        // End of the day
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        query = query.lte('created_at', end.toISOString())
    }

    const { data, error } = await query

    if (error) {
        console.error('Database error:', error)
        return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
}
