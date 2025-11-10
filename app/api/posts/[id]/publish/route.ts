// app/api/posts/[id]/publish/route.ts
import Post from "@/app/models/Post";
import { requireAnyPermission } from "@/lib/auth/permissions";
import { dbConnect } from "@/lib/mongoose";
import { validateAction, validateFeaturedUntilDate, validateObjectId } from "@/lib/security/validators";
import { NextResponse } from "next/server";

// POST - Publish or Unpublish post (admin/publisher only)
export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const { error, user, profile } = await requireAnyPermission(["publish_post", "unpublish_post"]);
        if (error) return error;

        await dbConnect();

        const { id } = params;

        const idValidation = validateObjectId(id);
        if (!idValidation.valid) {
            return NextResponse.json({ message: idValidation.error }, { status: 400 });
        }

        const body = await req.json();
        const { action, featured_until } = body;

        const actionValidation = validateAction(action, ["publish", "unpublish"]);
        if (!actionValidation.valid) {
            return NextResponse.json({ message: actionValidation.error }, { status: 400 });
        }

        const post = await Post.findById(id);

        if (!post) {
            return NextResponse.json({ message: "Post not found" }, { status: 404 });
        }

        if (action === "publish") {
            // Can only publish APPROVED posts
            if (post.status !== "APPROVED") {
                return NextResponse.json(
                    { message: `Cannot publish post in ${post.status} status. Must be APPROVED first.` },
                    { status: 400 }
                );
            }

            // Check if designed files exist
            if (!post.designed_files || post.designed_files.length === 0) {
                return NextResponse.json({ message: "Cannot publish post without designed files" }, { status: 400 });
            }

            // Publish post
            post.status = "PUBLISHED";
            post.published_at = new Date();
            post.published_by = profile._id;

            if (featured_until) {
                const dateValidation = validateFeaturedUntilDate(featured_until);
                if (!dateValidation.valid) {
                    return NextResponse.json({ message: dateValidation.error }, { status: 400 });
                }
                post.featured_until = new Date(featured_until);
            }

            await post.save();

            console.log(`[INFO] Post published: ${id} by ${profile.name}`);

            // TODO: Send notification to author
            // await sendPublishedNotification(post.author_email, post.title);

            return NextResponse.json(
                {
                    message: "Post published successfully",
                    post: {
                        id: post._id,
                        title: post.title,
                        status: post.status,
                        published_at: post.published_at,
                        featured_until: post.featured_until,
                    },
                },
                { status: 200 }
            );
        } else {
            // Unpublish
            if (post.status !== "PUBLISHED") {
                return NextResponse.json({ message: "Post is not published" }, { status: 400 });
            }

            // Move back to APPROVED status
            post.status = "APPROVED";
            post.published_at = undefined;
            post.published_by = undefined;
            post.featured_until = undefined;

            await post.save();

            console.log(`[INFO] Post unpublished: ${id} by ${profile.name}`);

            return NextResponse.json(
                {
                    message: "Post unpublished successfully",
                    post: {
                        id: post._id,
                        title: post.title,
                        status: post.status,
                    },
                },
                { status: 200 }
            );
        }
    } catch (error) {
        console.error("[ERROR] Publish post error:", error);
        return NextResponse.json({ message: "Failed to process request" }, { status: 500 });
    }
}

// PATCH - Update featured status
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const { error, user, profile } = await requireAnyPermission(["feature_post", "publish_post"]);
        if (error) return error;

        await dbConnect();

        const { id } = params;

        const idValidation = validateObjectId(id);
        if (!idValidation.valid) {
            return NextResponse.json({ message: idValidation.error }, { status: 400 });
        }

        const body = await req.json();
        const { featured_until } = body;

        const post = await Post.findById(id);

        if (!post) {
            return NextResponse.json({ message: "Post not found" }, { status: 404 });
        }

        if (post.status !== "PUBLISHED") {
            return NextResponse.json({ message: "Only published posts can be featured" }, { status: 400 });
        }

        if (featured_until) {
            const dateValidation = validateFeaturedUntilDate(featured_until);
            if (!dateValidation.valid) {
                return NextResponse.json({ message: dateValidation.error }, { status: 400 });
            }
            post.featured_until = new Date(featured_until);
        } else {
            post.featured_until = undefined;
        }

        await post.save();

        console.log(`[INFO] Featured status updated: ${id} by ${profile.name}`);

        return NextResponse.json(
            {
                message: featured_until ? "Post featured successfully" : "Featured status removed",
                post: {
                    id: post._id,
                    title: post.title,
                    featured_until: post.featured_until,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Update featured error:", error);
        return NextResponse.json({ message: "Failed to update featured status" }, { status: 500 });
    }
}
