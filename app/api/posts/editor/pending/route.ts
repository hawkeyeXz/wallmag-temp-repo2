// app/api/posts/editor/pending/route.ts
import Post from "@/app/models/Post";
import { requirePermission } from "@/lib/auth/permissions";
import { dbConnect } from "@/lib/mongoose";
import { NextResponse } from "next/server";

// GET - Get pending submissions for editor review
export async function GET(req: Request) {
    try {
        const { error, user, profile } = await requirePermission("view_pending_submissions");
        if (error) return error;

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") || "PENDING_REVIEW";
        const category = searchParams.get("category");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        // Build query for editor's view
        const query: any = {
            status: {
                $in: ["PENDING_REVIEW", "ACCEPTED", "DESIGNING", "ADMIN_REJECTED"],
            },
        };

        // Filter by specific status if provided
        if (status && ["PENDING_REVIEW", "ACCEPTED", "DESIGNING", "ADMIN_REJECTED"].includes(status)) {
            query.status = status;
        }

        if (category) {
            query.category = category;
        }

        // Get posts
        const posts = await Post.find(query)
            .populate("author", "name id_number email")
            .populate("reviewed_by", "name")
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .select("-raw_content"); // Don't send full content in list

        const total = await Post.countDocuments(query);

        // Get statistics for editor dashboard
        const stats = await Post.aggregate([
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
        ]);

        const statusCounts = stats.reduce((acc: any, item: any) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        // Category breakdown for pending
        const categoryStats = await Post.aggregate([
            { $match: { status: "PENDING_REVIEW" } },
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 },
                },
            },
        ]);

        const categoryCounts = categoryStats.reduce((acc: any, item: any) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        return NextResponse.json(
            {
                posts,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
                stats: {
                    pending_review: statusCounts.PENDING_REVIEW || 0,
                    accepted: statusCounts.ACCEPTED || 0,
                    designing: statusCounts.DESIGNING || 0,
                    admin_rejected: statusCounts.ADMIN_REJECTED || 0,
                    total,
                },
                category_stats: categoryCounts,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Get editor pending posts error:", error);
        return NextResponse.json({ message: "Failed to fetch posts" }, { status: 500 });
    }
}
