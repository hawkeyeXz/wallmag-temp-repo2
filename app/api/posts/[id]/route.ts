// app/api/posts/[id]/route.ts
import Post from "@/app/models/Post";
import { getAuthenticatedProfile } from "@/lib/auth/permissions";
import { deleteFile } from "@/lib/gridfs";
import { dbConnect } from "@/lib/mongoose";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

// GET - Get single post by ID
export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        await dbConnect();

        const { id } = params;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: "Invalid post ID" }, { status: 400 });
        }

        // Try to get authenticated user (optional for public posts)
        const authResult = await getAuthenticatedProfile();
        const isAuthenticated = !authResult.error;
        const userId = authResult.profile?._id;

        // Find post
        const post = await Post.findById(id).populate("author", "name id_number email");

        if (!post) {
            return NextResponse.json({ message: "Post not found" }, { status: 404 });
        }

        // Access control
        const isAuthor = userId && post.author._id.toString() === userId.toString();
        const isPublished = post.status === "PUBLISHED";

        // Public users can only see published posts
        if (!isAuthenticated && !isPublished) {
            return NextResponse.json({ message: "Post not found" }, { status: 404 });
        }

        // Authenticated users can see their own posts or published posts
        if (isAuthenticated && !isAuthor && !isPublished) {
            return NextResponse.json({ message: "Access denied" }, { status: 403 });
        }

        // Increment view count for published posts
        if (isPublished) {
            await Post.findByIdAndUpdate(id, { $inc: { views: 1 } });
        }

        return NextResponse.json({ post }, { status: 200 });
    } catch (error) {
        console.error("[ERROR] Get post error:", error);
        return NextResponse.json({ message: "Failed to fetch post" }, { status: 500 });
    }
}

// PATCH - Update post (author only, limited to pending/rejected status)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const { error, user, profile } = await getAuthenticatedProfile();
        if (error) return error;

        await dbConnect();

        const { id } = params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: "Invalid post ID" }, { status: 400 });
        }

        const post = await Post.findById(id);

        if (!post) {
            return NextResponse.json({ message: "Post not found" }, { status: 404 });
        }

        // Only author can update
        if (post.author.toString() !== profile._id.toString()) {
            return NextResponse.json({ message: "Access denied" }, { status: 403 });
        }

        // Can only update if post is pending or rejected
        if (!["PENDING_REVIEW", "REJECTED"].includes(post.status)) {
            return NextResponse.json({ message: "Cannot update post in current status" }, { status: 400 });
        }

        const body = await req.json();
        const { title, tags, raw_content } = body;

        // Update allowed fields
        if (title) {
            post.title = title.trim();
        }

        if (tags) {
            post.tags = Array.isArray(tags) ? tags.map((t: string) => t.trim().toLowerCase()) : [];
        }

        if (raw_content && post.submission_type === "paste") {
            if (raw_content.length > 50000) {
                return NextResponse.json({ message: "Content too large (max 50KB)" }, { status: 400 });
            }
            post.raw_content = raw_content.trim();
        }

        // Reset status to pending if was rejected
        if (post.status === "REJECTED") {
            post.status = "PENDING_REVIEW";
            post.rejection_reason = undefined;
        }

        await post.save();

        return NextResponse.json(
            {
                message: "Post updated successfully",
                post,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Update post error:", error);
        return NextResponse.json({ message: "Failed to update post" }, { status: 500 });
    }
}

// DELETE - Delete post (author only, or admin)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const { error, user, profile } = await getAuthenticatedProfile();
        if (error) return error;

        await dbConnect();

        const { id } = params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: "Invalid post ID" }, { status: 400 });
        }

        const post = await Post.findById(id);

        if (!post) {
            return NextResponse.json({ message: "Post not found" }, { status: 404 });
        }

        // Check permissions
        const isAuthor = post.author.toString() === profile._id.toString();
        const isAdmin = profile.role === "admin";

        if (!isAuthor && !isAdmin) {
            return NextResponse.json({ message: "Access denied" }, { status: 403 });
        }

        // Authors can only delete pending or rejected posts
        if (isAuthor && !["PENDING_REVIEW", "REJECTED"].includes(post.status)) {
            return NextResponse.json({ message: "Cannot delete post in current status" }, { status: 400 });
        }

        // Delete associated files from GridFS
        try {
            // Delete original file
            if (post.original_file?.file_id) {
                await deleteFile(post.original_file.file_id);
            }

            // Delete original images
            if (post.original_images && post.original_images.length > 0) {
                for (const img of post.original_images) {
                    await deleteFile(img.file_id);
                }
            }

            // Delete designed files
            if (post.designed_files && post.designed_files.length > 0) {
                for (const file of post.designed_files) {
                    await deleteFile(file.file_id);
                }
            }
        } catch (fileError) {
            console.error("[WARN] Error deleting files:", fileError);
            // Continue with post deletion even if file deletion fails
        }

        // Delete post
        await Post.findByIdAndDelete(id);

        console.log(`[INFO] Post deleted: ${id} by ${profile.name}`);

        return NextResponse.json({ message: "Post deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("[ERROR] Delete post error:", error);
        return NextResponse.json({ message: "Failed to delete post" }, { status: 500 });
    }
}
