// app/api/admin/security/dashboard/route.ts
import { requireAuth } from "@/lib/auth/middleware";
import { dbConnect } from "@/lib/mongoose";
import { blockIP, getSecurityDashboard, unblockIP } from "@/lib/security/monitoring";
import { NextResponse } from "next/server";

// GET - View security dashboard
export async function GET(req: Request) {
    const { error, user } = await requireAuth();
    if (error) return error;

    try {
        await dbConnect();

        // TODO: Add admin role check
        // const dbUser = await RegisteredUsers.findOne({ id_number: user.id_number });
        // if (!dbUser.is_admin) {
        //     return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
        // }

        const { searchParams } = new URL(req.url);
        const hours = parseInt(searchParams.get("hours") || "24");

        const dashboard = await getSecurityDashboard(hours);

        return NextResponse.json(dashboard, { status: 200 });
    } catch (error) {
        console.error("[ERROR] Security dashboard error:", error);
        return NextResponse.json({ message: "Failed to load dashboard" }, { status: 500 });
    }
}

// POST - Block/Unblock IP
export async function POST(req: Request) {
    const { error, user } = await requireAuth();
    if (error) return error;

    try {
        await dbConnect();

        // TODO: Add admin role check
        const body = await req.json();
        const { action, ip, duration } = body;

        if (!action || !ip) {
            return NextResponse.json({ message: "Invalid request" }, { status: 400 });
        }

        if (action === "block") {
            await blockIP(ip, duration || 86400);
            return NextResponse.json({ message: `IP ${ip} blocked` }, { status: 200 });
        } else if (action === "unblock") {
            await unblockIP(ip);
            return NextResponse.json({ message: `IP ${ip} unblocked` }, { status: 200 });
        } else {
            return NextResponse.json({ message: "Invalid action" }, { status: 400 });
        }
    } catch (error) {
        console.error("[ERROR] IP blocking error:", error);
        return NextResponse.json({ message: "Failed to process request" }, { status: 500 });
    }
}
