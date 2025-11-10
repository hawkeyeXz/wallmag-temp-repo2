// lib/frontend/auth.ts
// Frontend utilities for authentication

// Helper to get cookie value
function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop()?.split(";").shift() || null;
    }
    return null;
}

// 1. OTP Verification with CSRF
export async function verifyOTP(otp: string) {
    const csrfToken = getCookie("otp_csrf_token");

    if (!csrfToken) {
        throw new Error("Session expired. Please request a new code.");
    }

    const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            otp,
            csrf_token: csrfToken,
        }),
        credentials: "include",
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Verification failed");
    }

    return response.json();
}

// 2. Auto Session Refresh
export async function setupAutoRefresh() {
    // Refresh session every 6 days (token lasts 7 days)
    const REFRESH_INTERVAL = 6 * 24 * 60 * 60 * 1000; // 6 days in ms

    setInterval(async () => {
        try {
            const response = await fetch("/api/auth/refresh-session", {
                method: "POST",
                credentials: "include",
            });

            if (response.ok) {
                console.log("Session refreshed automatically");
            }
        } catch (error) {
            console.error("Auto-refresh failed:", error);
        }
    }, REFRESH_INTERVAL);
}

// 3. Protected API Call
export async function fetchProtectedData(endpoint: string) {
    const response = await fetch(endpoint, {
        method: "GET",
        credentials: "include", // Important: sends session cookie
    });

    if (response.status === 401) {
        // Session expired, redirect to login
        window.location.href = "/login";
        throw new Error("Session expired");
    }

    if (!response.ok) {
        throw new Error("Failed to fetch data");
    }

    return response.json();
}

// 4. Logout
export async function logout() {
    try {
        await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include",
        });
    } catch (error) {
        console.error("Logout error:", error);
    } finally {
        // Always redirect to login
        window.location.href = "/login";
    }
}

// 5. Enable 2FA
export async function enable2FA() {
    const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        credentials: "include",
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to enable 2FA");
    }

    return response.json(); // Returns backup codes
}

// 6. Check Auth Status
export async function checkAuthStatus() {
    try {
        const response = await fetch("/api/user/profile", {
            method: "GET",
            credentials: "include",
        });

        return {
            authenticated: response.ok,
            user: response.ok ? await response.json() : null,
        };
    } catch (error) {
        return {
            authenticated: false,
            user: null,
        };
    }
}

// React Hook Example
// import { useEffect, useState } from 'react';
//
// export function useAuth() {
//     const [user, setUser] = useState(null);
//     const [loading, setLoading] = useState(true);
//
//     useEffect(() => {
//         checkAuthStatus()
//             .then(({ authenticated, user }) => {
//                 if (authenticated) {
//                     setUser(user);
//                     setupAutoRefresh(); // Start auto-refresh
//                 }
//             })
//             .finally(() => setLoading(false));
//     }, []);
//
//     return { user, loading, logout };
// }
