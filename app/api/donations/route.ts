// app/api/donations/route.ts
import redis from "@/lib/redis";
import { NextResponse } from "next/server";

// Donation configuration (from environment variables)
const DONATION_CONFIG = {
    upi_id: process.env.NEXT_PUBLIC_UPI_ID || "developer@upi",
    upi_name: process.env.NEXT_PUBLIC_UPI_NAME || "WallMagazine Dev",
    paypal_link: process.env.NEXT_PUBLIC_PAYPAL_LINK || "https://paypal.me/wallmagazine",
};

// GET - Get donation configuration and QR code data
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const method = searchParams.get("method"); // 'upi' or 'paypal'

        // Get donation statistics (optional)
        const stats = await getDonationStats();

        // Return configuration
        return NextResponse.json(
            {
                config: {
                    upi_id: DONATION_CONFIG.upi_id,
                    upi_name: DONATION_CONFIG.upi_name,
                    paypal_link: DONATION_CONFIG.paypal_link,
                },
                stats,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Get donation config error:", error);
        return NextResponse.json({ message: "Failed to fetch donation config" }, { status: 500 });
    }
}

// POST - Track donation intent (analytics only, no actual payment)
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { method, amount, source } = body; // method: 'upi' or 'paypal'

        // Validate method
        if (!method || !["upi", "paypal"].includes(method)) {
            return NextResponse.json({ message: "Invalid payment method" }, { status: 400 });
        }

        // Get IP for analytics
        const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

        // Track donation intent in Redis (for analytics)
        const intentKey = `donation:intent:${Date.now()}`;
        await redis.hSet(intentKey, {
            method,
            amount: amount || "unknown",
            source: source || "web", // 'web', 'mobile', 'tablet'
            ip,
            timestamp: new Date().toISOString(),
        });
        await redis.expire(intentKey, 90 * 24 * 60 * 60); // Keep for 90 days

        // Increment method counter
        const counterKey = `donation:count:${method}`;
        await redis.incr(counterKey);

        console.log(`[INFO] Donation intent tracked: ${method} from ${source}`);

        return NextResponse.json(
            {
                message: "Donation intent tracked",
                config: {
                    upi_id: DONATION_CONFIG.upi_id,
                    upi_name: DONATION_CONFIG.upi_name,
                    paypal_link: DONATION_CONFIG.paypal_link,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Track donation intent error:", error);
        return NextResponse.json({ message: "Failed to track donation" }, { status: 500 });
    }
}

// Helper: Get donation statistics
async function getDonationStats() {
    try {
        const upiCount = await redis.get("donation:count:upi");
        const paypalCount = await redis.get("donation:count:paypal");

        return {
            total_intents: parseInt(upiCount || "0") + parseInt(paypalCount || "0"),
            upi_intents: parseInt(upiCount || "0"),
            paypal_intents: parseInt(paypalCount || "0"),
        };
    } catch (error) {
        return {
            total_intents: 0,
            upi_intents: 0,
            paypal_intents: 0,
        };
    }
}
