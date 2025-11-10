import type { IPost } from "@/app/models/Post";
import Post from "@/app/models/Post";
import { dbConnect } from "@/lib/mongoose";
import type { Category, PostSummary } from "@/lib/types";

/**
 * Extract image URL from designed files or original images
 */
function getImageFromPost(post: any): string | undefined {
    // First try designed files (published designs)
    if (post.designed_files?.length > 0) {
        const currentFile = post.designed_files.find((f: any) => f.is_current);
        const file = currentFile || post.designed_files[0];
        if (file?.file_id) {
            return `/api/posts/files/${file.file_id}`;
        }
    }

    // Then try original images
    if (post.original_images?.length > 0) {
        const firstImage = post.original_images[0];
        if (firstImage?.file_id) {
            return `/api/posts/files/${firstImage.file_id}`;
        }
    }

    return undefined;
}

/**
 * Convert MongoDB post to PostSummary
 */
function mapPostToSummary(post: any): PostSummary {
    return {
        id: post._id.toString(),
        title: post.title || "",
        author: (post.author as any)?.name || post.author_name || "Anonymous",
        date: post.published_at?.toISOString() || post.created_at?.toISOString() || new Date().toISOString(),
        category: post.category as Category,
        excerpt: post.excerpt || post.raw_content?.slice(0, 200) || "",
        content: post.raw_content || "",
        image: getImageFromPost(post),
        likes: post.likes?.length || 0,
        approved: true,
    };
}

/**
 * Get featured post (published + featured, or most recent published)
 */
export async function getFeatured(): Promise<PostSummary | null> {
    try {
        await dbConnect();

        const post = (await Post.findOne({ status: "PUBLISHED" })
            .populate("author", "name")
            .sort({ featured_until: -1, published_at: -1 })
            .lean()
            .exec()) as unknown as IPost | null;

        if (!post) {
            return null;
        }

        return mapPostToSummary(post);
    } catch (error) {
        console.error("[ERROR] Error fetching featured post:", error);
        return null;
    }
}

/**
 * Get latest published posts by category
 */
export async function getLatestByCategory(category: string, limit = 3): Promise<PostSummary[]> {
    try {
        await dbConnect();

        const posts = (await Post.find({
            status: "PUBLISHED",
            category: category.toLowerCase(),
        })
            .populate("author", "name")
            .sort({ featured_until: -1, published_at: -1, created_at: -1 })
            .limit(limit)
            .lean()
            .exec()) as unknown as IPost[];

        return posts.map(mapPostToSummary);
    } catch (error) {
        console.error(`[ERROR] Error fetching latest ${category} posts:`, error);
        return [];
    }
}

/**
 * Get all published categories with post counts
 */
export async function getCategoryStats() {
    try {
        await dbConnect();

        const stats = await Post.aggregate([
            { $match: { status: "PUBLISHED" } },
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
        ]);

        return stats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
        }, {} as Record<string, number>);
    } catch (error) {
        console.error("[ERROR] Error fetching category stats:", error);
        return {};
    }
}

/**
 * Get post by ID with view count increment
 */
export async function getPostWithViewIncrement(postId: string): Promise<PostSummary | null> {
    try {
        await dbConnect();

        const post = (await Post.findByIdAndUpdate(postId, { $inc: { views: 1 } }, { new: true })
            .populate("author", "name")
            .lean()
            .exec()) as unknown as IPost | null;

        if (!post || post.status !== "PUBLISHED") {
            return null;
        }

        return mapPostToSummary(post);
    } catch (error) {
        console.error("[ERROR] Error fetching post:", error);
        return null;
    }
}

/**
 * Search posts by query
 */
export async function searchPosts(query: string, category?: string, limit = 10): Promise<PostSummary[]> {
    try {
        await dbConnect();

        const filter: any = { status: "PUBLISHED" };

        if (category) {
            filter.category = category.toLowerCase();
        }

        // Text search on title and tags
        if (query) {
            filter.$or = [{ title: { $regex: query, $options: "i" } }, { tags: { $regex: query, $options: "i" } }];
        }

        const posts = (await Post.find(filter)
            .populate("author", "name")
            .sort({ published_at: -1, created_at: -1 })
            .limit(limit)
            .lean()
            .exec()) as unknown as IPost[];

        return posts.map(mapPostToSummary);
    } catch (error) {
        console.error("[ERROR] Error searching posts:", error);
        return [];
    }
}
