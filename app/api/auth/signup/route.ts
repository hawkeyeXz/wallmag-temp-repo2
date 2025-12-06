import Profiles from "@/app/models/Profiles";
import RegisteredUsers from "@/app/models/RegisteredUser";
import { getClientIp } from "@/lib/getIp";
import { dbConnect } from "@/lib/mongoose";
import redis from "@/lib/redis";
import sgMail from "@sendgrid/mail";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// FIX #1: Use cryptographically secure random generation
function generateOtp(): string {
    const randomBytes = crypto.randomBytes(3);
    const otp = (randomBytes.readUIntBE(0, 3) % 900000) + 100000;
    return otp.toString();
}

async function tryAcquireLock(key: string, ttlSeconds = 8): Promise<boolean> {
    const res = await redis.set(key, "1", { EX: ttlSeconds, NX: true });
    return res === "OK";
}

async function incrAttempts(key: string, limit: number, ttlSeconds = 3600) {
    const attempts = await redis.incr(key);
    if (attempts === 1) await redis.expire(key, ttlSeconds);
    return { attempts, blocked: attempts > limit };
}

async function getCachedRegistered(id_number: string) {
    const cacheKey = `registered:exists:${id_number}`;
    const v = await redis.get(cacheKey);
    return v === "1";
}

async function setCachedRegistered(id_number: string, ttl = 3600) {
    const cacheKey = `registered:exists:${id_number}`;
    await redis.set(cacheKey, "1", { EX: ttl });
}

async function cachedOtp(id_number: string, hash: string, verified = false, ttlSeconds = 300) {
    const cacheKey = `otp:${id_number}`;
    await redis.hSet(cacheKey, {
        hash,
        verified: verified ? "true" : "false",
    });
    await redis.expire(cacheKey, ttlSeconds);
}

export async function POST(req: Request) {
    try {
        await dbConnect();
        let body;
        try {
            body = await req.json();
        } catch (parseError) {
            console.error("[SECURITY] JSON parse error from IP:", getClientIp(req));
            return NextResponse.json({ message: "Invalid request format" }, { status: 400 });
        }

        const { id_number } = body;

        // FIX #2: Enhanced input validation
        if (!id_number || typeof id_number !== "string" || id_number.trim().length === 0) {
            return NextResponse.json({ message: "Invalid request" }, { status: 400 });
        }

        // Additional validation: sanitize ID number
        const sanitizedId = id_number.trim();
        if (!/^[A-Za-z0-9-]{5,50}$/.test(sanitizedId)) {
            return NextResponse.json({ message: "Invalid request" }, { status: 400 });
        }

        const ip = getClientIp(req);

        // FIX #7: Stricter Rate Limiting
        // Limit per IP: 30 requests per hour
        const byIp = await incrAttempts(`signup:ip:${ip}`, 30, 3600);
        if (byIp.blocked) {
            return NextResponse.json({ message: "Too many requests. Please try again later" }, { status: 429 });
        }

        // Limit per ID: 10 requests per hour
        const byId = await incrAttempts(`signup:id:${sanitizedId}`, 10, 3600);
        if (byId.blocked) {
            return NextResponse.json({ message: "Too many attempts. Please try again later" }, { status: 429 });
        }

        const lockKey = `signup:lock:${sanitizedId}`;
        const locked = await tryAcquireLock(lockKey, 8);
        if (!locked) {
            return NextResponse.json({ message: "Request in progress. Please try again later" }, { status: 429 });
        }

        // FIX #3: Prevent user enumeration with constant-time response strategy
        const cached = await getCachedRegistered(sanitizedId);
        let regUser = null;
        let userProfile = null;

        if (cached) {
            regUser = await RegisteredUsers.findOne({ id_number: sanitizedId });
            userProfile = await Profiles.findOne({ id_number: sanitizedId });
        } else {
            regUser = await RegisteredUsers.findOne({ id_number: sanitizedId });
            userProfile = await Profiles.findOne({ id_number: sanitizedId });
            if (regUser && !userProfile) {
                await setCachedRegistered(sanitizedId, 3600);
            }
        }

        // If user is invalid or already registered, delay response to match successful processing time
        // This prevents attackers from guessing valid IDs based on response speed
        if (!regUser || regUser.is_signed_up || userProfile) {
            await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
            // Generic error message
            return NextResponse.json({ message: "Invalid request or user already registered" }, { status: 400 });
        }

        const otpCode = generateOtp();
        const otpHash = await bcrypt.hash(otpCode, 11);

        await cachedOtp(sanitizedId, otpHash, false, 300);

        // FIX #4: Enable and enforce resend limits
        const resendKey = `otp:resend:${sanitizedId}`;
        const resendCount = await redis.incr(resendKey);
        if (resendCount === 1) await redis.expire(resendKey, 24 * 3600);

        // Limit to 10 OTPs per day
        if (resendCount > 10) {
            return NextResponse.json({ message: "Too many OTP requests. Try again tomorrow" }, { status: 429 });
        }

        // FIX #23: REMOVE SENSITIVE DATA LOGGING
        console.log(`[SECURITY] OTP generation requested for ID: ***${sanitizedId.slice(-4)}`);
        // console.log(`[DEBUG] OTP: ${otpCode}`); // REMOVED FOR PRODUCTION

        const msg = {
            to: regUser.email,
            from: {
                email: process.env.SENDGRID_SENDER_EMAIL!,
                name: "Wall-Magazine",
            },
            subject: "Your WallMag Signup OTP",
            html: `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2>Wall-Magazine Signup Verification</h2>
      <p>Dear ${regUser.name || "User"},</p>
      <p>Your one-time password (OTP) is:</p>
      <h1 style="letter-spacing: 4px;">${otpCode}</h1>
      <p>This code will expire in 5 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <hr/>
      <small>© ${new Date().getFullYear()} Wall-Magazine. All rights reserved.</small>
    </div>
  `,
        };

        try {
            // FIX #6: Ensure email sending logic is active and guarded
            await sgMail.send(msg);
            console.log(`[INFO] OTP email sent successfully`);
        } catch (emailError) {
            console.error("[ERROR] Failed to send OTP email");
            // Clean up generated OTP if email fails
            await redis.del(`otp:${sanitizedId}`);
            return NextResponse.json(
                { message: "Failed to send verification code. Please try again" },
                { status: 500 }
            );
        }

        // FIX #3: JWT Secret Validation (Critical)
        if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
            console.error("[CRITICAL] JWT_SECRET is missing or too weak");
            return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
        }

        const token = jwt.sign(
            {
                id_number: sanitizedId,
                type: "otp_verification",
                jti: crypto.randomUUID(),
            },
            process.env.JWT_SECRET!,
            { expiresIn: "10m" }
        );

        const cookieStore = await cookies();
        const csrfToken = crypto.randomBytes(32).toString("hex");

        await redis.set(`otp:csrf:${sanitizedId}`, csrfToken, { EX: 300 });

        const isProduction = process.env.NODE_ENV === "production";

        // FIX #6: Secure CSRF Implementation
        // 1. Store CSRF token in HttpOnly cookie (cannot be read by JS)
        cookieStore.set("otp_csrf_token", csrfToken, {
            httpOnly: true, // Critical: Prevent XSS theft
            secure: isProduction,
            sameSite: "strict",
            path: "/",
            maxAge: 5 * 60,
        });

        // 2. Send token value in body so client can send it back in header
        // This implements the "Double Submit" or "Synchronized Token" pattern safely

        cookieStore.set("signup_token", token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            path: "/",
            maxAge: 10 * 60,
        });

        return NextResponse.json(
            {
                message: "Verification code sent successfully",
                expiresIn: 300,
                // Client must include this in 'X-CSRF-Token' header for subsequent requests
                csrfToken: csrfToken,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Signup error"); // No details logged
        return NextResponse.json({ message: "An error occurred. Please try again later" }, { status: 500 });
    }
}
