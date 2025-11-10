// app/auth/login/page.tsx
"use client";

import { AlertCircle, BookOpen, Eye, EyeOff, Loader2, LogIn, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const sanitizeInput = (input: string): string => {
    return input
        .trim()
        .replace(/[<>\"']/g, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+=/gi, "")
        .slice(0, 100);
};

export default function LoginPage() {
    const router = useRouter();
    const [idNumber, setIdNumber] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // SECURITY: Track rate limiting and lockout
    const [accountLocked, setAccountLocked] = useState(false);
    const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
    const [attemptCount, setAttemptCount] = useState(0);

    // Timer for account lock
    useEffect(() => {
        if (lockTimeRemaining <= 0) {
            setAccountLocked(false);
            return;
        }
        const timer = setInterval(() => setLockTimeRemaining(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [lockTimeRemaining]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const handleLogin = useCallback(async () => {
        setError("");
        const sanitizedId = sanitizeInput(idNumber);
        const sanitizedPassword = sanitizeInput(password);

        if (!sanitizedId || !sanitizedPassword) {
            setError("Please fill in all fields");
            return;
        }

        if (!/^[a-zA-Z0-9]{4,20}$/.test(sanitizedId)) {
            setError("Invalid ID format");
            return;
        }

        if (accountLocked) {
            setError(`Account locked. Try again in ${formatTime(lockTimeRemaining)}`);
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ id_number: sanitizedId, password: sanitizedPassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                // SECURITY: Handle rate limiting
                if (response.status === 429) {
                    if (data.locked_until) {
                        setAccountLocked(true);
                        setLockTimeRemaining(data.locked_until);
                    }
                    throw new Error(data.message || "Too many attempts. Please try again later.");
                }

                // SECURITY: Increment attempt counter on failure
                setAttemptCount(prev => prev + 1);
                throw new Error(data.message || "Login failed");
            }

            // SECURITY: Clear attempt counter on success
            setAttemptCount(0);

            // Redirect based on role
            if (data.role === "admin") {
                router.push("/admin"); // Admin goes to /admin
            } else {
                window.location.href = "/";
                // router.push("/"); // Regular users go to home
                // router.refresh(); // Refresh to load user-specific data
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [idNumber, password, router, accountLocked, lockTimeRemaining]);

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !loading && !accountLocked) handleLogin();
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-slate-900 rounded-lg">
                                <BookOpen className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900">Apodartho</h1>
                        </div>
                        <p className="text-slate-600 text-sm">Wall Magazine of Physics</p>
                    </div>

                    {/* Title */}
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome Back</h2>
                        <p className="text-slate-600 text-sm">Sign in to access your account</p>
                    </div>

                    {/* Alert */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    {/* SECURITY: Account locked warning */}
                    {accountLocked && (
                        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                                <Shield className="w-4 h-4 text-orange-600" />
                                <p className="text-sm text-orange-800 font-medium">Account Temporarily Locked</p>
                            </div>
                            <p className="text-sm text-orange-700">
                                Too many failed attempts. Try again in {formatTime(lockTimeRemaining)}
                            </p>
                        </div>
                    )}

                    {/* SECURITY: Warning after multiple failed attempts */}
                    {attemptCount >= 3 && attemptCount < 5 && !accountLocked && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                                Warning: {5 - attemptCount} attempt{5 - attemptCount !== 1 ? "s" : ""} remaining before
                                temporary lockout
                            </p>
                        </div>
                    )}

                    {/* Form */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">ID Number</label>
                            <input
                                type="text"
                                value={idNumber}
                                onChange={e => setIdNumber(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Enter your ID number"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                maxLength={20}
                                autoComplete="username"
                                disabled={loading || accountLocked}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-slate-700">Password</label>
                                <Link
                                    href="/auth/forgot-password"
                                    className="text-xs text-slate-600 hover:text-slate-900 font-medium"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Enter your password"
                                    className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                    autoComplete="current-password"
                                    disabled={loading || accountLocked}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    disabled={accountLocked}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleLogin}
                            disabled={loading || !idNumber || !password || accountLocked}
                            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                            {loading ? "Signing in..." : "Sign In"}
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="my-6 flex items-center gap-3">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-xs text-slate-500 uppercase">Or</span>
                        <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    {/* Sign Up Link */}
                    <div className="text-center text-sm text-slate-600">
                        Don't have an account?{" "}
                        <Link href="/auth/signup" className="text-slate-900 font-medium hover:underline">
                            Create one
                        </Link>
                    </div>

                    {/* Back to Home */}
                    <div className="mt-6 text-center">
                        <Link href="/" className="text-sm text-slate-600 hover:text-slate-900 font-medium">
                            ← Back to home
                        </Link>
                    </div>
                </div>
            </div>

            {/* Right Side - Design */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 items-center justify-center p-12 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div
                        className="absolute top-0 left-0 w-full h-full"
                        style={{
                            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                            backgroundSize: "40px 40px",
                        }}
                    />
                </div>

                {/* Animated Floating Elements */}
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
                <div
                    className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
                    style={{ animationDelay: "1s" }}
                />

                {/* Content */}
                <div className="relative z-10 max-w-lg text-white">
                    <div className="mb-12">
                        <div className="inline-block p-4 bg-white/10 backdrop-blur-sm rounded-2xl mb-6 transform hover:scale-110 transition-transform">
                            <BookOpen className="w-12 h-12" />
                        </div>
                        <h2 className="text-4xl font-bold mb-4 leading-tight">
                            Explore Ideas,
                            <br />
                            Share Knowledge
                        </h2>
                        <p className="text-lg text-slate-300 leading-relaxed">
                            Access your personalized dashboard and stay connected with the Apodartho community.
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="text-center p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                            <div className="text-2xl font-bold mb-1">500+</div>
                            <div className="text-xs text-slate-300">Articles</div>
                        </div>
                        <div className="text-center p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                            <div className="text-2xl font-bold mb-1">200+</div>
                            <div className="text-xs text-slate-300">Contributors</div>
                        </div>
                        <div className="text-center p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                            <div className="text-2xl font-bold mb-1">15+</div>
                            <div className="text-xs text-slate-300">Years</div>
                        </div>
                    </div>

                    {/* Security Feature */}
                    <div className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                        <div className="flex items-center gap-3 mb-3">
                            <Shield className="w-5 h-5 text-green-400" />
                            <p className="text-sm font-semibold">Secured with Advanced Protection</p>
                        </div>
                        <p className="text-sm text-slate-300">
                            Your account is protected with rate limiting, lockout mechanisms, and secure session
                            management.
                        </p>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-10 right-10 w-20 h-20 border-2 border-white/20 rounded-full" />
                <div className="absolute bottom-10 left-10 w-16 h-16 border-2 border-white/20 rounded-lg rotate-45" />
            </div>
        </div>
    );
}
