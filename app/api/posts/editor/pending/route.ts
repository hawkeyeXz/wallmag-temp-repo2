import Post from "@/app/models/Post";
import { requirePermission } from "@/lib/auth/permissions";
import { dbConnect } from "@/lib/mongoose";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        // 1. Check permissions
        const { error, user } = await requirePermission("view_pending_submissions");
        if (error) return error;

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") || "PENDING_REVIEW";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const skip = (page - 1) * limit;

        // 2. Fetch Posts
        const query = { status };

        const posts = await Post.find(query)
            .sort({ created_at: 1 }) // Oldest first for FIFO review queue
            .skip(skip)
            .limit(limit)
            .select("title author_name category submission_type status created_at")
            .lean();

        // 3. Aggregate Stats
        // Count documents for each relevant status to show in dashboard cards
        const statsPipeline = [
            {
                $match: {
                    status: {
                        $in: ["PENDING_REVIEW", "ACCEPTED", "DESIGNING", "ADMIN_REJECTED"],
                    },
                },
            },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ];

        const statsResult = await Post.aggregate(statsPipeline);

        // Transform array to object: { PENDING_REVIEW: 5, ACCEPTED: 2, ... }
        const stats = statsResult.reduce((acc, curr) => {
            acc[curr._id.toLowerCase()] = curr.count;
            return acc;
        }, {});

        // 4. Category Stats (for the current status view)
        const categoryStatsPipeline = [{ $match: { status } }, { $group: { _id: "$category", count: { $sum: 1 } } }];

        const catStatsResult = await Post.aggregate(categoryStatsPipeline);
        const category_stats = catStatsResult.reduce((acc, curr) => {
            acc[curr._id || "uncategorized"] = curr.count;
            return acc;
        }, {});

        return NextResponse.json({
            posts,
            stats, // Overall queue stats
            category_stats, // Breakdown for current view
            pagination: {
                page,
                limit,
                hasMore: posts.length === limit,
            },
        });
    } catch (error) {
        console.error("[ERROR] Fetch pending posts failed:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
