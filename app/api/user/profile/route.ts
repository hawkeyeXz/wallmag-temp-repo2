import Profile from "@/app/models/Profiles";
import { dbConnect } from "@/lib/mongoose";
import redis from "@/lib/redis";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
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

        if (decoded.jti) {
            const blacklisted = await redis.exists(`token:blacklist:${decoded.jti}`);
            if (blacklisted) {
                cookieStore.delete("session_token");
                return NextResponse.json({ message: "Session revoked" }, { status: 401 });
            }
        }

        const profile = await Profile.findOne({ id_number: decoded.id_number }).select("-password -__v");

        if (!profile) {
            return NextResponse.json({ message: "Profile not found" }, { status: 404 });
        }

        return NextResponse.json(
            {
                user: {
                    id_number: profile.id_number,
                    name: profile.name,
                    email: profile.email,
                    two_factor_enabled: profile.two_factor_enabled || false,
                    role: profile.role || "user",
                    // ADDED: Return the profile picture URL
                    profile_picture_url: profile.profile_picture_url || null,
                    bio: profile.bio || "",
                    social_links: profile.social_links || {},
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Profile API error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// Update basic info (Name, Bio, etc.)
export async function PATCH(req: Request) {
    try {
        await dbConnect();
        const cookieStore = await cookies();
        const token = cookieStore.get("session_token")?.value;

        if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

        let decoded: any;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!);
        } catch (err) {
            return NextResponse.json({ message: "Invalid session" }, { status: 401 });
        }

        const body = await req.json();
        const { name, bio, social_links } = body;

        const profile = await Profile.findOne({ id_number: decoded.id_number });
        if (!profile) return NextResponse.json({ message: "Profile not found" }, { status: 404 });

        if (name) profile.name = name.trim();
        if (bio !== undefined) profile.bio = bio.trim();
        if (social_links) profile.social_links = { ...profile.social_links, ...social_links };

        await profile.save();

        return NextResponse.json(
            {
                message: "Profile updated successfully",
                user: {
                    name: profile.name,
                    email: profile.email,
                    profile_picture_url: profile.profile_picture_url,
                    bio: profile.bio,
                    social_links: profile.social_links,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Profile update error:", error);
        return NextResponse.json({ message: "Failed to update profile" }, { status: 500 });
    }
}
