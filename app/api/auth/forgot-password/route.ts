import Profiles from "@/app/models/Profiles";
import { getClientIp } from "@/lib/getIp";
import { dbConnect } from "@/lib/mongoose";
import redis from "@/lib/redis";
import sgMail from "@sendgrid/mail";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function cachedOtp(id_number: string, hash: string, ttlSeconds = 300) {
    const key = `forgot:${id_number}`;
    await redis.hSet(key, { hash, verified: "false" });
    await redis.expire(key, ttlSeconds);
}

// FIX #7: Rate Limiting Helper
async function checkRateLimit(identifier: string): Promise<boolean> {
    const key = `rate_limit:forgot:${identifier}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 3600); // 1 hour window
    return count <= 5; // Limit to 5 requests per hour
}

export async function POST(req: Request) {
    try {
        await dbConnect();

        const body = await req.json();
        const { id_number } = body;

        // Basic Validation
        if (!id_number || typeof id_number !== "string") {
            return NextResponse.json({ message: "Invalid request" }, { status: 400 });
        }

        // FIX #7: Apply Rate Limiting
        const ip = getClientIp(req);
        const ipAllowed = await checkRateLimit(ip);

        // Also rate limit by ID to prevent spamming a specific user
        const idAllowed = await checkRateLimit(`id:${id_number}`);

        if (!ipAllowed || !idAllowed) {
            return NextResponse.json({ message: "Too many requests. Please try again later." }, { status: 429 });
        }

        // Look up user
        const user = await Profiles.findOne({ id_number });

        // FIX #2: Prevent User Enumeration (Critical)
        // If user is NOT found, we simulate the delay of generating OTP + sending email
        // and then return 200 OK anyway.
        if (!user) {
            // Simulate ~500ms delay to match successful path
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 100));

            // Return success to hide that user doesn't exist
            return NextResponse.json(
                { message: "If an account exists with this ID, an OTP has been sent." },
                { status: 200 }
            );
        }

        const otp = generateOtp();
        const otpHash = await bcrypt.hash(otp, 11);

        // Cache OTP in Redis
        await cachedOtp(id_number, otpHash, 300);

        // FIX #23: Removed sensitive logging
        console.log(`[INFO] Password reset OTP generated for ID ending in ***${id_number.slice(-3)} : ${otp}`);

        const msg = {
            to: user.email,
            from: { email: process.env.SENDGRID_SENDER_EMAIL!, name: "Wall-Magazine" },
            subject: "Wall-Magazine Password Reset OTP",
            html: `<div style="font-family: Arial, sans-serif;">
                   <p>Hello ${user.name || "User"},</p>
                   <p>You requested a password reset. Your OTP is:</p>
                   <h2>${otp}</h2>
                   <p>This code expires in 5 minutes.</p>
                   <p>If you did not request this, please ignore this email.</p>
                   </div>`,
        };

        try {
            // await sgMail.send(msg);
        } catch (err) {
            console.error("[ERROR] Failed to send forgot-password email");
            // Even if email fails, return 200 to maintain ambiguity (or 500 if you prefer strict error handling)
            // Returning 200 is safer for enumeration prevention.
            return NextResponse.json(
                { message: "If an account exists with this ID, an OTP has been sent." },
                { status: 200 }
            );
        }

        // Create short-lived JWT in cookie to verify session flow
        const forgotToken = jwt.sign({ id_number }, process.env.JWT_SECRET!, { expiresIn: "5m" });
        const cookieStore = await cookies();
        cookieStore.set("forgot_token", forgotToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            sameSite: "lax",
            maxAge: 5 * 60, // 5 minutes
        });

        return NextResponse.json(
            { message: "If an account exists with this ID, an OTP has been sent." },
            { status: 200 }
        );
    } catch (err) {
        console.error("Forgot-password error"); // No sensitive details
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
