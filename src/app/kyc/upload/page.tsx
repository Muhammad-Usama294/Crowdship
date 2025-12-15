"use client"

import { useEffect, useState } from "react"
import { useUser } from "@/contexts/user-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { uploadKYCDocuments, getKYCStatus, deleteKYCDocument } from "./actions"
import { Upload, FileCheck, AlertCircle, CheckCircle, XCircle, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"

export default function KYCUploadPage() {
    const { user, profile } = useUser()
    const router = useRouter()

    const [documentType, setDocumentType] = useState("national_id")
    const [idFront, setIdFront] = useState<File | null>(null)
    const [idBack, setIdBack] = useState<File | null>(null)
    const [proofOfAddress, setProofOfAddress] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [message, setMessage] = useState("")
    const [currentStatus, setCurrentStatus] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user) {
            fetchStatus()
        }
    }, [user])

    async function fetchStatus() {
        const result = await getKYCStatus()
        if (result.data) {
            setCurrentStatus(result.data)
        }
        setLoading(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!idFront) {
            setMessage("Please upload at least the front of your ID document")
            return
        }

        setUploading(true)
        setMessage("")

        const formData = new FormData()
        formData.append('documentType', documentType)
        formData.append('idFront', idFront)
        if (idBack) formData.append('idBack', idBack)
        if (proofOfAddress) formData.append('proofOfAddress', proofOfAddress)

        const result = await uploadKYCDocuments(formData)

        if (result.error) {
            setMessage(result.error)
        } else {
            setMessage("Documents uploaded successfully! Your submission is pending admin review.")
            setIdFront(null)
            setIdBack(null)
            setProofOfAddress(null)
            await fetchStatus()
        }

        setUploading(false)
    }

    const handleDelete = async () => {
        if (!currentStatus) return

        const result = await deleteKYCDocument(currentStatus.id)
        if (result.success) {
            setCurrentStatus(null)
            setMessage("Submission deleted. You can upload new documents.")
        } else {
            setMessage(result.error || "Error deleting submission")
        }
    }

    if (!user) {
        return (
            <div className="container py-10">
                <p>Please log in to upload KYC documents.</p>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="container py-10">
                <p>Loading...</p>
            </div>
        )
    }

    return (
        <div className="container py-8 max-w-3xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <FileCheck className="h-8 w-8" />
                    <h1 className="text-3xl font-bold">KYC Verification</h1>
                </div>
                {profile?.is_kyc_verified && (
                    <Badge className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                    </Badge>
                )}
            </div>

            {/* Already Verified Alert */}
            {profile?.is_kyc_verified && (
                <Alert className="mb-6 border-green-200 bg-green-50 dark:bg-green-950">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800 dark:text-green-200">Already Verified!</AlertTitle>
                    <AlertDescription className="text-green-700 dark:text-green-300">
                        Your account is fully verified. You have access to all features including Traveler mode.
                    </AlertDescription>
                </Alert>
            )}

            {/* Current Status Card */}
            {currentStatus && !profile?.is_kyc_verified && (
                <Card className="mb-6">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Current Submission Status</CardTitle>
                            {currentStatus.status === 'pending' && (
                                <Badge variant="secondary">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Pending Review
                                </Badge>
                            )}
                            {currentStatus.status === 'rejected' && (
                                <Badge variant="destructive">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Rejected
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label className="text-muted-foreground">Document Type</Label>
                            <p className="font-medium capitalize">{currentStatus.document_type?.replace('_', ' ')}</p>
                        </div>
                        <div>
                            <Label className="text-muted-foreground">Submitted On</Label>
                            <p className="font-medium">{new Date(currentStatus.created_at).toLocaleDateString()}</p>
                        </div>

                        {currentStatus.status === 'rejected' && currentStatus.admin_note && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Rejection Reason</AlertTitle>
                                <AlertDescription>{currentStatus.admin_note}</AlertDescription>
                            </Alert>
                        )}

                        {currentStatus.status === 'pending' && (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Under Review</AlertTitle>
                                <AlertDescription>
                                    Your documents are being reviewed by our admin team. This typically takes 1-3 business days.
                                </AlertDescription>
                            </Alert>
                        )}

                        {currentStatus.status === 'pending' && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDelete}
                                className="text-red-600"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Cancel Submission
                            </Button>
                        )}

                        {currentStatus.status === 'rejected' && (
                            <Button onClick={handleDelete} variant="outline">
                                Clear and Re-submit
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Upload Form - Only show if not verified and no pending submission */}
            {!profile?.is_kyc_verified && (!currentStatus || currentStatus.status === 'rejected') && (
                <Card>
                    <CardHeader>
                        <CardTitle>Upload Verification Documents</CardTitle>
                        <CardDescription>
                            Upload your identification documents to get verified and access Traveler mode
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Document Type Selection */}
                            <div className="space-y-2">
                                <Label>Document Type</Label>
                                <select
                                    value={documentType}
                                    onChange={(e) => setDocumentType(e.target.value)}
                                    className="w-full p-2 border rounded-md bg-background"
                                >
                                    <option value="national_id">National ID</option>
                                    <option value="passport">Passport</option>
                                    <option value="drivers_license">Driver's License</option>
                                </select>
                            </div>

                            <Separator />

                            {/* ID Front */}
                            <div className="space-y-2">
                                <Label htmlFor="idFront">
                                    ID Document (Front) <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="idFront"
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={(e) => setIdFront(e.target.files?.[0] || null)}
                                    required
                                />
                                {idFront && (
                                    <p className="text-sm text-green-600">
                                        <CheckCircle className="h-3 w-3 inline mr-1" />
                                        {idFront.name}
                                    </p>
                                )}
                            </div>

                            {/* ID Back */}
                            <div className="space-y-2">
                                <Label htmlFor="idBack">ID Document (Back) - Optional</Label>
                                <Input
                                    id="idBack"
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={(e) => setIdBack(e.target.files?.[0] || null)}
                                />
                                {idBack && (
                                    <p className="text-sm text-green-600">
                                        <CheckCircle className="h-3 w-3 inline mr-1" />
                                        {idBack.name}
                                    </p>
                                )}
                            </div>

                            {/* Proof of Address */}
                            <div className="space-y-2">
                                <Label htmlFor="proofOfAddress">
                                    Proof of Address - Optional
                                </Label>
                                <Input
                                    id="proofOfAddress"
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={(e) => setProofOfAddress(e.target.files?.[0] || null)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Utility bill, bank statement, or government letter (max 3 months old)
                                </p>
                                {proofOfAddress && (
                                    <p className="text-sm text-green-600">
                                        <CheckCircle className="h-3 w-3 inline mr-1" />
                                        {proofOfAddress.name}
                                    </p>
                                )}
                            </div>

                            {message && (
                                <Alert variant={message.includes('success') ? 'default' : 'destructive'}>
                                    {message.includes('success') ? (
                                        <CheckCircle className="h-4 w-4" />
                                    ) : (
                                        <AlertCircle className="h-4 w-4" />
                                    )}
                                    <AlertDescription>{message}</AlertDescription>
                                </Alert>
                            )}

                            <Button type="submit" disabled={uploading || !idFront} className="w-full">
                                {uploading ? (
                                    <>Uploading...</>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4 mr-2" />
                                        Submit Documents
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Info Card */}
            <Card className="mt-6 bg-blue-50 dark:bg-blue-950 border-blue-200">
                <CardHeader>
                    <CardTitle className="text-blue-800 dark:text-blue-200 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Important Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                    <p>• Documents uploaded are securely stored and only accessible to admin staff</p>
                    <p>• Accepted formats: JPG, PNG, PDF</p>
                    <p>• Ensure documents are clear, legible, and not expired</p>
                    <p>• Verification typically takes 1-3 business days</p>
                    <p>• You'll be notified once your verification is complete</p>
                </CardContent>
            </Card>
        </div>
    )
}
