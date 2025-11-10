// lib/auth/middleware.ts
import redis from "@/lib/redis";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export interface AuthUser {
    id_number: string;
    email: string;
    jti: string;
}

interface AuthResult {
    authenticated: boolean;
    user?: AuthUser;
    error?: string;
}

export async function authenticateRequest(): Promise<AuthResult> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("session_token")?.value;

        if (!token) {
            return { authenticated: false, error: "No session token" };
        }

        // Verify JWT
        let decoded: any;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!);
        } catch (err) {
            cookieStore.delete("session_token");
            return { authenticated: false, error: "Invalid token" };
        }

        // Validate token type
        if (decoded.type !== "authenticated_session") {
            return { authenticated: false, error: "Invalid token type" };
        }

        // Check if token is blacklisted
        if (decoded.jti) {
            const blacklisted = await redis.exists(`token:blacklist:${decoded.jti}`);
            if (blacklisted) {
                cookieStore.delete("session_token");
                return { authenticated: false, error: "Token revoked" };
            }
        }

        return {
            authenticated: true,
            user: {
                id_number: decoded.id_number,
                email: decoded.email,
                jti: decoded.jti,
            },
        };
    } catch (error) {
        console.error("[ERROR] Authentication error:", error);
        return { authenticated: false, error: "Authentication failed" };
    }
}

// Helper function to use in API routes
export async function requireAuth() {
    const result = await authenticateRequest();

    if (!result.authenticated) {
        return {
            error: NextResponse.json({ message: result.error || "Authentication required" }, { status: 401 }),
            user: null,
        };
    }

    return {
        error: null,
        user: result.user!,
    };
}

// Example usage in a protected API route:
// export async function GET(req: Request) {
//     const { error, user } = await requireAuth();
//     if (error) return error;
//
//     // Your protected logic here
//     return NextResponse.json({ data: "protected data", user });
// }
