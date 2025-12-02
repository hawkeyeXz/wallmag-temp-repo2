import Post from "@/app/models/Post";
import { requirePermission } from "@/lib/auth/permissions";
import { dbConnect } from "@/lib/mongoose";
import { validateAction, validateFeaturedUntilDate, validateObjectId } from "@/lib/security/validators";
import { NextResponse } from "next/server";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const { id } = params;

        const idCheck = validateObjectId(id);
        if (!idCheck.valid) return NextResponse.json({ message: idCheck.error }, { status: 400 });

        // 1. Permission Check
        const { error, profile } = await requirePermission("publish_post");
        if (error) return error;

        await dbConnect();

        // 2. Parse Body
        const body = await req.json();
        const { action, featured_until } = body;

        const actionCheck = validateAction(action, ["publish", "unpublish"]);
        if (!actionCheck.valid) return NextResponse.json({ message: actionCheck.error }, { status: 400 });

        const post = await Post.findById(id);
        if (!post) return NextResponse.json({ message: "Post not found" }, { status: 404 });

        // 3. Apply Action
        if (action === "publish") {
            if (post.status !== "APPROVED" && post.status !== "PUBLISHED") {
                return NextResponse.json({ message: "Post must be approved before publishing" }, { status: 400 });
            }

            post.status = "PUBLISHED";
            post.published_at = new Date();
            post.published_by = profile._id;

            if (featured_until) {
                const dateCheck = validateFeaturedUntilDate(featured_until);
                if (!dateCheck.valid) return NextResponse.json({ message: dateCheck.error }, { status: 400 });
                post.featured_until = new Date(featured_until);
            }
        } else if (action === "unpublish") {
            post.status = "APPROVED"; // Revert to approved state
            post.featured_until = undefined;
        }

        await post.save();

        return NextResponse.json(
            {
                message: `Post ${action}ed successfully`,
                post: { id: post._id, status: post.status },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Publish post failed:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
