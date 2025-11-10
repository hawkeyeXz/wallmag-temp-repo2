// hooks/useAutoRefresh.ts
"use client";

import { useEffect, useRef } from "react";

interface UseAutoRefreshOptions {
    enabled?: boolean;
    interval?: number; // milliseconds
    onRefresh?: () => void;
    onError?: (error: Error) => void;
}

/**
 * Hook to automatically refresh session tokens
 * Default: Refresh every 6 days (token lasts 7 days)
 */
export function useAutoRefresh(options: UseAutoRefreshOptions = {}) {
    const {
        enabled = true,
        interval = 6 * 24 * 60 * 60 * 1000, // 6 days
        onRefresh,
        onError,
    } = options;

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!enabled) return;

        const refreshSession = async () => {
            try {
                const response = await fetch("/api/auth/refresh-session", {
                    method: "POST",
                    credentials: "include",
                });

                if (response.ok) {
                    console.log("[Session] Auto-refresh successful");
                    onRefresh?.();
                } else {
                    throw new Error("Session refresh failed");
                }
            } catch (error) {
                console.error("[Session] Auto-refresh failed:", error);
                onError?.(error as Error);
            }
        };

        // Initial refresh check (on mount)
        refreshSession();

        // Set up periodic refresh
        intervalRef.current = setInterval(refreshSession, interval);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [enabled, interval, onRefresh, onError]);
}

// Example usage in a layout or dashboard component:
//
// export default function DashboardLayout({ children }) {
//     useAutoRefresh({
//         enabled: true,
//         onRefresh: () => console.log("Session refreshed"),
//         onError: () => router.push("/auth/login"),
//     });
//
//     return <div>{children}</div>;
// }
