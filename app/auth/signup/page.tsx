"use client";

import { AlertCircle, BookOpen, CheckCircle, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
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

const validateIdNumber = (id: string): boolean => {
    const sanitized = sanitizeInput(id);
    return /^[a-zA-Z0-9]{4,20}$/.test(sanitized);
};

const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (password.length < 8) errors.push("At least 8 characters");
    if (!/[A-Z]/.test(password)) errors.push("One uppercase letter");
    if (!/[a-z]/.test(password)) errors.push("One lowercase letter");
    if (!/[0-9]/.test(password)) errors.push("One number");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push("One special character");
    return { valid: errors.length === 0, errors };
};

// SECURITY: Helper to get CSRF token from cookies
const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop()?.split(";").shift() || null;
    }
    return null;
};

export default function SignupPage() {
    const router = useRouter();

    // Multi-step state
    const [step, setStep] = useState<"id" | "otp" | "password">("id");

    // Form fields
    const [idNumber, setIdNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // UI state
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [timeLeft, setTimeLeft] = useState(0);

    // SECURITY: Track if account is locked
    const [accountLocked, setAccountLocked] = useState(false);
    const [lockTimeRemaining, setLockTimeRemaining] = useState(0);

    // Timer for OTP
    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

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

    // Step 1: Request OTP
    const handleRequestOtp = useCallback(async () => {
        setError("");
        setSuccess("");
        const sanitizedId = sanitizeInput(idNumber);

        if (!validateIdNumber(sanitizedId)) {
            setError("Invalid ID format. Use 4-20 alphanumeric characters only.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ id_number: sanitizedId }),
            });

            const data = await response.json();

            if (!response.ok) {
                // SECURITY: Handle rate limiting and account lockout
                if (response.status === 429) {
                    throw new Error(data.message || "Too many attempts. Please try again later.");
                }
                throw new Error(data.message || "Failed to send OTP");
            }

            setSuccess("OTP sent to your email!");
            setTimeLeft(300); // 5 minutes
            setStep("otp");
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [idNumber]);

    // Step 2: Verify OTP with CSRF
    const handleVerifyOtp = useCallback(async () => {
        setError("");
        setSuccess("");
        const sanitizedOtp = sanitizeInput(otp);

        if (!/^\d{6}$/.test(sanitizedOtp)) {
            setError("OTP must be exactly 6 digits.");
            return;
        }

        if (accountLocked) {
            setError(`Account temporarily locked. Try again in ${formatTime(lockTimeRemaining)}`);
            return;
        }

        setLoading(true);

        // SECURITY: Get CSRF token from cookie
        const csrfToken = getCookie("otp_csrf_token");

        if (!csrfToken) {
            setError("Session expired. Please request a new OTP.");
            setStep("id");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    otp: sanitizedOtp,
                    csrf_token: csrfToken, // SECURITY: Send CSRF token in body
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // SECURITY: Handle account lockout
                if (response.status === 429 && data.locked_until) {
                    setAccountLocked(true);
                    setLockTimeRemaining(data.locked_until);
                    throw new Error(data.message || "Account temporarily locked");
                }
                throw new Error(data.message || "Invalid OTP");
            }

            setSuccess("OTP verified! <Redireccting styleName={Redirecting}></Redireccting>.");

            setStep("password");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Verification failed. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [otp, accountLocked, lockTimeRemaining, router]);

    const handleCreateProfile = useCallback(async () => {
        setError("");
        setSuccess("");
        const sanitizedPassword = sanitizeInput(password);
        const sanitizedConfirm = sanitizeInput(confirmPassword);

        if (sanitizedPassword !== sanitizedConfirm) {
            setError("Passwords do not match.");
            return;
        }

        const validation = validatePassword(sanitizedPassword);
        if (!validation.valid) {
            setError("Password requirements not met: " + validation.errors.join(", "));
            return;
        }
        setLoading(true);
        try {
            const response = await fetch("/api/auth/create-profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    password: sanitizedPassword,
                    confirmPassword: sanitizedConfirm,
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to create profile");
            }

            setSuccess("Profile created successfully! Redirecting...");
            setTimeout(() => {
                router.push("/dashboard");
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [password, confirmPassword, router]);

    const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
        if (e.key === "Enter") action();
    };

    const passwordValidation = validatePassword(password);

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

                    {/* Progress */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2">
                            {["ID", "OTP"].map((label, idx) => (
                                <div key={label} className="flex items-center flex-1">
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                                            idx === 0 && step === "id"
                                                ? "bg-slate-900 text-white"
                                                : idx === 1 && step === "otp"
                                                ? "bg-slate-900 text-white"
                                                : idx < ["id", "otp"].indexOf(step)
                                                ? "bg-green-500 text-white"
                                                : "bg-slate-200 text-slate-400"
                                        }`}
                                    >
                                        {idx < ["id", "otp"].indexOf(step) ? "✓" : idx + 1}
                                    </div>
                                    {idx < 1 && (
                                        <div
                                            className={`flex-1 h-0.5 mx-2 ${
                                                idx < ["id", "otp"].indexOf(step) ? "bg-green-500" : "bg-slate-200"
                                            }`}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-2">
                            <span className="text-xs text-slate-500">ID Number</span>
                            <span className="text-xs text-slate-500">Verification</span>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">
                            {step === "id" && "Create Account"}
                            {step === "otp" && "Verify Email"}
                        </h2>
                        <p className="text-slate-600 text-sm">
                            {step === "id" && "Enter your ID to get started"}
                            {step === "otp" && "Enter the code sent to your email"}
                        </p>
                    </div>

                    {/* Alerts */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-green-800">{success}</p>
                        </div>
                    )}

                    {/* SECURITY: Account locked warning */}
                    {accountLocked && (
                        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <p className="text-sm text-orange-800 font-medium mb-1">Account Temporarily Locked</p>
                            <p className="text-sm text-orange-700">Try again in {formatTime(lockTimeRemaining)}</p>
                        </div>
                    )}

                    {/* Step 1: ID Number */}
                    {step === "id" && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ID Number</label>
                                <input
                                    type="text"
                                    value={idNumber}
                                    onChange={e => setIdNumber(e.target.value)}
                                    onKeyPress={e => handleKeyPress(e, handleRequestOtp)}
                                    placeholder="Enter your ID number"
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                    maxLength={20}
                                    disabled={loading}
                                    autoComplete="username"
                                />
                                <p className="mt-1 text-xs text-slate-500">4-20 alphanumeric characters</p>
                            </div>
                            <button
                                onClick={handleRequestOtp}
                                disabled={loading || !idNumber}
                                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                {loading ? "Sending..." : "Send Verification Code"}
                            </button>
                        </div>
                    )}

                    {/* Step 2: OTP */}
                    {step === "otp" && (
                        <div className="space-y-4">
                            {timeLeft > 0 && (
                                <div className="text-center p-3 bg-slate-50 rounded-lg">
                                    <p className="text-sm text-slate-600 mb-1">Code expires in</p>
                                    <p
                                        className={`text-2xl font-mono font-bold ${
                                            timeLeft < 60 ? "text-red-600" : "text-slate-900"
                                        }`}
                                    >
                                        {formatTime(timeLeft)}
                                    </p>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Verification Code
                                </label>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    onKeyPress={e => handleKeyPress(e, handleVerifyOtp)}
                                    placeholder="000000"
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                    maxLength={6}
                                    disabled={loading || timeLeft <= 0 || accountLocked}
                                    autoComplete="one-time-code"
                                />
                            </div>
                            <button
                                onClick={handleVerifyOtp}
                                disabled={loading || otp.length !== 6 || timeLeft <= 0 || accountLocked}
                                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {loading ? "Verifying..." : "Verify Code"}
                            </button>
                            <button
                                onClick={() => {
                                    setStep("id");
                                    setOtp("");
                                    setError("");
                                    setSuccess("");
                                    setAccountLocked(false);
                                }}
                                disabled={loading}
                                className="w-full text-slate-600 hover:text-slate-900 text-sm font-medium disabled:opacity-50"
                            >
                                ← Change ID Number
                            </button>
                        </div>
                    )}
                    {step === "password" && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        onKeyPress={e => handleKeyPress(e, handleCreateProfile)}
                                        placeholder="Enter password"
                                        className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {password && (
                                    <div className="mt-2 space-y-1">
                                        {[
                                            { met: password.length >= 8, text: "8+ characters" },
                                            { met: /[A-Z]/.test(password), text: "Uppercase" },
                                            { met: /[a-z]/.test(password), text: "Lowercase" },
                                            { met: /[0-9]/.test(password), text: "Number" },
                                            { met: /[!@#$%^&*(),.?":{}|<>]/.test(password), text: "Special char" },
                                        ].map((req, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-xs">
                                                <div
                                                    className={`w-1.5 h-1.5 rounded-full ${
                                                        req.met ? "bg-green-500" : "bg-slate-300"
                                                    }`}
                                                />
                                                <span className={req.met ? "text-green-600" : "text-slate-500"}>
                                                    {req.text}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        onKeyPress={e => handleKeyPress(e, handleCreateProfile)}
                                        placeholder="Confirm password"
                                        className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={handleCreateProfile}
                                disabled={
                                    loading ||
                                    !password ||
                                    !confirmPassword ||
                                    password !== confirmPassword ||
                                    !passwordValidation.valid
                                }
                                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                {loading ? "Creating..." : "Create Account"}
                            </button>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-6 text-center text-sm text-slate-600">
                        Already have an account?{" "}
                        <a href="/auth/login" className="text-slate-900 font-medium hover:underline">
                            Sign in
                        </a>
                    </div>
                </div>
            </div>

            {/* Right Side - Design */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 items-center justify-center p-12 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div
                        className="absolute top-0 left-0 w-full h-full"
                        style={{
                            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                            backgroundSize: "40px 40px",
                        }}
                    />
                </div>

                <div className="relative z-10 max-w-lg text-white">
                    <div className="mb-8">
                        <div className="inline-block p-4 bg-white/10 backdrop-blur-sm rounded-2xl mb-6">
                            <BookOpen className="w-12 h-12" />
                        </div>
                        <h2 className="text-4xl font-bold mb-4">Welcome to Apodartho</h2>
                        <p className="text-lg text-slate-300 leading-relaxed">
                            Join our community of curious minds. Share your thoughts, discover fascinating articles, and
                            be part of our yearly wall magazine tradition.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1">Secure Sign Up</h3>
                                <p className="text-sm text-slate-300">
                                    Protected with OTP verification and advanced security measures
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1">Contribute & Collaborate</h3>
                                <p className="text-sm text-slate-300">
                                    Share your articles, poems, and artwork with the community
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1">Build Your Profile</h3>
                                <p className="text-sm text-slate-300">
                                    Showcase your work and connect with fellow students
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute top-20 right-20 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute bottom-20 left-20 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
            </div>
        </div>
    );
}
