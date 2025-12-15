"use client"

import { useEffect, useState } from "react"
import { UserProfile } from "@/types/database"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Shield, Star, UserX, UserCheck, RefreshCw } from "lucide-react"
import { toggleUserSuspension, getUsers, syncUsers } from "../actions"
import { useToast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function UserManagementPage() {
    const [users, setUsers] = useState<UserProfile[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [isSyncing, setIsSyncing] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        fetchUsers()
    }, [])

    async function fetchUsers() {
        setIsLoading(true)
        const result = await getUsers()

        if (result.error) {
            console.error(result.error)
            toast({
                variant: "destructive",
                title: "Error fetching users",
                description: result.error
            })
        } else {
            setUsers(result.data as UserProfile[] || [])
        }
        setIsLoading(false)
    }

    const handleSync = async () => {
        setIsSyncing(true)
        toast({ title: "Syncing users..." })

        const result = await syncUsers()

        if (result.error) {
            toast({ variant: "destructive", title: "Sync Failed", description: result.error })
        } else {
            toast({ title: "Sync Complete", description: `Processed ${result.count} users.` })
            fetchUsers()
        }
        setIsSyncing(false)
    }

    const handleToggleSuspension = async (userId: string, currentStatus: boolean, userName: string) => {
        const action = currentStatus ? "Unsuspend" : "Suspend"

        // Optimistic update
        setUsers(prev => prev.map(u =>
            u.id === userId ? { ...u, is_suspended: !currentStatus } : u
        ))

        toast({
            title: `${action}ing User...`,
            description: `Processing action for ${userName}`
        })

        const result = await toggleUserSuspension(userId, !currentStatus)

        if (result.error) {
            // Revert on error
            setUsers(prev => prev.map(u =>
                u.id === userId ? { ...u, is_suspended: currentStatus } : u
            ))
            toast({
                variant: "destructive",
                title: "Action Failed",
                description: result.error
            })
        } else {
            toast({
                title: "Success",
                description: `User has been ${action.toLowerCase()}ed.`
            })
        }
    }

    const filteredUsers = users.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone_number?.includes(searchTerm)
    )

    function formatPhoneNumber(phone: string | null | undefined) {
        if (!phone) return 'No phone'
        const clean = phone.replace(/[^\d+]/g, '')

        let normalized = clean
        if (normalized.startsWith('03')) {
            normalized = '+92' + normalized.substring(1)
        } else if (normalized.startsWith('3') && normalized.length === 10) {
            normalized = '+92' + normalized
        }

        const match = normalized.match(/^(\+92)(\d{3})(\d{7})$/)
        if (match) {
            return `${match[1]} ${match[2]} ${match[3]}`
        }

        return phone
    }

    return (
        <div className="container py-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold">User Management</h1>
                    <p className="text-muted-foreground">Monitor users, view ratings, and manage access.</p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Button variant="outline" size="icon" onClick={fetchUsers} title="Refresh List">
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleSync}
                        disabled={isSyncing}
                    >
                        {isSyncing ? "Syncing..." : "Sync Database"}
                    </Button>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Registered Users ({filteredUsers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {isLoading ? (
                            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">No users found.</div>
                        ) : (
                            <div className="grid gap-4">
                                {filteredUsers.map(user => (
                                    <div key={user.id} className={`flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg hover:bg-accent/30 transition-colors ${user.is_suspended ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900' : ''}`}>
                                        <div className="flex items-center gap-4 mb-4 md:mb-0">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={user.avatar_url || undefined} />
                                                <AvatarFallback>{user.full_name?.[0] || 'U'}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold">{user.full_name || 'Unknown'}</h3>

                                                    <span className="text-xs capitalize border px-2 py-0.5 rounded-full">
                                                        {user.role}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                                    <span>{formatPhoneNumber(user.phone_number)}</span>
                                                    <span className="flex items-center gap-1">
                                                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                                        {user.average_rating?.toFixed(1) || '0.0'} ({user.total_ratings})
                                                    </span>
                                                    <span>Trust: {user.trust_score}%</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 w-full md:w-auto">
                                            {user.is_suspended ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full md:w-auto border-green-200 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950"
                                                    onClick={() => handleToggleSuspension(user.id, true, user.full_name || 'User')}
                                                >
                                                    <UserCheck className="mr-2 h-4 w-4" />
                                                    Unsubspend
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="w-full md:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                                    onClick={() => handleToggleSuspension(user.id, false, user.full_name || 'User')}
                                                >
                                                    <UserX className="mr-2 h-4 w-4" />
                                                    Suspend
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
