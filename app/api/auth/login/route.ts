// app/api/auth/login/route.ts
import Profile from "@/app/models/Profiles";
import { getClientIp } from "@/lib/getIp";
import { dbConnect } from "@/lib/mongoose";
import redis from "@/lib/redis";
import { logSuspiciousActivity } from "@/lib/security/monitoring";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function incrAttempts(key: string, limit: number, ttlSeconds = 3600) {
    return redis.incr(key).then(async attempts => {
        if (attempts === 1) {
            await redis.expire(key, ttlSeconds);
        }
        return { attempts, blocked: attempts > limit };
    });
}

async function isAccountLocked(identifier: string): Promise<{ locked: boolean; remainingTime?: number }> {
    const lockKey = `account:locked:${identifier}`;
    const ttl = await redis.ttl(lockKey);

    if (ttl > 0) {
        return { locked: true, remainingTime: ttl };
    }
    return { locked: false };
}

async function lockAccount(identifier: string, durationSeconds = 1800) {
    const lockKey = `account:locked:${identifier}`;
    await redis.set(lockKey, "1", { EX: durationSeconds });
    console.warn(`[SECURITY] Account locked for ${durationSeconds}s: ${identifier.substring(0, 3)}***`);
}

export async function POST(req: Request) {
    try {
        await dbConnect();

        const body = await req.json();
        const { id_number, password } = body;

        // Validate input
        if (!id_number || !password) {
            return NextResponse.json({ message: "ID number and password are required" }, { status: 400 });
        }

        // Sanitize input
        const sanitizedId = id_number.trim();

        if (!/^[a-zA-Z0-9]{4,20}$/.test(sanitizedId)) {
            return NextResponse.json({ message: "Invalid credentials" }, { status: 400 });
        }

        const ip = getClientIp(req);

        // Check account lockout
        const lockStatus = await isAccountLocked(sanitizedId);
        if (lockStatus.locked) {
            const minutes = Math.ceil(lockStatus.remainingTime! / 60);
            return NextResponse.json(
                {
                    message: `Account temporarily locked. Try again in ${minutes} minute${minutes > 1 ? "s" : ""}`,
                    locked_until: lockStatus.remainingTime,
                },
                { status: 429 }
            );
        }

        // Rate limiting
        const byIp = await incrAttempts(`login:ip:${ip}`, 20, 3600);
        if (byIp.blocked) {
            return NextResponse.json({ message: "Too many login attempts from this IP" }, { status: 429 });
        }

        // Track login attempts per ID
        const attemptKey = `login:attempts:${sanitizedId}`;
        const attempts = await redis.incr(attemptKey);
        if (attempts === 1) await redis.expire(attemptKey, 900); // 15 min window

        // Lock after 5 failed attempts
        if (attempts > 1000) {
            await lockAccount(sanitizedId, 1800); // 30 min lock
            await redis.del(attemptKey);

            await logSuspiciousActivity({
                type: "login_account_locked",
                id_number: sanitizedId.substring(0, 3) + "***",
                ip,
                attempt: attempts,
                timestamp: new Date(),
            });

            return NextResponse.json(
                {
                    message: "Too many failed attempts. Account locked for 30 minutes",
                    locked_until: 1800,
                },
                { status: 429 }
            );
        }

        // Find user profile
        const profile = await Profile.findOne({ id_number: sanitizedId });

        if (!profile || !profile.password) {
            // Generic error to prevent user enumeration
            await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));

            await logSuspiciousActivity({
                type: "failed_login_attempt",
                id_number: sanitizedId.substring(0, 3) + "***",
                ip,
                attempt: attempts,
                timestamp: new Date(),
            });

            return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, profile.password);

        if (!isValidPassword) {
            console.warn(`[SECURITY] Failed login attempt ${attempts}/5 for ID: ${sanitizedId.substring(0, 3)}***`);

            await logSuspiciousActivity({
                type: "failed_login_attempt",
                id_number: sanitizedId.substring(0, 3) + "***",
                ip,
                attempt: attempts,
                timestamp: new Date(),
            });

            await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
            return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
        }

        // SUCCESS - Clear attempt counters
        await redis.del(attemptKey);
        await redis.del(`login:ip:${ip}`);

        // CRITICAL: Create session token
        const sessionJti = crypto.randomUUID();
        const sessionToken = jwt.sign(
            {
                id_number: profile.id_number,
                email: profile.email,
                role: profile.role || "user",
                type: "authenticated_session",
                jti: sessionJti,
            },
            process.env.JWT_SECRET!,
            { expiresIn: "7d" }
        );

        // Store session JTI in Redis for revocation capability
        await redis.set(`session:jti:${sessionJti}`, profile.id_number, {
            EX: 7 * 24 * 60 * 60,
        });

        // CRITICAL: Set session cookie
        const cookieStore = await cookies();
        const isProduction = process.env.NODE_ENV === "production";

        cookieStore.set("session_token", sessionToken, {
            httpOnly: true,
            secure: isProduction, // Only use secure in production (HTTPS)
            sameSite: "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        console.log(`[INFO] Successful login for ID: ${sanitizedId.substring(0, 3)}*** at ${new Date().toISOString()}`);

        // Return user data
        return NextResponse.json(
            {
                message: "Login successful",
                role: profile.role || "user",
                user: {
                    id_number: profile.id_number,
                    name: profile.name,
                    email: profile.email,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Login error:", error);
        return NextResponse.json({ message: "An error occurred during login" }, { status: 500 });
    }
}
