import Post from "@/app/models/Post";
import { requirePermission } from "@/lib/auth/permissions";
import {
    FILE_TYPES,
    MAX_FILE_SIZES,
    parseFileFromData,
    parseMultipleFilesFromFormData,
    uploadFile,
    validateFile,
} from "@/lib/gridfs";
import { dbConnect } from "@/lib/mongoose";
import { validatePostTitle, validateRawContent, validateSubmissionType } from "@/lib/security/validators";
import { NextResponse } from "next/server";

// -------------------- GET: Fetch Posts --------------------

export async function GET(req: Request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const category = searchParams.get("category");
        const author = searchParams.get("author");
        const page = Number.parseInt(searchParams.get("page") || "1");
        const limit = Number.parseInt(searchParams.get("limit") || "10");
        const skip = (page - 1) * limit;

        const query: Record<string, any> = {};

        if (status && status !== "ALL") {
            query.status = status;
        } else {
            query.status = "PUBLISHED";
        }

        if (category) query.category = category;
        if (author) query.author = author;

        const posts = await Post.find(query)
            .populate("author", "name id_number")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select("-raw_content -original_file");

        const total = await Post.countDocuments(query);

        return NextResponse.json(
            {
                posts,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching posts:", error);
        return NextResponse.json({ message: "Failed to fetch posts. Server Error." }, { status: 500 });
    }
}

// -------------------- POST: Create New Post --------------------

export async function POST(req: Request) {
    try {
        const { error, user, profile } = await requirePermission("create_post");
        if (error) return NextResponse.json(error, { status: 403 });

        await dbConnect();

        const formData = await req.formData();

        const title = formData.get("title") as string;

        const submission_type = formData.get("submission_type") as string;
        const raw_content = formData.get("raw_content") as string;

        // Validate title
        const titleValidation = validatePostTitle(title);
        if (!titleValidation.valid) {
            return NextResponse.json({ field: "title", message: titleValidation.error }, { status: 400 });
        }

        // Validate submission type
        const submissionValidation = validateSubmissionType(submission_type);
        if (!submissionValidation.valid) {
            return NextResponse.json(
                { field: "submission_type", message: submissionValidation.error },
                { status: 400 }
            );
        }

        const postData: any = {
            title: titleValidation.sanitized,

            submission_type,

            author: profile._id,
            author_name: profile.name,
            author_email: profile.email || user.email,
            status: "PENDING_REVIEW",
        };

        // -------- Submission Type Handling --------

        // Text Paste Submission
        if (submission_type === "paste") {
            const contentValidation = validateRawContent(raw_content);
            if (!contentValidation.valid) {
                return NextResponse.json({ field: "raw_content", message: contentValidation.error }, { status: 400 });
            }
            postData.raw_content = contentValidation.sanitized;
        }

        // File Upload Submission
        else if (submission_type === "upload") {
            const fileData = await parseFileFromData(formData, "file");
            if (!fileData) {
                return NextResponse.json({ message: "File is required for upload submissions." }, { status: 400 });
            }

            const validation = validateFile(
                { size: fileData.buffer.length, type: fileData.mimetype },
                FILE_TYPES.DOCUMENTS,
                MAX_FILE_SIZES.ORIGINAL_DOCUMENT
            );

            if (!validation.valid) {
                return NextResponse.json({ message: validation.error }, { status: 400 });
            }

            const fileId = await uploadFile(fileData.buffer, fileData.filename, fileData.mimetype);

            postData.original_file = {
                file_id: fileId,
                filename: fileData.filename,
                mimetype: fileData.mimetype,
                size: fileData.buffer.length,
                uploaded_at: new Date(),
            };
        }

        // Multiple Image Upload Submission
        else if (submission_type === "image_upload") {
            const imageFiles = await parseMultipleFilesFromFormData(formData, "images");

            if (imageFiles.length === 0) {
                return NextResponse.json(
                    { message: "At least one image file is required for image uploads." },
                    { status: 400 }
                );
            }

            if (imageFiles.length > 10) {
                return NextResponse.json({ message: "Maximum 10 images allowed." }, { status: 400 });
            }

            const uploadedImages = await Promise.all(
                imageFiles.map(async imageFile => {
                    const validation = validateFile(
                        { size: imageFile.buffer.length, type: imageFile.mimetype },
                        FILE_TYPES.IMAGES,
                        MAX_FILE_SIZES.ORIGINAL_IMAGE
                    );
                    if (!validation.valid) {
                        throw new Error(`Image ${imageFile.filename}: ${validation.error}`);
                    }

                    const fileId = await uploadFile(imageFile.buffer, imageFile.filename, imageFile.mimetype);

                    return {
                        file_id: fileId,
                        filename: imageFile.filename,
                        mimetype: imageFile.mimetype,
                        size: imageFile.buffer.length,
                        uploaded_at: new Date(),
                    };
                })
            );

            postData.original_images = uploadedImages;
        }

        const post = await Post.create(postData);

        console.log(`[POST CREATED] id=${post._id}, author=${user.email}, type=${submission_type}`);

        return NextResponse.json(
            {
                message: "Post created successfully.",
                post: {
                    id: post._id,
                    title: post.title,
                    status: post.status,
                    category: post.category,
                    createdAt: post.createdAt,
                },
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("[ERROR] Error creating post:", error);
        return NextResponse.json({ message: "Failed to create post. Server Error." }, { status: 500 });
    }
}
