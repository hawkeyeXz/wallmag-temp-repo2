// app/api/auth/logout/route.ts
import redis from "@/lib/redis";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("session_token")?.value;

        if (token) {
            try {
                // Decode token to get JTI and expiration
                const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
                    jti: string;
                    exp: number;
                    id_number: string;
                };

                // Calculate remaining time until token would expire
                const now = Math.floor(Date.now() / 1000);
                const remainingTime = decoded.exp - now;

                if (remainingTime > 0 && decoded.jti) {
                    // Blacklist the token
                    await redis.set(`token:blacklist:${decoded.jti}`, "1", {
                        EX: remainingTime,
                    });

                    // Remove session JTI
                    await redis.del(`session:jti:${decoded.jti}`);

                    console.log(`[INFO] User logged out: ${decoded.id_number.substring(0, 3)}***`);
                }
            } catch (err) {
                // Token invalid/expired, just delete cookie
                console.log("[INFO] Logout with invalid token");
            }
        }

        // Delete session cookie/api/user/profile
        cookieStore.delete("session_token");
        cookieStore.delete("csrf_token");

        return NextResponse.json({ message: "Logged out successfully" }, { status: 200 });
    } catch (error) {
        console.error("[ERROR] Logout error:", error);

        // Still delete cookie even if error occurs
        const cookieStore = await cookies();
        cookieStore.delete("session_token");
        cookieStore.delete("csrf_token");

        return NextResponse.json({ message: "Logged out" }, { status: 200 });
    }
}
