import Post from "@/app/models/Post";
import { getAuthenticatedProfile, requirePermission } from "@/lib/auth/permissions";
import { deleteFile } from "@/lib/blob"; // Ensure this is imported
import { dbConnect } from "@/lib/mongoose";
import { validateObjectId } from "@/lib/security/validators";
import { NextResponse } from "next/server";

// GET - Retrieve a single post (Existing code)
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const { id } = params;

        const idCheck = validateObjectId(id);
        if (!idCheck.valid) return NextResponse.json({ message: idCheck.error }, { status: 400 });

        await dbConnect();

        const post = await Post.findById(id).populate("author", "name email").populate("reviewed_by", "name").lean();

        if (!post) {
            return NextResponse.json({ message: "Post not found" }, { status: 404 });
        }

        if (post.status === "PUBLISHED") {
            // Fire and forget view increment
            // Note: 'views' field was removed from schema, so this might fail silently or needs removal too.
            // Keeping it commented out unless you add 'views' back.
            // Post.findByIdAndUpdate(id, { $inc: { views: 1 } }).exec();
            return NextResponse.json({ post }, { status: 200 });
        }

        const { user, profile } = await getAuthenticatedProfile();

        if (!user || !profile) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const isAuthor = post.author._id.toString() === profile._id.toString();
        const isStaff = ["editor", "admin", "publisher"].includes(profile.role);

        if (!isAuthor && !isStaff) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json({ post }, { status: 200 });
    } catch (error) {
        console.error("[ERROR] Get single post failed:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// DELETE - Remove a post and its associated Vercel Blob files
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const { id } = params;

        const idCheck = validateObjectId(id);
        if (!idCheck.valid) return NextResponse.json({ message: idCheck.error }, { status: 400 });

        const { error, profile } = await requirePermission("delete_post");
        // Note: You might want to allow Authors to delete their own pending posts.
        // If so, custom logic is needed here instead of the strict permission check.
        // For now, assuming only Admins/Editors with 'delete_post' permission can delete.

        if (error) return error;

        await dbConnect();

        const post = await Post.findById(id);
        if (!post) return NextResponse.json({ message: "Post not found" }, { status: 404 });

        // --- BLOB CLEANUP LOGIC ---
        const deletePromises = [];

        // 1. Delete Original File (if exists)
        if (post.original_file?.url) {
            deletePromises.push(deleteFile(post.original_file.url));
        }

        // Note: original_images and designed_files were removed from the schema in the latest update.
        // If you still have old records with these fields, you might want to keep this logic,
        // but TypeScript will complain if the types don't match the new Interface.
        // Assuming we are moving forward with the cleaned schema:

        // Execute all deletions in parallel
        await Promise.allSettled(deletePromises);
        // --------------------------

        // Delete from DB
        await Post.findByIdAndDelete(id);

        return NextResponse.json({ message: "Post and associated files deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("[ERROR] Delete post failed:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
