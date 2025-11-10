// app/api/posts/[id]/approve/route.ts
import Post from "@/app/models/Post";
import { requirePermission } from "@/lib/auth/permissions";
import { dbConnect } from "@/lib/mongoose";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

// POST - Approve or Reject designed post (admin only)
export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const { error, user, profile } = await requirePermission("approve_designs");
        if (error) return error;

        await dbConnect();

        const { id } = params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: "Invalid post ID" }, { status: 400 });
        }

        const body = await req.json();
        const { action, rejection_reason } = body;

        // Validate action
        if (!action || !["approve", "reject"].includes(action)) {
            return NextResponse.json({ message: "Invalid action. Must be 'approve' or 'reject'" }, { status: 400 });
        }

        // Find post
        const post = await Post.findById(id);

        if (!post) {
            return NextResponse.json({ message: "Post not found" }, { status: 404 });
        }

        // Can only approve/reject posts in AWAITING_ADMIN status
        if (post.status !== "AWAITING_ADMIN") {
            return NextResponse.json(
                { message: `Cannot approve/reject post in ${post.status} status` },
                { status: 400 }
            );
        }

        // Check if designed files exist
        if (!post.designed_files || post.designed_files.length === 0) {
            return NextResponse.json({ message: "No designed files found for this post" }, { status: 400 });
        }

        // Process action
        if (action === "approve") {
            post.status = "APPROVED";
            post.rejection_reason = undefined; // Clear any previous rejection

            await post.save();

            console.log(`[INFO] Design approved: ${id} by admin ${profile.name}`);

            return NextResponse.json(
                {
                    message: "Design approved successfully. Post is ready to publish.",
                    post: {
                        id: post._id,
                        title: post.title,
                        status: post.status,
                    },
                },
                { status: 200 }
            );
        } else {
            // Reject design - send back to editor
            if (!rejection_reason || rejection_reason.trim().length === 0) {
                return NextResponse.json({ message: "Rejection reason is required" }, { status: 400 });
            }

            if (rejection_reason.length > 1000) {
                return NextResponse.json(
                    { message: "Rejection reason too long (max 1000 characters)" },
                    { status: 400 }
                );
            }

            post.status = "ADMIN_REJECTED";
            post.rejection_reason = rejection_reason.trim();

            await post.save();

            console.log(`[INFO] Design rejected: ${id} by admin ${profile.name}`);

            // TODO: Send notification to editor who uploaded the design
            // await sendDesignRejectionEmail(post.reviewed_by, post.title, rejection_reason);

            return NextResponse.json(
                {
                    message: "Design rejected. Editor will be notified to re-upload.",
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
        console.error("[ERROR] Approve design error:", error);
        return NextResponse.json({ message: "Failed to process request" }, { status: 500 });
    }
}
