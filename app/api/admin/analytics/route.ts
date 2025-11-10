// app/api/admin/analytics/route.ts
import Post from "@/app/models/Post";
import Profiles from "@/app/models/Profiles";
import { requirePermission } from "@/lib/auth/permissions";
import { dbConnect } from "@/lib/mongoose";
import { NextResponse } from "next/server";

// GET - Get platform analytics (admin only)
export async function GET(req: Request) {
    try {
        const { error, user, profile } = await requirePermission("view_analytics");
        if (error) return error;

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const period = searchParams.get("period") || "30"; // days
        const days = parseInt(period);

        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - days);

        // Overall statistics
        const totalPosts = await Post.countDocuments();
        const publishedPosts = await Post.countDocuments({ status: "PUBLISHED" });
        const pendingPosts = await Post.countDocuments({ status: "PENDING_REVIEW" });
        const totalUsers = await Profiles.countDocuments();

        // Status breakdown
        const statusBreakdown = await Post.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]);

        const statusCounts = statusBreakdown.reduce((acc: any, item: any) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        // Category breakdown (published only)
        const categoryBreakdown = await Post.aggregate([
            { $match: { status: "PUBLISHED" } },
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 },
                    total_views: { $sum: "$views" },
                    total_likes: { $sum: { $size: "$likes" } },
                },
            },
        ]);

        // Recent posts (last N days)
        const recentPosts = await Post.countDocuments({
            created_at: { $gte: dateFrom },
        });

        const recentPublished = await Post.countDocuments({
            status: "PUBLISHED",
            published_at: { $gte: dateFrom },
        });

        // Top viewed posts
        const topViewed = await Post.find({ status: "PUBLISHED" })
            .sort({ views: -1 })
            .limit(10)
            .select("title category views published_at author_name");

        // Top liked posts
        const topLiked = await Post.aggregate([
            { $match: { status: "PUBLISHED" } },
            {
                $project: {
                    title: 1,
                    category: 1,
                    author_name: 1,
                    published_at: 1,
                    likes_count: { $size: "$likes" },
                },
            },
            { $sort: { likes_count: -1 } },
            { $limit: 10 },
        ]);

        // Top contributors
        const topContributors = await Post.aggregate([
            { $match: { status: "PUBLISHED" } },
            {
                $group: {
                    _id: "$author",
                    author_name: { $first: "$author_name" },
                    post_count: { $sum: 1 },
                    total_views: { $sum: "$views" },
                    total_likes: { $sum: { $size: "$likes" } },
                },
            },
            { $sort: { post_count: -1 } },
            { $limit: 10 },
        ]);

        // Posts over time (last 30 days)
        const postsOverTime = await Post.aggregate([
            {
                $match: {
                    created_at: { $gte: dateFrom },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$created_at",
                        },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Engagement metrics
        const engagementMetrics = await Post.aggregate([
            { $match: { status: "PUBLISHED" } },
            {
                $group: {
                    _id: null,
                    total_views: { $sum: "$views" },
                    total_likes: { $sum: { $size: "$likes" } },
                    avg_views: { $avg: "$views" },
                    avg_likes: { $avg: { $size: "$likes" } },
                },
            },
        ]);

        const engagement = engagementMetrics[0] || {
            total_views: 0,
            total_likes: 0,
            avg_views: 0,
            avg_likes: 0,
        };

        // Editor performance
        const editorPerformance = await Post.aggregate([
            { $match: { reviewed_by: { $exists: true } } },
            {
                $lookup: {
                    from: "profiles",
                    localField: "reviewed_by",
                    foreignField: "_id",
                    as: "reviewer",
                },
            },
            { $unwind: "$reviewer" },
            {
                $group: {
                    _id: "$reviewed_by",
                    editor_name: { $first: "$reviewer.name" },
                    reviewed_count: { $sum: 1 },
                    accepted_count: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "ACCEPTED"] }, 1, 0],
                        },
                    },
                    rejected_count: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "REJECTED"] }, 1, 0],
                        },
                    },
                },
            },
            { $sort: { reviewed_count: -1 } },
            { $limit: 10 },
        ]);

        return NextResponse.json(
            {
                overview: {
                    total_posts: totalPosts,
                    published_posts: publishedPosts,
                    pending_posts: pendingPosts,
                    total_users: totalUsers,
                },
                status_breakdown: statusCounts,
                category_breakdown: categoryBreakdown,
                recent_activity: {
                    period_days: days,
                    new_posts: recentPosts,
                    new_published: recentPublished,
                },
                engagement: {
                    total_views: engagement.total_views,
                    total_likes: engagement.total_likes,
                    avg_views_per_post: Math.round(engagement.avg_views),
                    avg_likes_per_post: Math.round(engagement.avg_likes),
                },
                top_posts: {
                    most_viewed: topViewed,
                    most_liked: topLiked,
                },
                top_contributors: topContributors,
                editor_performance: editorPerformance,
                posts_over_time: postsOverTime,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Analytics error:", error);
        return NextResponse.json({ message: "Failed to fetch analytics" }, { status: 500 });
    }
}
