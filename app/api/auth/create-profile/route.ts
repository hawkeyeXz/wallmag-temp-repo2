// app/api/auth/create-profile/route.ts
import Profile from "@/app/models/Profiles"; // Your Profile model
import RegisteredUsers from "@/app/models/RegisteredUser";
import { getClientIp } from "@/lib/getIp";
import { dbConnect } from "@/lib/mongoose";
import redis from "@/lib/redis";
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

export async function POST(req: Request) {
    try {
        await dbConnect();

        const cookieStore = await cookies();

        // Validate profile creation token
        const token = cookieStore.get("profile_token")?.value;
        if (!token) {
            return NextResponse.json(
                {
                    message: "Session expired. Please restart signup",
                },
                { status: 401 }
            );
        }

        let decodedToken: { id_number: string; type?: string; jti?: string };
        try {
            decodedToken = jwt.verify(token, process.env.JWT_SECRET!) as typeof decodedToken;

            if (decodedToken.type !== "profile_creation") {
                throw new Error("Invalid token type");
            }
        } catch (err) {
            cookieStore.delete("profile_token");
            console.error("[SECURITY] Invalid profile token:", err);
            return NextResponse.json(
                {
                    message: "Invalid session. Please restart signup",
                },
                { status: 401 }
            );
        }

        const id_number = decodedToken.id_number;

        // Get request body
        const body = await req.json();
        const { password, confirmPassword } = body;

        // Validate passwords
        if (!password || !confirmPassword) {
            return NextResponse.json(
                {
                    message: "Password and confirm password are required",
                },
                { status: 400 }
            );
        }

        if (password !== confirmPassword) {
            return NextResponse.json(
                {
                    message: "Passwords do not match",
                },
                { status: 400 }
            );
        }

        // Validate password strength
        if (password.length < 8) {
            return NextResponse.json(
                {
                    message: "Password must be at least 8 characters",
                },
                { status: 400 }
            );
        }

        if (!/[A-Z]/.test(password)) {
            return NextResponse.json(
                {
                    message: "Password must contain at least one uppercase letter",
                },
                { status: 400 }
            );
        }

        if (!/[a-z]/.test(password)) {
            return NextResponse.json(
                {
                    message: "Password must contain at least one lowercase letter",
                },
                { status: 400 }
            );
        }

        if (!/[0-9]/.test(password)) {
            return NextResponse.json(
                {
                    message: "Password must contain at least one number",
                },
                { status: 400 }
            );
        }

        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            return NextResponse.json(
                {
                    message: "Password must contain at least one special character",
                },
                { status: 400 }
            );
        }

        const ip = getClientIp(req);

        // Rate limiting
        const byIp = await incrAttempts(`profile:ip:${ip}`, 20, 3600);
        if (byIp.blocked) {
            return NextResponse.json({ message: "Too many requests. Please try again later" }, { status: 429 });
        }

        // Verify OTP was actually verified
        const otpData = await redis.hGetAll(`otp:${id_number}`);
        if (!otpData || otpData.verified !== "true") {
            return NextResponse.json(
                {
                    message: "OTP not verified. Please restart signup",
                },
                { status: 400 }
            );
        }

        // Get registered user
        const regUser = await RegisteredUsers.findOne({ id_number });
        if (!regUser) {
            return NextResponse.json(
                {
                    message: "User not found",
                },
                { status: 404 }
            );
        }

        // Check if already signed up
        if (regUser.is_signed_up) {
            return NextResponse.json(
                {
                    message: "User already signed up",
                },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create Profile
        const profile = await Profile.create({
            user_id: regUser._id,
            id_number: id_number,
            name: regUser.name,
            email: regUser.email,
            password: hashedPassword,
            role: regUser.role || "user",
            created_at: new Date(),
        });

        // Mark user as signed up
        regUser.is_signed_up = true;
        await regUser.save();
        if (regUser.is_signed_up) {
            regUser.profile_id = profile._id;
            await profile.save();
        }

        // Clean up OTP data
        await redis.del(`otp:${id_number}`);
        await redis.del(`otp:csrf:${id_number}`);
        await redis.del(`otp:resend:${id_number}`);

        // Create authenticated session token
        const sessionJti = crypto.randomUUID();
        const sessionToken = jwt.sign(
            {
                id_number: profile.id_number,
                email: profile.email,
                role: profile.role,
                type: "authenticated_session",
                jti: sessionJti,
            },
            process.env.JWT_SECRET!,
            { expiresIn: "7d" }
        );

        // Store session JTI for potential revocation
        await redis.set(`session:jti:${sessionJti}`, id_number, {
            EX: 7 * 24 * 60 * 60,
        });

        // Delete profile creation token
        cookieStore.delete("profile_token");

        // Set authenticated session cookie
        const isProduction = process.env.NODE_ENV === "production";
        cookieStore.set("session_token", sessionToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60,
        });

        console.log(
            `[INFO] Profile created successfully for ID: ${id_number.substring(0, 3)}*** at ${new Date().toISOString()}`
        );

        return NextResponse.json(
            {
                message: "Account created successfully",
                user: {
                    id_number: profile.id_number,
                    name: profile.name,
                    email: profile.email,
                    role: profile.role,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("[ERROR] Profile creation error:", error);

        const cookieStore = await cookies();
        cookieStore.delete("profile_token");

        return NextResponse.json(
            {
                message: "Failed to create profile. Please try again",
            },
            { status: 500 }
        );
    }
}
