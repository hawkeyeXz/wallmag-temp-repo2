// app/api/admin/donations/analytics/route.ts
import { requirePermission } from "@/lib/auth/permissions";
import redis from "@/lib/redis";
import { NextResponse } from "next/server";

// GET - Get donation analytics (admin only)
export async function GET(req: Request) {
    try {
        const { error } = await requirePermission("view_analytics");
        if (error) return error;

        const { searchParams } = new URL(req.url);
        const days = parseInt(searchParams.get("days") || "30");

        // Get donation intent counts
        const upiCount = await redis.get("donation:count:upi");
        const paypalCount = await redis.get("donation:count:paypal");

        // Get recent intents
        const intentKeys = await redis.keys("donation:intent:*");
        const recentIntents = [];

        // Get last 50 intents
        const sortedKeys = intentKeys.sort().reverse().slice(0, 50);
        for (const key of sortedKeys) {
            const data = await redis.hGetAll(key);
            if (data && data.timestamp) {
                recentIntents.push(data);
            }
        }

        // Group by date
        const intentsByDate: Record<string, number> = {};
        const intentsByMethod: Record<string, number> = {
            upi: 0,
            paypal: 0,
        };
        const intentsBySource: Record<string, number> = {
            web: 0,
            mobile: 0,
            tablet: 0,
        };

        recentIntents.forEach(intent => {
            const date = new Date(intent.timestamp).toISOString().split("T")[0];
            intentsByDate[date] = (intentsByDate[date] || 0) + 1;

            if (intent.method) {
                intentsByMethod[intent.method] = (intentsByMethod[intent.method] || 0) + 1;
            }

            if (intent.source) {
                intentsBySource[intent.source] = (intentsBySource[intent.source] || 0) + 1;
            }
        });

        // Convert to array for frontend charts
        const intentsOverTime = Object.entries(intentsByDate)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json(
            {
                summary: {
                    total_intents: parseInt(upiCount || "0") + parseInt(paypalCount || "0"),
                    upi_intents: parseInt(upiCount || "0"),
                    paypal_intents: parseInt(paypalCount || "0"),
                },
                breakdown: {
                    by_method: intentsByMethod,
                    by_source: intentsBySource,
                },
                recent_intents: recentIntents.slice(0, 20),
                intents_over_time: intentsOverTime,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Donation analytics error:", error);
        return NextResponse.json({ message: "Failed to fetch donation analytics" }, { status: 500 });
    }
}
