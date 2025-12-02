import Post from "@/app/models/Post";
import { requirePermission } from "@/lib/auth/permissions";
import { dbConnect } from "@/lib/mongoose";
import { validateAction, validateObjectId, validateRejectionReason } from "@/lib/security/validators";
import { NextResponse } from "next/server";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const { id } = params;

        const idCheck = validateObjectId(id);
        if (!idCheck.valid) return NextResponse.json({ message: idCheck.error }, { status: 400 });

        // 1. Permission Check
        const { error, user, profile } = await requirePermission("accept_reject_submissions");
        if (error) return error;

        await dbConnect();

        // 2. Parse Body
        const body = await req.json();
        const { action, rejection_reason } = body;

        const actionCheck = validateAction(action, ["accept", "reject"]);
        if (!actionCheck.valid) return NextResponse.json({ message: actionCheck.error }, { status: 400 });

        const post = await Post.findById(id);
        if (!post) return NextResponse.json({ message: "Post not found" }, { status: 404 });

        // 3. Apply Action
        if (action === "accept") {
            // Only allow if currently pending or admin rejected (re-review)
            if (!["PENDING_REVIEW", "ADMIN_REJECTED"].includes(post.status)) {
                return NextResponse.json({ message: "Post is not in a reviewable state" }, { status: 400 });
            }

            post.status = "ACCEPTED";
            post.reviewed_by = profile._id;
            post.reviewed_at = new Date();
            post.rejection_reason = undefined; // Clear any previous rejection
        } else if (action === "reject") {
            const reasonCheck = validateRejectionReason(rejection_reason);
            if (!reasonCheck.valid) return NextResponse.json({ message: reasonCheck.error }, { status: 400 });

            post.status = "REJECTED";
            post.reviewed_by = profile._id;
            post.reviewed_at = new Date();
            post.rejection_reason = reasonCheck.sanitized;
        }

        await post.save();

        // TODO: Send email notification to author

        return NextResponse.json(
            {
                message: `Post ${action}ed successfully`,
                post: { id: post._id, status: post.status },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Review post failed:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
