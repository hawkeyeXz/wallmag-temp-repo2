// middleware.ts (root level)
import { isIPBlocked } from "@/lib/security/monitoring";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
    const response = NextResponse.next();

    // Get client IP
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";

    // Check if IP is blocked
    if (ip !== "unknown" && (await isIPBlocked(ip))) {
        return new NextResponse("Access Denied", { status: 403 });
    }

    // RECOMMENDATION #3: Security Headers

    // Prevent clickjacking
    response.headers.set("X-Frame-Options", "DENY");

    // Prevent MIME type sniffing
    response.headers.set("X-Content-Type-Options", "nosniff");

    // Enable XSS protection (legacy, but still useful)
    response.headers.set("X-XSS-Protection", "1; mode=block");

    // Referrer policy - don't leak sensitive URLs
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // Permissions Policy - restrict browser features
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");

    // Content Security Policy (CSP)
    const cspDirectives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
    ];
    response.headers.set("Content-Security-Policy", cspDirectives.join("; "));

    // Strict Transport Security (HSTS) - only in production
    if (process.env.NODE_ENV === "production") {
        response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    }

    // Add custom security header to track request
    response.headers.set("X-Request-ID", crypto.randomUUID());

    return response;
}

// Configure which routes to run middleware on
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
