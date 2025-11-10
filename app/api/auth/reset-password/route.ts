// /app/api/auth/reset-password/route.ts
import Profiles from "@/app/models/Profiles";
import { dbConnect } from "@/lib/mongoose";
import redis from "@/lib/redis";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function validatePassword(password: string): { valid: boolean; error?: string } {
    if (!password || password.length < 8) return { valid: false, error: "Password must be at least 8 characters" };
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password))
        return { valid: false, error: "Password must contain uppercase letters and numbers" };
    return { valid: true };
}

export async function POST(req: Request) {
    try {
        await dbConnect();
        const cookieStore = await cookies();
        const forgotToken = cookieStore.get("forgot_token")?.value;
        if (!forgotToken) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }
        const body = await req.json();
        const { id_number, otp, password, confirmPassword } = body;

        if (!id_number || !otp || !password || !confirmPassword) {
            return NextResponse.json({ message: "All fields are required" }, { status: 400 });
        }

        if (password !== confirmPassword) {
            return NextResponse.json({ message: "Passwords do not match" }, { status: 400 });
        }

        const passCheck = validatePassword(password);
        if (!passCheck.valid) return NextResponse.json({ message: passCheck.error }, { status: 400 });

        const cachedKey = `forgot:${id_number}`;
        const data = (await redis.hGetAll(cachedKey)) as Record<string, string>;

        if (!data || !data.hash) return NextResponse.json({ message: "OTP not found or expired" }, { status: 400 });

        const isMatch = await bcrypt.compare(otp, data.hash);
        if (!isMatch) return NextResponse.json({ message: "Invalid OTP" }, { status: 400 });

        // OTP valid → update password
        const passwordHash = await bcrypt.hash(password, 11);
        await Profiles.updateOne({ id_number }, { $set: { password: passwordHash } });

        // Cleanup
        await redis.del(cachedKey);
        cookieStore.delete("forgot_token");

        return NextResponse.json({ message: "Password reset successfully" }, { status: 200 });
    } catch (err) {
        console.error("Reset-password error:", err);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
