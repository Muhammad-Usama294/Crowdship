'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    const fullName = formData.get('fullName') as string
    const phoneNumber = formData.get('phoneNumber') as string

    const { error } = await supabase
        .from('users')
        .update({
            full_name: fullName,
            phone_number: phoneNumber,
        })
        .eq('id', user.id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/account')
    revalidatePath('/k4jhf4jd82jd92jd/users') // Refresh Admin List
    return { success: true }
}

export async function updatePassword(currentPassword: string, newPassword: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) {
        return { error: 'Not authenticated' }
    }

    // Verify current password by trying to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
    })

    if (signInError) {
        return { error: 'Current password is incorrect' }
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
    })

    if (updateError) {
        return { error: updateError.message }
    }

    return { success: true }
}

export async function uploadAvatar(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    const file = formData.get('avatar') as File
    if (!file) {
        return { error: 'No file provided' }
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
        })

    if (uploadError) {
        return { error: uploadError.message }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

    // Update user profile with new avatar URL
    const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

    if (updateError) {
        return { error: updateError.message }
    }

    revalidatePath('/account')
    revalidatePath('/k4jhf4jd82jd92jd/users') // Refresh Admin List
    return { success: true, avatarUrl: publicUrl }
}

export async function deleteAccount() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    // Delete user's data from database
    // Note: This is a simplified version. In production, you'd want to:
    // 1. Delete or anonymize related data (shipments, transactions, etc.)
    // 2. Handle this in a database transaction
    // 3. Possibly soft-delete instead of hard-delete

    const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id)

    if (deleteError) {
        return { error: deleteError.message }
    }

    // Sign out the user
    await supabase.auth.signOut()

    return { success: true }
}
