// app/api/auth/refresh-session/route.ts
import redis from "@/lib/redis";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

interface SessionPayload {
    id_number: string;
    email: string;
    type: string;
    jti: string;
    iat: number;
    exp: number;
}

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const currentToken = cookieStore.get("session_token")?.value;

        if (!currentToken) {
            return NextResponse.json({ message: "No session found" }, { status: 401 });
        }

        // Verify current token
        let decodedToken: SessionPayload;
        try {
            decodedToken = jwt.verify(currentToken, process.env.JWT_SECRET!) as SessionPayload;
        } catch (err) {
            cookieStore.delete("session_token");
            return NextResponse.json({ message: "Invalid session" }, { status: 401 });
        }

        // Check if token type is correct
        if (decodedToken.type !== "authenticated_session") {
            return NextResponse.json({ message: "Invalid token type" }, { status: 401 });
        }

        // Check if token is blacklisted
        const blacklisted = await redis.exists(`token:blacklist:${decodedToken.jti}`);
        if (blacklisted) {
            cookieStore.delete("session_token");
            return NextResponse.json({ message: "Session has been revoked" }, { status: 401 });
        }

        // RECOMMENDATION #6: Only refresh if token is near expiration
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = decodedToken.exp - now;
        const tokenLifetime = decodedToken.exp - decodedToken.iat;

        // Only refresh if less than 25% of lifetime remaining (e.g., < 1.75 days for 7-day token)
        if (timeUntilExpiry > tokenLifetime * 0.25) {
            return NextResponse.json(
                {
                    message: "Token still valid, no refresh needed",
                    expiresIn: timeUntilExpiry,
                },
                { status: 200 }
            );
        }

        // Create new token with new JTI
        const newJti = crypto.randomUUID();
        const newToken = jwt.sign(
            {
                id_number: decodedToken.id_number,
                email: decodedToken.email,
                type: "authenticated_session",
                jti: newJti,
            },
            process.env.JWT_SECRET!,
            { expiresIn: "7d" }
        );

        // Store new session JTI
        await redis.set(`session:jti:${newJti}`, decodedToken.id_number, {
            EX: 7 * 24 * 60 * 60,
        });

        // Blacklist old token (with remaining lifetime)
        await redis.set(`token:blacklist:${decodedToken.jti}`, "1", {
            EX: timeUntilExpiry > 0 ? timeUntilExpiry : 60,
        });

        // Remove old session JTI
        await redis.del(`session:jti:${decodedToken.jti}`);

        // Set new cookie
        const isProduction = process.env.NODE_ENV === "production";
        cookieStore.set("session_token", newToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60,
        });

        console.log(`[INFO] Session refreshed for user: ${decodedToken.id_number.substring(0, 3)}***`);

        return NextResponse.json(
            {
                message: "Session refreshed successfully",
                expiresIn: 7 * 24 * 60 * 60,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Session refresh error:", error);
        return NextResponse.json({ message: "Failed to refresh session" }, { status: 500 });
    }
}
