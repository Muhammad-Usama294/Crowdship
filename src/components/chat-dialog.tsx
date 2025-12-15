"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Message } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Send, User } from "lucide-react"
import { useUser } from "@/contexts/user-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ChatDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    shipmentId: string
    otherUserId: string
    otherUserName: string
    otherUserAvatar?: string | null
    isShipmentDelivered?: boolean
    deliveredAt?: string | null
}

export function ChatDialog({
    open,
    onOpenChange,
    shipmentId,
    otherUserId,
    otherUserName,
    otherUserAvatar,
    isShipmentDelivered,
    deliveredAt
}: ChatDialogProps) {
    const { user } = useUser()
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    // Check if chat should be disabled (1 day after delivery)
    const isChatDisabled = isShipmentDelivered && deliveredAt
        ? (new Date().getTime() - new Date(deliveredAt).getTime() > 24 * 60 * 60 * 1000)
        : false

    useEffect(() => {
        if (open && shipmentId && user) {
            fetchMessages()
            subscribeToMessages()
        }

        return () => {
            supabase.channel(`chat:${shipmentId}`).unsubscribe()
        }
    }, [open, shipmentId, user])

    useEffect(() => {
        // Scroll to bottom on new messages
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages])

    const fetchMessages = async () => {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('shipment_id', shipmentId)
            .order('created_at', { ascending: true })

        if (!error && data) {
            setMessages(data)
            // Mark unread messages from other user as read
            const unreadIds = data
                .filter(m => m.sender_id === otherUserId && !m.is_read)
                .map(m => m.id)

            if (unreadIds.length > 0) {
                await supabase
                    .from('messages')
                    .update({ is_read: true })
                    .in('id', unreadIds)
            }
        }
    }

    const subscribeToMessages = () => {
        supabase
            .channel(`chat:${shipmentId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `shipment_id=eq.${shipmentId}`
                },
                (payload) => {
                    const newMessage = payload.new as Message
                    setMessages(prev => [...prev, newMessage])

                    // If message is from other user, mark as read immediately if chat is open
                    if (newMessage.sender_id === otherUserId) {
                        supabase
                            .from('messages')
                            .update({ is_read: true })
                            .eq('id', newMessage.id)
                    }
                }
            )
            .subscribe()
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || !user || isChatDisabled) return

        setLoading(true)
        const content = newMessage.trim()
        setNewMessage("") // Optimistic clear

        const { error } = await supabase
            .from('messages')
            .insert({
                shipment_id: shipmentId,
                sender_id: user.id,
                receiver_id: otherUserId,
                content: content
            })

        if (error) {
            console.error("Error sending message:", error)
            setNewMessage(content) // Restore on error
        }

        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] h-[80vh] sm:h-[600px] flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={otherUserAvatar || undefined} />
                            <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-semibold">{otherUserName}</div>
                            {isChatDisabled && (
                                <div className="text-xs text-muted-foreground font-normal">
                                    Chat closed (delivered &gt; 24h ago)
                                </div>
                            )}
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                        {messages.length === 0 && (
                            <div className="text-center text-muted-foreground py-10">
                                No messages yet. Start the conversation!
                            </div>
                        )}
                        {messages.map((message) => {
                            const isMe = message.sender_id === user?.id
                            return (
                                <div
                                    key={message.id}
                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg px-4 py-2 ${isMe
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted'
                                            }`}
                                    >
                                        <p className="text-sm">{message.content}</p>
                                        <span className="text-[10px] opacity-70 block text-right mt-1">
                                            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>

                <div className="p-4 border-t">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <Input
                            placeholder={isChatDisabled ? "Chat is closed" : "Type a message..."}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={loading || isChatDisabled}
                            className="flex-1"
                        />
                        <Button type="submit" disabled={loading || isChatDisabled || !newMessage.trim()} size="icon">
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}
