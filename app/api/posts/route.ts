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

// FIX #12: API Request Size Limits
export const config = {
    api: {
        bodyParser: {
            sizeLimit: "4mb",
        },
    },
};

// FIX #4: Whitelist allowed categories to prevent injection
const ALLOWED_CATEGORIES = ["tech", "science", "art", "news", "literature", "sports"];

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

        const query: any = { status: "PUBLISHED" };

        // FIX #4: MongoDB Injection Prevention (Whitelist Check)
        if (category && category !== "all") {
            if (ALLOWED_CATEGORIES.includes(category)) {
                query.category = category;
            } else {
                // Return empty result for invalid category without hitting DB
                return NextResponse.json({ items: [], total: 0, page: 1, pageSize: limitNum, totalPages: 0 });
            }
        }

        if (q) {
            // Escape regex characters to prevent ReDoS
            const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            query.$or = [
                { title: { $regex: safeQ, $options: "i" } },
                { excerpt: { $regex: safeQ, $options: "i" } },
                { author_name: { $regex: safeQ, $options: "i" } },
            ];
        }

        const posts = await Post.find(query)
            .sort({ published_at: -1, created_at: -1 })
            .skip(skip)
            .limit(limitNum)
            .select("-original_file") // Lightweight for list view
            .lean();

        const total = await Post.countDocuments(query);

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
        console.error("[ERROR] Get posts failed");
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

        // FIX #4: Validate Category against Whitelist
        if (category && !ALLOWED_CATEGORIES.includes(category)) {
            return NextResponse.json({ message: "Invalid category selected" }, { status: 400 });
        }

        const titleCheck = validatePostTitle(title);
        if (!titleCheck.valid) return NextResponse.json({ message: titleCheck.error }, { status: 400 });

        const sanitizedTitle = titleCheck.sanitized || title || "";

        // --- UNIQUE TITLE CHECK (PER AUTHOR) ---
        const existingPost = await Post.findOne({
            title: { $regex: new RegExp(`^${sanitizedTitle}$`, "i") },
            author: profile._id,
        });

        if (existingPost) {
            return NextResponse.json(
                { message: "You have already submitted a post with this title." },
                { status: 409 }
            );
        }

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

            // This now includes the Magic Number check from lib/blob.ts (if updated)
            const fileCheck = await validateFile(file, FILE_TYPES.DOCUMENTS, MAX_FILE_SIZES.ORIGINAL_DOCUMENT);
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
            const imgCheck = await validateFile(img, FILE_TYPES.IMAGES, MAX_FILE_SIZES.ORIGINAL_IMAGE);
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
        await Post.create(newPost);

        return NextResponse.json({ message: "Post submitted successfully" }, { status: 201 });
    } catch (error) {
        console.error("[ERROR] Create post failed:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
