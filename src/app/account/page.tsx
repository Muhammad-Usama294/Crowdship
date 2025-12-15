"use client"

import { useEffect, useState } from "react"
import { useUser } from "@/contexts/user-context"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { updateProfile, updatePassword, uploadAvatar, deleteAccount } from "./actions"
import { User, Lock, UserCircle, Trash2, Upload, CheckCircle, XCircle, AlertCircle, Shield, Camera } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"

export default function AccountPage() {
    const { user, profile, refreshProfile } = useUser()
    const router = useRouter()
    const supabase = createClient()
    const { toast } = useToast()

    // Profile state
    const [fullName, setFullName] = useState("")
    const [phoneNumber, setPhoneNumber] = useState("")
    const [profileLoading, setProfileLoading] = useState(false)
    const [profileMessage, setProfileMessage] = useState("")

    // Password state
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [passwordLoading, setPasswordLoading] = useState(false)
    const [passwordMessage, setPasswordMessage] = useState("")

    // Avatar state
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = useState("")
    const [avatarLoading, setAvatarLoading] = useState(false)

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || "")
            setPhoneNumber(profile.phone_number || "+92")
            setAvatarPreview(profile.avatar_url || "")
        }
    }, [profile])

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setProfileLoading(true)
        setProfileMessage("")

        const formData = new FormData()
        formData.append('fullName', fullName)
        formData.append('phoneNumber', phoneNumber)

        const result = await updateProfile(formData)

        if (result.error) {
            setProfileMessage(result.error)
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.error
            })
        } else {
            setProfileMessage("Profile updated successfully!")
            toast({
                title: 'Success',
                description: 'Profile updated successfully!'
            })
            await refreshProfile()
            setTimeout(() => {
                router.refresh()
            }, 1000)
        }

        setProfileLoading(false)
    }

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setPasswordLoading(true)
        setPasswordMessage("")

        if (newPassword !== confirmPassword) {
            setPasswordMessage("New passwords don't match")
            setPasswordLoading(false)
            return
        }

        if (newPassword.length < 6) {
            setPasswordMessage("Password must be at least 6 characters")
            setPasswordLoading(false)
            return
        }

        const result = await updatePassword(currentPassword, newPassword)

        if (result.error) {
            setPasswordMessage(result.error)
            toast({ variant: 'destructive', title: 'Error', description: result.error })
        } else {
            setPasswordMessage("Password updated successfully!")
            toast({ title: 'Success', description: 'Password updated successfully!' })
            setCurrentPassword("")
            setNewPassword("")
            setConfirmPassword("")
        }

        setPasswordLoading(false)
    }

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setAvatarFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleAvatarUpload = async () => {
        if (!avatarFile) return

        setAvatarLoading(true)
        const formData = new FormData()
        formData.append('avatar', avatarFile)

        const result = await uploadAvatar(formData)

        if (result.error) {
            toast({ variant: 'destructive', title: 'Error', description: result.error })
        } else {
            toast({ title: 'Success', description: 'Avatar updated successfully!' })
            setAvatarFile(null)
            await refreshProfile()
            setTimeout(() => {
                router.refresh()
            }, 1000)
        }

        setAvatarLoading(false)
    }

    const handleDeleteAccount = async () => {
        const result = await deleteAccount()

        if (result.error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Error deleting account: " + result.error
            })
        } else {
            router.push('/')
        }
    }

    if (!user) {
        return (
            <div className="container py-20 text-center">
                <h1 className="text-2xl font-bold">Please log in</h1>
                <p className="text-muted-foreground mt-2">To view your account settings, you need to be authenticated.</p>
                <Link href="/login" className="mt-4 inline-block text-primary hover:underline">Go to Login</Link>
            </div>
        )
    }

    return (
        <div className="container py-10 max-w-4xl min-h-[calc(100vh-4rem)]">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-4 mb-8"
            >
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <UserCircle className="h-7 w-7" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">Account Settings</h1>
                    <p className="text-muted-foreground">Manage your profile, security, and preferences.</p>
                </div>
            </motion.div>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/50 p-1 rounded-xl h-12">
                    <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-300">
                        <User className="h-4 w-4 mr-2" />
                        Profile
                    </TabsTrigger>
                    <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-300">
                        <Shield className="h-4 w-4 mr-2" />
                        Security
                    </TabsTrigger>
                    <TabsTrigger value="account" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-300">
                        <UserCircle className="h-4 w-4 mr-2" />
                        Account Status
                    </TabsTrigger>
                </TabsList>

                {/* Profile Tab */}
                <TabsContent value="profile" className="space-y-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Card className="border-primary/10 shadow-lg bg-card/60 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle>Profile Information</CardTitle>
                                <CardDescription>
                                    Update your personal information and profile picture
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                {/* Avatar Section */}
                                <div className="flex flex-col md:flex-row items-center gap-8 pb-6 border-b border-border/50">
                                    <div className="relative group">
                                        <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                                            <AvatarImage src={avatarPreview} alt={fullName} />
                                            <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                                                {fullName?.charAt(0) || "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <Label htmlFor="avatar" className="absolute bottom-0 right-0 bg-primary hover:bg-primary/90 text-white p-2 rounded-full shadow-lg cursor-pointer transition-transform hover:scale-105">
                                            <Camera className="h-5 w-5" />
                                        </Label>
                                        <Input
                                            id="avatar"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAvatarChange}
                                            className="hidden"
                                        />
                                    </div>
                                    <div className="flex-1 text-center md:text-left space-y-4">
                                        <div>
                                            <h3 className="font-semibold text-lg">{fullName || 'User'}</h3>
                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                        </div>
                                        {avatarFile && (
                                            <Button
                                                onClick={handleAvatarUpload}
                                                disabled={avatarLoading}
                                                size="sm"
                                                className="animate-in fade-in zoom-in"
                                            >
                                                {avatarLoading ? "Uploading..." : "Save New Picture"}
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Profile Form */}
                                <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-xl">
                                    <div className="grid gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={user.email || ""}
                                                disabled
                                                className="bg-muted/50"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="fullName">Full Name</Label>
                                            <Input
                                                id="fullName"
                                                type="text"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                placeholder="Enter your full name"
                                                className="bg-background/50 focus:bg-background transition-colors"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="phoneNumber">Phone Number</Label>
                                            <Input
                                                id="phoneNumber"
                                                type="tel"
                                                value={phoneNumber}
                                                onChange={(e) => {
                                                    let val = e.target.value
                                                    if (!val.startsWith('+92')) {
                                                        const nums = val.replace(/\D/g, '')
                                                        if (nums.startsWith('92')) val = '+' + nums
                                                        else if (nums.startsWith('03')) val = '+92' + nums.substring(1)
                                                        else val = '+92'
                                                    }
                                                    const clean = '+92' + val.substring(3).replace(/\D/g, '').slice(0, 10)
                                                    setPhoneNumber(clean)
                                                }}
                                                placeholder="+92 300 1234567"
                                                className="bg-background/50 focus:bg-background transition-colors"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4 flex items-center justify-between">
                                        {profileMessage && (
                                            <div className={`text-sm ${profileMessage.includes('success') ? 'text-green-600' : 'text-destructive'} animate-in fade-in`}>
                                                {profileMessage}
                                            </div>
                                        )}
                                        <Button type="submit" disabled={profileLoading} className="ml-auto min-w-[120px]">
                                            {profileLoading ? "Saving..." : "Save Changes"}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </motion.div>
                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="security">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Card className="border-primary/10 shadow-lg bg-card/60 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle>Password & Security</CardTitle>
                                <CardDescription>
                                    Update your password to keep your account secure
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-xl">
                                    <div className="space-y-2">
                                        <Label htmlFor="currentPassword">Current Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="currentPassword"
                                                type="password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                placeholder="Enter current password"
                                                required
                                                className="pl-9"
                                            />
                                            <Lock className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="newPassword">New Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="newPassword"
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="Enter new password"
                                                required
                                                className="pl-9"
                                            />
                                            <Lock className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                                        </div>
                                        <p className="text-xs text-muted-foreground ml-1">
                                            Must be at least 6 characters
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="confirmPassword"
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Re-enter new password"
                                                required
                                                className="pl-9"
                                            />
                                            <Lock className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                                        </div>
                                    </div>

                                    <div className="pt-4 flex items-center justify-between">
                                        {passwordMessage && (
                                            <div className={`text-sm ${passwordMessage.includes('success') ? 'text-green-600' : 'text-destructive'} animate-in fade-in`}>
                                                {passwordMessage}
                                            </div>
                                        )}
                                        <Button type="submit" disabled={passwordLoading} className="ml-auto min-w-[140px]">
                                            {passwordLoading ? "Updating..." : "Update Password"}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </motion.div>
                </TabsContent>

                {/* Account Tab */}
                <TabsContent value="account">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                    >
                        <Card className="border-primary/10 shadow-lg bg-card/60 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle>Account Status</CardTitle>
                                <CardDescription>
                                    View your account details and verification status
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                                        <Label className="text-muted-foreground text-xs uppercase tracking-wider">KYC Status</Label>
                                        <div className="mt-2 flex items-center gap-2">
                                            {profile?.is_kyc_verified ? (
                                                <Badge className="bg-green-500 hover:bg-green-600 border-0 h-8 px-3 text-sm">
                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                    Verified
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-0 h-8 px-3 text-sm">
                                                    <AlertCircle className="h-4 w-4 mr-2" />
                                                    Not Verified
                                                </Badge>
                                            )}
                                        </div>
                                        {!profile?.is_kyc_verified && (
                                            <p className="text-xs text-muted-foreground mt-2">
                                                Complete verification to become a Traveler.
                                            </p>
                                        )}
                                    </div>

                                    <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                                        <Label className="text-muted-foreground text-xs uppercase tracking-wider">Trust Score</Label>
                                        <div className="mt-2 text-3xl font-bold text-primary">
                                            {profile?.trust_score || 0}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Score increases with successful deliveries.
                                        </p>
                                    </div>

                                    <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                                        <Label className="text-muted-foreground text-xs uppercase tracking-wider">Member Since</Label>
                                        <div className="mt-2 font-medium">
                                            {new Date(profile?.created_at || "").toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </div>
                                    </div>

                                    <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                                        <Label className="text-muted-foreground text-xs uppercase tracking-wider">Email</Label>
                                        <div className="mt-2 font-medium break-all">
                                            {user.email}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/10">
                            <CardHeader>
                                <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5" />
                                    Danger Zone
                                </CardTitle>
                                <CardDescription>
                                    Irreversible actions for your account
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="font-medium">Delete Account</p>
                                        <p className="text-sm text-muted-foreground">Permanently delete your account and all data.</p>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete your
                                                    account and remove all your data including shipment history and wallet balance.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={handleDeleteAccount}
                                                    className="bg-red-600 hover:bg-red-700"
                                                >
                                                    Yes, delete my account
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
