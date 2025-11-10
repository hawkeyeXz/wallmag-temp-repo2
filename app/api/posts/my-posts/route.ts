// app/api/posts/my-posts/route.ts
import Post from "@/app/models/Post";
import { getAuthenticatedProfile } from "@/lib/auth/permissions";
import { dbConnect } from "@/lib/mongoose";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { error, user, profile } = await getAuthenticatedProfile();
        if (error) return error;

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const category = searchParams.get("category");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        // Build query - only user's own posts
        const query: any = {
            author: profile._id,
        };

        if (status) {
            query.status = status;
        }

        if (category) {
            query.category = category;
        }

        // Execute query
        const posts = await Post.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).select("-raw_content"); // Don't send full content in list

        const total = await Post.countDocuments(query);

        // Group by status for dashboard stats
        const statusCounts = await Post.aggregate([
            { $match: { author: profile._id } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]);

        const stats = statusCounts.reduce((acc: any, item: any) => {
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
                    pending: stats.PENDING_REVIEW || 0,
                    accepted: stats.ACCEPTED || 0,
                    rejected: stats.REJECTED || 0,
                    designing: stats.DESIGNING || 0,
                    awaiting_admin: stats.AWAITING_ADMIN || 0,
                    published: stats.PUBLISHED || 0,
                    total,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Get my posts error:", error);
        return NextResponse.json({ message: "Failed to fetch posts" }, { status: 500 });
    }
}
