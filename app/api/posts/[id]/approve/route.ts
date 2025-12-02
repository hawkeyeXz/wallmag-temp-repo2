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
        const { error, user } = await requirePermission("approve_designs");
        if (error) return error;

        await dbConnect();

        // 2. Parse Body
        const body = await req.json();
        const { action, rejection_reason } = body;

        const actionCheck = validateAction(action, ["approve", "reject"]);
        if (!actionCheck.valid) return NextResponse.json({ message: actionCheck.error }, { status: 400 });

        const post = await Post.findById(id);
        if (!post) return NextResponse.json({ message: "Post not found" }, { status: 404 });

        // Only allow if awaiting admin
        if (post.status !== "AWAITING_ADMIN") {
            return NextResponse.json({ message: "Post is not waiting for admin approval" }, { status: 400 });
        }

        // 3. Apply Action
        if (action === "approve") {
            post.status = "APPROVED";
            post.rejection_reason = undefined;
        } else if (action === "reject") {
            const reasonCheck = validateRejectionReason(rejection_reason);
            if (!reasonCheck.valid) return NextResponse.json({ message: reasonCheck.error }, { status: 400 });

            post.status = "ADMIN_REJECTED"; // Goes back to Editor
            post.rejection_reason = reasonCheck.sanitized;
        }

        await post.save();

        return NextResponse.json(
            {
                message: `Design ${action}d successfully`,
                post: { id: post._id, status: post.status },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Admin approve failed:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
