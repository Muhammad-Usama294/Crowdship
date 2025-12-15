'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function uploadKYCDocuments(formData: FormData) {
    const supabase = await createClient()
    const supabaseAdmin = await createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    const documentType = formData.get('documentType') as string
    const idFront = formData.get('idFront') as File
    const idBack = formData.get('idBack') as File | null
    const proofOfAddress = formData.get('proofOfAddress') as File | null

    if (!idFront || !documentType) {
        return { error: 'ID document (front) and document type are required' }
    }

    try {
        // Upload ID front
        const frontExt = idFront.name.split('.').pop()
        const frontPath = `${user.id}-id-front-${Date.now()}.${frontExt}`

        // Convert File to ArrayBuffer for upload
        const arrayBuffer = await idFront.arrayBuffer()
        const buffer = new Uint8Array(arrayBuffer)

        const { error: frontError, data: frontData } = await supabaseAdmin.storage
            .from('kyc_documents')
            .upload(frontPath, buffer, {
                contentType: idFront.type,
                cacheControl: '3600',
                upsert: true
            })

        if (frontError) {
            console.error('Front upload error:', frontError)
            return { error: `Error uploading ID front: ${frontError.message}` }
        }

        const { data: { publicUrl: frontUrl } } = supabaseAdmin.storage
            .from('kyc_documents')
            .getPublicUrl(frontPath)

        // Upload ID back if provided
        let backUrl: string | null = null
        if (idBack) {
            const backExt = idBack.name.split('.').pop()
            const backPath = `${user.id}-id-back-${Date.now()}.${backExt}`
            const backArrayBuffer = await idBack.arrayBuffer()
            const backBuffer = new Uint8Array(backArrayBuffer)

            const { error: backError } = await supabaseAdmin.storage
                .from('kyc_documents')
                .upload(backPath, backBuffer, {
                    contentType: idBack.type,
                    cacheControl: '3600',
                    upsert: true
                })

            if (!backError) {
                const { data: { publicUrl } } = supabaseAdmin.storage
                    .from('kyc_documents')
                    .getPublicUrl(backPath)
                backUrl = publicUrl
            }
        }

        // Upload proof of address if provided
        let proofUrl: string | null = null
        if (proofOfAddress) {
            const proofExt = proofOfAddress.name.split('.').pop()
            const proofPath = `${user.id}-proof-${Date.now()}.${proofExt}`
            const proofArrayBuffer = await proofOfAddress.arrayBuffer()
            const proofBuffer = new Uint8Array(proofArrayBuffer)

            const { error: proofError } = await supabaseAdmin.storage
                .from('kyc_documents')
                .upload(proofPath, proofBuffer, {
                    contentType: proofOfAddress.type,
                    cacheControl: '3600',
                    upsert: true
                })

            if (!proofError) {
                const { data: { publicUrl } } = supabaseAdmin.storage
                    .from('kyc_documents')
                    .getPublicUrl(proofPath)
                proofUrl = publicUrl
            }
        }

        // Create KYC document record
        const { error: insertError } = await supabase
            .from('kyc_documents')
            .insert({
                user_id: user.id,
                document_type: documentType,
                document_url: frontUrl,
                document_url_back: backUrl,
                proof_of_address_url: proofUrl,
                status: 'pending'
            })

        if (insertError) {
            return { error: `Error saving KYC record: ${insertError.message}` }
        }

        revalidatePath('/kyc/upload')
        return { success: true }
    } catch (error: any) {
        console.error('Upload error:', error)
        return { error: error.message || 'An error occurred' }
    }
}

export async function getKYCStatus() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    const { data, error } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        return { error: error.message }
    }

    return { data }
}

export async function deleteKYCDocument(docId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    const { error } = await supabase
        .from('kyc_documents')
        .delete()
        .eq('id', docId)
        .eq('user_id', user.id)
        .eq('status', 'pending') // Only allow deleting pending submissions

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/kyc/upload')
    return { success: true }
}
