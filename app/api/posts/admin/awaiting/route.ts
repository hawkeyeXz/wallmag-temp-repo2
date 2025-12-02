import Post from "@/app/models/Post";
import { requirePermission } from "@/lib/auth/permissions";
import { dbConnect } from "@/lib/mongoose";
import { validatePagination } from "@/lib/security/validators";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        // 1. Check permissions
        const { error } = await requirePermission("approve_designs");
        if (error) return error;

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") || "AWAITING_ADMIN";
        const page = searchParams.get("page");
        const limit = searchParams.get("limit");

        const pageCheck = validatePagination(page, limit);
        if (!pageCheck.valid) return NextResponse.json({ message: pageCheck.error }, { status: 400 });

        const pageNum = parseInt(page || "1");
        const limitNum = parseInt(limit || "10");
        const skip = (pageNum - 1) * limitNum;

        // 2. Fetch Posts
        const query = { status };

        const posts = await Post.find(query)
            .populate("author", "name")
            .populate("reviewed_by", "name") // Show who edited it
            .sort({ updated_at: -1 }) // Recently updated first
            .skip(skip)
            .limit(limitNum)
            .select("title category status updated_at")
            .lean();

        // 3. Aggregate Stats
        const statsPipeline = [
            {
                $match: {
                    status: {
                        $in: ["AWAITING_ADMIN", "APPROVED", "PUBLISHED"],
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
        const stats = statsResult.reduce((acc, curr) => {
            acc[curr._id.toLowerCase()] = curr.count;
            return acc;
        }, {});

        // 4. Recent Published
        const recentPublished = await Post.find({ status: "PUBLISHED" })
            .sort({ published_at: -1 })
            .limit(5)
            .select("title category views likes")
            .lean();

        return NextResponse.json({
            posts,
            stats,
            recent_published: recentPublished,
            pagination: {
                page: pageNum,
                limit: limitNum,
                hasMore: posts.length === limitNum,
            },
        });
    } catch (error) {
        console.error("[ERROR] Fetch admin posts failed:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
