import Post from "@/app/models/Post";
import { getAuthenticatedProfile } from "@/lib/auth/permissions";
import { dbConnect } from "@/lib/mongoose";
import { validateObjectId } from "@/lib/security/validators";
import { NextResponse } from "next/server";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        // Await params for Next.js 16 compatibility
        const params = await props.params;
        const { id } = params;

        // 1. Validate ID format
        const idCheck = validateObjectId(id);
        if (!idCheck.valid) return NextResponse.json({ message: idCheck.error }, { status: 400 });

        await dbConnect();

        // 2. Fetch Post
        const post = await Post.findById(id)
            .populate("author", "name email")
            .populate("reviewed_by", "name")
            .populate("designed_files.uploaded_by", "name")
            .lean();

        if (!post) {
            return NextResponse.json({ message: "Post not found" }, { status: 404 });
        }

        // 3. Access Control Logic

        // Scenario A: Public Access - STRICTLY only for PUBLISHED posts
        if (post.status === "PUBLISHED") {
            // Increment view count asynchronously (fire and forget)
            Post.findByIdAndUpdate(id, { $inc: { views: 1 } }).exec();

            return NextResponse.json({ post }, { status: 200 });
        }

        // Scenario B: Restricted Access (Drafts, Pending, Rejected, Designing, etc.)
        // If code reaches here, the post is NOT public.

        const { user, profile } = await getAuthenticatedProfile();

        // 3a. Must be logged in to see non-published posts
        if (!user || !profile) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // 3b. Check ownership or role
        // Author can always see their own submission
        const isAuthor = post.author._id.toString() === profile._id.toString();

        // Editors, Admins, Publishers can see submissions
        const isStaff = ["editor", "admin", "publisher"].includes(profile.role);

        if (!isAuthor && !isStaff) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        // If authorized (Author or Staff), return the non-published post
        return NextResponse.json({ post }, { status: 200 });
    } catch (error) {
        console.error("[ERROR] Get single post failed:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
