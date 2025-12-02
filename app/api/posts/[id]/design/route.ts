import Post from "@/app/models/Post";
import { requirePermission } from "@/lib/auth/permissions";
import { FILE_TYPES, MAX_FILE_SIZES, uploadFile, validateFile } from "@/lib/blob";
import { dbConnect } from "@/lib/mongoose";
import { validateObjectId } from "@/lib/security/validators";
import { NextResponse } from "next/server";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const { id } = params;

        const idCheck = validateObjectId(id);
        if (!idCheck.valid) return NextResponse.json({ message: idCheck.error }, { status: 400 });

        // 1. Permission Check
        const { error, user, profile } = await requirePermission("upload_designed_version");
        if (error) return error;

        await dbConnect();

        const post = await Post.findById(id);
        if (!post) return NextResponse.json({ message: "Post not found" }, { status: 404 });

        // Ensure post is in correct state (ACCEPTED or already DESIGNING/ADMIN_REJECTED)
        if (!["ACCEPTED", "DESIGNING", "ADMIN_REJECTED"].includes(post.status)) {
            return NextResponse.json({ message: "Post is not ready for design upload" }, { status: 400 });
        }

        // 2. Handle Files
        const formData = await req.formData();
        const files = formData.getAll("designs") as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ message: "No files uploaded" }, { status: 400 });
        }

        if (files.length > 20) {
            return NextResponse.json({ message: "Max 20 files allowed" }, { status: 400 });
        }

        // 3. Upload & Update
        const newDesignedFiles = [];

        // Determine next version number
        const currentVersion =
            post.designed_files.length > 0 ? Math.max(...post.designed_files.map((f: any) => f.version)) + 1 : 1;

        // Set previous current files to false
        post.designed_files.forEach((f: any) => (f.is_current = false));

        for (const file of files) {
            const val = validateFile(file, FILE_TYPES.DESIGNED, MAX_FILE_SIZES.DESIGNED_FILE);
            if (!val.valid) return NextResponse.json({ message: val.error }, { status: 400 });

            const url = await uploadFile(file, `designs/${post._id}/${currentVersion}`);

            newDesignedFiles.push({
                url: url, // Storing URL string
                filename: file.name,
                mimetype: file.type,
                size: file.size,
                uploaded_by: profile._id,
                uploaded_at: new Date(),
                version: currentVersion,
                is_current: true,
            });
        }

        // Add to array
        post.designed_files.push(...newDesignedFiles);

        // Update status to AWAITING_ADMIN for final approval
        post.status = "AWAITING_ADMIN";

        await post.save();

        return NextResponse.json(
            {
                message: "Design uploaded successfully",
                post: { id: post._id, status: post.status },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Upload design failed:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
