// components/profiledropdown.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, LogOut, Settings, Shield, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProfileDropdown() {
    const { user, logout, loading } = useAuth();
    const router = useRouter();
    const [loggingOut, setLoggingOut] = useState(false);

    const getInitials = (name: string) => {
        if (!name) return "U";
        return name
            .split(" ")
            .map(n => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await logout();
            // AuthContext handles redirect to /auth/login
        } catch (error) {
            console.error("Logout error:", error);
            // Force redirect even on error
            router.push("/auth/login");
        } finally {
            setLoggingOut(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <Button variant="outline" size="icon" className="rounded-full w-10 h-10 border-2 bg-transparent" disabled>
                <Loader2 className="w-4 h-4 animate-spin" />
            </Button>
        );
    }

    // Not authenticated - show login button
    if (!user) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full w-10 h-10 border-2 bg-transparent hover:bg-muted cursor-pointer"
                        aria-label="User menu"
                    >
                        <div className="w-full h-full rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                            <User className="w-5 h-5" />
                        </div>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal text-muted-foreground">Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem asChild>
                            <Link href="/auth/login" className="cursor-pointer">
                                <User className="mr-2 h-4 w-4" />
                                <span>Sign in</span>
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    // Authenticated - show full profile dropdown
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full w-10 h-10 border-2 hover:bg-muted bg-transparent cursor-pointer"
                    aria-label={`${user.name} profile menu`}
                >
                    <div className="w-full h-full rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                        {getInitials(user.name || "User")}
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                {/* User Info */}
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                        {user.id_number && (
                            <p className="text-xs leading-none text-muted-foreground mt-1">ID: {user.id_number}</p>
                        )}
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {/* Menu Items */}
                <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                        <Link href="/profile" className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>My Profile</span>
                        </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                        <Link href="/settings" className="cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </Link>
                    </DropdownMenuItem>

                    {/* Show 2FA badge if enabled */}
                    {user.two_factor_enabled && (
                        <DropdownMenuItem disabled className="text-xs">
                            <Shield className="mr-2 h-3 w-3 text-green-600" />
                            <span className="text-green-600">2FA Enabled</span>
                        </DropdownMenuItem>
                    )}
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                {/* Logout */}
                <DropdownMenuItem
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                    {loggingOut ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <LogOut className="mr-2 h-4 w-4" />
                    )}
                    <span>{loggingOut ? "Logging out..." : "Logout"}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
