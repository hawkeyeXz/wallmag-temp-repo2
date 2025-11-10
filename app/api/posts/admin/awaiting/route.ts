// app/api/posts/admin/awaiting/route.ts
import Post from "@/app/models/Post";
import { requirePermission } from "@/lib/auth/permissions";
import { dbConnect } from "@/lib/mongoose";
import { NextResponse } from "next/server";

// GET - Get posts awaiting admin approval
export async function GET(req: Request) {
    try {
        const { error, user, profile } = await requirePermission("approve_designs");
        if (error) return error;

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") || "AWAITING_ADMIN";
        const category = searchParams.get("category");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        // Build query for admin's view
        const query: any = {
            status: {
                $in: ["AWAITING_ADMIN", "APPROVED"],
            },
        };

        // Filter by specific status if provided
        if (status && ["AWAITING_ADMIN", "APPROVED"].includes(status)) {
            query.status = status;
        }

        if (category) {
            query.category = category;
        }

        // Get posts
        const posts = await Post.find(query)
            .populate("author", "name id_number email")
            .populate("reviewed_by", "name") // Editor who reviewed
            .populate({
                path: "designed_files.uploaded_by",
                select: "name",
            })
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .select("-raw_content");

        const total = await Post.countDocuments(query);

        // Get statistics for admin dashboard
        const stats = await Post.aggregate([
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
        ]);

        const statusCounts = stats.reduce((acc: any, item: any) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        // Category breakdown for awaiting admin
        const categoryStats = await Post.aggregate([
            { $match: { status: "AWAITING_ADMIN" } },
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

        // Recent activity - published posts
        const recentPublished = await Post.find({ status: "PUBLISHED" })
            .sort({ published_at: -1 })
            .limit(5)
            .select("title published_at category views likes");

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
                    awaiting_admin: statusCounts.AWAITING_ADMIN || 0,
                    approved: statusCounts.APPROVED || 0,
                    published: statusCounts.PUBLISHED || 0,
                    total,
                },
                category_stats: categoryCounts,
                recent_published: recentPublished,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Get admin awaiting posts error:", error);
        return NextResponse.json({ message: "Failed to fetch posts" }, { status: 500 });
    }
}
