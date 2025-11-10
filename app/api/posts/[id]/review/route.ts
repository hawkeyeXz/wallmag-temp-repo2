// app/api/posts/[id]/review/route.ts
import Post from "@/app/models/Post";
import { requirePermission } from "@/lib/auth/permissions";
import { dbConnect } from "@/lib/mongoose";
import { validateAction, validateObjectId, validateRejectionReason } from "@/lib/security/validators";
import { NextResponse } from "next/server";

// POST - Accept or Reject post (editor only)
export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const { error, user, profile } = await requirePermission("accept_reject_submissions");
        if (error) return error;

        await dbConnect();

        const { id } = params;

        const idValidation = validateObjectId(id);
        if (!idValidation.valid) {
            return NextResponse.json({ message: idValidation.error }, { status: 400 });
        }

        const body = await req.json();
        const { action, rejection_reason } = body;

        const actionValidation = validateAction(action, ["accept", "reject"]);
        if (!actionValidation.valid) {
            return NextResponse.json({ message: actionValidation.error }, { status: 400 });
        }

        const post = await Post.findById(id);

        if (!post) {
            return NextResponse.json({ message: "Post not found" }, { status: 404 });
        }

        if (post.status !== "PENDING_REVIEW") {
            return NextResponse.json({ message: `Cannot review post in ${post.status} status` }, { status: 400 });
        }

        if (action === "accept") {
            post.status = "ACCEPTED";
            post.reviewed_by = profile._id;
            post.reviewed_at = new Date();
            post.rejection_reason = undefined;

            await post.save();

            console.log(`[INFO] Post accepted: ${id} by ${profile.name}`);

            return NextResponse.json(
                {
                    message: "Post accepted successfully",
                    post: {
                        id: post._id,
                        title: post.title,
                        status: post.status,
                    },
                },
                { status: 200 }
            );
        } else {
            const reasonValidation = validateRejectionReason(rejection_reason);
            if (!reasonValidation.valid) {
                return NextResponse.json(
                    { field: "rejection_reason", message: reasonValidation.error },
                    { status: 400 }
                );
            }

            post.status = "REJECTED";
            post.reviewed_by = profile._id;
            post.reviewed_at = new Date();
            post.rejection_reason = reasonValidation.sanitized;

            await post.save();

            console.log(`[INFO] Post rejected: ${id} by ${profile.name}`);

            return NextResponse.json(
                {
                    message: "Post rejected",
                    post: {
                        id: post._id,
                        title: post.title,
                        status: post.status,
                        rejection_reason: post.rejection_reason,
                    },
                },
                { status: 200 }
            );
        }
    } catch (error) {
        console.error("[ERROR] Review post error:", error);
        return NextResponse.json({ message: "Failed to review post" }, { status: 500 });
    }
}
