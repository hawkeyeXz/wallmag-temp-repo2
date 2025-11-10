// contexts/AuthContext.tsx
"use client";

import { useRouter } from "next/navigation";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

interface User {
    id_number: string;
    name: string;
    email: string;
    two_factor_enabled: boolean;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAuthenticated: boolean;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Check authentication status on mount
    useEffect(() => {
        checkAuth();
    }, []);

    // Auto-refresh session every 6 days
    useEffect(() => {
        if (!user) return;

        const REFRESH_INTERVAL = 6 * 24 * 60 * 60 * 1000; // 6 days
        const intervalId = setInterval(refreshSession, REFRESH_INTERVAL);

        return () => clearInterval(intervalId);
    }, [user]);

    const checkAuth = async () => {
        try {
            // FIXED: Added credentials: "include" to send cookies
            const response = await fetch("/api/user/profile", {
                method: "GET",
                credentials: "include", // CRITICAL: This sends the session cookie
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error("Auth check failed:", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async () => {
        setLoading(true);
        await checkAuth();
    };

    const logout = async () => {
        try {
            const response = await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include", // Send session cookie
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                console.warn("Logout API failed, clearing local session anyway");
            }
        } catch (error) {
            console.error("Logout error:", error);
            // Continue with logout even if API fails
        } finally {
            // Clear user state
            setUser(null);

            // Clear any cached data
            if (typeof window !== "undefined") {
                sessionStorage.clear();
            }

            // Redirect to login
            router.push("/auth/login");
        }
    };

    const refreshSession = async () => {
        try {
            const response = await fetch("/api/auth/refresh-session", {
                method: "POST",
                credentials: "include", // Send session cookie
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                console.log("[Auth] Session refreshed successfully");
            } else {
                console.warn("[Auth] Session refresh failed, may need to re-login");
            }
        } catch (error) {
            console.error("[Auth] Session refresh failed:", error);
        }
    };

    const value = {
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshSession,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

// Protected Route Wrapper Component
export function ProtectedRoute({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/auth/login");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return <>{children}</>;
}
