// components/DebugAuth.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

export function DebugAuth() {
    const { user, loading, isAuthenticated } = useAuth();
    const [debugInfo, setDebugInfo] = useState<any>(null);
    const [testResult, setTestResult] = useState<string>("");

    const checkCookies = () => {
        const cookies = document.cookie;
        setDebugInfo({ cookies });
        setTestResult(cookies ? "Cookies found: " + cookies : "No cookies found");
    };

    const testProfileAPI = async () => {
        try {
            const response = await fetch("/api/user/profile", {
                method: "GET",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();
            setDebugInfo({
                status: response.status,
                data,
                headers: Object.fromEntries(response.headers.entries()),
            });
            setTestResult(response.ok ? "✅ Profile API Success" : "❌ Profile API Failed");
        } catch (error) {
            setDebugInfo({ error: String(error) });
            setTestResult("❌ Network Error");
        }
    };

    const testLoginAPI = async () => {
        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id_number: "test123",
                    password: "Test@1234",
                }),
            });

            const data = await response.json();
            setDebugInfo({
                status: response.status,
                data,
                setCookie: response.headers.get("set-cookie"),
            });
            setTestResult(response.ok ? "✅ Login Success" : "❌ Login Failed");
        } catch (error) {
            setDebugInfo({ error: String(error) });
            setTestResult("❌ Network Error");
        }
    };

    // Only show in development
    if (process.env.NODE_ENV === "production") {
        return null;
    }

    return (
        <Card className="fixed bottom-4 right-4 w-96 max-h-[600px] overflow-auto z-50 shadow-lg">
            <CardHeader>
                <CardTitle className="text-sm">🐛 Auth Debug Panel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
                <div className="space-y-1">
                    <p>
                        <strong>Loading:</strong> {loading ? "Yes" : "No"}
                    </p>
                    <p>
                        <strong>Authenticated:</strong> {isAuthenticated ? "Yes" : "No"}
                    </p>
                    <p>
                        <strong>User:</strong> {user ? user.name : "None"}
                    </p>
                </div>

                <div className="space-y-2 pt-2 border-t">
                    <Button onClick={checkCookies} size="sm" className="w-full">
                        Check Cookies
                    </Button>
                    <Button onClick={testProfileAPI} size="sm" className="w-full">
                        Test Profile API
                    </Button>
                    <Button onClick={testLoginAPI} size="sm" className="w-full" variant="secondary">
                        Test Login API
                    </Button>
                </div>

                {testResult && (
                    <div className="mt-2 p-2 bg-muted rounded">
                        <p className="font-semibold">{testResult}</p>
                    </div>
                )}

                {debugInfo && (
                    <div className="mt-2 p-2 bg-muted rounded max-h-40 overflow-auto">
                        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(debugInfo, null, 2)}</pre>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
