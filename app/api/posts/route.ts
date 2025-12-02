import Post from "@/app/models/Post";
import { requirePermission } from "@/lib/auth/permissions";
import { FILE_TYPES, MAX_FILE_SIZES, uploadFile, validateFile } from "@/lib/blob";
import { dbConnect } from "@/lib/mongoose";
import {
    validatePagination,
    validatePostTitle,
    validateRawContent,
    validateSubmissionType,
} from "@/lib/security/validators";
import { NextResponse } from "next/server";

// GET - Public Feed & Filtering
export async function GET(req: Request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q") || "";
        const category = searchParams.get("category");
        const page = searchParams.get("page");
        const limit = searchParams.get("limit");

        // Validate pagination
        const pageValidation = validatePagination(page, limit);
        if (!pageValidation.valid) {
            return NextResponse.json({ message: pageValidation.error }, { status: 400 });
        }

        const pageNum = parseInt(page || "1");
        const limitNum = parseInt(limit || "10");
        const skip = (pageNum - 1) * limitNum;

        // Build Query
        const query: any = { status: "PUBLISHED" };

        if (category && category !== "all") {
            query.category = category;
        }

        if (q) {
            query.$or = [
                { title: { $regex: q, $options: "i" } },
                { excerpt: { $regex: q, $options: "i" } },
                { author_name: { $regex: q, $options: "i" } },
            ];
        }

        // Execute Query
        const posts = await Post.find(query)
            .sort({ published_at: -1, created_at: -1 })
            .skip(skip)
            .limit(limitNum)
            .select("-original_file") // Lightweight for list view
            .lean();

        const total = await Post.countDocuments(query);

        // Map for frontend consistency
        // Explicitly cast 'posts' to any[] to avoid TS errors
        const items = (posts as any[]).map((post: any) => {
            return {
                id: post._id,
                title: post.title,
                author: post.author_name,
                date: post.published_at || post.created_at,
                category: post.category,
                excerpt: post.excerpt,
                status: post.status,
            };
        });

        return NextResponse.json({
            items,
            total,
            page: pageNum,
            pageSize: limitNum,
            totalPages: Math.ceil(total / limitNum),
        });
    } catch (error) {
        console.error("[ERROR] Get posts failed:", error);
        return NextResponse.json({ message: "Failed to fetch posts" }, { status: 500 });
    }
}

// POST - Create New Submission
export async function POST(req: Request) {
    try {
        // 1. Auth & Permission Check
        const { error, user, profile } = await requirePermission("create_post");
        if (error) return error;

        await dbConnect();

        // 2. Parse Form Data
        const formData = await req.formData();
        const title = formData.get("title") as string;
        const category = formData.get("category") as string; // Optional
        const submissionType = formData.get("submission_type") as string;
        const rawContent = formData.get("raw_content") as string;

        // 3. Validation
        const titleCheck = validatePostTitle(title);
        if (!titleCheck.valid) return NextResponse.json({ message: titleCheck.error }, { status: 400 });

        // Ensure sanitized title is a string (fallback to original or empty string if undefined)
        const sanitizedTitle = titleCheck.sanitized || title || "";

        // --- UNIQUE TITLE CHECK (PER AUTHOR) ---
        // Check if THIS author already has a post with THIS title
        const existingPost = await Post.findOne({
            title: { $regex: new RegExp(`^${sanitizedTitle}$`, "i") },
            author: profile._id, // Scoped to current user
        });

        if (existingPost) {
            return NextResponse.json(
                { message: "You have already submitted a post with this title." },
                { status: 409 }
            );
        }
        // ---------------------------------------

        const typeCheck = validateSubmissionType(submissionType);
        if (!typeCheck.valid) return NextResponse.json({ message: typeCheck.error }, { status: 400 });

        // 4. Prepare Post Object
        const newPost: any = {
            title: sanitizedTitle,
            category: category || undefined,
            author: profile._id,
            author_name: profile.name,
            author_email: profile.email,
            submission_type: submissionType,
            status: "PENDING_REVIEW",
            created_at: new Date(),
        };

        // 5. Handle Content/Files based on Type
        if (submissionType === "paste") {
            const contentCheck = validateRawContent(rawContent);
            if (!contentCheck.valid) return NextResponse.json({ message: contentCheck.error }, { status: 400 });

            const content = contentCheck.sanitized || "";

            // Convert Text to File & Upload
            const blob = new Blob([content], { type: "text/plain" });
            const file = new File([blob], `${sanitizedTitle.substring(0, 20)}.txt`, { type: "text/plain" });

            const url = await uploadFile(file, "submissions/pasted");

            newPost.original_file = {
                url: url,
                filename: file.name,
                mimetype: "text/plain",
                size: file.size,
                uploaded_at: new Date(),
            };

            newPost.excerpt = content.slice(0, 200) + (content.length > 200 ? "..." : "");
        } else if (submissionType === "upload") {
            const file = formData.get("file") as File;
            if (!file) return NextResponse.json({ message: "File is required for upload type" }, { status: 400 });

            const fileCheck = validateFile(file, FILE_TYPES.DOCUMENTS, MAX_FILE_SIZES.ORIGINAL_DOCUMENT);
            if (!fileCheck.valid) return NextResponse.json({ message: fileCheck.error }, { status: 400 });

            const url = await uploadFile(file, "submissions/docs");

            newPost.original_file = {
                url: url,
                filename: file.name,
                mimetype: file.type,
                size: file.size,
                uploaded_at: new Date(),
            };
        } else if (submissionType === "image_upload") {
            const images = formData.getAll("images") as File[];
            if (!images || images.length === 0) {
                return NextResponse.json({ message: "At least one image is required" }, { status: 400 });
            }

            const img = images[0];
            const imgCheck = validateFile(img, FILE_TYPES.IMAGES, MAX_FILE_SIZES.ORIGINAL_IMAGE);
            if (!imgCheck.valid) {
                return NextResponse.json({ message: `Image ${img.name}: ${imgCheck.error}` }, { status: 400 });
            }

            const url = await uploadFile(img, "submissions/images");

            newPost.original_file = {
                url: url,
                filename: img.name,
                mimetype: img.type,
                size: img.size,
                uploaded_at: new Date(),
            };
        }

        // 6. Save to DB
        const post = await Post.create(newPost);

        return NextResponse.json(
            {
                message: "Post submitted successfully",
                // post: { id: post._id, status: post.status },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("[ERROR] Create post failed:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
