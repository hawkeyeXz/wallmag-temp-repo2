import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
    const response = NextResponse.next();

    // 1. Security Headers
    const headers = response.headers;

    // Prevent clickjacking (allow same origin for iframes if needed, or DENY)
    headers.set("X-Frame-Options", "SAMEORIGIN");

    // Prevent MIME type sniffing
    headers.set("X-Content-Type-Options", "nosniff");

    // Enable XSS protection
    headers.set("X-XSS-Protection", "1; mode=block");

    // Referrer policy
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // Permissions Policy (Privacy)
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");

    // Content Security Policy (CSP)
    // Note: Strict CSP often breaks Next.js dev mode or external images.
    // This is a baseline; adjust 'img-src' if you use external CDNs like Vercel Blob.
    const cspDirectives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: blob: *.public.blob.vercel-storage.com", // Added Vercel Blob domain
        "connect-src 'self' https://*.public.blob.vercel-storage.com", // Added Vercel Blob for uploads
        "frame-ancestors 'self'",
        "base-uri 'self'",
        "form-action 'self'",
    ];

    headers.set("Content-Security-Policy", cspDirectives.join("; "));

    // HSTS (Production Only)
    if (process.env.NODE_ENV === "production") {
        headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * 1. /api/ (API routes handled separately or allow global middleware)
         * 2. /_next/ (Next.js internals)
         * 3. /_static (inside /public)
         * 4. /favicon.ico, /sitemap.xml (static files)
         */
        "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml).*)",
    ],
};
