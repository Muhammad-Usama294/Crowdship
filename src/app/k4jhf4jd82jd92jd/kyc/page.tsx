"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { KYCDocument, UserProfile } from "@/types/database"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X, FileText, User } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { approveKYC, rejectKYC, getKYCDocuments } from "../actions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

export default function KYCDashboard() {
    const [kycDocs, setKycDocs] = useState<(KYCDocument & { users: UserProfile })[]>([])
    const [activeTab, setActiveTab] = useState("pending")
    const [rejectNote, setRejectNote] = useState("")
    const [selectedDoc, setSelectedDoc] = useState<string | null>(null)
    const supabase = createClient()
    const router = useRouter()
    const { toast } = useToast()

    useEffect(() => {
        fetchKYC()
    }, [activeTab])

    async function fetchKYC() {
        console.log('[KYC Page] Fetching KYC docs with activeTab:', activeTab)
        const result = await getKYCDocuments(activeTab !== "all" ? activeTab : undefined)

        console.log('[KYC Page] Received result:', {
            hasError: !!result.error,
            error: result.error,
            dataLength: result.data?.length || 0
        })

        if (result.error) {
            console.error('[KYC Page] Error:', result.error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to fetch KYC documents: " + result.error
            })
        } else if (result.data) {
            console.log('[KYC Page] Setting KYC docs:', result.data.length, 'documents')
            setKycDocs(result.data as any)
        }
    }

    async function handleApprove(id: string, userId: string) {
        console.log('Approving KYC:', id, userId)
        const result = await approveKYC(id, userId)
        console.log('Approval result:', result)

        if (result.error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Error: " + result.error
            })
        } else {
            toast({
                title: "Success",
                description: "KYC approved successfully!"
            })
            // Force full page reload to update the list
            setTimeout(() => window.location.reload(), 1000)
        }
    }

    async function handleReject(id: string) {
        if (!rejectNote.trim()) {
            toast({
                variant: "destructive",
                title: "Correction Needed",
                description: "Please provide a reason for rejection"
            })
            return
        }

        const result = await rejectKYC(id, rejectNote)
        if (result.error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Error: " + result.error
            })
        } else {
            toast({
                title: "Rejected",
                description: "KYC submission rejected"
            })
            // Force full page reload
            setTimeout(() => window.location.reload(), 1000)
        }
    }

    return (
        <div className="container py-10">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">KYC Management</h1>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full max-w-md grid-cols-4">
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="approved">Approved</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>KYC Verifications</CardTitle>
                            <CardDescription>
                                {activeTab === "pending" && "Review pending user documents"}
                                {activeTab === "approved" && "View approved verifications"}
                                {activeTab === "rejected" && "View rejected submissions"}
                                {activeTab === "all" && "All KYC submissions"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {kycDocs.length === 0 ? (
                                <p className="text-muted-foreground">No {activeTab !== "all" ? activeTab : ""} verifications.</p>
                            ) : (
                                <div className="space-y-6">
                                    {kycDocs.map((doc) => (
                                        <div key={doc.id} className="border p-6 rounded-lg space-y-4">
                                            {/* User Info */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <User className="h-5 w-5 text-muted-foreground" />
                                                    <div>
                                                        <p className="font-medium">{doc.users?.full_name || "Unknown User"}</p>
                                                        <p className="text-sm text-muted-foreground">{doc.users?.phone_number}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <Badge variant={
                                                        doc.status === 'pending' ? 'secondary' :
                                                            doc.status === 'approved' ? 'default' : 'destructive'
                                                    }>
                                                        {doc.status}
                                                    </Badge>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {new Date(doc.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Document Type */}
                                            <div>
                                                <Label className="text-muted-foreground">Document Type</Label>
                                                <p className="font-medium capitalize">{doc.document_type?.replace('_', ' ')}</p>
                                            </div>

                                            {/* Document Images */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {/* ID Front */}
                                                <div>
                                                    <Label className="text-xs text-muted-foreground">ID Front</Label>
                                                    <a href={doc.document_url} target="_blank" rel="noopener noreferrer" className="block">
                                                        <div className="border rounded-lg p-2 hover:bg-accent transition-colors cursor-pointer">
                                                            <img
                                                                src={doc.document_url}
                                                                alt="ID Front"
                                                                className="w-full h-40 object-cover rounded"
                                                            />
                                                            <p className="text-xs text-center mt-2 text-primary hover:underline">
                                                                View Full Size
                                                            </p>
                                                        </div>
                                                    </a>
                                                </div>

                                                {/* ID Back */}
                                                {doc.document_url_back && (
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">ID Back</Label>
                                                        <a href={doc.document_url_back} target="_blank" rel="noopener noreferrer" className="block">
                                                            <div className="border  rounded-lg p-2 hover:bg-accent transition-colors cursor-pointer">
                                                                <img
                                                                    src={doc.document_url_back}
                                                                    alt="ID Back"
                                                                    className="w-full h-40 object-cover rounded"
                                                                />
                                                                <p className="text-xs text-center mt-2 text-primary hover:underline">
                                                                    View Full Size
                                                                </p>
                                                            </div>
                                                        </a>
                                                    </div>
                                                )}

                                                {/* Proof of Address */}
                                                {doc.proof_of_address_url && (
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">Proof of Address</Label>
                                                        <a href={doc.proof_of_address_url} target="_blank" rel="noopener noreferrer" className="block">
                                                            <div className="border rounded-lg p-2 hover:bg-accent transition-colors cursor-pointer">
                                                                <img
                                                                    src={doc.proof_of_address_url}
                                                                    alt="Proof of Address"
                                                                    className="w-full h-40 object-cover rounded"
                                                                />
                                                                <p className="text-xs text-center mt-2 text-primary hover:underline">
                                                                    View Full Size
                                                                </p>
                                                            </div>
                                                        </a>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Admin Note for Rejected */}
                                            {doc.status === 'rejected' && doc.admin_note && (
                                                <div className="bg-red-50 dark:bg-red-950 p-3 rounded-md">
                                                    <Label className="text-xs text-red-800 dark:text-red-200">Rejection Reason</Label>
                                                    <p className="text-sm text-red-700 dark:text-red-300">{doc.admin_note}</p>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            {doc.status === 'pending' && (
                                                <div className="flex gap-2 pt-4 border-t">
                                                    <Dialog open={selectedDoc === doc.id} onOpenChange={(open) => !open && setSelectedDoc(null)}>
                                                        <DialogTrigger asChild>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => setSelectedDoc(doc.id)}
                                                            >
                                                                <X className="h-4 w-4 mr-1" /> Reject
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>Reject KYC Submission</DialogTitle>
                                                                <DialogDescription>
                                                                    Please provide a reason for rejection. The user will see this message.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <Label htmlFor="note">Rejection Reason</Label>
                                                                    <Textarea
                                                                        id="note"
                                                                        value={rejectNote}
                                                                        onChange={(e) => setRejectNote(e.target.value)}
                                                                        placeholder="e.g., Document is not clear, please upload a higher quality image"
                                                                        rows={4}
                                                                    />
                                                                </div>
                                                                <div className="flex gap-2 justify-end">
                                                                    <Button variant="outline" onClick={() => setSelectedDoc(null)}>
                                                                        Cancel
                                                                    </Button>
                                                                    <Button variant="destructive" onClick={() => handleReject(doc.id)}>
                                                                        Reject Submission
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>

                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleApprove(doc.id, doc.user_id)}
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        <Check className="h-4 w-4 mr-1" /> Approve
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
