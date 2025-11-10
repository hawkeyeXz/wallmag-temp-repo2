// app/api/user/profile/route.ts
import Profile from "@/app/models/Profiles";
import { dbConnect } from "@/lib/mongoose";
import redis from "@/lib/redis";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        await dbConnect();

        // Get session token from cookies
        const cookieStore = await cookies();
        const token = cookieStore.get("session_token")?.value;

        console.log("[DEBUG] Profile API - Token present:", !!token);

        if (!token) {
            console.log("[DEBUG] Profile API - No token found in cookies");
            return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
        }

        // Verify JWT token
        let decoded: any;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!);
            console.log("[DEBUG] Profile API - Token decoded:", decoded.id_number?.substring(0, 3) + "***");
        } catch (err) {
            console.error("[DEBUG] Profile API - Token verification failed:", err);
            // Invalid token, clear it
            cookieStore.delete("session_token");
            return NextResponse.json({ message: "Invalid session" }, { status: 401 });
        }

        // Validate token type
        if (decoded.type !== "authenticated_session") {
            console.log("[DEBUG] Profile API - Invalid token type:", decoded.type);
            return NextResponse.json({ message: "Invalid token type" }, { status: 401 });
        }

        // Check if token is blacklisted
        if (decoded.jti) {
            const blacklisted = await redis.exists(`token:blacklist:${decoded.jti}`);
            if (blacklisted) {
                console.log("[DEBUG] Profile API - Token blacklisted");
                cookieStore.delete("session_token");
                return NextResponse.json({ message: "Session revoked" }, { status: 401 });
            }
        }

        // Fetch user profile from database
        const profile = await Profile.findOne({ id_number: decoded.id_number }).select("-password -__v"); // Don't return password

        if (!profile) {
            console.log("[DEBUG] Profile API - Profile not found for:", decoded.id_number?.substring(0, 3) + "***");
            return NextResponse.json({ message: "Profile not found" }, { status: 404 });
        }

        console.log("[DEBUG] Profile API - Success for:", profile.id_number?.substring(0, 3) + "***");

        // Return user data
        return NextResponse.json(
            {
                user: {
                    id_number: profile.id_number,
                    name: profile.name,
                    email: profile.email,
                    two_factor_enabled: profile.two_factor_enabled || false,
                    role: profile.role || "user",
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Profile API error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// Update profile
export async function PATCH(req: Request) {
    try {
        await dbConnect();

        const cookieStore = await cookies();
        const token = cookieStore.get("session_token")?.value;

        if (!token) {
            return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
        }

        let decoded: any;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!);
        } catch (err) {
            cookieStore.delete("session_token");
            return NextResponse.json({ message: "Invalid session" }, { status: 401 });
        }

        if (decoded.type !== "authenticated_session") {
            return NextResponse.json({ message: "Invalid token type" }, { status: 401 });
        }

        const body = await req.json();
        const { name } = body;

        if (!name || typeof name !== "string" || name.trim().length === 0) {
            return NextResponse.json({ message: "Invalid name" }, { status: 400 });
        }

        const profile = await Profile.findOne({ id_number: decoded.id_number });
        if (!profile) {
            return NextResponse.json({ message: "Profile not found" }, { status: 404 });
        }

        profile.name = name.trim();
        await profile.save();

        return NextResponse.json(
            {
                message: "Profile updated successfully",
                user: {
                    name: profile.name,
                    email: profile.email,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Profile update error:", error);
        return NextResponse.json({ message: "Failed to update profile" }, { status: 500 });
    }
}
