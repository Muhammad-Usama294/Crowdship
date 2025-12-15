"use client"

import Link from "next/link"
import { useUser } from "@/contexts/user-context"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { MapPin, Box, Truck, UserCircle, LogOut, User, Wallet } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle" // Assuming ThemeToggle is an existing component

import { useRouter } from "next/navigation"

export function Navbar() {
    const { user, profile, isTravelerMode, toggleTravelerMode, signOut } = useUser()
    const router = useRouter()

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center">
                <div className="mr-8 hidden md:flex">
                    <Link href="/" className="mr-6 flex items-center space-x-2">
                        <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
                            <Box className="h-5 w-5" />
                        </div>
                        <span className="hidden font-bold sm:inline-block text-lg bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                            CrowdShip
                        </span>
                    </Link>
                </div>

                {/* Mobile Logo */}
                <div className="md:hidden mr-4">
                    <Link href="/" className="flex items-center space-x-2">
                        <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
                            <Box className="h-5 w-5" />
                        </div>
                        <span className="hidden sm:inline font-bold text-lg bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                            CrowdShip
                        </span>
                    </Link>
                </div>

                <div className="flex items-center gap-6 ml-auto">
                    {user && (
                        <div className="flex items-center gap-3 bg-secondary/50 p-1.5 rounded-full border border-border/50">
                            <Switch
                                id="traveler-mode"
                                checked={isTravelerMode}
                                onCheckedChange={toggleTravelerMode}
                                className="data-[state=checked]:bg-primary"
                            />
                            <Label htmlFor="traveler-mode" className="cursor-pointer flex items-center gap-2 font-medium text-sm pr-3 select-none">
                                {isTravelerMode ? (
                                    <><Truck className="h-4 w-4 text-primary" /> <span className="hidden sm:inline">Traveler</span></>
                                ) : (
                                    <><MapPin className="h-4 w-4 text-primary" /> <span className="hidden sm:inline">Sender</span></>
                                )}
                            </Label>
                        </div>
                    )}

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        {user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || user.email || ""} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                {profile?.full_name?.charAt(0) || user.email?.charAt(0) || "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{profile?.full_name || 'User'}</p>
                                            <p className="text-xs leading-none text-muted-foreground">
                                                {user.email}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => router.push('/account')}>
                                        <User className="mr-2 h-4 w-4" />
                                        <span>Profile</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => router.push('/sender/dashboard')}>
                                        <MapPin className="mr-2 h-4 w-4" />
                                        <span>Sender Dashboard</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                        if (!isTravelerMode) toggleTravelerMode()
                                        router.push('/traveler/dashboard')
                                    }}>
                                        <Truck className="mr-2 h-4 w-4" />
                                        <span>Traveler Dashboard</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => router.push('/wallet')}>
                                        <Wallet className="mr-2 h-4 w-4" />
                                        <span>Wallet</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Log out</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Link href="/login">
                                <Button className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/20">Sign In</Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}
