// app/api/auth/verify-otp/route.ts
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

async function isTokenBlacklisted(jti: string): Promise<boolean> {
    const exists = await redis.exists(`token:blacklist:${jti}`);
    return exists === 1;
}

async function blacklistToken(jti: string, expiresIn: number) {
    await redis.set(`token:blacklist:${jti}`, "1", { EX: expiresIn });
}

async function isAccountLocked(id_number: string): Promise<{ locked: boolean; remainingTime?: number }> {
    const lockKey = `account:locked:${id_number}`;
    const ttl = await redis.ttl(lockKey);

    if (ttl > 0) {
        return { locked: true, remainingTime: ttl };
    }
    return { locked: false };
}

async function lockAccount(id_number: string, durationSeconds = 1800) {
    const lockKey = `account:locked:${id_number}`;
    await redis.set(lockKey, "1", { EX: durationSeconds });
    console.warn(`[SECURITY] Account locked for ${durationSeconds}s: ${id_number.substring(0, 3)}***`);
}

export async function POST(req: Request) {
    try {
        await dbConnect();

        const cookieStore = await cookies();
        const csrfCookie = cookieStore.get("otp_csrf_token")?.value;

        const body = await req.json();
        const { otp, csrf_token } = body;

        // CSRF validation
        if (!csrfCookie || !csrf_token || csrfCookie !== csrf_token) {
            console.warn(`[SECURITY] CSRF validation failed at ${new Date().toISOString()}`);
            await logSuspiciousActivity({
                type: "csrf_validation_failed",
                ip: getClientIp(req),
                timestamp: new Date(),
            });
            return NextResponse.json({ message: "Invalid request" }, { status: 403 });
        }

        // JWT validation
        const token = cookieStore.get("signup_token")?.value;
        if (!token) {
            return NextResponse.json({ message: "Session expired. Please restart signup" }, { status: 401 });
        }

        let decodedToken: { id_number: string; type?: string; jti?: string };
        try {
            decodedToken = jwt.verify(token, process.env.JWT_SECRET!) as typeof decodedToken;

            if (decodedToken.type !== "otp_verification") {
                throw new Error("Invalid token type");
            }

            if (decodedToken.jti && (await isTokenBlacklisted(decodedToken.jti))) {
                throw new Error("Token has been revoked");
            }
        } catch (err) {
            cookieStore.delete("signup_token");
            cookieStore.delete("otp_csrf_token");
            console.error("[SECURITY] Invalid JWT token:", err);
            return NextResponse.json({ message: "Invalid session. Please restart signup" }, { status: 401 });
        }

        const id_number = decodedToken.id_number;

        // Check if account is locked
        const lockStatus = await isAccountLocked(id_number);
        if (lockStatus.locked) {
            const minutes = Math.ceil(lockStatus.remainingTime! / 60);
            return NextResponse.json(
                {
                    message: `Account temporarily locked due to too many failed attempts. Try again in ${minutes} minute${
                        minutes > 1 ? "s" : ""
                    }`,
                    locked_until: lockStatus.remainingTime,
                },
                { status: 429 }
            );
        }

        // Validate CSRF token in Redis
        const storedCsrf = await redis.get(`otp:csrf:${id_number}`);
        if (!storedCsrf || storedCsrf !== csrf_token) {
            console.warn(`[SECURITY] CSRF token mismatch for user ${id_number.substring(0, 3)}***`);
            return NextResponse.json({ message: "Invalid request" }, { status: 403 });
        }

        // Strict OTP validation
        if (!otp || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
            return NextResponse.json({ message: "Invalid verification code" }, { status: 400 });
        }

        const ip = getClientIp(req);

        // Rate limiting
        const byIp = await incrAttempts(`verify:ip:${ip}`, 60, 3600);
        if (byIp.blocked) {
            return NextResponse.json({ message: "Too many attempts. Please try again later" }, { status: 429 });
        }

        const byId = await incrAttempts(`verify:id:${id_number}`, 10, 3600);
        if (byId.blocked) {
            return NextResponse.json({ message: "Too many attempts. Please try again later" }, { status: 429 });
        }

        // Check OTP attempts
        const attemptKey = `otp:attempts:${id_number}`;
        const attempts = await redis.incr(attemptKey);
        if (attempts === 1) await redis.expire(attemptKey, 300);

        if (attempts > 5) {
            await lockAccount(id_number, 1800);
            await redis.del(`otp:${id_number}`);
            await redis.del(`otp:csrf:${id_number}`);

            if (decodedToken.jti) {
                await blacklistToken(decodedToken.jti, 600);
            }

            cookieStore.delete("signup_token");
            cookieStore.delete("otp_csrf_token");

            await logSuspiciousActivity({
                type: "account_locked_too_many_attempts",
                id_number: id_number.substring(0, 3) + "***",
                ip,
                attempt: attempts,
                timestamp: new Date(),
            });

            return NextResponse.json(
                {
                    message:
                        "Account temporarily locked due to too many incorrect attempts. Please try again in 30 minutes",
                },
                { status: 429 }
            );
        }

        // Retrieve OTP data
        const cachedKey = `otp:${id_number}`;
        const data = (await redis.hGetAll(cachedKey)) as Record<string, string>;

        if (!data || !data.hash) {
            await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
            return NextResponse.json({ message: "Invalid or expired verification code" }, { status: 400 });
        }

        if (data.verified === "true") {
            return NextResponse.json({ message: "Code already used. Please request a new one" }, { status: 400 });
        }

        // Verify OTP
        const isMatch = await bcrypt.compare(otp, data.hash);

        if (!isMatch) {
            console.warn(`[SECURITY] Failed OTP attempt ${attempts}/5 for ID: ${id_number.substring(0, 3)}***`);

            await logSuspiciousActivity({
                type: "failed_otp_attempt",
                id_number: id_number.substring(0, 3) + "***",
                ip,
                attempt: attempts,
                timestamp: new Date(),
            });

            await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
            return NextResponse.json({ message: "Invalid verification code" }, { status: 400 });
        }

        // SUCCESS - Clean up attempt counters
        await redis.del(attemptKey);
        await redis.del(`verify:ip:${ip}`);
        await redis.del(`verify:id:${id_number}`);

        // Mark OTP as verified (but DON'T mark user as signed up yet!)
        await redis.hSet(cachedKey, { verified: "true" });

        // FIXED: Create a new token for the profile creation step
        const profileToken = jwt.sign(
            {
                id_number: id_number,
                type: "profile_creation",
                jti: crypto.randomUUID(),
            },
            process.env.JWT_SECRET!,
            { expiresIn: "10m" }
        );

        // Blacklist the old signup token
        if (decodedToken.jti) {
            await blacklistToken(decodedToken.jti, 600);
        }

        // Delete old cookies
        cookieStore.delete("signup_token");
        cookieStore.delete("otp_csrf_token");

        // Set new profile creation token
        const isProduction = process.env.NODE_ENV === "production";
        cookieStore.set("profile_token", profileToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            path: "/",
            maxAge: 10 * 60, // 10 minutes to complete profile
        });

        console.log(`[INFO] OTP verified for ID: ${id_number.substring(0, 3)}*** at ${new Date().toISOString()}`);

        return NextResponse.json(
            {
                message: "Verification successful. Please create your password",
                // Frontend should now show password creation form
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Verification error:", error);

        const cookieStore = await cookies();
        cookieStore.delete("signup_token");
        cookieStore.delete("otp_csrf_token");

        return NextResponse.json({ message: "An error occurred. Please try again" }, { status: 500 });
    }
}
