// app/api/posts/[id]/design/route.ts
import Post from "@/app/models/Post";
import { requirePermission } from "@/lib/auth/permissions";
import {
    MAX_FILE_SIZES as FILE_SIZE_LIMITS,
    FILE_TYPES,
    parseMultipleFilesFromFormData,
    uploadFile,
    validateFile,
} from "@/lib/gridfs";
import { dbConnect } from "@/lib/mongoose";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

// POST - Upload designed files (editor only)
export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const { error, user, profile } = await requirePermission("upload_designed_version");
        if (error) return error;

        await dbConnect();

        const { id } = params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: "Invalid post ID" }, { status: 400 });
        }

        const post = await Post.findById(id);

        if (!post) {
            return NextResponse.json({ message: "Post not found" }, { status: 404 });
        }

        // Can only upload design for ACCEPTED or ADMIN_REJECTED posts
        if (!["ACCEPTED", "ADMIN_REJECTED"].includes(post.status)) {
            return NextResponse.json(
                { message: `Cannot upload design for post in ${post.status} status` },
                { status: 400 }
            );
        }

        const formData = await req.formData();

        // Parse uploaded designed files
        const designFiles = await parseMultipleFilesFromFormData(formData, "designs");

        if (designFiles.length === 0) {
            return NextResponse.json({ message: "At least one designed file is required" }, { status: 400 });
        }

        if (designFiles.length > 20) {
            return NextResponse.json({ message: "Maximum 20 files allowed" }, { status: 400 });
        }

        // Validate and upload each file
        const uploadedFiles = [];
        for (const file of designFiles) {
            // Validate file type and size
            const validation = validateFile(
                { size: file.buffer.length, type: file.mimetype },
                FILE_TYPES.DESIGNED,
                FILE_SIZE_LIMITS.DESIGNED_FILE
            );

            if (!validation.valid) {
                return NextResponse.json({ message: validation.error }, { status: 400 });
            }

            // Upload to GridFS
            const fileId = await uploadFile(file.buffer, file.filename, file.mimetype);

            uploadedFiles.push({
                file_id: fileId,
                filename: file.filename,
                mimetype: file.mimetype,
                size: file.buffer.length,
                uploaded_by: profile._id,
                uploaded_at: new Date(),
                version: 1,
                is_current: true,
            });
        }

        // Calculate next version number
        const currentMaxVersion =
            post.designed_files.length > 0 ? Math.max(...post.designed_files.map((f: any) => f.version)) : 0;
        const nextVersion = currentMaxVersion + 1;

        // Mark all previous files as not current
        post.designed_files.forEach((file: any) => {
            file.is_current = false;
        });

        // Add new files with correct version number
        uploadedFiles.forEach(file => {
            file.version = nextVersion;
        });

        post.designed_files.push(...uploadedFiles);

        // Update status to AWAITING_ADMIN
        post.status = "AWAITING_ADMIN";

        await post.save();

        console.log(`[INFO] Design uploaded: ${uploadedFiles.length} file(s) for post ${id} by ${profile.name}`);

        return NextResponse.json(
            {
                message: "Designed files uploaded successfully",
                post: {
                    id: post._id,
                    title: post.title,
                    status: post.status,
                    designed_files_count: uploadedFiles.length,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Upload design error:", error);
        return NextResponse.json({ message: "Failed to upload designed files" }, { status: 500 });
    }
}
