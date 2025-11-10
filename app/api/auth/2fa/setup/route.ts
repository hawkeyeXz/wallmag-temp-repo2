// app/api/auth/2fa/setup/route.ts
import RegisteredUsers from "@/app/models/RegisteredUser";
import { requireAuth } from "@/lib/auth/middleware";
import { dbConnect } from "@/lib/mongoose";
import sgMail from "@sendgrid/mail";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextResponse } from "next/server";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// Generate 6-digit backup codes
function generateBackupCodes(count = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(4).toString("hex").toUpperCase();
        codes.push(code);
    }
    return codes;
}

// ENABLE 2FA
export async function POST(req: Request) {
    try {
        const { error, user } = await requireAuth();
        if (error) return error;

        await dbConnect();

        const dbUser = await RegisteredUsers.findOne({ id_number: user.id_number });
        if (!dbUser) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        if (dbUser.two_factor_enabled) {
            return NextResponse.json({ message: "2FA already enabled" }, { status: 400 });
        }

        // Generate backup codes
        const backupCodes = generateBackupCodes(10);
        const hashedCodes = await Promise.all(backupCodes.map(code => bcrypt.hash(code, 11)));

        // Save to database
        dbUser.two_factor_enabled = true;
        dbUser.backup_codes = hashedCodes;
        await dbUser.save();

        // Send backup codes via email
        const msg = {
            to: dbUser.email,
            from: {
                email: process.env.SENDGRID_SENDER_EMAIL!,
                name: "Wall-Magazine",
            },
            subject: "Your 2FA Backup Codes",
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Two-Factor Authentication Enabled</h2>
                    <p>Dear ${dbUser.name},</p>
                    <p>You have successfully enabled two-factor authentication.</p>
                    <p><strong>Save these backup codes in a secure location:</strong></p>
                    <ul>
                        ${backupCodes.map(code => `<li><code>${code}</code></li>`).join("")}
                    </ul>
                    <p>Each code can only be used once. Use them if you lose access to your email.</p>
                    <hr/>
                    <small>© ${new Date().getFullYear()} Wall-Magazine</small>
                </div>
            `,
        };

        try {
            await sgMail.send(msg);
        } catch (emailError) {
            console.error("Error sending backup codes email:", emailError);
        }

        return NextResponse.json(
            {
                message: "2FA enabled successfully",
                backup_codes: backupCodes, // Show once, then user must save
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] 2FA setup error:", error);
        return NextResponse.json({ message: "Failed to enable 2FA" }, { status: 500 });
    }
}

// DISABLE 2FA
export async function DELETE(req: Request) {
    try {
        const { error, user } = await requireAuth();
        if (error) return error;

        await dbConnect();

        const body = await req.json();
        const { password } = body; // Require password to disable

        if (!password) {
            return NextResponse.json({ message: "Password required" }, { status: 400 });
        }

        const dbUser = await RegisteredUsers.findOne({ id_number: user.id_number });
        if (!dbUser) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        // Verify password (assuming you have password field)
        // const validPassword = await bcrypt.compare(password, dbUser.password);
        // if (!validPassword) {
        //     return NextResponse.json({ message: "Invalid password" }, { status: 401 });
        // }

        dbUser.two_factor_enabled = false;
        dbUser.backup_codes = [];
        await dbUser.save();

        return NextResponse.json({ message: "2FA disabled successfully" }, { status: 200 });
    } catch (error) {
        console.error("[ERROR] 2FA disable error:", error);
        return NextResponse.json({ message: "Failed to disable 2FA" }, { status: 500 });
    }
}
