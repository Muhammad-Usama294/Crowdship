"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Loader2, MessageCircle, User } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ChatsListDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    shipmentId: string
    currentUserId: string
    onSelectUser: (user: { id: string, name: string, avatar: string | null }) => void
}

interface ChatThread {
    userId: string
    user: {
        full_name: string
        avatar_url: string | null
    }
    lastMessage: string
    lastMessageAt: string
}

export function ChatsListDialog({
    open,
    onOpenChange,
    shipmentId,
    currentUserId,
    onSelectUser
}: ChatsListDialogProps) {
    const [threads, setThreads] = useState<ChatThread[]>([])
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        if (open && shipmentId) {
            fetchThreads()
        }
    }, [open, shipmentId])

    const fetchThreads = async () => {
        setLoading(true)

        // 1. Fetch all messages for this shipment
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .eq('shipment_id', shipmentId)
            .order('created_at', { ascending: false })

        if (error || !messages) {
            console.error(error)
            setLoading(false)
            return
        }

        // 2. Group by other user (sender or receiver)
        const threadMap = new Map<string, { lastMessage: string, lastMessageAt: string }>()

        messages.forEach(msg => {
            const otherId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id
            if (!threadMap.has(otherId)) {
                threadMap.set(otherId, {
                    lastMessage: msg.content,
                    lastMessageAt: msg.created_at
                })
            }
        })

        if (threadMap.size === 0) {
            setThreads([])
            setLoading(false)
            return
        }

        // 3. Fetch user details for these threads
        const userIds = Array.from(threadMap.keys())
        const { data: users } = await supabase
            .from('users')
            .select('id, full_name, avatar_url')
            .in('id', userIds)

        if (users) {
            const threadData: ChatThread[] = users.map(u => ({
                userId: u.id,
                user: {
                    full_name: u.full_name || 'Unknown User',
                    avatar_url: u.avatar_url
                },
                ...threadMap.get(u.id)!
            }))
            // Sort by most recent
            threadData.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
            setThreads(threadData)
        }

        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Conversations</DialogTitle>
                    <DialogDescription>
                        Select a traveler to chat with.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[60vh] overflow-y-auto space-y-2 py-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : threads.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p>No messages yet.</p>
                        </div>
                    ) : (
                        threads.map(thread => (
                            <Button
                                key={thread.userId}
                                variant="outline"
                                className="w-full h-auto flex items-center justify-start gap-3 p-3"
                                onClick={() => onSelectUser({
                                    id: thread.userId,
                                    name: thread.user.full_name,
                                    avatar: thread.user.avatar_url
                                })}
                            >
                                <Avatar className="h-10 w-10 border">
                                    <AvatarImage src={thread.user.avatar_url || undefined} />
                                    <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-left overflow-hidden">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <span className="font-semibold truncate">{thread.user.full_name}</span>
                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                            {formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate font-normal">
                                        {thread.lastMessage}
                                    </p>
                                </div>
                            </Button>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
